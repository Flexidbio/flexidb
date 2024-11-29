'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { DATABASE_CONFIGS } from "@/lib/config/database.config"
import { useCreateContainer, useAvailablePorts } from "@/hooks/use-docker"
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"

interface EnvVarField {
  key: string;
  value: string;
  required: boolean;
  type?: "text" | "password";
}

const generateRandomString = (length: number = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((x) => chars[x % chars.length])
    .join('')
}

export default function CreateDatabasePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [type, setType] = useState<string>("")
  const [envVars, setEnvVars] = useState<EnvVarField[]>([])
  const [externalPort, setExternalPort] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [replicaSetConfig, setReplicaSetConfig] = useState({
    replicas: 3,
    name: "rs0",
    authDb: "admin"
  });


  const { mutate: createDatabase, isPending } = useCreateContainer()
  const { data: availablePorts, isLoading: isLoadingPorts } = useAvailablePorts(
    type ? DATABASE_CONFIGS[type as keyof typeof DATABASE_CONFIGS]?.internal_port || 0 : 0
  )

  const getEnvVarType = (key: string): "text" | "password" => {
    return key.toLowerCase().includes("password") ? "password" : "text"
  }

  const handleTypeChange = (newType: string) => {
    try {
      setError(null);
      setType(newType);
      setName(uniqueNamesGenerator({ 
        dictionaries: [adjectives, colors, animals],
        separator: '-',
        length: 3,
      }));

      const config = DATABASE_CONFIGS[newType as keyof typeof DATABASE_CONFIGS];
      if (!config) {
        throw new Error('Invalid database type selected');
      }

      // For MongoDB, add additional required environment variables
      if (newType === 'mongodb') {
        const newEnvVars: EnvVarField[] = [
          // Standard MongoDB env vars
          ...config.required_env_vars.map((key) => ({
            key,
            value: key.toLowerCase().includes('port') ? '' : generateRandomString(),
            required: true,
            type: getEnvVarType(key),
          })),
          // Additional replica set specific vars
          {
            key: "MONGO_INITDB_DATABASE",
            value: "admin",
            required: true,
            type: "text"
          },
          {
            key: "MONGO_REPLICA_SET_NAME",
            value: replicaSetConfig.name,
            required: true,
            type: "text"
          }
        ];
        setEnvVars(newEnvVars);
      } else {
        // Original env vars handling for other databases
        const newEnvVars: EnvVarField[] = [
          ...config.required_env_vars.map((key) => ({
            key,
            value: key.toLowerCase().includes('port') ? '' : generateRandomString(),
            required: true,
            type: getEnvVarType(key),
          })),
          ...config.optional_env_vars.map((key) => ({
            key,
            value: key.toLowerCase().includes('port') ? '' : generateRandomString(),
            required: false,
            type: getEnvVarType(key),
          })),
        ];
        setEnvVars(newEnvVars);
      }
      setExternalPort(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set database type';
      setError(message);
      toast.error(message);
    }
  };

  const handleSubmit = () => {
    try {
      setError(null)
      
      // Validation
      if (!name.trim()) {
        throw new Error('Database name is required')
      }
      if (!type) {
        throw new Error('Database type is required')
      }
      if (!externalPort) {
        throw new Error('Port selection is required')
      }

      // Validate required env vars
      const missingRequiredVars = envVars
        .filter(v => v.required && !v.value.trim())
        .map(v => v.key)

      if (missingRequiredVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingRequiredVars.join(', ')}`)
      }

      const envVarsObject = envVars.reduce((acc, curr) => {
        if (curr.value) {
          acc[curr.key] = curr.value;
        }
        return acc;
      }, {} as Record<string, string>);
      const dbConfig = DATABASE_CONFIGS[type];
      if (!dbConfig) throw new Error('Invalid database type');
       // Add replica set configuration for MongoDB
       if (type === 'mongodb') {
        envVarsObject.MONGO_REPLICA_SET_NAME = replicaSetConfig.name;
        envVarsObject.MONGO_REPLICAS = replicaSetConfig.replicas.toString();
        envVarsObject.MONGO_AUTH_DB = replicaSetConfig.authDb;
      }

      createDatabase(
        { 
          name, 
          image: dbConfig.image,
          envVars: envVarsObject, 
          port: externalPort,
          internalPort: dbConfig.internal_port,
          network: 'bridge'
        },
        { 
          onSuccess: () => {
            toast.success(type === 'mongodb' 
              ? 'MongoDB replica set created successfully' 
              : 'Database created successfully'
            );
            router.push("/dashboard");
          },
          onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to create database';
            setError(message);
            toast.error(message);
          }
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create database';
      setError(message);
      toast.error(message);
    }
  }

  const togglePasswordVisibility = (key: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div>      
      <h1 className="text-2xl font-bold mb-6">Create New Database</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Database Configuration</CardTitle>
          {error && (
            <div className="text-sm font-normal text-red-500 mt-1">
              Connection to docker failed. Please try again.
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-database"
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={type}
                onValueChange={handleTypeChange}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select database type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(DATABASE_CONFIGS).map((dbType) => (
                    <SelectItem key={dbType} value={dbType}>
                      {dbType.charAt(0).toUpperCase() + dbType.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {envVars.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Environment Variables</h3>
                {envVars.map((envVar) => (
                  <div key={envVar.key}>
                    <Label htmlFor={envVar.key}>
                      {envVar.key}
                      {envVar.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        id={envVar.key}
                        type={envVar.type === "password" && !visiblePasswords.has(envVar.key) ? "password" : "text"}
                        value={envVar.value}
                        onChange={(e) => {
                          setEnvVars(envVars.map(v => 
                            v.key === envVar.key ? { ...v, value: e.target.value } : v
                          ))
                        }}
                        placeholder={`Enter ${envVar.key}`}
                        disabled={isPending}
                      />
                      {envVar.type === "password" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => togglePasswordVisibility(envVar.key)}
                        >
                          {visiblePasswords.has(envVar.key) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {type && (
              <div>
                <Label htmlFor="port">External Port (For Connections)</Label>
                <Select
                  value={externalPort?.toString()}
                  onValueChange={(value) => setExternalPort(Number(value))}
                  disabled={isPending || isLoadingPorts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingPorts ? "Loading ports..." : "Select external port"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePorts?.map((port) => (
                      <SelectItem key={port} value={port.toString()}>
                        {port}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Internal port {DATABASE_CONFIGS[type].internal_port} will be mapped to your selected external port
                </p>
                {type === 'mongodb' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Replica Set Configuration</h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="replicas">Number of Replicas</Label>
                    <Select
                      value={replicaSetConfig.replicas.toString()}
                      onValueChange={(value) => setReplicaSetConfig(prev => ({
                        ...prev,
                        replicas: parseInt(value)
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select number of replicas" />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 5, 7].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} nodes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recommended minimum is 3 nodes for high availability
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="replicaSetName">Replica Set Name</Label>
                    <Input
                      id="replicaSetName"
                      value={replicaSetConfig.name}
                      onChange={(e) => setReplicaSetConfig(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      placeholder="rs0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="authDb">Authentication Database</Label>
                    <Input
                      id="authDb"
                      value={replicaSetConfig.authDb}
                      onChange={(e) => setReplicaSetConfig(prev => ({
                        ...prev,
                        authDb: e.target.value
                      }))}
                        placeholder="admin"
                      />
                    </div>
                  </div>
                </div>
                  
                )}
              </div>
            )}

            <Button 
              onClick={handleSubmit} 
              disabled={isPending || !name || !type || !externalPort}
              className="mt-4"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Database...
                </>
              ) : (
                'Create Database'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}