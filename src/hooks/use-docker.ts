// hooks/use-docker.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateContainerInput } from '@/lib/docker/actions';
import * as dockerActions from '@/lib/docker/actions';
import { toast } from '@/hooks/use-toast';
import * as cmdActions from '@/lib/net/actions';

export function useCreateContainer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateContainerInput) => {
      return dockerActions.createContainer(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      toast({
        title: 'Success',
        description: 'Container created successfully',
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


export function useAvailablePorts(internalPort:number ){
  return useQuery({
    queryKey:['available-ports',internalPort],
    queryFn:()=> cmdActions.getAvailablePorts(internalPort),
    refetchInterval:1000
  })
}

