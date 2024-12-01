'use server'

import { MongoComposeService } from '@/lib/services/mongodb-compose.service'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function createMongoReplicaSet(
  instanceId: string,
  basePort: number
) {
  const service = MongoComposeService.getInstance()
  return service.createReplicaSet(instanceId, basePort)
}

export async function cleanupMongoReplicaSet(instanceId: string) {
  const service = MongoComposeService.getInstance()
  return service.cleanup(instanceId)
}

// Additional helper actions
export async function getMongoReplicaStatus(instanceId: string) {
  const service = MongoComposeService.getInstance()
  try {
    const composePath = path.join(
      process.cwd(),
      'data',
      'mongodb-compose',
      `${instanceId}-compose.yml`
    )
    const { stdout } = await execAsync(`docker compose -f ${composePath} ps --format json`)
    return JSON.parse(stdout)
  } catch (error) {
    console.error('Failed to get replica status:', error)
    throw error
  }
}