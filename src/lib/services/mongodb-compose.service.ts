import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { MongoKeyfileService } from './mongodb-keyfile.service';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

export class MongoComposeService {
  private static instance: MongoComposeService;
  private keyfileService: MongoKeyfileService;

  private constructor() {
    this.keyfileService = MongoKeyfileService.getInstance();
  }

  public static getInstance(): MongoComposeService {
    if (!MongoComposeService.instance) {
      MongoComposeService.instance = new MongoComposeService();
    }
    return MongoComposeService.instance;
  }

  private async createComposeFile(
    instanceId: string,
    basePort: number,
    username: string,
    password: string
  ): Promise<string> {
    const composeDir = path.join(process.cwd(), 'data', 'mongodb-compose');
    await fs.mkdir(composeDir, { recursive: true });

    // Create env file for compose
    const envContent = `
MONGO_ROOT_USERNAME=${username}
MONGO_ROOT_PASSWORD=${password}
MONGO_PRIMARY_PORT=${basePort}
MONGO_SECONDARY1_PORT=${basePort + 1}
MONGO_SECONDARY2_PORT=${basePort + 2}
MONGODB_NETWORK_NAME=mongo_network_${instanceId}
    `.trim();

    const envPath = path.join(composeDir, `${instanceId}.env`);
    await fs.writeFile(envPath, envContent);

    // Copy compose template
    const templatePath = path.join(process.cwd(), 'templates', 'mongodb-compose.yml');
    const composePath = path.join(composeDir, `${instanceId}-compose.yml`);
    await fs.copyFile(templatePath, composePath);

    return composePath;
  }

  private async initializeReplicaSet(
    instanceId: string,
    username: string,
    password: string
  ): Promise<void> {
    const initCommand = `
    rs.initiate({
      _id: "rs0",
      members: [
        { _id: 0, host: "mongodb-primary:27017", priority: 2 },
        { _id: 1, host: "mongodb-secondary-1:27017", priority: 1 },
        { _id: 2, host: "mongodb-secondary-2:27017", priority: 1 }
      ]
    })
    `;

    await execAsync(`
      docker exec mongodb-primary mongosh admin \
        -u "${username}" -p "${password}" \
        --eval '${initCommand}'
    `);
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

      // Ensure directories exist
      const dataDir = path.join(process.cwd(), 'data', 'mongodb');
      await fs.mkdir(path.join(dataDir, 'primary'), { recursive: true });
      await fs.mkdir(path.join(dataDir, 'secondary1'), { recursive: true });
      await fs.mkdir(path.join(dataDir, 'secondary2'), { recursive: true });

      // Generate keyfile
      await this.keyfileService.generateKeyfile(instanceId);

      // Create compose file
      const composePath = await this.createComposeFile(
        instanceId,
        basePort,
        username,
        password
      );

      // Start containers
      await execAsync(`docker compose -f ${composePath} --env-file ${composePath}.env up -d`);

      // Wait for primary to be healthy
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Initialize replica set
      await this.initializeReplicaSet(instanceId, username, password);

      // Update database record with connection info
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
      const composePath = path.join(
        process.cwd(),
        'data',
        'mongodb-compose',
        `${instanceId}-compose.yml`
      );

      // Stop and remove containers
      await execAsync(`docker compose -f ${composePath} down -v`);

      // Clean up files
      await fs.unlink(composePath);
      await fs.unlink(`${composePath}.env`);
      await this.keyfileService.cleanup(instanceId);

      // Clean up data directories
      const dataDir = path.join(process.cwd(), 'data', 'mongodb');
      await fs.rm(path.join(dataDir, 'primary'), { recursive: true, force: true });
      await fs.rm(path.join(dataDir, 'secondary1'), { recursive: true, force: true });
      await fs.rm(path.join(dataDir, 'secondary2'), { recursive: true, force: true });

    } catch (error) {
      console.error('Failed to cleanup:', error);
      throw error;
    }
  }
}