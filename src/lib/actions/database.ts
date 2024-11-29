'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { CreateContainerInput } from "@/lib/types"
import { DockerClient } from "@/lib/docker/client"
import { MongoDBService } from "@/lib/services/mongodb.service"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

const dockerClient = DockerClient.getInstance()
const mongoService = MongoDBService.getInstance()

// Helper function to check if a database type is MongoDB
function isMongoDB(image: string): boolean {
  return image.toLowerCase().includes('mongo')
}

export async function createDatabaseAction(input: CreateContainerInput) {
  const session = await auth()
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized: User ID not found")
  }

  try {
    // Special handling for MongoDB instances
    if (isMongoDB(input.image)) {
      const mongoInstance = await mongoService.createMongoDBReplicaSet(
        input.name,
        session.user.id,
        input.envVars,
        input.port
      )
      
      revalidatePath("/dashboard/containers")
      return { success: true, container: mongoInstance }
    }

    // Standard database creation flow for non-MongoDB instances
    const containerId = randomUUID()
    const safeName = `${input.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${containerId}`

    // Create database entry
    const dbContainer = await prisma.databaseInstance.create({
      data: {
        id: containerId,
        name: input.name,
        type: input.image.split(":")[0],
        image: input.image,
        port: input.port,
        internalPort: input.internalPort,
        status: "creating",
        container_id: containerId,
        envVars: input.envVars,
        userId: session.user.id,
      }
    })

    // Create Docker container
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

    // Start container and update database
    await dockerClient.startContainer(containerResponse.data.id)
    const containerInfo = await dockerClient.getContainerInfo(containerResponse.data.id)

    const updatedContainer = await prisma.databaseInstance.update({
      where: { id: dbContainer.id },
      data: {
        container_id: containerResponse.data.id,
        status: "running",
        port: input.port,
        internalPort: input.internalPort
      }
    })

    revalidatePath("/dashboard/containers")
    return { success: true, container: updatedContainer }
  } catch (error) {
    console.error("Container creation failed:", error)
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
    // First, get the database instance to check its type
    const dbInstance = await prisma.databaseInstance.findFirst({
      where: { container_id: containerId }
    })

    if (!dbInstance) {
      throw new Error("Database instance not found")
    }

    // Special handling for MongoDB replica sets
    if (isMongoDB(dbInstance.image)) {
      await mongoService.removeReplicaSet(dbInstance.id)
    } else {
      // Standard cleanup for other databases
      await dockerClient.removeContainer(containerId)
      await prisma.databaseInstance.delete({
        where: { container_id: containerId }
      })
    }

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Failed to remove container:", error)
    throw error
  }
}

// New helper function to get connection string for a database
export async function getDatabaseConnectionString(databaseId: string): Promise<string> {
  const database = await prisma.databaseInstance.findUnique({
    where: { id: databaseId }
  })

  if (!database) {
    throw new Error("Database not found")
  }

  if (isMongoDB(database.image)) {
    const envVars = database.envVars as Record<string, any>
    if (envVars.REPLICA_MEMBERS) {
      return `mongodb://${envVars.MONGO_INITDB_ROOT_USERNAME}:${envVars.MONGO_INITDB_ROOT_PASSWORD}@localhost:${database.port}/${envVars.MONGO_INITDB_DATABASE || 'admin'}?replicaSet=${envVars.REPLICA_SET_NAME}&authSource=admin`
    }
  }

  // Default connection string format for other databases
  return `${database.type}://localhost:${database.port}`
}