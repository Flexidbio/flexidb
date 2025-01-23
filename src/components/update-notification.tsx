"use client";

import { useUpdate } from '@/hooks/use-update';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Download, Loader2 } from 'lucide-react';

interface UpdateNotificationProps {
  latest: string;
  current: string;
  releaseUrl: string;
}

export function UpdateNotification({ latest, current, releaseUrl }: UpdateNotificationProps) {
  const { updateInfo, isLoading, isPending, performUpdate } = useUpdate();

  if (isLoading || !updateInfo?.hasUpdate) return null;

  return (
    <Alert className="mb-4">
      <Download className="h-4 w-4" />
      <AlertTitle>Update Available</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          Version {updateInfo.latestVersion} is available
          (current: {updateInfo.currentVersion})
        </span>
        <Button 
          onClick={() => performUpdate()}
          disabled={isPending}
          size="sm"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Now'
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
} 