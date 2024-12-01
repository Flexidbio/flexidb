import { DockerClient } from "@/lib/docker/client";
import { MongoKeyfileService } from './mongodb-keyfile.service';
import { randomBytes } from 'crypto';
import { MongoReplicaSetConfig } from "@/lib/types";

export class MongoDBManager {
  private static instance: MongoDBManager;
  private dockerClient: DockerClient;
  private keyfileService: MongoKeyfileService;

  private constructor() {
    this.dockerClient = DockerClient.getInstance();
    this.keyfileService = MongoKeyfileService.getInstance();
  }

  public static getInstance(): MongoDBManager {
    if (!MongoDBManager.instance) {
      MongoDBManager.instance = new MongoDBManager();
    }
    return MongoDBManager.instance;
  }

  private async initializeReplicaSet(
    primaryContainer: any,
    config: MongoReplicaSetConfig
  ): Promise<void> {
    try {
      // Wait for MongoDB to start
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Build replica set config
      const rsConfig = {
        _id: 'rs0',
        members: [
          {
            _id: 0,
            host: `localhost:${config.primaryPort}`,
            priority: 2
          },
          {
            _id: 1,
            host: `localhost:${config.secondaryPorts[0]}`,
            priority: 1
          },
          {
            _id: 2,
            host: `localhost:${config.secondaryPorts[1]}`,
            priority: 1
          }
        ]
      };

      // Initialize replica set
      await primaryContainer.exec({
        Cmd: [
          'mongosh',
          'admin',
          '-u', config.username,
          '-p', config.password,
          '--eval', `rs.initiate(${JSON.stringify(rsConfig)})`
        ],
        AttachStdout: true,
        AttachStderr: true
      });

    } catch (error) {
      console.error('Failed to initialize replica set:', error);
      throw error;
    }
  }
// src/lib/services/mongodb-manager.ts

private async createReplicaMember(
    config: MongoReplicaSetConfig,
    port: number,
    role: string
  ) {
    const containerName = `mongo-${role}-${config.instanceId}`;
    const dataPath = `/data/mongodb/${role}_${config.instanceId}`;
    
    try {
      const container = await this.dockerClient.docker.createContainer({
        name: containerName,
        Image: 'mongo:latest',
        Cmd: [
          'mongod',
          '--replSet', 'rs0',
          '--bind_ip_all'
        ],
        Env: [
          `MONGO_INITDB_ROOT_USERNAME=${config.username}`,
          `MONGO_INITDB_ROOT_PASSWORD=${config.password}`
        ],
        ExposedPorts: {
          '27017/tcp': {}
        },
        HostConfig: {
          PortBindings: {
            '27017/tcp': [{ HostPort: port.toString() }]
          },
          NetworkMode: config.networkName,
          Binds: [
            `/var/lib/mongodb/${role}_${config.instanceId}:/data/db`
          ]
        },
        Labels: {
          'mongodb.replica': config.instanceId,
          'mongodb.role': role
        }
      });
  
      await container.start();
      return container;
  
    } catch (error) {
      console.error(`Failed to create ${role} container:`, error);
      throw error;
    }
  }
  
  public async createReplicaSet(
    instanceId: string,
    basePort: number
  ): Promise<{
    username: string;
    password: string;
    primaryPort: number;
    secondaryPorts: number[];
    replicaSetName: string;
  }> {
    try {
      // Generate credentials
      const username = 'admin';
      const password = randomBytes(16).toString('hex');
  
      // Create network
      const networkName = `mongo_network_${instanceId}`;
      await this.dockerClient.docker.createNetwork({
        Name: networkName,
        Driver: 'bridge'
      });
  
      // Create MongoDB data directories on host
      const roles = ['primary', 'secondary1', 'secondary2'];
      for (const role of roles) {
        const dirPath = `/var/lib/mongodb/${role}_${instanceId}`;
        await this.dockerClient.docker.getContainer('flexidb_app').exec({
          Cmd: ['mkdir', '-p', dirPath],
          User: 'root'
        });
        await this.dockerClient.docker.getContainer('flexidb_app').exec({
          Cmd: ['chown', '-R', '999:999', dirPath],
          User: 'root'
        });
      }
  
      // Create containers
      const [primary, secondary1, secondary2] = await Promise.all([
        this.createReplicaMember(
          { 
            username, 
            password, 
            instanceId, 
            networkName,
            primaryPort: basePort,
            secondaryPorts: [basePort + 1, basePort + 2],
            keyfilePath: await this.keyfileService.generateKeyfile(instanceId)
          },
          basePort,
          'primary'
        ),
        this.createReplicaMember(
            { 
                username, 
                password, 
                instanceId, 
                networkName,
                primaryPort: basePort,
                secondaryPorts: [basePort + 1, basePort + 2],
                keyfilePath: await this.keyfileService.generateKeyfile(instanceId)
              },
          basePort + 1,
          'secondary1'
        ),
        this.createReplicaMember(
            { 
                username, 
                password, 
                instanceId, 
                networkName,
                primaryPort: basePort,
                secondaryPorts: [basePort + 1, basePort + 2],
                keyfilePath: await this.keyfileService.generateKeyfile(instanceId)
              },
          basePort + 2,
          'secondary2'
        )
      ]);
  
      // Wait for containers to start
      await new Promise(resolve => setTimeout(resolve, 10000));
  
      // Initialize replica set
      await this.initializeReplicaSet(
        primary,
        { 
            username, 
            password, 
            instanceId, 
            networkName,
            primaryPort: basePort,
            secondaryPorts: [basePort + 1, basePort + 2],
            keyfilePath: await this.keyfileService.generateKeyfile(instanceId)
          },
      );
  
      return {
        username,
        password,
        primaryPort: basePort,
        secondaryPorts: [basePort + 1, basePort + 2],
        replicaSetName: 'rs0'
      };
  
    } catch (error) {
      console.error('Failed to create replica set:', error);
      await this.cleanup(instanceId);
      throw error;
    }
  }
  
  public async cleanup(instanceId: string): Promise<void> {
    try {
      // Find and remove containers
      const containers = await this.dockerClient.docker.listContainers({
        all: true,
        filters: {
          label: [`mongodb.replica=${instanceId}`]
        }
      });
  
      await Promise.all(
        containers.map(container =>
          this.dockerClient.removeContainer(container.Id, true)
        )
      );
  
      // Remove network
      try {
        const network = await this.dockerClient.docker.getNetwork(`mongo_network_${instanceId}`);
        await network.remove();
      } catch (error) {
        console.error('Error removing network:', error);
      }
  
      // Clean up directories
      const roles = ['primary', 'secondary1', 'secondary2'];
      for (const role of roles) {
        try {
          await this.dockerClient.docker.getContainer('flexidb_app').exec({
            Cmd: ['rm', '-rf', `/var/lib/mongodb/${role}_${instanceId}`],
            User: 'root'
          });
        } catch (error) {
          console.error(`Error removing ${role} directory:`, error);
        }
      }
  
    } catch (error) {
      console.error('Failed to cleanup:', error);
      throw error;
    }
  }
}