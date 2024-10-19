"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Database, Settings, User, LogOut } from 'lucide-react'
import { useAuth } from './auth-provider'

export function Sidebar() {
  const pathname = usePathname()
  const { isAuthenticated, logout } = useAuth()

  if (!isAuthenticated) return null

  return (
    <aside className="w-64 bg-white shadow-md">
      <nav className="flex flex-col p-4">
        <Link href="/containers" className={`flex items-center p-2 ${pathname === '/containers' ? 'bg-gray-100' : ''}`}>
          <Database className="mr-2" />
          Containers
        </Link>
        <Link href="/settings" className={`flex items-center p-2 ${pathname === '/settings' ? 'bg-gray-100' : ''}`}>
          <Settings className="mr-2" />
          Settings
        </Link>
        <Link href="/profile" className={`flex items-center p-2 ${pathname === '/profile' ? 'bg-gray-100' : ''}`}>
          <User className="mr-2" />
          Profile
        </Link>
        <button onClick={logout} className="flex items-center p-2 text-red-500">
          <LogOut className="mr-2" />
          Logout
        </button>
      </nav>
    </aside>
  )
}