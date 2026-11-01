'use server'

import { requirePermission } from "@/lib/auth/permissions"
import { prisma } from "@/lib/db/prisma"
import { DockerClient } from "@/lib/docker/client"

const dockerClient = DockerClient.getInstance()

const VALID_IDENTIFIER = /^[a-zA-Z0-9_-]{1,63}$/

function validateIdentifier(value: string, label: string) {
  if (!VALID_IDENTIFIER.test(value)) {
    throw new Error(`Invalid ${label}: must be 1-63 alphanumeric characters, underscores, or hyphens`)
  }
}

function escapeSingleQuote(str: string): string {
  return str.replace(/'/g, "''")
}

function escapeDoubleQuote(str: string): string {
  return str.replace(/"/g, '""')
}

export async function createDatabaseUser(
  databaseId: string,
  username: string,
  password: string,
  database?: string
) {
  const session = await requirePermission("database:update")

  validateIdentifier(username, "username")

  const instance = await prisma.databaseInstance.findFirst({
    where: { id: databaseId, userId: session.user.id }
  })

  if (!instance || !instance.container_id) {
    throw new Error("Database not found")
  }

  const envVars = instance.envVars as Record<string, string>
  let cmd: string[] = []

  switch (instance.type) {
    case 'postgres':
      cmd = [
        'psql',
        '-U', envVars.POSTGRES_USER || 'postgres',
        '-c', `CREATE USER "${escapeDoubleQuote(username)}" WITH PASSWORD '${escapeSingleQuote(password)}';${database ? ` GRANT ALL PRIVILEGES ON DATABASE "${escapeDoubleQuote(database)}" TO "${escapeDoubleQuote(username)}";` : ''}`
      ]
      break
    case 'mysql':
    case 'mariadb':
      cmd = [
        'mysql',
        '-u', envVars.MYSQL_USER || 'root',
        `-p${envVars.MYSQL_ROOT_PASSWORD || ''}`,
        '-e', `CREATE USER '${escapeSingleQuote(username)}'@'%' IDENTIFIED BY '${escapeSingleQuote(password)}';${database ? ` GRANT ALL PRIVILEGES ON \`${database.replace(/`/g, '``')}\`.* TO '${escapeSingleQuote(username)}'@'%'; FLUSH PRIVILEGES;` : ''}`
      ]
      break
    case 'mongo': {
      const safeDbName = database ? escapeDoubleQuote(database) : 'admin'
      const safeUsername = escapeDoubleQuote(username)
      const safePassword = password.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      cmd = [
        'mongosh',
        '-u', envVars.MONGO_INITDB_ROOT_USERNAME,
        '-p', envVars.MONGO_INITDB_ROOT_PASSWORD,
        '--authenticationDatabase', 'admin',
        '--eval', `db = db.getSiblingDB("${safeDbName}"); db.createUser({user: "${safeUsername}", pwd: "${safePassword}", roles: [{role: "readWrite", db: "${safeDbName}"}]})`
      ]
      break
    }
    default:
      throw new Error(`User creation not supported for ${instance.type}`)
  }

  const result = await dockerClient.execInContainer(instance.container_id, cmd)

  if (result.exitCode !== 0) {
    throw new Error(`Failed to create user: ${result.output}`)
  }

  return { success: true }
}

export async function deleteDatabaseUser(
  databaseId: string,
  username: string
) {
  const session = await requirePermission("database:update")

  validateIdentifier(username, "username")

  const instance = await prisma.databaseInstance.findFirst({
    where: { id: databaseId, userId: session.user.id }
  })

  if (!instance || !instance.container_id) {
    throw new Error("Database not found")
  }

  const envVars = instance.envVars as Record<string, string>
  let cmd: string[] = []

  switch (instance.type) {
    case 'postgres':
      cmd = [
        'psql',
        '-U', envVars.POSTGRES_USER || 'postgres',
        '-c', `DROP USER IF EXISTS "${escapeDoubleQuote(username)}";`
      ]
      break
    case 'mysql':
    case 'mariadb':
      cmd = [
        'mysql',
        '-u', envVars.MYSQL_USER || 'root',
        `-p${envVars.MYSQL_ROOT_PASSWORD || ''}`,
        '-e', `DROP USER IF EXISTS '${escapeSingleQuote(username)}'@'%'; FLUSH PRIVILEGES;`
      ]
      break
    case 'mongo':
      cmd = [
        'mongosh',
        '-u', envVars.MONGO_INITDB_ROOT_USERNAME,
        '-p', envVars.MONGO_INITDB_ROOT_PASSWORD,
        '--authenticationDatabase', 'admin',
        '--eval', `db.dropUser("${escapeDoubleQuote(username)}")`
      ]
      break
    default:
      throw new Error(`User deletion not supported for ${instance.type}`)
  }

  const result = await dockerClient.execInContainer(instance.container_id, cmd)

  if (result.exitCode !== 0) {
    throw new Error(`Failed to delete user: ${result.output}`)
  }

  return { success: true }
}
