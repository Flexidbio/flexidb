"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Database, Settings, LogOut, BarChart } from "lucide-react"
import { signOut } from "next-auth/react"
import { ThemeToggle } from "@/components/theme-toggle"
import { VersionDisplay } from "@/components/version-display"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultCollapsed?: boolean
  className?: string
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function Sidebar({ className, user }: SidebarProps) {
  const pathname = usePathname()

  const routes = [
    {
      label: "Databases",
      icon: Database,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "Settings",
      icon: Settings,
      href: "/settings",
      active: pathname === "/settings",
    },
    {
      label: "Stats",
      icon: BarChart,
      href: "/stats",
      active: pathname === "/stats",
    },
  ]

  const onLogout = () => {
    signOut({ callbackUrl: "/auth/login" })
  }

  return (
    <div className={cn("relative flex h-full flex-col", className)}>
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">FlexiDB</h2>
          <div className="space-y-1">
            {routes.map((route) => (
              <Link key={route.href} href={route.href}>
                <Button variant={route.active ? "secondary" : "ghost"} className="w-full justify-start">
                  <route.icon className="mr-2 h-4 w-4" />
                  {route.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="sticky bottom-0 border-t bg-background">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.image ?? ""} />
              <AvatarFallback>{user?.name?.charAt(0) ?? user?.email?.charAt(0) ?? "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 overflow-hidden">
              <p className="text-sm font-medium leading-none truncate">{user?.name ?? "User"}</p>
              {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <div className="text-xs text-muted-foreground">
                <VersionDisplay />
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
