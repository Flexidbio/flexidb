'use server'

import { auth } from "@/auth"
import { execSync } from 'child_process'
import { readFileSync, appendFileSync } from 'fs'
import path from 'path'
import { VersionInfo } from "./types"

const GITHUB_API_URL = 'https://api.github.com/repos/Flexidbio/flexidb'
const LOG_FILE = path.join(process.env.INSTALL_DIR || '.', 'update.log')

function logUpdate(message: string) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  appendFileSync(LOG_FILE, logMessage)
}

function getCurrentVersion(): string {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    return packageJson.version
  } catch (error) {
    console.error('Error reading package.json:', error)
    return '0.0.0'
  }
}

async function fetchLatestRelease(): Promise<string> {
  const response = await fetch(`${GITHUB_API_URL}/releases/latest?include_prereleases=true`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      ...(process.env.GITHUB_TOKEN && {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`
      })
    },
    next: { revalidate: 0 } // Cache for 1 hour
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch latest release')
  }
  
  const data = await response.json()
  return data.tag_name.replace('v', '')
}

function compareVersions(v1: string, v2: string): number {
  const normalize = (v: string) => v.replace(/^v/, '')
  const v1Parts = normalize(v1).split('.').map(Number)
  const v2Parts = normalize(v2).split('.').map(Number)
  
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
    const latestVersion = await fetchLatestRelease()
    
    return {
      currentVersion,
      latestVersion,
      hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
      releaseUrl: `${GITHUB_API_URL}/releases/tag/v${latestVersion}`
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
    logUpdate('Starting application update...')

    // Create backup of database
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(process.env.INSTALL_DIR || '.', 'backups', `db-${timestamp}.sql`)
    execSync(`pg_dump -U ${process.env.POSTGRES_USER} -h db ${process.env.POSTGRES_DB} > ${backupPath}`)
    logUpdate('Database backup created successfully')

    // Pull latest changes
    execSync('git pull origin main')
    logUpdate('Pulled latest changes from repository')

    // Install dependencies
    execSync('bun install')
    logUpdate('Installed dependencies')

    // Run migrations
    execSync('bunx prisma migrate deploy')
    logUpdate('Database migrations completed')

    // Rebuild application
    execSync('bun run build')
    logUpdate('Application rebuilt successfully')

    logUpdate('Update completed successfully')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logUpdate(`Update failed: ${errorMessage}`)
    throw new Error('Failed to update application')
  }
}
