'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react"
import { DATABASE_CONFIGS } from "@/lib/config/database.config"
import { getDatabaseEngine } from "@/components/database/database-ui"
import { useCreateContainer, useAvailablePorts } from "@/hooks/use-docker"
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"

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
  const [memoryLimit, setMemoryLimit] = useState<number | "">("")
  const [cpuLimit, setCpuLimit] = useState<number | "">("")
  const [resourcesOpen, setResourcesOpen] = useState(false)

  const { mutate: createDatabase, isPending } = useCreateContainer()
  const { data: availablePorts, isLoading: isLoadingPorts } = useAvailablePorts(
    type ? DATABASE_CONFIGS[type as keyof typeof DATABASE_CONFIGS]?.internal_port || 0 : 0
  )

  const getEnvVarType = (key: string): "text" | "password" => {
    return key.toLowerCase().includes("password") ? "password" : "text"
  }

  const handleTypeChange = (newType: string) => {
    try {
      setError(null)
      setType(newType)
      if (!name.trim()) {
        setName(uniqueNamesGenerator({
          dictionaries: [adjectives, colors, animals],
          separator: '-',
          length: 3,
        }))
      }
      setVisiblePasswords(new Set())

      const config = DATABASE_CONFIGS[newType as keyof typeof DATABASE_CONFIGS]
      if (!config) {
        throw new Error('Invalid database type selected')
      }

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
      ]
      setEnvVars(newEnvVars)
      setExternalPort(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set database type'
      setError(message)
      toast.error(message)
    }
  }

  const handleSubmit = () => {
    if (isPending) return
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

      if (memoryLimit !== "" && (!Number.isFinite(memoryLimit) || memoryLimit < 128)) {
        setResourcesOpen(true)
        throw new Error('Memory limit must be at least 128 MB')
      }
      if (cpuLimit !== "" && (!Number.isFinite(cpuLimit) || cpuLimit < 0.1)) {
        setResourcesOpen(true)
        throw new Error('CPU limit must be at least 0.1 cores')
      }

      const envVarsObject = envVars.reduce((acc, curr) => {
        if (curr.value) {
          acc[curr.key] = curr.value
        }
        return acc
      }, {} as Record<string, string>)

      const dbConfig = DATABASE_CONFIGS[type];
      if (!dbConfig) throw new Error('Invalid database type');

      const resourceLimits: { memoryMB?: number; cpuCount?: number } = {}
      if (memoryLimit && Number(memoryLimit) > 0) resourceLimits.memoryMB = Number(memoryLimit)
      if (cpuLimit && Number(cpuLimit) > 0) resourceLimits.cpuCount = Number(cpuLimit)

      createDatabase(
        { 
          name, 
          image: dbConfig.image,
          envVars: envVarsObject, 
          port: externalPort,
          internalPort: dbConfig.internal_port,
          network: 'bridge',
          cmd: dbConfig.cmd.length > 0 ? dbConfig.cmd : undefined,
          resourceLimits: Object.keys(resourceLimits).length > 0 ? resourceLimits : undefined,
        },
        { 
          onSuccess: () => {
            toast.success('Database created successfully')
            router.push("/dashboard")
          },
          onError: (error) => {
            const message = error instanceof Error ? error.message : 'Failed to create database'
            setError(message)
            toast.error(message)
          }
        }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create database'
      setError(message)
      toast.error(message)
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

  const selectedConfig = type ? DATABASE_CONFIGS[type] : null
  const selectedEngine = type ? getDatabaseEngine(type) : null
  const canCreate = Boolean(name.trim() && type && externalPort && !envVars.some(field => field.required && !field.value.trim()))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 h-10 gap-2 text-muted-foreground">
          <Link href="/dashboard"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to databases</Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">Create a database</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Pick an engine and we&apos;ll spin up a container and hand you a connection string.
        </p>
      </div>

      <form noValidate onSubmit={event => { event.preventDefault(); handleSubmit() }} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card className="rounded-xl shadow-none lg:col-span-2">
          <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
            <CardTitle className="text-lg">Database engine</CardTitle>
            <CardDescription>Choose the database you want to provision.</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
            <fieldset disabled={isPending}>
              <legend className="sr-only">Select a database engine</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {Object.keys(DATABASE_CONFIGS).map(dbType => {
                  const engine = getDatabaseEngine(dbType)
                  const EngineIcon = engine.icon

                  return (
                    <label key={dbType} className="cursor-pointer">
                      <input type="radio" name="database-engine" value={dbType} checked={type === dbType} onChange={() => handleTypeChange(dbType)} className="peer sr-only" />
                      <span className={cn(
                        "relative flex h-full min-h-28 flex-col gap-3 rounded-xl border bg-background/30 p-4 transition-colors hover:bg-accent/50 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-card peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                        type === dbType && "border-primary bg-primary/5 hover:bg-primary/10"
                      )}>
                        <EngineIcon aria-hidden="true" className={cn("h-6 w-6", engine.color)} />
                        {type === dbType && <CheckCircle2 aria-hidden="true" className="absolute right-3 top-3 h-4 w-4 text-primary" />}
                        <span>
                          <span className="block text-sm font-semibold">{engine.label}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{engine.category}</span>
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </CardContent>
        </Card>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 lg:col-span-2">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Database could not be created</p>
              <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        <div className="min-w-0 space-y-6">
          <Card className="rounded-xl shadow-none">
            <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
              <CardTitle className="text-lg">Configuration</CardTitle>
              <CardDescription>Set the instance name and connection port.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={event => setName(event.target.value)} placeholder={type ? "my-database" : "Choose an engine first"} disabled={isPending || !type} required autoComplete="off" spellCheck={false} aria-describedby="name-help" className="h-11" />
                <p id="name-help" className="text-xs leading-5 text-muted-foreground">A name is generated for you. Change it to something you recognize.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">External port</Label>
                <Select value={externalPort?.toString() ?? ""} onValueChange={value => setExternalPort(Number(value))} disabled={isPending || isLoadingPorts || !type}>
                  <SelectTrigger id="port" className="h-11" aria-describedby="port-help">
                    <SelectValue placeholder={!type ? "Choose an engine first" : isLoadingPorts ? "Loading available ports…" : "Select an available port"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePorts?.map(port => <SelectItem key={port} value={port.toString()}>{port}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p id="port-help" className="text-xs leading-5 text-muted-foreground">
                  {selectedConfig ? <>Internal port <span className="font-mono text-foreground">{selectedConfig.internal_port}</span> will be mapped to your selected external port.</> : "This is the port you will use to connect to your database."}
                </p>
                {type && !isLoadingPorts && availablePorts?.length === 0 && <p role="status" className="text-sm text-destructive">No available ports. Free a port on your server and try again.</p>}
              </div>

              {envVars.length > 0 && (
                <div className="space-y-4 border-t pt-6">
                  <div>
                    <h2 className="text-base font-semibold">Environment variables</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Values are generated for you. You can edit them before creating the database.</p>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {envVars.map(envVar => (
                      <div key={envVar.key} className="min-w-0 space-y-2">
                        <Label htmlFor={envVar.key} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="break-all font-mono text-xs">{envVar.key}</span>
                          <span className="text-xs font-normal text-muted-foreground">{envVar.required ? "Required" : "Optional"}</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id={envVar.key}
                            type={envVar.type === "password" && !visiblePasswords.has(envVar.key) ? "password" : "text"}
                            value={envVar.value}
                            onChange={event => setEnvVars(envVars.map(field => field.key === envVar.key ? { ...field, value: event.target.value } : field))}
                            placeholder={`Enter ${envVar.key}`}
                            disabled={isPending}
                            required={envVar.required}
                            autoComplete="off"
                            spellCheck={false}
                            className={cn("h-11 font-mono text-sm", envVar.type === "password" && "pr-12")}
                          />
                          {envVar.type === "password" && (
                            <Button type="button" variant="ghost" size="icon" disabled={isPending} className="absolute right-0.5 top-1/2 h-10 w-10 -translate-y-1/2 text-muted-foreground" onClick={() => togglePasswordVisibility(envVar.key)} aria-label={`${visiblePasswords.has(envVar.key) ? "Hide" : "Show"} ${envVar.key}`} aria-pressed={visiblePasswords.has(envVar.key)}>
                              {visiblePasswords.has(envVar.key) ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {type && (
            <details open={resourcesOpen} onToggle={event => setResourcesOpen(event.currentTarget.open)} className="group rounded-xl border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6 [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="block text-base font-semibold">Resource limits</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Optional memory and CPU limits</span>
                </span>
                <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="memory">Memory limit (MB)</Label>
                    <Input id="memory" type="number" min={128} placeholder="e.g. 512" value={memoryLimit} onChange={event => setMemoryLimit(event.target.value ? Number(event.target.value) : "")} disabled={isPending} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpu">CPU limit (cores)</Label>
                    <Input id="cpu" type="number" min={0.1} step={0.1} placeholder="e.g. 1.0" value={cpuLimit} onChange={event => setCpuLimit(event.target.value ? Number(event.target.value) : "")} disabled={isPending} className="h-11" />
                  </div>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">Leave empty for unlimited resources.</p>
              </div>
            </details>
          )}
        </div>

        <aside aria-label="Deployment summary" className="min-w-0 lg:sticky lg:top-0">
          <Card className="rounded-xl shadow-none">
            <CardHeader className="p-5 pb-4">
              <CardTitle className="text-lg">Deployment summary</CardTitle>
              <CardDescription>Review your instance before creating it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-5">
              <dl className="space-y-4 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">Engine</dt>
                  <dd className="text-right font-medium">{selectedEngine?.label || "Not selected"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="mt-1 break-all font-mono text-sm">{name.trim() || "Not set"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground">External port</dt>
                  <dd className="font-mono">{externalPort ?? "Not selected"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground">Memory</dt>
                  <dd className="font-mono">{memoryLimit ? `${memoryLimit} MB` : "Unlimited"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground">CPU</dt>
                  <dd className="font-mono">{cpuLimit ? `${cpuLimit} ${cpuLimit === 1 ? "core" : "cores"}` : "Unlimited"}</dd>
                </div>
                {selectedConfig && (
                  <div className="border-t pt-4">
                    <dt className="text-xs text-muted-foreground">Container image</dt>
                    <dd className="mt-1.5 break-all font-mono text-xs leading-5">{selectedConfig.image}</dd>
                  </div>
                )}
              </dl>
              {!type && <p className="rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">Choose an engine to generate your configuration.</p>}
            </CardContent>
            <CardFooter className="flex-col gap-2 border-t px-5 py-4">
              <Button type="submit" disabled={isPending || !canCreate} className="h-11 w-full gap-2">
                {isPending ? <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> : <ArrowRight aria-hidden="true" className="h-4 w-4" />}
                {isPending ? "Creating database…" : "Create database"}
              </Button>
              <Button asChild variant="ghost" className="h-10 w-full text-muted-foreground">
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </form>
    </div>
  )
}
