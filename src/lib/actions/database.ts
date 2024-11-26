'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"
import { CreateContainerInput } from "@/lib/types"
import { DockerClient } from "@/lib/docker/client"
import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

const dockerClient = DockerClient.getInstance()

export async function createDatabaseAction(input: CreateContainerInput) {
  const session = await auth()
  console.log(session)
  if (!session?.user?.id) {
    throw new Error("Unauthorized: User ID not found")
  }

  const containerId = randomUUID()
  const safeName = `${input.name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}-${containerId}`

  try {
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
        port: input.internalPort,
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

  return await prisma.databaseInstance.findMany({
    where: { userId: session.user.id }
  })
}

export async function deleteDatabaseAction(containerId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

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
