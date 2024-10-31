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

interface EnvVarField {
  key: string;
  value: string;
  required: boolean;
  type?: "text" | "password";
}

export default function CreateDatabasePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [type, setType] = useState<string>("")
  const [envVars, setEnvVars] = useState<EnvVarField[]>([])
  const [selectedPort, setSelectedPort] = useState<number | null>(null)

  const { mutate: createDatabase, isPending } = useCreateContainer()
  const { data: availablePorts, isLoading: isLoadingPorts } = useAvailablePorts(
    type ? DATABASE_CONFIGS[type as keyof typeof DATABASE_CONFIGS]?.internal_port || 0 : 0
  )

  const getEnvVarType = (key: string): "text" | "password" => {
    return key.toLowerCase().includes("password") ? "password" : "text"
  }

  const handleTypeChange = (newType: string) => {
    setType(newType)
    const config = DATABASE_CONFIGS[newType as keyof typeof DATABASE_CONFIGS]
    if (!config) return

    const newEnvVars: EnvVarField[] = [
      ...config.required_env_vars.map((key) => ({
        key,
        value: "",
        required: true,
        type: getEnvVarType(key),
      })),
      ...config.optional_env_vars.map((key) => ({
        key,
        value: "",
        required: false,
        type: getEnvVarType(key),
      })),
    ]
    setEnvVars(newEnvVars)
    setSelectedPort(null)
  }

  const handleSubmit = () => {
    const envVarsObject = envVars.reduce((acc, curr) => {
      if (curr.value) {
        acc[curr.key] = curr.value
      }
      return acc
    }, {} as Record<string, string>)

    createDatabase(
      { name, image: type, envVars: envVarsObject, port: selectedPort || 0 },
      { onSuccess: () => router.push("/dashboard") }
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create New Database</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Database Configuration</CardTitle>
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
                    <Input
                      id={envVar.key}
                      type={envVar.type}
                      value={envVar.value}
                      onChange={(e) => {
                        setEnvVars(envVars.map(v => 
                          v.key === envVar.key ? { ...v, value: e.target.value } : v
                        ))
                      }}
                      placeholder={`Enter ${envVar.key}`}
                      disabled={isPending}
                    />
                  </div>
                ))}
              </div>
            )}

            {type && (
              <div>
                <Label htmlFor="port">Port</Label>
                <Select
                  value={selectedPort?.toString()}
                  onValueChange={(value) => setSelectedPort(Number(value))}
                  disabled={isPending || isLoadingPorts}
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

            <Button 
              onClick={handleSubmit} 
              disabled={isPending || !name || !type}
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