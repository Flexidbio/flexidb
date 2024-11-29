import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, ExternalLink, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DatabaseInstance } from "@/lib/types";
import { startContainer, stopContainer } from "@/lib/docker/actions";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DatabaseCardProps {
  database: DatabaseInstance;
}

export function DatabaseCard({ database }: DatabaseCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine if this is a MongoDB replica set
  const isMongoDB = database.type.toLowerCase().includes('mongo');
  const envVars = database.envVars as Record<string, any>;
  const isReplicaSet = isMongoDB && envVars.REPLICA_SET_NAME;
  const replicaMembers = isReplicaSet ? JSON.parse(envVars.REPLICA_MEMBERS) : [];

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

  // Enhanced toggle mutation for replica sets
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
        description: isReplicaSet 
          ? `Replica set ${variables.action === 'stop' ? 'stopped' : 'started'} successfully`
          : `Database ${variables.action === 'stop' ? 'stopped' : 'started'} successfully`,
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
            <CardTitle className="flex items-center gap-2">
              {database.name}
              {isReplicaSet && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs">
                      <Server className="w-3 h-3 mr-1" />
                      Replica Set
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>High-availability cluster with {replicaMembers.length} nodes</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </CardTitle>
            <CardDescription>
              {isReplicaSet ? (
                <div className="space-y-1">
                  <div>
                    Primary Port: {database.port} · Type: {database.type}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Replica Set: {envVars.REPLICA_SET_NAME}
                  </div>
                </div>
              ) : (
                <>
                  External Port: {database.port} · Internal Port: {database.internalPort} · Type: {database.type}
                </>
              )}
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
        <div className="flex flex-col gap-2">
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${getStatusColor(database.status)}`} />
            <span className="text-sm capitalize">{database.status}</span>
          </div>
          {isReplicaSet && database.status === "running" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {replicaMembers.map((member: any, index: number) => (
                <Tooltip key={member.node_name}>
                  <TooltipTrigger>
                    <Badge 
                      variant="outline" 
                      className={member.is_primary ? "border-primary" : ""}
                    >
                      {member.is_primary ? "Primary" : `Secondary ${index}`}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Port: {member.external_port}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
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
          {isReplicaSet 
            ? `${database.status === "running" ? "Stop" : "Start"} Replica Set`
            : database.status === "running" ? "Stop" : "Start"
          }
        </Button>
      </CardFooter>
    </Card>
  );
}