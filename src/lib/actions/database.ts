'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { CreateContainerInput } from "@/lib/types"
import { DockerClient } from "@/lib/docker/client"
import { MongoDBService } from "@/lib/services/mongodb.service"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { MongoComposeService } from "@/lib/services/mongodb-compose.service"
import { cleanupMongoReplicaSet, createMongoReplicaSet } from "./mongo"

const dockerClient = DockerClient.getInstance()
const mongoService = MongoDBService.getInstance()
const mongoComposeService = MongoComposeService.getInstance()

// Helper function to check if a database type is MongoDB
function isMongoDB(image: string): boolean {
  return image.toLowerCase().includes('mongo')
}

// src/lib/actions/database.ts
export async function createDatabaseAction(input: CreateContainerInput) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized: User ID not found")
  }

  const containerId = randomUUID()
  
  try {
    // Handle MongoDB differently using compose
    if (isMongoDB(input.image)) {
      // Create replica set first
      const replicaSetInfo = await createMongoReplicaSet(
        containerId,
        input.port
      )

      // Only create database record after successful replica set creation
      const dbContainer = await prisma.databaseInstance.create({
        data: {
          id: containerId,
          name: input.name,
          type: "mongodb",
          image: input.image,
          port: input.port,
          internalPort: input.internalPort,
          status: "running",
          container_id: containerId,
          envVars: {
            ...input.envVars,
            MONGO_ROOT_USERNAME: replicaSetInfo.username,
            MONGO_ROOT_PASSWORD: replicaSetInfo.password,
            REPLICA_SET_NAME: 'rs0',
            PRIMARY_PORT: replicaSetInfo.primaryPort,
            SECONDARY_PORTS: replicaSetInfo.secondaryPorts
          },
          userId: session.user.id
        }
      })

      revalidatePath("/dashboard")
      return { success: true, container: dbContainer }
    }

    // For non-MongoDB databases
    const safeName = `${input.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${containerId}`
    
    // First create and start the container
    const containerResponse = await dockerClient.createContainer(
      safeName,
      input.image,
      input.envVars,
      input.port,
      input.internalPort,
      input.network
    )

    if (!containerResponse?.data) {
      throw new Error("Failed to create Docker container")
    }

    // Start container
    await dockerClient.startContainer(containerResponse.data.id)

    // Wait for container to be healthy
    const containerInfo = await dockerClient.getContainerInfo(containerResponse.data.id)
    if (containerInfo.state !== "running") {
      throw new Error("Container failed to start properly")
    }

    // Only create database record after container is successfully running
    const dbContainer = await prisma.databaseInstance.create({
      data: {
        id: containerId,
        name: input.name,
        type: input.image.split(":")[0],
        image: input.image,
        port: input.port,
        internalPort: input.internalPort,
        status: "running",
        container_id: containerResponse.data.id,
        envVars: input.envVars,
        userId: session.user.id
      }
    })

    revalidatePath("/dashboard")
    return { success: true, container: dbContainer }

  } catch (error) {
    console.error("Container creation failed:", error)
    
    // Cleanup containers if they were created but failed
    try {
      if (isMongoDB(input.image)) {
        await cleanupMongoReplicaSet(containerId)
      } else {
        const containers = await dockerClient.docker.listContainers({
          all: true,
          filters: { name: [containerId] }
        })
        
        for (const container of containers) {
          await dockerClient.removeContainer(container.Id, true)
        }
      }
    } catch (cleanupError) {
      console.error("Cleanup failed:", cleanupError)
    }

    throw error
  }
}

export async function getDatabasesAction() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    const databases = await prisma.databaseInstance.findMany({
      where: { 
        userId: session.user.id 
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    })

    // For MongoDB instances, enrich the data with replica set information
    const enrichedDatabases = await Promise.all(databases.map(async (db) => {
      if (isMongoDB(db.image)) {
        const envVars = db.envVars as Record<string, any>
        // Add replica set information if it exists
        if (envVars.REPLICA_MEMBERS) {
          return {
            ...db,
            replicaSet: {
              name: envVars.REPLICA_SET_NAME,
              members: JSON.parse(envVars.REPLICA_MEMBERS)
            }
          }
        }
      }
      return db
    }))

    return enrichedDatabases
  } catch (error) {
    console.error("Failed to fetch databases:", error)
    throw new Error("Failed to fetch databases")
  }
}

export async function deleteDatabaseAction(containerId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    const dbInstance = await prisma.databaseInstance.findFirst({
      where: { container_id: containerId }
    })

    if (!dbInstance) {
      throw new Error("Database instance not found")
    }

    // Use compose service for MongoDB cleanup
    if (isMongoDB(dbInstance.image)) {
      await mongoComposeService.cleanup(dbInstance.id)
    } else {
      // Standard cleanup for other databases
      await dockerClient.removeContainer(containerId)
    }

    // Remove database record
    await prisma.databaseInstance.delete({
      where: { container_id: containerId }
    })

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Failed to remove container:", error)
    throw error
  }
}
export async function getDatabaseConnectionString(databaseId: string): Promise<string> {
  const database = await prisma.databaseInstance.findUnique({
    where: { id: databaseId }
  })

  if (!database) {
    throw new Error("Database not found")
  }

  const envVars = database.envVars as Record<string, any>

  if (isMongoDB(database.image)) {
    const ports = envVars.SECONDARY_PORTS 
      ? `,${process.env.SERVER_IP}:${envVars.SECONDARY_PORTS.join(',')}`
      : ''
    
    return `mongodb://${envVars.MONGO_ROOT_USERNAME}:${envVars.MONGO_ROOT_PASSWORD}@${process.env.SERVER_IP}:${database.port}${ports}/admin?replicaSet=rs0&authSource=admin`
  }

  // Default connection string format for other databases
  return `${database.type}://${process.env.SERVER_IP}:${database.port}`
}