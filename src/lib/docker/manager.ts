import { randomUUID } from 'crypto';
import { DockerClient } from '@/lib/docker/client';
import { DATABASE_CONFIGS } from '../config/database.config';
import { prisma } from '../db/prisma';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private dockerClient: DockerClient;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('DatabaseManager cannot be instantiated on the client side');
    }
    this.dockerClient = DockerClient.getInstance();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async createDatabaseInstance(
    name: string,
    type: string,
    envVars: Record<string, string>
  ) {
    const config = DATABASE_CONFIGS[type];
    if (!config) {
      throw new Error(`Unsupported database type: ${type}`);
    }

    // Validate required env vars
    const missingVars = config.required_env_vars.filter(v => !envVars[v]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    const containerId = randomUUID();
    const containerName = `flexidb_${type}_${containerId}`;

    // Create container
    const container = await this.dockerClient.createContainer(
      containerName,
      config.image,
      envVars,
      config.internal_port
    );

    // Start container
    await container.start();

    // Get container info to get the assigned port
    const containerInfo = await container.inspect();
    const hostPort = containerInfo.NetworkSettings.Ports[`${config.internal_port}/tcp`][0].HostPort;

    // Save to database
    const instance = await prisma.databaseInstance.create({
      data: {
        id: containerId,
        name,
        type,
        port: parseInt(hostPort),
        status: 'running',
        envVars
      }
    });

    return instance;
  }

  async deleteDatabaseInstance(id: string) {
    const instance = await prisma.databaseInstance.findUnique({
      where: { id }
    });

    if (!instance) {
      throw new Error('Database instance not found');
    }

    const containerName = `flexidb_${instance.type}_${id}`;
    await this.dockerClient.removeContainer(containerName);

    await prisma.databaseInstance.delete({
      where: { id }
    });
  }

  async listDatabaseInstances() {
    return prisma.databaseInstance.findMany();
  }

  async getDatabaseInstance(id: string) {
    return prisma.databaseInstance.findUnique({
      where: { id }
    });
  }

  async updateDatabaseInstanceEnv(id: string, envVars: Record<string, string>) {
    const instance = await prisma.databaseInstance.findUnique({
      where: { id }
    });

    if (!instance) {
      throw new Error('Database instance not found');
    }

    // Stop and remove the old container
    const oldContainerName = `flexidb_${instance.type}_${id}`;
    await this.dockerClient.removeContainer(oldContainerName);

    // Create and start a new container with updated env vars
    const config = DATABASE_CONFIGS[instance.type];
    const container = await this.dockerClient.createContainer(
      oldContainerName,
      config.image,
      envVars,
      config.internal_port
    );

    await container.start();

    // Update database record
    return prisma.databaseInstance.update({
      where: { id },
      data: { envVars }
    });
  }
}
