import Docker from 'dockerode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const docker = new Docker();

export class UpdateService {
  private static instance: UpdateService;
  
  public static getInstance(): UpdateService {
    if (!this.instance) {
      this.instance = new UpdateService();
    }
    return this.instance;
  }

  async checkForUpdates(): Promise<{
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
  }> {
    try {
      // Get current version from running container
      const currentContainer = await docker.getContainer(process.env.HOSTNAME || '');
      const containerInfo = await currentContainer.inspect();
      const currentVersion = containerInfo.Config.Labels['org.opencontainers.image.version'] || 'unknown';

      // Check latest version from GitHub Container Registry
      await docker.pull('ghcr.io/flexidbio/flexidb:latest');
      const latestImageInfo = await docker.getImage('ghcr.io/flexidbio/flexidb:latest').inspect();
      const latestVersion = latestImageInfo.Config.Labels['org.opencontainers.image.version'] || 'unknown';

      return {
        hasUpdate: latestVersion > currentVersion,
        currentVersion,
        latestVersion
      };
    } catch (error) {
      console.error('Failed to check for updates:', error);
      throw error;
    }
  }

  async performUpdate(): Promise<void> {
    try {
      // Pull latest image
      await docker.pull('ghcr.io/flexidbio/flexidb:latest');

      // Get current container info
      const currentContainer = await docker.getContainer(process.env.HOSTNAME || '');
      const containerInfo = await currentContainer.inspect();

      // Create new container with same config but new image
      const newContainer = await docker.createContainer({
        ...containerInfo.Config,
        Image: 'ghcr.io/flexidbio/flexidb:latest',
        HostConfig: containerInfo.HostConfig
      });

      // Stop current container
      await currentContainer.stop();

      // Start new container
      await newContainer.start();

      // Remove old container
      await currentContainer.remove();
    } catch (error) {
      console.error('Failed to perform update:', error);
      throw error;
    }
  }
} 