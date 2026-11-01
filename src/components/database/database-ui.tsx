import { Box, Cylinder, Database, HardDrive, Loader2, Server, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatabaseEngineMeta {
  icon: LucideIcon
  label: string
  color: string
  category: string
}

const DATABASE_ENGINES: Record<string, DatabaseEngineMeta> = {
  postgres: { icon: Cylinder, label: "PostgreSQL", color: "text-blue-600 dark:text-blue-400", category: "Relational" },
  mysql: { icon: HardDrive, label: "MySQL", color: "text-orange-600 dark:text-orange-400", category: "Relational" },
  mongo: { icon: Database, label: "MongoDB", color: "text-green-600 dark:text-green-400", category: "Document" },
  redis: { icon: Server, label: "Redis", color: "text-red-600 dark:text-red-400", category: "Key-value" },
  mariadb: { icon: HardDrive, label: "MariaDB", color: "text-purple-600 dark:text-purple-400", category: "Relational" },
}

export function getDatabaseEngine(type: string): DatabaseEngineMeta {
  const key = type.toLowerCase()
  const normalized = key === "postgresql" ? "postgres" : key === "mongodb" ? "mongo" : key

  return DATABASE_ENGINES[normalized] || {
    icon: Box,
    label: type || "Database",
    color: "text-muted-foreground",
    category: "Database",
  }
}

const DATABASE_STATUSES: Record<string, { label: string; className: string; dotColor: string; isTransitioning: boolean }> = {
  running: { label: "Live", className: "border-success/20 bg-success/10 text-success", dotColor: "bg-success", isTransitioning: false },
  stopped: { label: "Stopped", className: "border-border bg-muted/60 text-muted-foreground", dotColor: "bg-muted-foreground", isTransitioning: false },
  exited: { label: "Stopped", className: "border-border bg-muted/60 text-muted-foreground", dotColor: "bg-muted-foreground", isTransitioning: false },
  creating: { label: "Provisioning", className: "border-warning/25 bg-warning/10 text-warning-foreground dark:text-warning", dotColor: "bg-warning", isTransitioning: true },
  starting: { label: "Starting", className: "border-warning/25 bg-warning/10 text-warning-foreground dark:text-warning", dotColor: "bg-warning", isTransitioning: true },
  restarting: { label: "Restarting", className: "border-warning/25 bg-warning/10 text-warning-foreground dark:text-warning", dotColor: "bg-warning", isTransitioning: true },
  stopping: { label: "Stopping", className: "border-warning/25 bg-warning/10 text-warning-foreground dark:text-warning", dotColor: "bg-warning", isTransitioning: true },
  error: { label: "Error", className: "border-destructive/20 bg-destructive/10 text-destructive", dotColor: "bg-destructive", isTransitioning: false },
  unhealthy: { label: "Unhealthy", className: "border-destructive/20 bg-destructive/10 text-destructive", dotColor: "bg-destructive", isTransitioning: false },
}

export function getDatabaseStatus(status: string) {
  return DATABASE_STATUSES[status.toLowerCase()] || {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown",
    className: "border-border bg-muted/60 text-muted-foreground",
    dotColor: "bg-muted-foreground",
    isTransitioning: false,
  }
}

export function DatabaseStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = getDatabaseStatus(status)

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", meta.className, className)}>
      {meta.isTransitioning ? (
        <Loader2 aria-hidden="true" className="h-3 w-3 motion-safe:animate-spin" />
      ) : (
        <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", meta.dotColor)} />
      )}
      {meta.label}
    </span>
  )
}
