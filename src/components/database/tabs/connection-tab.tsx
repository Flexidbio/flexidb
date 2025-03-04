import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { useState } from "react";
import { DatabaseInstance } from "@/lib/types";
import { toast } from "sonner";
import { env } from '@/lib/env'

interface DatabaseConnectionTabProps {
  database: DatabaseInstance;
}

export function DatabaseConnectionTab({ database }: DatabaseConnectionTabProps) {
  const [showCredentials, setShowCredentials] = useState(false);

  const getConnectionString = () => {
    const envVars = database.envVars as Record<string, string>;
    
    try {
      switch (database.type) {
        case 'postgres':
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
          if (!envVars.MONGO_INITDB_ROOT_USERNAME || !envVars.MONGO_INITDB_ROOT_PASSWORD) {
            throw new Error('Missing required MongoDB environment variables');
          }
          return `mongodb://${envVars.MONGO_INITDB_ROOT_USERNAME}:${envVars.MONGO_INITDB_ROOT_PASSWORD}@${env.serverIp}:${database.port}`;
        
        default:
          throw new Error(`Unsupported database type: ${database.type}`);
      }
    } catch (error) {
      console.error('Error generating connection string:', error);
      return 'Error generating connection string. Check console for details.';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      console.error("Error copying to clipboard:", err);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connection Details</CardTitle>
          <CardDescription>
            Use these details to connect to your {database.type} database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Host</Label>
            <div className="flex gap-2">
              <Input value={env.serverIp} readOnly />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(env.serverIp)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Port</Label>
            <div className="flex gap-2">
              <Input value={database.port} readOnly />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(database.port.toString())}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Connection String</Label>
            <div className="flex gap-2">
              <Input
                type={showCredentials ? "text" : "password"}
                value={getConnectionString()}
                readOnly
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(getConnectionString())}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowCredentials(!showCredentials)}
          >
            {showCredentials ? "Hide" : "Show"} Connection String
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}