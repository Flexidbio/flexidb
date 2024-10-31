// hooks/use-traefik.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TraefikRouteInput, TraefikConfigInput } from '@/lib/traefik/actions';
import * as traefikActions from '@/lib/traefik/actions';
import { toast } from '@/hooks/use-toast';

export function useTraefikRoutes() {
  return useQuery({
    queryKey: ['traefik-routes'],
    queryFn: traefikActions.getTraefikRoutes,
  });
}

export function useCreateTraefikRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: TraefikRouteInput) => {
      return traefikActions.createTraefikRoute(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traefik-routes'] });
      toast({
        title: 'Success',
        description: 'Traefik route created successfully',
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

export function useUpdateTraefikConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: TraefikConfigInput) => {
      return traefikActions.updateTraefikConfig(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traefik-config'] });
      toast({
        title: 'Success',
        description: 'Traefik configuration updated successfully',
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

export function useDeleteTraefikRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (name: string) => {
      return traefikActions.deleteTraefikRoute(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traefik-routes'] });
      toast({
        title: 'Success',
        description: 'Traefik route deleted successfully',
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

export function useCurrentDomain() {
  return useQuery({
    queryKey: ['traefik-domain'],
    queryFn: async () => {
      const routes = await traefikActions.getTraefikRoutes();
      return routes.find(route => route.name === 'flexidb-app')?.domain || '';
    },
  });
}