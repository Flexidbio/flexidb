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

export function useContainerLogs(containerId: string) {
  return useQuery({
    queryKey: ['container-logs', containerId],
    queryFn: () => dockerActions.getContainerLogs(containerId),
    refetchInterval: 5000, // Refresh logs every 5 seconds
  });
}


export function useAvailablePorts(internalPort:number ){
  return useQuery({
    queryKey:['available-ports',internalPort],
    queryFn:()=> cmdActions.getAvailablePorts(internalPort),
    refetchInterval:1000
  })
}

export function useSshConnection() {
  return useMutation({
    mutationFn: async (credentials: {
      host: string;
      port: number;
      username: string;
      password: string;
    }) => {
      const response = await fetch("/api/ssh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to establish SSH connection");
      }

      return response.json();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to establish SSH connection",
      });
    },
  });
}
