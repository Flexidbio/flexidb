'use client';
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AlertCircle, Archive, ArrowLeft, Cable, Database, FileText, Loader2, RotateCw, Settings, Trash, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getContainerById } from "@/lib/db/docker";
import { removeContainer, restartContainer } from "@/lib/docker/actions";
import { DatabaseSettingsTab } from "@/components/database/tabs/settings-tab";
import { DatabaseLogsTab } from "@/components/database/tabs/logs-tab";
import { DatabaseConnectionTab } from "@/components/database/tabs/connection-tab";
import { DatabaseBackupTab } from "@/components/database/tabs/backup-tab";
import { DatabaseUsersTab } from "@/components/database/tabs/users-tab";
import { DatabaseStatusBadge, getDatabaseEngine } from "@/components/database/database-ui";
import { Suspense, use, useState } from "react";
import Link from "next/link";

const tabClassName = "min-h-11 flex-1 gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm text-muted-foreground shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

function DatabaseDetailsSkeleton() {
  return (
    <div role="status" aria-label="Loading database details" className="mx-auto max-w-6xl space-y-6">
      <div aria-hidden="true" className="h-8 w-36 rounded bg-muted motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-9 w-2/3 max-w-md rounded bg-muted motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-24 rounded-xl border bg-card" />
      <div aria-hidden="true" className="h-12 rounded-lg bg-muted motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-64 rounded-xl border bg-card" />
      <span className="sr-only">Loading your database configuration.</span>
    </div>
  );
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

function DatabasePageContent({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingAction, setPendingAction] = useState<"restart" | "delete" | null>(null);

  const { data: database, isLoading, isError, refetch } = useQuery({
    queryKey: ["database", id],
    queryFn: () => getContainerById(id)
  });

  const handleDelete = async () => {
    if (!database?.container_id || pendingAction) return;
    setPendingAction("delete");
    try {
      await removeContainer(database.container_id);
      toast({
        title: "Success",
        description: "Database deleted successfully"
      });
      router.push("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete database"
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRestart = async () => {
    if (!database?.container_id || pendingAction) return;
    setPendingAction("restart");
    try {
      await restartContainer(database.container_id);
      await refetch();
      toast({
        title: "Success",
        description: "Database restarted successfully"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restart database"
      });
    } finally {
      setPendingAction(null);
    }
  };

  if (isLoading) {
    return <DatabaseDetailsSkeleton />;
  }

  if (!database) {
    return (
      <div role={isError ? "alert" : undefined} className="mx-auto flex max-w-2xl flex-col items-center rounded-xl border bg-card px-6 py-16 text-center">
        {isError ? <AlertCircle aria-hidden="true" className="h-9 w-9 text-destructive" /> : <Database aria-hidden="true" className="h-9 w-9 text-muted-foreground" />}
        <h1 className="mt-5 text-2xl font-semibold">{isError ? "Could not load this database" : "Database not found"}</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{isError ? "Try loading the instance again or return to your database list." : "This instance may have been removed. Return to your database list to choose another one."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline"><Link href="/dashboard"><ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />Back to databases</Link></Button>
          {isError && <Button onClick={() => refetch()}>Try again</Button>}
        </div>
      </div>
    );
  }

  const typeMeta = getDatabaseEngine(database.type);
  const TypeIcon = typeMeta.icon;
  const isRunning = database.status.toLowerCase() === "running";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {isError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3">
          <p className="text-sm">Could not refresh this instance. Showing the last loaded details.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
        </div>
      )}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 h-10 gap-2 text-muted-foreground">
          <Link href="/dashboard"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to databases</Link>
        </Button>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="min-w-0 break-all text-3xl font-semibold tracking-tight">{database.name}</h1>
              <DatabaseStatusBadge status={database.status} />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Manage connections, configuration, and activity for this instance.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-2"
              onClick={handleRestart}
              disabled={!isRunning || !database.container_id || pendingAction !== null}
            >
              {pendingAction === "restart" ? <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> : <RotateCw aria-hidden="true" className="h-4 w-4" />}
              {pendingAction === "restart" ? "Restarting…" : "Restart"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={pendingAction !== null || !database.container_id} className="h-10 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  {pendingAction === "delete" ? <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> : <Trash aria-hidden="true" className="h-4 w-4" />}
                  {pendingAction === "delete" ? "Deleting…" : "Delete"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="break-all">Delete {database.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    database and remove all data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-5 rounded-xl border bg-card px-5 py-4 sm:grid-cols-3 sm:px-6">
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-muted-foreground">Database engine</dt>
            <dd className="mt-1.5 flex items-center gap-2 text-sm font-medium"><TypeIcon aria-hidden="true" className={`h-4 w-4 ${typeMeta.color}`} />{typeMeta.label}</dd>
          </div>
          <div><dt className="text-xs text-muted-foreground">External port</dt><dd className="tabular mt-1.5 font-mono text-sm">{database.port}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Internal port</dt><dd className="tabular mt-1.5 font-mono text-sm">{database.internalPort ?? "—"}</dd></div>
        </dl>
      </div>

      <Tabs defaultValue="connection" className="min-w-0 space-y-5">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList aria-label="Database sections" className="h-auto w-max min-w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="connection" className={tabClassName}><Cable aria-hidden="true" className="h-4 w-4" />Connection</TabsTrigger>
            <TabsTrigger value="settings" className={tabClassName}><Settings aria-hidden="true" className="h-4 w-4" />Settings</TabsTrigger>
            <TabsTrigger value="logs" className={tabClassName}><FileText aria-hidden="true" className="h-4 w-4" />Logs</TabsTrigger>
            <TabsTrigger value="backups" className={tabClassName}><Archive aria-hidden="true" className="h-4 w-4" />Backups</TabsTrigger>
            <TabsTrigger value="users" className={tabClassName}><Users aria-hidden="true" className="h-4 w-4" />Users</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="connection">
          <DatabaseConnectionTab database={database} />
        </TabsContent>
        <TabsContent value="settings">
          <DatabaseSettingsTab database={database} />
        </TabsContent>
        <TabsContent value="logs">
          <DatabaseLogsTab containerId={database.container_id || ''} />
        </TabsContent>
        <TabsContent value="backups">
          <DatabaseBackupTab database={database} />
        </TabsContent>
        <TabsContent value="users">
          <DatabaseUsersTab database={database} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DatabasePage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <Suspense fallback={<DatabaseDetailsSkeleton />}>
      <DatabasePageContent id={id} />
    </Suspense>
  );
}
