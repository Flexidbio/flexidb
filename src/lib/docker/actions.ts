"use server";

import { DockerClient } from "@/lib/docker/client";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createDatabaseAction } from "@/lib/actions/database";
import { prisma } from "@/lib/db/prisma";
import { CreateContainerInput } from "@/lib/types";

const dockerClient = DockerClient.getInstance();

export type { CreateContainerInput };

export async function createContainer(input: CreateContainerInput) {
  return createDatabaseAction(input);
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
  console.log(containerId)
  try {
    await dockerClient.stopContainer(containerId);
    await prisma.databaseInstance.update({
      where: { container_id: containerId },
      data: { status: "stopped" }
    });
    revalidatePath("/dashboard/containers");
    return { success: true };
  } catch (error) {
    console.log("Failed to stop container:", error);
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

export async function restartContainer(containerId: string) {
  try {
    await dockerClient.restartContainer(containerId);
    await prisma.databaseInstance.update({
      where: { container_id: containerId },
      data: { status: "running" }
    });
    revalidatePath("/dashboard/containers");
    return { success: true };
  } catch (error) {
    console.error("Failed to restart container:", error);
    throw new Error("Failed to restart container");
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