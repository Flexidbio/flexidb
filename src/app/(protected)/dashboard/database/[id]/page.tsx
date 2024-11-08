'use client';
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { getContainerById } from "@/lib/db/docker";
import { removeContainer } from "@/lib/docker/actions";
import { DatabaseSettingsTab } from "@/components/database/tabs/settings-tab";
import { DatabaseLogsTab } from "@/components/database/tabs/logs-tab";
import { DatabaseConnectionTab } from "@/components/database/tabs/connection-tab";
import { Suspense, use } from "react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

function DatabasePageContent({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const { data: database, isLoading } = useQuery({
    queryKey: ["database", id],
    queryFn: () => getContainerById(id)
  });

  const handleDelete = async () => {
    try {
      if (!database?.container_id) return;
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
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!database) {
    return <div>Database not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{database.name}</h1>
          <p className="text-muted-foreground">
            Type: {database.type} · Port: {database.port}
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash className="mr-2 h-4 w-4" />
              Delete Database
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                database and remove all data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="connection">
          <DatabaseConnectionTab database={database} />
        </TabsContent>
        <TabsContent value="settings">
          <DatabaseSettingsTab database={database} />
        </TabsContent>
        <TabsContent value="logs">
          <DatabaseLogsTab containerId={database.container_id || ''} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DatabasePage({ params }: PageProps) {
  const resolvedParams = use(params);
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <DatabasePageContent id={resolvedParams.id} />
    </Suspense>
  );
}
