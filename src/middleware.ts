import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'

export async function middleware(request: NextRequest) {
  const session = await auth()
  
  // Public routes that don't need database check
  const publicRoutes = ['/auth/login', '/auth/signup', '/']
  if (publicRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  // For API routes, return error response if database is down
  if (request.nextUrl.pathname.startsWith('/api')) {
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/health`)
      return NextResponse.next()
    } catch (error) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      )
    }
  }

  // For protected routes, redirect to maintenance page if database is down
  if (!session?.user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  try {
    await fetch(`${process.env.NEXTAUTH_URL}/api/health`)
    return NextResponse.next()
  } catch (error) {
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}