'use client'

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Trash2, Database } from "lucide-react"
import { toast } from "sonner"
import { createBackup, getBackups, deleteBackup } from "@/lib/actions/backup"
import { DatabaseInstance } from "@/lib/types"

interface DatabaseBackupTabProps {
  database: DatabaseInstance
}

export function DatabaseBackupTab({ database }: DatabaseBackupTabProps) {
  const queryClient = useQueryClient()

  const { data: backups, isLoading } = useQuery({
    queryKey: ["backups", database.id],
    queryFn: () => getBackups(database.id),
  })

  const { mutate: createNewBackup, isPending: isCreating } = useMutation({
    mutationFn: () => createBackup(database.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups", database.id] })
      toast.success("Backup created successfully")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create backup")
    },
  })

  const { mutate: removeBackup } = useMutation({
    mutationFn: deleteBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups", database.id] })
      toast.success("Backup deleted")
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete backup")
    },
  })

  const isBackupSupported = ['postgres', 'mysql', 'mongo', 'mariadb'].includes(database.type)

  if (!isBackupSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
          <CardDescription>
            Backups are not supported for {database.type} databases
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Backup & Restore</CardTitle>
              <CardDescription>
                Create and manage database backups
              </CardDescription>
            </div>
            <Button
              onClick={() => createNewBackup()}
              disabled={isCreating || database.status !== "running"}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Create Backup
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!backups || backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No backups yet. Create your first backup to protect your data.
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{backup.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(backup.createdAt).toLocaleString()}
                        {backup.size > 0 && ` · ${formatBytes(backup.size)}`}
                        {backup.type === 'scheduled' && ' · Scheduled'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      backup.status === 'completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : backup.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {backup.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={backup.status !== 'completed'}
                      onClick={() => window.open(`/api/backups/${backup.id}/download`, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBackup(backup.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
