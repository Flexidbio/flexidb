'use server';

import { prisma } from "@/lib/db/prisma";
import { DatabaseInstance } from "@/lib/types";
import { Prisma } from "@prisma/client";

export async function getContainers() {
  return await prisma.databaseInstance.findMany();
}

export async function getContainerById(id: string) {
  
  
  try {
    const database = await prisma.databaseInstance.findUnique({ 
      where: { 
        id: id
      } 
    });

    

    if (!database) {
      console.log("No database found with ID:", id);
      return null;
    }

    return database;
  } catch (error) {
    console.error("Error fetching database:", error);
    throw error;
  }
}

export async function createContainer(container: DatabaseInstance) {
  const { name, port, envVars, type, image, ...rest } = container;
  
  return await prisma.databaseInstance.create({ 
    data: {
      name,
      port,
      type,
      image,
      envVars: envVars as Prisma.InputJsonValue,
      ...rest
    } 
  });
}

export async function updateContainer(container: DatabaseInstance) {
  return await prisma.databaseInstance.update({ 
    where: { id: container.id }, 
    data: {
      name: container.name,
      type: container.type,
      image: container.image,
      port: container.port,
      status: container.status,
      container_id: container.container_id,
      internalPort: container.internalPort,
      envVars: container.envVars as Prisma.InputJsonValue,
      // userId is not updated as it shouldn't change
    }
  });
}

export async function deleteContainer(id: string) {
  return await prisma.databaseInstance.delete({ where: { id } });
}

