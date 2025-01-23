import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from './use-toast';

export function useUpdate() {
  const { data: updateInfo, isLoading } = useQuery({
    queryKey: ['update-check'],
    queryFn: async () => {
      const res = await fetch('/api/update');
      if (!res.ok) throw new Error('Failed to check for updates');
      return res.json();
    },
    refetchInterval: 1000 * 60 * 60, // Check every hour
  });

  const { mutate: performUpdate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/update', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to perform update');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Update Successful',
        description: 'The application will restart momentarily.',
      });
      // Reload the page after a short delay
      setTimeout(() => window.location.reload(), 5000);
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    updateInfo,
    isLoading,
    isPending,
    performUpdate,
  };
} 