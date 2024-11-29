'use server'

import { auth } from "@/auth"
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { prisma } from '@/lib/db/prisma'
import { VersionInfo } from './types'

// Fetch version from Github API
async function fetchLatestVersion(): Promise<string> {
  const response = await fetch(
    'https://api.github.com/repos/Flexidbio/flexidb/releases/latest',
    { next: { revalidate: 3600 } } // Cache for 1 hour
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch latest version')
  }
  
  const data = await response.json()
  return data.tag_name.replace('v', '')
}

// Get current version from package.json
function getCurrentVersion(): string {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    return packageJson.version
  } catch (error) {
    console.error('Error reading package.json:', error)
    return '0.0.0'
  }
}

// Compare version strings
function compareVersions(v1: string, v2: string): number {
  const v1Parts = v1.split('.').map(Number)
  const v2Parts = v2.split('.').map(Number)
  
  for (let i = 0; i < 3; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1
    if (v1Parts[i] < v2Parts[i]) return -1
  }
  
  return 0
}

export async function getVersionInfo(): Promise<VersionInfo> {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized')
  }

  try {
    const currentVersion = getCurrentVersion()
    const latestVersion = await fetchLatestVersion()
    
    return {
      currentVersion,
      latestVersion,
      hasUpdate: compareVersions(latestVersion, currentVersion) > 0
    }
  } catch (error) {
    console.error('Error checking version:', error)
    throw new Error('Failed to check version information')
  }
}

export async function updateApplication(): Promise<void> {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized')
  }

  try {
    // Create backup of database
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `/app/backups/db-${timestamp}.sql`
    execSync(`pg_dump -U ${process.env.POSTGRES_USER} -h db ${process.env.POSTGRES_DB} > ${backupPath}`)

    // Pull latest changes
    execSync('git pull origin main')

    // Install dependencies
    execSync('bun install')

    // Run migrations
    execSync('bunx prisma migrate deploy')

    // Rebuild application
    execSync('bun run build')

    // Record update in database
    await prisma.systemUpdate.create({
      data: {
        version: getCurrentVersion(),
        timestamp: new Date(),
        status: 'success'
      }
    })

    // The application will need to be restarted by Docker
    // This will be handled by the container's restart policy
    
  } catch (error) {
    console.error('Update failed:', error)
    
    // Record failed update
    await prisma.systemUpdate.create({
      data: {
        version: getCurrentVersion(),
        timestamp: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
    
    throw new Error('Failed to update application')
  }
}
