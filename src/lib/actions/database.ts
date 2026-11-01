'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { CreateContainerInput } from "@/lib/types"
import { DockerClient } from "@/lib/docker/client"
import { DATABASE_CONFIGS } from "@/lib/config/database.config"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/auth/permissions"

const dockerClient = DockerClient.getInstance()

async function initMongoReplicaSet(
  containerId: string,
  envVars: Record<string, string>
): Promise<void> {
  const isReady = await dockerClient.waitForContainerReady(containerId)
  if (!isReady) {
    console.error('MongoDB container not ready for replica set init')
    return
  }

  const username = envVars.MONGO_INITDB_ROOT_USERNAME
  const password = envVars.MONGO_INITDB_ROOT_PASSWORD

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const result = await dockerClient.execInContainer(
        containerId,
        [
          'mongosh',
          '-u', username,
          '-p', password,
          '--authenticationDatabase', 'admin',
          '--eval', 'rs.initiate({_id: "rs0", members: [{_id: 0, host: "localhost:27017"}]})'
        ]
      )

      if (result.exitCode === 0) {
        console.log('MongoDB replica set initialized successfully')
        return
      }
    } catch (error) {
      console.warn(`Replica set init attempt ${attempt + 1} failed:`, error)
    }
  }

  console.error('Failed to initialize MongoDB replica set after all attempts')
}

export async function createDatabaseAction(input: CreateContainerInput) {
  const session = await requirePermission("database:create")
  const userId = session.user.id

  const containerId = randomUUID()
  const safeName = `${input.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${containerId}`

  try {
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
        userId,
      }
    })

    const containerResponse = await dockerClient.createContainer(
      safeName,
      input.image,
      input.envVars,
      input.port,
      input.internalPort,
      input.network,
      input.cmd,
      input.resourceLimits
    )

    if (!containerResponse?.data) {
      throw new Error("Failed to create Docker container")
    }

    await dockerClient.startContainer(containerResponse.data.id)
    const containerInfo = await dockerClient.getContainerInfo(containerResponse.data.id)

    const dbType = input.image.split(":")[0]
    const dbConfig = Object.values(DATABASE_CONFIGS).find(c => c.image.split(":")[0] === dbType)

    if (dbConfig?.postStart === "replicaset") {
      initMongoReplicaSet(containerResponse.data.id, input.envVars).catch(err => {
        console.error('Background replica set init failed:', err)
      })
    }

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
  const session = await requirePermission("database:read")

  try {
    const databases = await prisma.databaseInstance.findMany({
      where: { 
        userId: session.user.id 
      },
    })

    return databases
  } catch (error) {
    console.error("Failed to fetch databases:", error)
    throw new Error("Failed to fetch databases")
  }
}

export async function deleteDatabaseAction(containerId: string) {
  await requirePermission("database:delete")

  try {
    await dockerClient.removeContainer(containerId)
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
