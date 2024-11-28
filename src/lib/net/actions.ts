'use server'

import { prisma } from "@/lib/db/prisma"
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function getAvailablePorts(internalPort: number) {
  try {
    // Get all ports currently in use by databases
    const usedPorts = await prisma.databaseInstance.findMany({
      select: { port: true }
    })
    const usedPortSet = new Set(usedPorts.map(db => db.port))

    // Check system ports in use
    const { stdout } = await execAsync('netstat -tln | grep LISTEN')
    const systemPorts = stdout.split('\n')
      .map(line => {
        const match = line.match(/:(\d+)/)
        return match ? parseInt(match[1]) : null
      })
      .filter((port): port is number => port !== null)

    // Combine all used ports
    const allUsedPorts = new Set([...usedPortSet, ...systemPorts])

    // Generate available ports (starting from 5432 for postgres, etc)
    const availablePorts = []
    let port = internalPort
    while (availablePorts.length < 10 && port < 65535) {
      if (!allUsedPorts.has(port)) {
        availablePorts.push(port)
      }
      port++
    }

    return availablePorts
  } catch (error) {
    console.error('Error checking port availability:', error)
    throw new Error('Failed to check port availability')
  }
}
