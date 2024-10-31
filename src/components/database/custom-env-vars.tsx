'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CustomEnvVarsProps {
  envVars: EnvVarField[];
  onAddEnvVar: (key: string) => void;
  onRemoveEnvVar: (key: string) => void;
  onUpdateEnvVar: (key: string, value: string) => void;
  error?: string;
}

interface EnvVarField {
  key: string;
  value: string;
  required: boolean;
  type?: "text" | "password";
  custom?: boolean;
}

export function CustomEnvVars({
  envVars,
  onAddEnvVar,
  onRemoveEnvVar,
  onUpdateEnvVar,
  error
}: CustomEnvVarsProps) {
  const [newEnvKey, setNewEnvKey] = useState("");

  const handleAdd = () => {
    if (newEnvKey.trim()) {
      onAddEnvVar(newEnvKey.trim());
      setNewEnvKey("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {envVars.filter(v => v.custom).map((envVar) => (
          <div key={envVar.key} className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>{envVar.key}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveEnvVar(envVar.key)}
                className="h-6 text-red-500 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              type={envVar.type}
              value={envVar.value}
              onChange={(e) => onUpdateEnvVar(envVar.key, e.target.value)}
              placeholder={`Enter ${envVar.key}`}
            />
          </div>
        ))}
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-medium">Add Custom Variable</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={newEnvKey}
              onChange={(e) => setNewEnvKey(e.target.value.toUpperCase())}
              placeholder="CUSTOM_VAR_NAME"
              className={cn(error && "border-red-500")}
            />
            {error && (
              <span className="text-sm text-red-500">{error}</span>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}