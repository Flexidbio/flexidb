import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'healthy' })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    )
  }
}