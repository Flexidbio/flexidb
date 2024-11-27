"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { DATABASE_CONFIGS } from "@/lib/config/database.config";
import { useAvailablePorts } from "@/hooks/use-docker";
import { toast } from "sonner";
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

interface CreateDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateDatabaseDialog({ open, onOpenChange }: CreateDatabaseDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [externalPort, setExternalPort] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: availablePorts, isLoading: isLoadingPorts } = useAvailablePorts(
    type ? DATABASE_CONFIGS[type as keyof typeof DATABASE_CONFIGS]?.internal_port || 0 : 0
  );

  const { mutate: createDatabase, isPending } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          port: externalPort,
        }),
      });
      if (!response.ok) throw new Error("Failed to create database");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["databases"] });
      toast.success("Database created successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create database");
    },
  });

  const resetForm = () => {
    setName("");
    setType("");
    setExternalPort(null);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setName(uniqueNamesGenerator({ 
      dictionaries: [adjectives, colors, animals],
      separator: '-',
      length: 3,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Database</DialogTitle>
          <DialogDescription>
            Deploy a new database instance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Database Type</Label>
            <Select value={type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select database type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATABASE_CONFIGS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.image}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Database name"
            />
          </div>

          {type && (
            <div className="space-y-2">
              <Label htmlFor="port">External Port</Label>
              <Select
                value={externalPort?.toString()}
                onValueChange={(value) => setExternalPort(Number(value))}
                disabled={isLoadingPorts}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingPorts ? "Loading ports..." : "Select port"} />
                </SelectTrigger>
                <SelectContent>
                  {availablePorts?.map((port) => (
                    <SelectItem key={port} value={port.toString()}>
                      {port}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => createDatabase()}
            disabled={isPending || !name || !type || !externalPort}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Database'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
