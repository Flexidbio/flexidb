// app/api/docker/actions.ts
"use server";

import { DockerClient } from "@/lib/docker/client";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createContainer as dbCreateContainer } from "@/lib/db/docker";
import { DatabaseInstance, PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const dockerClient = DockerClient.getInstance();
const prisma = new PrismaClient();

const CreateContainerSchema = z.object({
  name: z.string().min(1),
  image: z.string().min(1),
  envVars: z.record(z.string()).default({}),
  port: z.number().int().positive(),
  internalPort: z.number().int().positive(),
  network: z.string().optional(),
});

export type CreateContainerInput = z.infer<typeof CreateContainerSchema>;

export async function createContainer(input: CreateContainerInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: User ID not found");
  }

  let dbContainer = null;

  try {
    const validated = CreateContainerSchema.parse(input);
    const containerId = randomUUID();
    const safeName = `${validated.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${containerId}`;

    // Create database entry with explicit userId
    dbContainer = await dbCreateContainer({
      id: containerId,
      name: validated.name,
      type: validated.image.split(":")[0],
      image: validated.image,
      port: validated.port,
      internalPort: validated.internalPort,
      status: "creating",
      container_id: containerId,
      envVars: validated.envVars || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: session.user.id  // Ensure this is passed
    } as DatabaseInstance)  // Type assertion to match DatabaseInstance

    if (!dbContainer) {
      throw new Error("Failed to create database entry");
    }

    // Create the Docker container with proper configuration
    const containerResponse = await dockerClient.createContainer(
      safeName,
      validated.image,
      validated.envVars || {},
      validated.port,
      validated.internalPort,
      validated.network
    );

    if (!containerResponse?.data) {
      throw new Error("Failed to create Docker container");
    }

    const container = containerResponse.data;

    // Start the container
    await dockerClient.startContainer(container.id);
    
    // Get container info including bound port
    const containerInfo = await dockerClient.getContainerInfo(container.id);

    // Update the database entry with the container info
    const updatedContainer = await prisma.databaseInstance.update({
      where: { id: dbContainer.id },
      data: {
        container_id: container.id,
        status: "running",
        port: parseInt(validated.internalPort.toString()),
      }
    });

    revalidatePath("/dashboard/containers");
    
    return { 
      success: true, 
      containerId: container.id,
      accessUrl: containerInfo.accessUrl,
      ports: containerInfo.ports,
      dbContainer: updatedContainer
    };

  } catch (error) {
    console.error("Container creation failed:", error);
    
    // Clean up database entry if it exists and container creation failed
    if (dbContainer?.id) {
      try {
        await prisma.databaseInstance.delete({
          where: { id: dbContainer.id }
        });
      } catch (cleanupError) {
        console.warn("Failed to clean up database entry:", cleanupError);
      }
    }

    if (error instanceof Error) {
      throw new Error(`Failed to create container`);
    }
    
    throw new Error("Failed to create container");
  }
}

// Update getContainers to include database information
export async function getContainers() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const dbContainers = await prisma.databaseInstance.findMany({
      where: { userId: session.user.id }
    });

    const containerInfoPromises = dbContainers.map(async (container) => {
      try {
        const dockerInfo = await dockerClient.getContainerInfo(container.container_id||"");
        return {
          ...container,
          dockerInfo
        };
      } catch (error) {
        console.warn(`Failed to get Docker info for container ${container.id}:`, error);
        return container;
      }
    });

    const containers = await Promise.all(containerInfoPromises);
    return { success: true, containers };
  } catch (error) {
    console.error("Failed to list containers:", error);
    throw new Error("Failed to list containers");
  }
}

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

// Keep other existing functions but add proper error handling
export async function stopContainer(containerId: string) {
 //? console.log(containerId)
  try {
    await dockerClient.stopContainer(containerId);
    await prisma.databaseInstance.update({
      where: { container_id: containerId },
      data: { status: "stopped" }
    });
    revalidatePath("/dashboard/containers");
    return { success: true };
  } catch (error) {
    //? console.log("Failed to stop container:", error);
    throw new Error("Failed to stop container");
  }
}

export async function removeContainer(containerId: string) {
  try {
    await dockerClient.removeContainer(containerId);
    await prisma.databaseInstance.delete({
      where: { container_id: containerId }
    });
    revalidatePath("/dashboard/");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove container:", error);
    throw new Error("Failed to remove container");
  }
}

export async function startContainer(containerId: string) {
  try {
    await dockerClient.startContainer(containerId);
    await prisma.databaseInstance.update({
      where: { container_id: containerId },
      data: { status: "running" }
    });
    revalidatePath("/dashboard/containers");
    return { success: true };
  } catch (error) {
    console.error("Failed to start container:", error);
    throw new Error("Failed to start container");
  }
}

export async function getContainerLogs(containerId: string) {
  try {
    const logs = await dockerClient.getContainerLogs(containerId);
    return { success: true, logs };
  } catch (error) {
    console.error("Failed to get container logs:", error);
    throw new Error("Failed to get container logs");
  }
}