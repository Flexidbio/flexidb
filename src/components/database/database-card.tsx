'use client';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DatabaseInstance } from "@/lib/types";
import { startContainer, stopContainer } from "@/lib/docker/actions";
import { useRouter } from "next/navigation";

interface DatabaseCardProps {
  database: DatabaseInstance;
}

export function DatabaseCard({ database }: DatabaseCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return "bg-green-500";
      case "stopped":
        return "bg-red-500";
      case "starting":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  // Toggle mutation
  const { mutate: toggleDatabase, isPending: isToggling } = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'start' | 'stop' }) => {
      if (action === 'start') {
        await startContainer(id);
      } else {
        await stopContainer(id);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["databases"] });
      toast({
        title: "Success",
        description: `Database ${variables.action === 'stop' ? 'stopped' : 'started'} successfully`,
      });
    },
    onError: (error, variables) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${variables.action} database`,
      });
    },
  });

  const handleToggle = () => {
    if (!database.container_id) return;
    const action = database.status === "running" ? 'stop' : 'start';
    toggleDatabase({ id: database.container_id, action });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{database.name}</CardTitle>
            <CardDescription>
              External Port: {database.port} · Internal Port: {database.internalPort} · Type: {database.type}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/database/${database.id}`)}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${getStatusColor(database.status)}`} />
          <span className="text-sm capitalize">{database.status}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-3">
        <Button
          onClick={handleToggle}
          disabled={isToggling}
          className="w-full"
          variant={database.status === "running" ? "destructive" : "default"}
        >
          {database.status === "running" ? (
            <Square className="mr-2 h-4 w-4" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {database.status === "running" ? "Stop" : "Start"}
        </Button>
      </CardFooter>
    </Card>
  );
}