'use client'

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { createDatabaseUser } from "@/lib/actions/database-users"
import { DatabaseInstance } from "@/lib/types"

interface DatabaseUsersTabProps {
  database: DatabaseInstance
}

export function DatabaseUsersTab({ database }: DatabaseUsersTabProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [dbName, setDbName] = useState("")

  const isSupported = ['postgres', 'mysql', 'mongo', 'mariadb'].includes(database.type)

  const { mutate: createUser, isPending } = useMutation({
    mutationFn: () => createDatabaseUser(database.id, username, password, dbName || undefined),
    onSuccess: () => {
      toast.success(`User "${username}" created successfully`)
      setUsername("")
      setPassword("")
      setDbName("")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create user")
    },
  })

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Database Users</CardTitle>
          <CardDescription>
            User management is not supported for {database.type} databases
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Database User</CardTitle>
        <CardDescription>
          Create additional users for your {database.type} database instance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="new_user"
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Secure password"
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dbName">Database (optional)</Label>
          <Input
            id="dbName"
            value={dbName}
            onChange={(e) => setDbName(e.target.value)}
            placeholder="Database to grant access to"
            disabled={isPending}
          />
        </div>

        <Button
          onClick={() => {
            if (!/^[a-zA-Z0-9_-]{1,63}$/.test(username)) {
              toast.error("Username must be 1-63 alphanumeric characters, underscores, or hyphens")
              return
            }
            createUser()
          }}
          disabled={isPending || !username || !password || database.status !== "running"}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating User...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
