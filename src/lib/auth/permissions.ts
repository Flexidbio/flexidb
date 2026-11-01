import { auth } from "@/auth"

export type Permission =
  | "database:create"
  | "database:read"
  | "database:update"
  | "database:delete"
  | "database:restart"
  | "backup:create"
  | "backup:read"
  | "backup:delete"
  | "user:manage"
  | "settings:manage"
  | "settings:view"

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    "database:create",
    "database:read",
    "database:update",
    "database:delete",
    "database:restart",
    "backup:create",
    "backup:read",
    "backup:delete",
    "user:manage",
    "settings:manage",
    "settings:view",
  ],
  OPERATOR: [
    "database:create",
    "database:read",
    "database:update",
    "database:delete",
    "database:restart",
    "backup:create",
    "backup:read",
    "backup:delete",
    "settings:view",
  ],
  VIEWER: [
    "database:read",
    "backup:read",
    "settings:view",
  ],
}

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.VIEWER
  return permissions.includes(permission)
}

export async function requirePermission(permission: Permission) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const role = session.user.isAdmin && session.user.role === 'VIEWER' ? "ADMIN" : (session.user.role || "VIEWER")

  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: insufficient permissions (${permission} required)`)
  }

  return session
}
