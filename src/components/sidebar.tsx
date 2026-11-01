"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Database, Settings, LogOut, BarChart, Layers, Plus, ChevronDown } from "lucide-react"
import { signOut } from "next-auth/react"
import { ThemeToggle } from "@/components/theme-toggle"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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

  const navSections = [
    {
      label: "Overview",
      items: [
        {
          label: "Databases",
          icon: Database,
          href: "/dashboard",
          active: pathname === "/dashboard" || pathname.startsWith("/dashboard/database"),
        },
      ]
    },
    {
      label: "System",
      items: [
        {
          label: "Stats",
          icon: BarChart,
          href: "/stats",
          active: pathname === "/stats",
        },
        {
          label: "Settings",
          icon: Settings,
          href: "/settings",
          active: pathname === "/settings",
        },
      ]
    }
  ]

  const onLogout = () => {
    signOut({ callbackUrl: "/auth/login" })
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"

  return (
    <>
      <header className="shrink-0 border-b bg-card lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/dashboard" aria-label="FlexiDB databases" className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
            <Layers aria-hidden="true" className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold tracking-tight">FlexiDB</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-1.5 px-1.5" aria-label="Open account menu">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.image ?? ""} alt={user?.name ?? "Account"} />
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">{initial}</AvatarFallback>
                  </Avatar>
                  <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="mb-1 border-b px-2 py-3">
                  <p className="truncate text-sm font-medium">{user?.name || "Your account"}</p>
                  {user?.email && <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>}
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="gap-2">
                    <Settings aria-hidden="true" className="h-4 w-4" />
                    Account settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLogout} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav aria-label="Main navigation" className="grid grid-cols-3 gap-1 px-4 pb-3 sm:px-6">
          {navSections.flatMap(section => section.items).map(route => (
            <Link
              key={route.href}
              href={route.href}
              aria-current={route.active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                route.active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <route.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              {route.label}
            </Link>
          ))}
        </nav>
      </header>

      <aside aria-label="Workspace sidebar" className={cn("relative hidden h-full shrink-0 flex-col border-r bg-card lg:flex", className)}>
        <div className="flex h-20 shrink-0 items-center px-6">
          <Link href="/dashboard" aria-label="FlexiDB databases" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card">
            <Layers aria-hidden="true" className="h-6 w-6 text-primary" />
            <span className="font-display text-xl font-semibold tracking-tight">FlexiDB</span>
          </Link>
        </div>

        <div className="px-4 pb-6">
          <Button asChild variant="outline" className="h-11 w-full justify-start gap-2.5 bg-transparent">
            <Link href="/dashboard/database/create">
              <Plus aria-hidden="true" className="h-4 w-4" />
              New database
            </Link>
          </Button>
        </div>

        <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto pb-5">
          {navSections.map((section, i) => (
            <div key={section.label} className={cn("px-4", i > 0 && "mt-7")}>
              <p className="mb-2 px-3 text-xs font-medium text-muted-foreground">{section.label}</p>
              <div className="space-y-1">
                {section.items.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    aria-current={route.active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      route.active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <route.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {route.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t p-4">
          <div className="mb-3 flex items-center gap-3 px-2 py-2.5">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.image ?? ""} alt={user?.name ?? "Account"} />
              <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name || "Your account"}</p>
              {user?.email && <p className="mt-0.5 truncate text-xs text-muted-foreground" title={user.email}>{user.email}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="h-10 text-muted-foreground hover:text-destructive" onClick={onLogout}>
              <LogOut aria-hidden="true" className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
