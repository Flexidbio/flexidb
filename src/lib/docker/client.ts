import Docker,{Container} from 'dockerode';
import { networkInterfaces, platform } from 'os';
import { Writable } from 'stream';

import { isPortAvailable } from "@/lib/net/actions"

export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  accessUrl: string;
  network: string;
  container_id: string;
  ports: {
    [key: string]: number;
  };
  state: string;
}

interface DockerResponse<T = unknown> {
  data: T;
  status: number;
}



export class DockerClient {
  private static instance: DockerClient;
  public docker: Docker;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('DockerClient cannot be instantiated on the client side');
    }

    // Handle different Docker socket configurations based on OS
    const isWindows = platform() === 'win32';
    const config = isWindows
      ? {
          socketPath: '//./pipe/docker_engine'
        }
      : {
          socketPath: '/var/run/docker.sock'
        };

    this.docker = new Docker(config);
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

  public async pullImage(image: string): Promise<void> {
    try {
    //?  console.log(`Pulling image: ${image}`);
      await new Promise((resolve, reject) => {
        this.docker.pull(image, (err: any, stream: any) => {
          if (err) {
            reject(err);
            return;
          }

          this.docker.modem.followProgress(stream, (err: any, output: any) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(output);
          });
        });
      });
     //? console.log(`Successfully pulled image: ${image}`);
    } catch (error) {
      console.error(`Failed to pull image ${image}:`, error);
      throw error;
    }
  }

  public async createContainer(
    name: string,
    image: string,
    envVars: Record<string, string>,
    externalPort: number,
    internalPort: number,
    network?: string,
    cmd?: string[],
    resourceLimits?: { memoryMB?: number; cpuCount?: number }
  ): Promise<DockerResponse<Container>> {
    const isAvailable = await isPortAvailable(externalPort)
    if (!isAvailable) {
      throw new Error(`Port ${externalPort} is already in use`)
    }

    await this.pullImage(image)

    const portBindings: any = {}
    portBindings[`${internalPort}/tcp`] = [{ HostPort: externalPort.toString() }]

    const hostConfig: any = {
      PortBindings: portBindings,
      NetworkMode: network || 'bridge'
    }

    if (resourceLimits?.memoryMB) {
      hostConfig.Memory = resourceLimits.memoryMB * 1024 * 1024
      hostConfig.MemorySwap = resourceLimits.memoryMB * 1024 * 1024
    }

    if (resourceLimits?.cpuCount) {
      hostConfig.NanoCpus = resourceLimits.cpuCount * 1e9
    }

    const createOptions: any = {
      name,
      Image: image,
      Env: Object.entries(envVars).map(([key, value]) => `${key}=${value}`),
      ExposedPorts: {
        [`${internalPort}/tcp`]: {}
      },
      HostConfig: hostConfig
    }

    if (cmd && cmd.length > 0) {
      createOptions.Cmd = cmd
    }

    const container = await this.docker.createContainer(createOptions)

    return {
      data: container,
      status: 200
    }
  }

  public async execInContainer(
    containerId: string,
    command: string[],
    user?: string
  ): Promise<{ exitCode: number; output: string }> {
    const container = this.docker.getContainer(containerId)
    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
      User: user || 'root'
    })

    const execStream = await exec.start({ hijack: true, stdin: false })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    const stdout = new Writable({
      write(chunk, _encoding, callback) {
        stdoutChunks.push(chunk)
        callback()
      }
    })
    const stderr = new Writable({
      write(chunk, _encoding, callback) {
        stderrChunks.push(chunk)
        callback()
      }
    })

    this.docker.modem.demuxStream(execStream, stdout, stderr)

    return new Promise((resolve, reject) => {
      execStream.on('end', async () => {
        try {
          const inspectResult = await exec.inspect()
          const stdoutStr = Buffer.concat(stdoutChunks).toString('utf8')
          const stderrStr = Buffer.concat(stderrChunks).toString('utf8')
          resolve({
            exitCode: inspectResult.ExitCode ?? 1,
            output: stdoutStr + (stderrStr ? '\n' + stderrStr : '')
          })
        } catch {
          resolve({ exitCode: 1, output: Buffer.concat(stdoutChunks).toString('utf8') })
        }
      })
      execStream.on('error', (err: Error) => {
        reject(err)
      })
    })
  }

  public async waitForContainerReady(containerId: string, maxRetries: number = 30, delayMs: number = 2000): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const container = this.docker.getContainer(containerId)
        const info = await container.inspect()
        if (info.State.Running) {
          return true
        }
      } catch {
        // container not found yet
      }
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
    return false
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
      container_id:info.Id,
      state: info.State.Status,
      network: info.NetworkSettings.Networks.bridge.IPAddress
    };
  }

  public async listContainers(): Promise<ContainerInfo[]> {
    const containers = await this.docker.listContainers({ all: true });
    

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

  public async restartContainer(id: string) {
    const container = this.docker.getContainer(id);
    await container.restart();
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