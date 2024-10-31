import { prisma } from "@/lib/db/prisma";
import { DatabaseInstance } from "@prisma/client";
import { Prisma } from "@prisma/client";

export async function getContainers() {
  return await prisma.databaseInstance.findMany();
}

export async function getContainerById(id: string) {
  return await prisma.databaseInstance.findUnique({ where: { id } });
}

export async function createContainer(container: DatabaseInstance) {
  return await prisma.databaseInstance.create({ 
    data: {
      ...container,
      envVars: container.envVars as Prisma.InputJsonValue
    } 
  });
}

export async function updateContainer(container: DatabaseInstance) {
  return await prisma.databaseInstance.update({ 
    where: { id: container.id }, 
    data: {
      ...container,
      envVars: container.envVars as Prisma.InputJsonValue
    }
  });
}


export async function deleteContainer(id: string) {
  return await prisma.databaseInstance.delete({ where: { id } });
}

