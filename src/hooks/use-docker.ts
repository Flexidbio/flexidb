// hooks/use-docker.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateContainerInput } from '@/lib/docker/actions';
import * as dockerActions from '@/lib/docker/actions';
import { toast } from '@/hooks/use-toast';
import * as cmdActions from '@/lib/net/actions';
import { createDatabaseAction } from '@/lib/actions/database';

export function useCreateContainer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateContainerInput) => {
      return createDatabaseAction(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      toast({
        title: 'Success',
        description: 'Database created successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create database',
        variant: 'destructive',
      });
    },
  });
}

export function useContainerOperation(operation: 'start' | 'stop' | 'remove') {
  const queryClient = useQueryClient();
  const operationFn = {
    start: dockerActions.startContainer,
    stop: dockerActions.stopContainer,
    remove: dockerActions.removeContainer,
  }[operation];

  return useMutation({
    mutationFn: async (containerId: string) => {
      return operationFn(containerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      toast({
        title: 'Success',
        description: `Container ${operation}ed successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useContainerLogs(containerId: string, isLive: boolean = true) {
  return useQuery({
    queryKey: ['container-logs', containerId],
    queryFn: () => dockerActions.getContainerLogs(containerId),
    refetchInterval: isLive ? 5000 : false, // Refresh logs every 5 seconds if live mode is on
    refetchIntervalInBackground: false,
  });
}


export function useAvailablePorts(internalPort: number) {
  return useQuery({
    queryKey: ['available-ports', internalPort],
    queryFn: async () => {
      try {
        return await cmdActions.getAvailablePorts(internalPort);
      } catch (error) {
        console.error('Failed to fetch available ports:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch available ports. Please try again.',
          variant: 'destructive',
        });
        throw error;
      }
    },
    refetchInterval: 5000,
    retry: 2,
    staleTime: 2000,
    gcTime: 5000
  });
}

