// src/lib/services/mongodb.service.ts

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
import { MongoKeyfileService } from "./mongodb-keyfile.service";

// The MongoDBService class manages MongoDB replica set creation and management
export class MongoDBService {
  private static instance: MongoDBService;
  private dockerClient: DockerClient;
  private keyfileService: MongoKeyfileService;

  private constructor() {
    this.dockerClient = DockerClient.getInstance();
    this.keyfileService = MongoKeyfileService.getInstance();
  }

  public static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  // Enhanced container health check that verifies MongoDB is actually responding
  private async waitForContainer(containerId: string, timeout = 120000): Promise<boolean> {
    console.log(`Starting to wait for container ${containerId}`);
    const startTime = Date.now();
    
    const container = this.dockerClient.docker.getContainer(containerId);
    
    while (Date.now() - startTime < timeout) {
      try {
        const info = await container.inspect();
        console.log(`Container state: ${info.State.Status}`);
  
        if (info.State.Status === 'running') {
          // Add delay before checking MongoDB connection
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          try {
            const exec = await container.exec({
              Cmd: [
                'mongosh',
                '--quiet',
                '--eval',
                'db.adminCommand({ ping: 1 })'
              ],
              AttachStdout: true,
              AttachStderr: true
            });
  
            const stream = await exec.start({});
            let output = '';
  
            await new Promise((resolve, reject) => {
              stream.on('data', (chunk: Buffer) => {
                output += chunk.toString();
              });
              stream.on('end', resolve);
              stream.on('error', reject);
            });
  
            if (output.includes('"ok" : 1')) {
              console.log('MongoDB is accepting connections');
              return true;
            }
          } catch (cmdError) {
            console.log('Waiting for MongoDB to initialize...');
          }
        } else if (info.State.Status === 'exited' || info.State.Status === 'dead') {
          const logs = await container.logs({ stdout: true, stderr: true });
          console.error('Container failed to start. Logs:', logs.toString());
          return false;
        }
      } catch (error) {
        console.error('Error checking container:', error);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  
    return false;
  }

  // Creates a single MongoDB container with proper security configuration
  private async createMongoContainer(
    containerName: string,
    member: MongoNodeConfig,
    networkName: string,
    envVars: Record<string, string>,
    keyfilePath: string
  ): Promise<any> {
    console.log(`Creating MongoDB container: ${containerName}`);
    
    const containerConfig = {
      name: containerName,
      Image: MONGODB_CONFIG.image,
      User: "999:999",
      Env: [
        ...Object.entries(envVars).map(([key, value]) => `${key}=${value}`),
        `MONGO_REPLSET_NAME=${MONGODB_REPLICA_CONFIG.replica_set_name}`
      ],
      Cmd: [
        "mongod",
        "--replSet", MONGODB_REPLICA_CONFIG.replica_set_name,
        "--keyFile", "/data/mongodb-keyfile/keyfile",
        "--bind_ip_all",
        "--port", member.internal_port.toString(),
        "--oplogSize", "128",
        "--wiredTigerCacheSizeGB", "1"
      ],
      HostConfig: {
        Binds: [
          `${process.cwd()}/data/mongodb/${containerName}:/data/db`,
          `${process.cwd()}/data/mongodb-keyfiles/${keyfilePath}:/data/mongodb-keyfile/keyfile:ro`
        ],
        SecurityOpt: ["seccomp=unconfined"],
        Privileged: true,
        NetworkMode: networkName
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [networkName]: {}
        }
      }
    };

    try {
      await this.dockerClient.docker.createVolume({
        Name: `${containerName}_data`,
        Driver: 'local'
      });

      const container = await this.dockerClient.docker.createContainer(containerConfig);
      
      // Connect container to network
      const network = this.dockerClient.docker.getNetwork(networkName);
      await network.connect({ Container: container.id });
      
      await container.start();
      
      return container;
    } catch (error) {
      console.error(`Failed to create/start container ${containerName}:`, error);
      throw error;
    }
  }

  // Creates an isolated network for the replica set
  private async createReplicaSetNetwork(instanceId: string): Promise<string> {
    const networkName = `mongo_network_${instanceId}`;
    try {
      await this.dockerClient.docker.createNetwork({
        Name: networkName,
        Driver: "bridge",
        Options: {
          "com.docker.network.bridge.enable_icc": "true"
        }
      });
      return networkName;
    } catch (error) {
      console.error("Failed to create network:", error);
      throw error;
    }
  }

  // Initializes the replica set on the primary node
  private async initializeReplicaSet(
    primaryContainerId: string,
    members: MongoNodeConfig[]
  ): Promise<void> {
    console.log('Starting replica set initialization...');
    
    const isReady = await this.waitForContainer(primaryContainerId);
    if (!isReady) {
      const container = this.dockerClient.docker.getContainer(primaryContainerId);
      const logs = await container.logs({ stdout: true, stderr: true });
      console.error('Container logs:', logs.toString());
      throw new Error("Primary container failed to start properly");
    }

    const initCommand = generateReplicaSetInitCommand(members);
    console.log('Initializing replica set with command:', initCommand);

    const container = this.dockerClient.docker.getContainer(primaryContainerId);

    // Verify MongoDB is responding before initialization
    try {
      const pingCommand = 'db.adminCommand({ ping: 1 })';
      const pingExec = await container.exec({
        Cmd: ['mongosh', '--eval', pingCommand],
        AttachStdout: true,
        AttachStderr: true
      });

      await new Promise((resolve, reject) => {
        pingExec.start({}, (err, stream) => {
          if (err) reject(err);
          stream?.on('data', data => console.log('Ping output:', data.toString()));
          stream?.on('end', resolve);
          stream?.on('error', reject);
        });
      });
    } catch (error) {
      console.error('MongoDB ping failed:', error);
      throw new Error('MongoDB is not responding to commands');
    }

    // Initialize the replica set
    try {
      const exec = await container.exec({
        Cmd: ['mongosh', '--eval', initCommand],
        AttachStdout: true,
        AttachStderr: true
      });

      const output = await new Promise<string>((resolve, reject) => {
        exec.start({}, (err, stream) => {
          if (err) {
            reject(err);
            return;
          }
          let output = '';
          stream?.on('data', chunk => {
            const data = chunk.toString();
            console.log('Initialization output:', data);
            output += data;
          });
          stream?.on('end', () => resolve(output));
          stream?.on('error', reject);
        });
      });

      if (!output.includes('"ok" : 1')) {
        console.error('Replica set initialization failed. Output:', output);
        throw new Error('Failed to initialize replica set');
      }

      console.log('Replica set initialized successfully');
    } catch (error) {
      console.error('Error during replica set initialization:', error);
      throw error;
    }
  }

  // Main method to create a MongoDB replica set
  public async createMongoDBReplicaSet(
    name: string,
    userId: string,
    envVars: Record<string, string>,
    baseExternalPort: number
  ): Promise<any> {
    const instanceId = randomUUID();
    const networkName = await this.createReplicaSetNetwork(instanceId);
    let keyfilePath: string | undefined;

    try {
      // Generate security keyfile for the replica set
      keyfilePath = await this.keyfileService.generateKeyfile(instanceId);

      const replicaMembers = generateReplicaSetMembers(
        baseExternalPort,
        MONGODB_REPLICA_CONFIG.replicas
      );

      // Create containers for each replica member
      const containers = [];
      for (const member of replicaMembers) {
        const containerName = `${name}-${member.node_name}-${instanceId}`;
        const container = await this.createMongoContainer(
          containerName,
          member,
          networkName,
          envVars,
          keyfilePath
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
          port: replicaMembers[0].external_port,
          internalPort: MONGODB_CONFIG.internal_port,
          status: "initializing",
          container_id: containers[0].id,
          envVars: {
            ...envVars,
            REPLICA_SET_NAME: MONGODB_REPLICA_CONFIG.replica_set_name,
            REPLICA_MEMBERS: JSON.stringify(replicaMembers)
          },
          userId
        }
      });

      // Initialize the replica set configuration
      await this.initializeReplicaSet(containers[0].id, replicaMembers);

      // Update instance status to running
      const updatedInstance = await prisma.databaseInstance.update({
        where: { id: instanceId },
        data: { 
          status: "running",
        }
      });

      return updatedInstance;

    } catch (error) {
      console.error("Failed to create MongoDB replica set:", error);
      // Clean up all resources on failure
      await this.cleanup(networkName, instanceId);
      if (keyfilePath) {
        await this.keyfileService.cleanup(instanceId);
      }
      throw error;
    }
  }

  // Cleanup method to remove all resources associated with a replica set
  private async cleanup(networkName: string, instanceId: string): Promise<void> {
    try {
      // Remove all containers in the network
      const containers = await this.dockerClient.docker.listContainers({
        all: true,
        filters: { network: [networkName] }
      });

      await Promise.all(
        containers.map(container =>
          this.dockerClient.removeContainer(container.Id, true)
        )
      );

      // Remove the network
      const network = await this.dockerClient.docker.getNetwork(networkName);
      await network.remove();

      // Remove database record
      await prisma.databaseInstance.deleteMany({
        where: { id: instanceId }
      });

      // Clean up keyfile
      await this.keyfileService.cleanup(instanceId);
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }

  // Method to remove an entire replica set
  public async removeReplicaSet(instanceId: string): Promise<void> {
    const instance = await prisma.databaseInstance.findUnique({
      where: { id: instanceId }
    });

    if (!instance || instance.type !== "mongodb") {
      throw new Error("Invalid MongoDB instance");
    }

    const networkName = `mongo_network_${instanceId}`;
    await this.cleanup(networkName, instanceId);
  }
}