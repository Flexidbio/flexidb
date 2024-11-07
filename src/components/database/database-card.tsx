'use client';
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Play, Square, Trash } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { DatabaseInstance } from "@/lib/types";
import { removeContainer, startContainer, stopContainer } from "@/lib/docker/actions";

interface DatabaseCardProps {
  database: DatabaseInstance;
}

export function DatabaseCard({ database }: DatabaseCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  // Delete mutation
  const { mutate: deleteDatabase, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      await removeContainer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["databases"] });
      toast({
        title: "Database deleted",
        description: "Database has been deleted successfully",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete database",
      });
    },
  });

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
    const action = database.status === "running" ? 'stop' : 'start';
    toggleDatabase({ id: database.container_id, action });
  };

  const handleDelete = () => {
    deleteDatabase(database.container_id);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{database.name}</CardTitle>
              <CardDescription>
                External Port: {database.port} · Internal Port: {database.internalPort} · Type: {database.type}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DatabaseCard;