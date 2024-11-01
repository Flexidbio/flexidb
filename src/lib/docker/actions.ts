"use server";

import { DockerClient } from "@/lib/docker/client";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createContainer as dbCreateContainer } from "@/lib/db/docker";
import { PrismaClient } from "@prisma/client";

const dockerClient = DockerClient.getInstance();
const prisma = new PrismaClient();

const CreateContainerSchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
  envVars: z.record(z.string()),
  port: z.number().int().positive(),
  internalPort: z.number().int().positive(),
  network: z.string().optional(),
});

export type CreateContainerInput = z.infer<typeof CreateContainerSchema>;

export async function createContainer(input: CreateContainerInput) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const validated = CreateContainerSchema.parse(input);

    // First create the database entry
    const dbContainer = await dbCreateContainer({
      id: "", // This will be updated after Docker container creation
      name: validated.name,
      type: validated.image,
      port: validated.port,
      status: "creating",
      envVars: validated.envVars,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: session.user.id
    });

    // Then create the Docker container
    const container = await dockerClient.createContainer(
      validated.name,
      validated.image,
      validated.envVars,
      validated.port,
      validated.internalPort,
    );

    // Start the container
    await container.start();
    
    // Get container info
    const containerInfo = await dockerClient.getContainerInfo(container.id);

    // Update the database entry with the container ID
    await prisma.databaseInstance.update({
      where: { id: dbContainer.id },
      data: {
        id: container.id,
        status: "running"
      }
    });

    revalidatePath("/dashboard/containers");
    return { 
      success: true, 
      containerId: container.id,
      accessUrl: containerInfo.accessUrl,
      ports: containerInfo.ports
    };
  } catch (error) {
    console.error("Container creation failed:", error);
    // If we have a database entry but container creation failed, clean up
    try {
      if (dbContainer?.id) {
        await prisma.databaseInstance.delete({
          where: { id: dbContainer.id }
        });
      }
    } catch {
      // Ignore deletion errors since we're already in an error state
      console.warn("Failed to clean up database entry after container creation failed");
    }
    throw new Error(
      error instanceof Error ? error.message : "Failed to create container"
    );
  }
}

export async function getContainers() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const containers = await dockerClient.listContainers();
    return { success: true, containers };
  } catch (error) {
    console.error("Failed to list containers:", error);
    throw new Error("Failed to list containers");
  }
}

// Update other existing actions to use containerInfo
export async function getContainerStatus(containerId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const containerInfo = await dockerClient.getContainerInfo(containerId);
    return { success: true, containerInfo };
  } catch (error) {
    console.error("Failed to get container status:", error);
    throw new Error("Failed to get container status");
  }
}

export async function stopContainer(containerId: string) {
  await dockerClient.stopContainer(containerId);
}

export async function removeContainer(containerId: string) {
  await dockerClient.removeContainer(containerId);

}
export async function startContainer(containerId: string) {
  await dockerClient.startContainer(containerId);
}

export async function getContainerLogs(containerId: string) {
  return await dockerClient.getContainerLogs(containerId);
}
