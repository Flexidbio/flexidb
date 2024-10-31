"use server"
import { DockerClient } from '@/lib/docker/client';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const dockerClient = DockerClient.getInstance();

// Validation schemas
const CreateContainerSchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
  envVars: z.record(z.string()),
  port: z.number().int().positive(),
  network: z.string().optional()
});

export type CreateContainerInput = z.infer<typeof CreateContainerSchema>;

export async function createContainer(input: CreateContainerInput) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const validated = CreateContainerSchema.parse(input);
    
    const container = await dockerClient.createContainer(
      validated.name,
      validated.image,
      validated.envVars,
      validated.port,
      validated.network
    );
    
    await container.start();
    
    revalidatePath('/dashboard/containers');
    return { success: true, containerId: container.id };
  } catch (error) {
    console.error('Container creation failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create container');
  }
}

export async function stopContainer(containerId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const container = dockerClient.docker.getContainer(containerId);
    await container.stop();
    revalidatePath('/dashboard/containers');
    return { success: true };
  } catch (error) {
    console.error('Failed to stop container:', error);
    throw new Error('Failed to stop container');
  }
}

export async function startContainer(containerId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const container = dockerClient.docker.getContainer(containerId);
    await container.start();
    revalidatePath('/dashboard/containers');
    return { success: true };
  } catch (error) {
    console.error('Failed to start container:', error);
    throw new Error('Failed to start container');
  }
}

export async function removeContainer(containerId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const container = dockerClient.docker.getContainer(containerId);
    await container.remove({ force: true });
    revalidatePath('/dashboard/containers');
    return { success: true };
  } catch (error) {
    console.error('Failed to remove container:', error);
    throw new Error('Failed to remove container');
  }
}

export async function getContainerLogs(containerId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  try {
    const container = dockerClient.docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 100,
      timestamps: true
    });
    return { success: true, logs: logs.toString() };
  } catch (error) {
    console.error('Failed to get container logs:', error);
    throw new Error('Failed to get container logs');
  }
}