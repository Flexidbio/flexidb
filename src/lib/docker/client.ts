import Docker from 'dockerode';
import { headers } from 'next/headers';

export class DockerClient {
  private static instance: DockerClient;
  public docker: Docker;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('DockerClient cannot be instantiated on the client side');
    }
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  public static getInstance(): DockerClient {
    if (!DockerClient.instance) {
      DockerClient.instance = new DockerClient();
    }
    return DockerClient.instance;
  }

  public async createContainer(
    name: string,
    image: string,
    envVars: Record<string, string>,
    port: number,
    network?: string
  ) {
    const containerConfig = {
      Image: image,
      name,
      Env: Object.entries(envVars).map(([key, value]) => `${key}=${value}`),
      ExposedPorts: {
        [`${port}/tcp`]: {}
      },
      HostConfig: {
        PortBindings: {
          [`${port}/tcp`]: [{ HostPort: '0' }] // Dynamically assign host port
        },
        RestartPolicy: {
          Name: 'always'
        }
      }
    };
    if (network) {
      (containerConfig.HostConfig as any).NetworkMode = network;
    }

    const container = await this.docker.createContainer(containerConfig);
    return container;
  }

  public async listContainers() {
    const containers = await this.docker.listContainers({ all: true });
    return containers.map(container => ({
      id: container.Id,
      name: container.Names[0].replace('/', ''),
      status: container.Status,
      ports: container.Ports.reduce((acc, port) => ({
        ...acc,
        [`${port.PrivatePort}`]: port.PublicPort
      }), {}),
      created: container.Created,
      state: container.State
    }));
  }

  public async removeContainer(id: string, force: boolean = true) {
    const container = this.docker.getContainer(id);
    await container.remove({ force });
  }

  public async startContainer(id: string) {
    const container = this.docker.getContainer(id);
    await container.start();
  }

  public async stopContainer(id: string) {
    const container = this.docker.getContainer(id);
    await container.stop();
  }

  public async getContainerLogs(id: string, tail: number = 100) {
    const container = this.docker.getContainer(id);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail
    });
    return logs.toString();
  }
}
