'use server'

import { prisma } from "@/lib/db/prisma"
import { createServer } from 'net'

export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    
    const timeout = setTimeout(() => {
      server.close()
      resolve(false)
    }, 1000)
    
    server.once('error', () => {
      clearTimeout(timeout)
      server.close()
      resolve(false)
    })
    
    server.once('listening', () => {
      clearTimeout(timeout)
      server.close(() => {
        resolve(true)
      })
    })
    
    server.listen(port, '127.0.0.1')
  })
}

export async function getAvailablePorts(internalPort: number) {
  try {
    // Get all ports currently in use by databases
    const usedPorts = await prisma.databaseInstance.findMany({
      select: { port: true }
    })
    const usedPortSet = new Set(usedPorts.map(db => db.port))

    // Generate available ports starting from internalPort
    const availablePorts = []
    let port = internalPort
    const maxPort = 65535
    const maxAttempts = 20 // Try up to 20 ports

    while (availablePorts.length < 10 && port < maxPort && availablePorts.length < maxAttempts) {
      if (!usedPortSet.has(port)) {
        // Check if port is actually available
        const isAvailable = await isPortAvailable(port)
        if (isAvailable) {
          availablePorts.push(port)
        }
      }
      port++
    }

    if (availablePorts.length === 0) {
      throw new Error('No available ports found')
    }

    return availablePorts
  } catch (error) {
    console.error('Error checking port availability:', error)
    throw new Error('Failed to check port availability')
  }
}
