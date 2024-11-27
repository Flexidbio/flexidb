'use client';

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatabaseCard } from "@/components/database/database-card";
import { CreateDatabaseDialog } from "@/components/database/create-database-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getDatabasesAction } from "@/lib/actions/database";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function DatabaseList() {
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  
  const { data: databases, isLoading, error } = useQuery({
    queryKey: ['databases'],
    queryFn: async () => {
      try {
        const result = await getDatabasesAction();
        return result;
      } catch (error) {
        toast.error("Failed to fetch databases");
        throw error;
      }
    },
    retry: 1
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

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">Failed to load databases</p>
        <Button 
          variant="outline" 
          onClick={() => router.refresh()}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Your Databases</h2>
        <Button onClick={() => router.push("/dashboard/database/create")}>
          <Plus className="mr-2 h-4 w-4" />
          New Database
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {databases?.map((database) => (
            <DatabaseCard
              key={database.id}
              database={database}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}