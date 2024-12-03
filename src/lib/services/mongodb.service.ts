import { DockerClient } from "@/lib/docker/client";
import { 
  MONGODB_CONFIG,
  MONGODB_REPLICA_CONFIG,
  generateReplicaSetMembers,
  generateReplicaSetInitCommand,
  MongoNodeConfig
} from "@/lib/config/mongodb.config";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import path from 'path';
import fs from 'fs/promises';

interface MongoDBPaths {
  dataDir: string;
  keyfileDir: string;
}

export class MongoDBService {
  private static instance: MongoDBService;
  private dockerClient: DockerClient;
  private paths: MongoDBPaths;

  private constructor() {
    this.dockerClient = DockerClient.getInstance();
    this.paths = {
      dataDir: process.env.MONGODB_DATA_DIR || '/var/lib/flexidb/mongodb',
      keyfileDir: process.env.MONGODB_KEYFILE_DIR || '/var/lib/flexidb/mongodb-keyfiles'
    };
  }

  public static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  private async generateKeyfile(instanceId: string): Promise<string> {
    const keyContent = require('crypto').randomBytes(756).toString('base64');
    const keyfilePath = path.join(this.paths.keyfileDir, `${instanceId}.key`);
    
    await fs.mkdir(this.paths.keyfileDir, { recursive: true });
    await fs.writeFile(keyfilePath, keyContent);
    await fs.chmod(keyfilePath, 0o400);
    
    // Set ownership to mongodb user (UID 999)
    try {
      await fs.chown(keyfilePath, 999, 999);
    } catch (error) {
      console.warn('Failed to set keyfile ownership, container might need to handle this');
    }

    return keyfilePath;
  }

  private async setupDataDirectory(instanceId: string): Promise<string> {
    const dataPath = path.join(this.paths.dataDir, instanceId);
    await fs.mkdir(dataPath, { recursive: true });
    
    try {
      await fs.chmod(dataPath, 0o700);
      await fs.chown(dataPath, 999, 999);
    } catch (error) {
      console.warn('Failed to set data directory permissions, container might need to handle this');
    }

    return dataPath;
  }

  private async createContainer(
    containerName: string,
    member: MongoNodeConfig,
    networkName: string,
    keyfilePath: string,
    dataPath: string,
    envVars: Record<string, string>
  ): Promise<any> {
    const containerConfig = {
      name: containerName,
      Image: MONGODB_CONFIG.image,
      Cmd: [
        "mongod",
        "--replSet", MONGODB_REPLICA_CONFIG.replica_set_name,
        "--keyFile", "/mongodb/keyfile/keyfile",
        "--bind_ip_all",
        "--port", member.internal_port.toString()
      ],
      Env: Object.entries(envVars).map(([key, value]) => `${key}=${value}`),
      ExposedPorts: {
        [`${member.internal_port}/tcp`]: {}
      },
      HostConfig: {
        Binds: [
          `${dataPath}:/data/db`,
          `${keyfilePath}:/mongodb/keyfile/keyfile:ro`
        ],
        PortBindings: {
          [`${member.internal_port}/tcp`]: [
            { HostPort: member.external_port.toString() }
          ]
        },
        NetworkMode: networkName
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [networkName]: {
            Aliases: [member.node_name]
          }
        }
      }
    };

