'use client';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, ArrowUpRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DatabaseInstance } from "@/lib/types";
import { startContainer, stopContainer } from "@/lib/docker/actions";
import Link from "next/link";
import { DatabaseStatusBadge, getDatabaseEngine, getDatabaseStatus } from "@/components/database/database-ui";

interface DatabaseCardProps {
  database: DatabaseInstance;
}

export function DatabaseCard({ database }: DatabaseCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const typeMeta = getDatabaseEngine(database.type);
  const statusMeta = getDatabaseStatus(database.status);
  const TypeIcon = typeMeta.icon;
  const isRunning = database.status.toLowerCase() === "running";

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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!database.container_id) return;
    const action = isRunning ? 'stop' : 'start';
    toggleDatabase({ id: database.container_id, action });
  };

  return (
    <Card className="group flex min-w-0 flex-col overflow-hidden rounded-xl bg-card shadow-none transition-colors hover:border-primary/40">
      <Link href={`/dashboard/database/${database.id}`} className="block min-w-0 flex-1 rounded-t-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <CardHeader className="space-y-4 p-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <TypeIcon aria-hidden="true" className={`h-4 w-4 shrink-0 ${typeMeta.color}`} />
              <CardDescription className="truncate text-xs">
                {typeMeta.label}
              </CardDescription>
            </div>
            <DatabaseStatusBadge status={database.status} />
          </div>
          <CardTitle className="truncate text-lg font-semibold leading-6" title={database.name}>{database.name}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <dl className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 px-3 py-3">
            <div>
              <dt className="text-xs text-muted-foreground">External port</dt>
              <dd className="tabular mt-1 font-mono text-sm font-medium">{database.port}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Internal port</dt>
              <dd className="tabular mt-1 font-mono text-sm font-medium">{database.internalPort ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Link>
      <CardFooter className="justify-between gap-3 border-t bg-muted/20 px-5 py-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-10 gap-1.5 text-muted-foreground hover:text-foreground">
          <Link href={`/dashboard/database/${database.id}`} aria-label={`Manage ${database.name}`}>
            Manage
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button
          onClick={handleToggle}
          disabled={isToggling || !database.container_id || statusMeta.isTransitioning}
          aria-label={`${isRunning ? "Stop" : "Start"} ${database.name}`}
          className="h-10 min-w-24 gap-2"
          size="sm"
          variant={isRunning ? "outline" : "default"}
        >
          {isToggling ? (
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 motion-safe:animate-spin" />
          ) : isRunning ? (
            <Square aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Play aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {isToggling ? (isRunning ? "Stopping…" : "Starting…") : isRunning ? "Stop" : "Start"}
        </Button>
      </CardFooter>
    </Card>
  );
}
