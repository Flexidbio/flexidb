// src/components/version/version-check.tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getVersionInfo, updateApplication } from '@/lib/version/actions'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

export function VersionCheck() {
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)

  const { data: versionInfo, isLoading, error } = useQuery({
    queryKey: ['version'],
    queryFn: getVersionInfo,
    refetchInterval: 1000 * 60 * 60, // Check every hour
    retry: 2
  })

  const { mutate: updateApp, isPending: isUpdating } = useMutation({
    mutationFn: updateApplication,
    onSuccess: () => {
      toast.success('Application updated successfully. Restarting...')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update application')
    }
  })

  // Handle error state
  if (error) {
    return (
      <Button variant="outline" size="sm" disabled>
        Version check failed
      </Button>
    )
  }

  // Handle loading state
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking...</span>
      </Button>
    )
  }

  // If no version info available
  if (!versionInfo) {
    return (
      <Button variant="outline" size="sm" disabled>
        Unknown version
      </Button>
    )
  }

  // If no update available
  if (!versionInfo.hasUpdate) {
    return (
      <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
        v{versionInfo.currentVersion}
      </Button>
    )
  }

  // If update available
  return (
    <>
      <AlertDialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Update v{versionInfo.latestVersion}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Application?</AlertDialogTitle>
            <AlertDialogDescription>
              A new version (v{versionInfo.latestVersion}) is available. Your current version is v{versionInfo.currentVersion}.
              {versionInfo.releaseUrl && (
                <p className="mt-2">
                  <a 
                    href={versionInfo.releaseUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    View release notes
                  </a>
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsUpdateDialogOpen(false)
                updateApp()
              }}
              disabled={isUpdating}
              className="gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}