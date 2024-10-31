'use client';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatabaseCard } from "@/components/database/database-card";
import { CreateDatabaseDialog } from "@/components/database/create-database-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { DatabaseInstance } from "@/lib/types";

export function DatabaseList() {
  const [createOpen, setCreateOpen] = useState(false);

  const { data: databases, isLoading } = useQuery({
    queryKey: ["databases"],
    queryFn: async () => {
      const response = await fetch("/api/databases");
      if (!response.ok) throw new Error("Failed to fetch databases");
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Databases</h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Database
        </Button>
      </div>

      {databases?.length === 0 ? (
        <EmptyState
          title="No databases found"
          description="Create your first database to get started"
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Database
            </Button>
          }
        />
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {databases?.map((database: DatabaseInstance) => (
              <DatabaseCard
                key={database.id}
                database={database}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <CreateDatabaseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}