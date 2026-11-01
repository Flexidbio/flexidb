export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/db/prisma"
import { getContainerStats } from '@/lib/docker/stats'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const execAsync = promisify(exec)

async function checkDatabaseConnection(): Promise<{ status: string; latency: number }> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'healthy', latency: Date.now() - start }
  } catch {
    return { status: 'unhealthy', latency: Date.now() - start }
  }
}

async function getSystemMetrics() {
  try {
    const { stdout: memInfo } = await execAsync('free -b')
    const memLines = memInfo.split('\n')
    const memValues = memLines[1].split(/\s+/).filter(Boolean)

    const { stdout: dfOutput } = await execAsync('df -B1 /')
    const dfLines = dfOutput.split('\n')
    const dfValues = dfLines[1].split(/\s+/).filter(Boolean)

    return {
      uptime: os.uptime(),
      memory: {
        total: parseInt(memValues[1]),
        used: parseInt(memValues[2]),
        free: parseInt(memValues[3])
      },
      disk: {
        total: parseInt(dfValues[1]),
        used: parseInt(dfValues[2]),
        free: parseInt(dfValues[3])
      }
    }
  } catch {
    return null
  }
}

async function getHealthPayload() {
  const [dbStatus, systemMetrics, containerStats] = await Promise.all([
    checkDatabaseConnection(),
    getSystemMetrics(),
    getContainerStats()
  ])

  return {
    status: dbStatus.status === 'healthy' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    services: {
      database: {
        ...dbStatus,
        metrics: containerStats?.database || null
      },
      traefik: {
        status: containerStats?.traefik ? 'healthy' : 'unhealthy',
        metrics: containerStats?.traefik || null
      },
      app: {
        status: 'healthy',
        metrics: {
          memory: systemMetrics?.memory || { total: 0, used: 0, free: 0 },
          uptime: systemMetrics?.uptime || 0
        }
      }
    },
    system: systemMetrics || {
      uptime: 0,
      memory: { total: 0, used: 0, free: 0 },
      disk: { total: 0, used: 0, free: 0 }
    }
  }
}

export async function GET(request: Request) {
  const encoder = new TextEncoder()
  let intervalId: ReturnType<typeof setInterval> | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = async () => {
        try {
          const data = await getHealthPayload()
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        } catch (error) {
          console.error('SSE health check error:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Health check failed' })}\n\n`)
          )
        }
      }

      await sendEvent()
      intervalId = setInterval(sendEvent, 5000)

      timeoutId = setTimeout(() => {
        if (intervalId) clearInterval(intervalId)
        intervalId = null
        try {
          controller.close()
        } catch {
          // stream already closed
        }
      }, 300000)
    },
    cancel() {
      if (intervalId) clearInterval(intervalId)
      intervalId = null
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = null
    }
  })

  request.signal.addEventListener('abort', () => {
    if (intervalId) clearInterval(intervalId)
    intervalId = null
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = null
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
