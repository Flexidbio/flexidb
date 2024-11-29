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

  const { data: versionInfo, isLoading } = useQuery({
    queryKey: ['version'],
    queryFn: getVersionInfo,
    refetchInterval: 1000 * 60 * 60, // Check every hour
  })

  const { mutate: updateApp, isPending: isUpdating } = useMutation({
    mutationFn: updateApplication,
    onSuccess: () => {
      toast.success('Application updated successfully. Restarting...')
      // The app will restart automatically due to Docker's restart policy
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update application')
    }
  })

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking...
      </Button>
    )
  }

  if (!versionInfo?.hasUpdate) {
    return (
      <Button variant="outline" size="sm" disabled>
        v{versionInfo?.currentVersion}
      </Button>
    )
  }

  return (
    <>
      <AlertDialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            Update to v{versionInfo.latestVersion}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Application?</AlertDialogTitle>
            <AlertDialogDescription>
              A new version (v{versionInfo.latestVersion}) is available. Your current version is v{versionInfo.currentVersion}.
              A database backup will be created before updating. The application will restart after the update.
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
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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