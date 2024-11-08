'use client';
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Save } from "lucide-react";
import { DatabaseInstance } from "@/lib/types";
import { toast } from "sonner";
import { updateContainer } from "@/lib/db/docker";
import { useRouter } from "next/navigation";
import { Prisma } from "@prisma/client";

interface DatabaseSettingsTabProps {
  database: DatabaseInstance;
}

export function DatabaseSettingsTab({ database }: DatabaseSettingsTabProps) {
  const router = useRouter();
  const [envVars, setEnvVars] = useState<Record<string, string>>(
    database.envVars as Record<string, string>
  );
  const [showSecrets, setShowSecrets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateContainer({
        ...database,
        envVars: envVars as Prisma.JsonValue
      });
      toast.success("Settings updated successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update settings");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const isPasswordField = (key: string) => {
    return key.toLowerCase().includes('password');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>
            Configure your database environment variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSecrets(!showSecrets)}
            >
              {showSecrets ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide Secrets
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Show Secrets
                </>
              )}
            </Button>
          </div>

          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <Label>{key}</Label>
              <Input
                type={showSecrets || !isPasswordField(key) ? "text" : "password"}
                value={value}
                onChange={(e) =>
                  setEnvVars((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            </div>
          ))}

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}