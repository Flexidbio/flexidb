import Docker from 'dockerode';
import { networkInterfaces } from 'os';

export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  accessUrl: string;
  ports: {
    [key: string]: number;
  };
  state: string;
}

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

  private getServerIP(): string {
    const nets = networkInterfaces();
    let serverIP = process.env.SERVER_IP;

    if (!serverIP) {
      for (const name of Object.keys(nets)) {
        const net = nets[name];
        if (net) {
          const validInterface = net.find(
            (ip) => !ip.internal && ip.family === 'IPv4'
          );
          if (validInterface) {
            serverIP = validInterface.address;
            break;
          }
        }
      }
    }

    return serverIP || 'localhost';
  }

  public async createContainer(
    name: string,
    image: string,
    envVars: Record<string, string>,
    externalPort: number,
    internalPort: number,
    network?: string
  ) {
    const portBindings: any = {};
    portBindings[`${internalPort}/tcp`] = [{ HostPort: externalPort.toString() }];

    const container = await this.docker.createContainer({
      name,
      Image: image,
      Env: Object.entries(envVars).map(([key, value]) => `${key}=${value}`),
      ExposedPorts: {
        [`${internalPort}/tcp`]: {}
      },
      HostConfig: {
        PortBindings: portBindings,
        NetworkMode: network || 'bridge'
      }
    });

    return container;
  }

  public async getContainerInfo(containerId: string): Promise<ContainerInfo> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();
    const ports = info.NetworkSettings.Ports;
    const serverIP = this.getServerIP();

    // Get the bound port
    const boundPorts: { [key: string]: number } = {};
    let primaryPort: number | undefined;

    for (const [containerPort, hostBindings] of Object.entries(ports)) {
      if (hostBindings && hostBindings[0]) {
        const hostPort = parseInt(hostBindings[0].HostPort);
        boundPorts[containerPort.replace('/tcp', '')] = hostPort;
        if (!primaryPort) primaryPort = hostPort;
      }
    }

    return {
      id: info.Id,
      name: info.Name.replace('/', ''),
      status: info.State.Status,
      accessUrl: primaryPort ? `${serverIP}:${primaryPort}` : '',
      ports: boundPorts,
      state: info.State.Status
    };
  }

  public async listContainers(): Promise<ContainerInfo[]> {
    const containers = await this.docker.listContainers({ all: true });
    const serverIP = this.getServerIP();

    return Promise.all(
      containers.map(async (container) => {
        const info = await this.getContainerInfo(container.Id);
        return info;
      })
    );
  }

  // Keep existing methods but update to use new ContainerInfo type
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