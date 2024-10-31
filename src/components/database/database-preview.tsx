
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle } from "lucide-react";

interface EnvVarField {
  key: string;
  value: string;
  required: boolean;
  type?: "text" | "password";
  custom?: boolean;
}

interface DatabasePreviewProps {
  name: string;
  type: string;
  envVars: EnvVarField[];
  showSecrets: boolean;
  onToggleSecrets: (show: boolean) => void;
}

export function DatabasePreview({
  name,
  type,
  envVars,
  showSecrets,
  onToggleSecrets
}: DatabasePreviewProps) {
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Basic Configuration</h3>
          <div className="rounded-lg border p-4 space-y-2">
            <div className="grid grid-cols-2">
              <span className="text-sm text-muted-foreground">Name:</span>
              <span className="text-sm font-medium">{name}</span>
            </div>
            <div className="grid grid-cols-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <span className="text-sm font-medium capitalize">{type}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Environment Variables</h3>
            <div className="flex items-center space-x-2">
              <Label htmlFor="show-secrets" className="text-sm">Show secrets</Label>
              <Switch
                id="show-secrets"
                checked={showSecrets}
                onCheckedChange={onToggleSecrets}
              />
            </div>
          </div>
          <div className="rounded-lg border divide-y">
            {envVars.map((envVar) => (
              <div key={envVar.key} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {envVar.key}
                    {envVar.required && (
                      <span className="text-xs text-red-500">Required</span>
                    )}
                    {envVar.custom && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        Custom
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {envVar.type === "password" && !showSecrets
                    ? "••••••••"
                    : envVar.value || "(empty)"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please review your configuration carefully. Once created, some settings cannot be changed.
          </AlertDescription>
        </Alert>
      </div>
    </ScrollArea>
  );
}