    try {
      await this.dockerClient.pullImage(MONGODB_CONFIG.image);
      const container = await this.dockerClient.docker.createContainer(containerConfig);
      await container.start();
      return container;
    } catch (error) {
      console.error(`Failed to create/start container ${containerName}:`, error);
      throw error;
    }
  }

  // Main method to create MongoDB replica set
  public async createReplicaSet(
    name: string,
    userId: string,
    envVars: Record<string, string>,
    basePort: number
  ): Promise<any> {
    const instanceId = randomUUID();
    const networkName = `mongo_network_${instanceId}`;
    
    try {
      // Ensure required directories exist with proper permissions
      await this.ensureDirectories();

      // Create network
      await this.dockerClient.docker.createNetwork({
        Name: networkName,
        Driver: "bridge"
      });

      // Setup directories and keyfile
      const keyfilePath = await this.generateKeyfile(instanceId);
      const dataPath = await this.setupDataDirectory(instanceId);

      // Generate replica set member configs
      const members = generateReplicaSetMembers(basePort, MONGODB_REPLICA_CONFIG.replicas);
      
      // Create containers
      const containers = [];
      for (const member of members) {
        const containerName = `${name}-${member.node_name}-${instanceId}`;
        const container = await this.createContainer(
          containerName,
          member,
          networkName,
          keyfilePath,
          path.join(dataPath, member.node_name),
          envVars
        );
        containers.push(container);
      }

      // Create database record
      const dbInstance = await prisma.databaseInstance.create({
        data: {
          id: instanceId,
          name,
          type: "mongodb",
          image: MONGODB_CONFIG.image,
          port: members[0].external_port,
          internalPort: MONGODB_CONFIG.internal_port,
          status: "initializing",
          container_id: containers[0].id,
          envVars: {
            ...envVars,
            REPLICA_SET_NAME: MONGODB_REPLICA_CONFIG.replica_set_name,
            REPLICA_MEMBERS: JSON.stringify(members)
          },
          userId
        }
      });

      // Initialize replica set
      await this.initializeReplicaSet(containers[0].id, members);

      return dbInstance;
    } catch (error) {
      await this.cleanup(networkName, instanceId);
      throw error;
    }
  }

  private async initializeReplicaSet(primaryContainerId: string, members: MongoNodeConfig[]): Promise<void> {
    const initCommand = generateReplicaSetInitCommand(members);
    const container = this.dockerClient.docker.getContainer(primaryContainerId);

    // Wait for MongoDB to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));

    const exec = await container.exec({
      Cmd: ['mongosh', '--eval', initCommand],
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({});
    await new Promise((resolve, reject) => {
      let output = '';
      stream.on('data', (chunk: Buffer) => {
        output += chunk.toString();
      });
      stream.on('end', () => {
        if (output.includes('"ok" : 1')) {
          resolve(output);
        } else {
          reject(new Error(`Replica set initialization failed: ${output}`));
        }
      });
      stream.on('error', reject);
    });
  }

  private async cleanup(networkName: string, instanceId: string): Promise<void> {
    try {
      // Remove containers
      const containers = await this.dockerClient.docker.listContainers({
        all: true,
        filters: { network: [networkName] }
      });

      for (const container of containers) {
        await this.dockerClient.removeContainer(container.Id, true);
      }

      // Remove network
      const network = await this.dockerClient.docker.getNetwork(networkName);
      await network.remove();

      // Cleanup directories
      await fs.rm(path.join(this.paths.dataDir, instanceId), { recursive: true, force: true });
      await fs.unlink(path.join(this.paths.keyfileDir, `${instanceId}.key`));

      // Remove database record
      await prisma.databaseInstance.delete({
        where: { id: instanceId }
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  private async ensureDirectories(): Promise<void> {
    try {
      // First try using fs to create directories directly
      await fs.mkdir(this.paths.dataDir, { recursive: true });
      await fs.mkdir(this.paths.keyfileDir, { recursive: true });
      
      try {
        // Try to set permissions directly first
        await fs.chmod(this.paths.dataDir, 0o700);
        await fs.chmod(this.paths.keyfileDir, 0o700);
        await fs.chown(this.paths.dataDir, 999, 999);
        await fs.chown(this.paths.keyfileDir, 999, 999);
      } catch (permError) {
        console.warn('Failed to set permissions directly, falling back to Docker exec:', permError);
        
        // Fallback to Docker exec if direct permission changes fail
        try {
          await this.dockerClient.docker.getContainer('flexidb_app').exec({
            Cmd: [
              'sh', '-c',
              `mkdir -p ${this.paths.dataDir} ${this.paths.keyfileDir} && ` +
              `chmod 700 ${this.paths.dataDir} ${this.paths.keyfileDir} && ` +
              `chown -R mongodb:mongodb ${this.paths.dataDir} ${this.paths.keyfileDir}`
            ],
            User: 'root'
          });
        } catch (dockerError) {
          console.warn('Docker exec fallback failed:', dockerError);
          // If both methods fail, throw the original permission error
          throw permError;
        }
      }
    } catch (error: unknown) {
      console.error('Failed to ensure directories:', error);
      throw new Error(`Failed to create or set permissions on MongoDB directories: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}