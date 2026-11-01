import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle, Check, Copy, Eye, EyeOff } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { DatabaseInstance } from "@/lib/types";
import { getDatabaseEngine } from "@/components/database/database-ui";
import { toast } from "sonner";
import { env } from '@/lib/env'

interface DatabaseConnectionTabProps {
  database: DatabaseInstance;
}

function getConnectionString(database: DatabaseInstance) {
  const envVars = (database.envVars ?? {}) as Record<string, string>;

  switch (database.type) {
    case 'postgres':
    case 'postgresql':
      if (!envVars.POSTGRES_USER || !envVars.POSTGRES_PASSWORD || !envVars.POSTGRES_DB) {
        throw new Error('Missing required PostgreSQL environment variables');
      }
      return `postgresql://${envVars.POSTGRES_USER}:${envVars.POSTGRES_PASSWORD}@${env.serverIp}:${database.port}/${envVars.POSTGRES_DB}`;

    case 'mysql':
      if (!envVars.MYSQL_USER || !envVars.MYSQL_PASSWORD || !envVars.MYSQL_DATABASE) {
        throw new Error('Missing required MySQL environment variables');
      }
      return `mysql://${envVars.MYSQL_USER}:${envVars.MYSQL_PASSWORD}@${env.serverIp}:${database.port}/${envVars.MYSQL_DATABASE}`;

    case 'mariadb':
      if (!envVars.MYSQL_USER || !envVars.MYSQL_PASSWORD || !envVars.MYSQL_DATABASE) {
        throw new Error('Missing required MariaDB environment variables');
      }
      return `mysql://${envVars.MYSQL_USER}:${envVars.MYSQL_PASSWORD}@${env.serverIp}:${database.port}/${envVars.MYSQL_DATABASE}`;

    case 'mongo':
    case 'mongodb': {
      if (!envVars.MONGO_INITDB_ROOT_USERNAME || !envVars.MONGO_INITDB_ROOT_PASSWORD) {
        throw new Error('Missing required MongoDB environment variables');
      }
      const dbName = envVars.MONGO_INITDB_DATABASE || '';
      return `mongodb://${envVars.MONGO_INITDB_ROOT_USERNAME}:${envVars.MONGO_INITDB_ROOT_PASSWORD}@${env.serverIp}:${database.port}${dbName ? `/${dbName}` : ''}?authSource=admin`;
    }

    case 'redis':
      if (!envVars.REDIS_PASSWORD) {
        throw new Error('Missing required Redis environment variables');
      }
      return `redis://:${envVars.REDIS_PASSWORD}@${env.serverIp}:${database.port}`;

    default:
      throw new Error(`Unsupported database type: ${database.type}`);
  }
}

function ConnectionField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  const id = useId();

  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} value={value} readOnly onFocus={event => event.currentTarget.select()} className="tabular h-12 bg-muted/40 pr-12 font-mono text-sm" />
        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-10 w-10 text-muted-foreground hover:text-foreground" onClick={onCopy} aria-label={`${copied ? "Copied" : "Copy"} ${label.toLowerCase()}`} title={`${copied ? "Copied" : "Copy"} ${label.toLowerCase()}`}>
          {copied ? <Check aria-hidden="true" className="h-4 w-4 text-success" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function DatabaseConnectionTab({ database }: DatabaseConnectionTabProps) {
  const [showCredentials, setShowCredentials] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionId = useId();

  useEffect(() => () => {
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
  }, []);

  const { connectionString, connectionError } = (() => {
    try {
      return { connectionString: getConnectionString(database), connectionError: null };
    } catch (error) {
      return { connectionString: null, connectionError: error instanceof Error ? error.message : "The connection string could not be generated" };
    }
  })();

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      setCopiedField(field);
      copyTimeout.current = setTimeout(() => setCopiedField(null), 2000);
      toast.success('Copied to clipboard');
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
      <Card className="rounded-xl shadow-none">
        <CardHeader className="p-5 pb-5 sm:p-6 sm:pb-5">
          <CardTitle className="text-lg">Connection details</CardTitle>
          <CardDescription>
            Use these details to connect to your {getDatabaseEngine(database.type).label} database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <ConnectionField label="Host" value={env.serverIp} copied={copiedField === "host"} onCopy={() => copyToClipboard(env.serverIp, "host")} />
            <ConnectionField label="Port" value={database.port.toString()} copied={copiedField === "port"} onCopy={() => copyToClipboard(database.port.toString(), "port")} />
          </div>

          {connectionError ? (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">Connection string unavailable</h3>
                <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{connectionError}. Review the environment variables in the Settings tab.</p>
              </div>
            </div>
          ) : connectionString && (
            <div className="space-y-3 border-t pt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={connectionId} className="text-sm font-semibold">Connection string</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCredentials(value => !value)} aria-pressed={showCredentials} className="h-10 gap-2 text-muted-foreground">
                  {showCredentials ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                  {showCredentials ? "Hide credentials" : "Show credentials"}
                </Button>
              </div>
              <div className="rounded-xl border bg-muted/40 p-4 sm:p-5">
                <code aria-labelledby={connectionId} className="block select-all break-all font-mono text-sm leading-7">
                  {showCredentials ? connectionString : connectionString.replace(/\/\/[\s\S]*@/, "//••••••@")}
                </code>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md text-xs leading-5 text-muted-foreground">Copy includes the full connection string, even when credentials are hidden.</p>
                <Button type="button" variant="outline" className="h-11 shrink-0 gap-2" onClick={() => copyToClipboard(connectionString, "connection string")}>
                  {copiedField === "connection string" ? <Check aria-hidden="true" className="h-4 w-4 text-success" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                  {copiedField === "connection string" ? "Copied" : "Copy connection string"}
                </Button>
              </div>
            </div>
          )}
          <p role="status" className="sr-only">{copiedField ? `Copied ${copiedField} to clipboard.` : ""}</p>
        </CardContent>
      </Card>
  );
}
