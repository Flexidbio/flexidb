import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'

// Add cache for health check
let lastHealthCheck = 0;
let isHealthy = false;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

async function checkHealth() {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return isHealthy;
  }

  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/health`);
    isHealthy = response.ok;
    lastHealthCheck = now;
    return isHealthy;
  } catch (error) {
    isHealthy = false;
    lastHealthCheck = now;
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const session = await auth()
  
  // Public routes that don't need database check
  const publicRoutes = ['/auth/login', '/auth/signup', '/']
  if (publicRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Only check health for protected routes
  const healthy = await checkHealth()
  if (!healthy) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}