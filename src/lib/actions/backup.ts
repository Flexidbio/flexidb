'use server'

import { prisma } from "@/lib/db/prisma"
import { DockerClient } from "@/lib/docker/client"
import { requirePermission } from "@/lib/auth/permissions"
import { mkdir, writeFile, readFile, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

const dockerClient = DockerClient.getInstance()
const BACKUP_DIR = process.env.BACKUP_DIR || "/tmp/flexidb-backups"

async function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    await mkdir(BACKUP_DIR, { recursive: true })
  }
}

export async function createBackup(databaseId: string) {
  const session = await requirePermission("backup:create")

  const database = await prisma.databaseInstance.findFirst({
    where: { id: databaseId, userId: session.user.id }
  })

  if (!database || !database.container_id) {
    throw new Error("Database not found")
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `${database.name}-${database.type}-${timestamp}`

  const backup = await prisma.backup.create({
    data: {
      databaseId: database.id,
      filename,
      status: "pending",
      type: "manual",
    }
  })

  try {
    await ensureBackupDir()
    const envVars = database.envVars as Record<string, string>

    let cmd: string[] = []

    switch (database.type) {
      case 'postgres':
        cmd = [
          'pg_dump',
          '-U', envVars.POSTGRES_USER || 'postgres',
          '-h', 'localhost',
          '-p', database.internalPort.toString(),
          envVars.POSTGRES_DB || 'postgres',
        ]
        break
      case 'mysql':
        cmd = [
          'mysqldump',
          '-u', envVars.MYSQL_USER || 'root',
          `-p${envVars.MYSQL_ROOT_PASSWORD || ''}`,
          '-h', 'localhost',
          envVars.MYSQL_DATABASE || '',
        ]
        break
      case 'mongo':
        cmd = [
          'mongodump',
          '-u', envVars.MONGO_INITDB_ROOT_USERNAME,
          `-p${envVars.MONGO_INITDB_ROOT_PASSWORD}`,
          '--authenticationDatabase', 'admin',
          '-h', 'localhost',
          '--out', '/tmp/backup',
        ]
        break
      case 'mariadb':
        cmd = [
          'mysqldump',
          '-u', envVars.MYSQL_USER || 'root',
          `-p${envVars.MYSQL_ROOT_PASSWORD || ''}`,
          '-h', 'localhost',
          envVars.MYSQL_DATABASE || '',
        ]
        break
      default:
        throw new Error(`Backup not supported for database type: ${database.type}`)
    }

    const result = await dockerClient.execInContainer(database.container_id, cmd)

    if (result.exitCode !== 0) {
      throw new Error(`Backup command failed: ${result.output}`)
    }

    const finalFilename = database.type === 'mongo' ? `${filename}.tar.gz` : `${filename}.sql`
    const backupPath = join(BACKUP_DIR, finalFilename)

    await writeFile(backupPath, result.output)

    const stats = existsSync(backupPath) ? (await import('fs')).statSync(backupPath) : null

    await prisma.backup.update({
      where: { id: backup.id },
      data: {
        filename: finalFilename,
        size: stats?.size || Buffer.byteLength(result.output),
        status: "completed",
      }
    })

    return { success: true, backupId: backup.id }
  } catch (error) {
    await prisma.backup.update({
      where: { id: backup.id },
      data: { status: "failed" }
    })
    throw error
  }
}

export async function getBackups(databaseId: string) {
  const session = await requirePermission("backup:read")

  const database = await prisma.databaseInstance.findFirst({
    where: { id: databaseId, userId: session.user.id }
  })

  if (!database) {
    throw new Error("Database not found")
  }

  return prisma.backup.findMany({
    where: { databaseId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function deleteBackup(backupId: string) {
  const session = await requirePermission("backup:delete")

  const backup = await prisma.backup.findFirst({
    where: { id: backupId },
    include: { database: true }
  })

  if (!backup || backup.database.userId !== session.user.id) {
    throw new Error("Backup not found")
  }

  const backupPath = join(BACKUP_DIR, backup.filename)
  if (existsSync(backupPath)) {
    try {
      await unlink(backupPath)
    } catch {
      // file cleanup is best-effort
    }
  }

  await prisma.backup.delete({ where: { id: backupId } })
  return { success: true }
}

export async function getBackupFile(backupId: string): Promise<{ data: Buffer; filename: string } | null> {
  const session = await requirePermission("backup:read")

  const backup = await prisma.backup.findFirst({
    where: { id: backupId },
    include: { database: true }
  })

  if (!backup || backup.database.userId !== session.user.id) {
    return null
  }

  const backupPath = join(BACKUP_DIR, backup.filename)
  if (!existsSync(backupPath)) {
    return null
  }

  const data = await readFile(backupPath)
  return { data, filename: backup.filename }
}
