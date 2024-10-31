"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

type EmailProvider = 'smtp' | 'resend'

interface EmailConfig {
  provider: EmailProvider
  host?: string
  port?: number
  username?: string
  password?: string
  apiKey?: string
  from: string
}

export function EmailSettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<EmailProvider>('smtp')
  const [config, setConfig] = useState<EmailConfig>({
    provider: 'smtp',
    host: '',
    port: 587,
    username: '',
    password: '',
    apiKey: '',
    from: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailConfig: {
            ...config,
            provider,
            // Only include relevant fields based on provider
            ...(provider === 'smtp' 
              ? { apiKey: undefined } 
              : { host: undefined, port: undefined, username: undefined, password: undefined })
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save email settings')
      }

      toast({
        title: "Success",
        description: "Email settings saved successfully",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save email settings",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Email Settings</h2>
        <p className="text-muted-foreground">
          Configure your email provider settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Provider</Label>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={provider === 'smtp' ? 'default' : 'outline'}
              onClick={() => setProvider('smtp')}
            >
              SMTP
            </Button>
            <Button
              type="button"
              variant={provider === 'resend' ? 'default' : 'outline'}
              onClick={() => setProvider('resend')}
            >
              Resend
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="from">From Address</Label>
          <Input
            className="max-w-xs"
            id="from"
            value={config.from}
            onChange={(e) => setConfig({ ...config, from: e.target.value })}
            placeholder="noreply@example.com"
            required
          />
        </div>

        {provider === 'smtp' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host</Label>
              <Input
                className="max-w-xs"
                id="host"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                placeholder="smtp.example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">SMTP Port</Label>
              <Input
                className="max-w-xs"
                id="port"
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })}
                placeholder="587"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">SMTP Username</Label>
              <Input
                className="max-w-xs"
                id="username"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">SMTP Password</Label>
              <Input
                className="max-w-xs"
                id="password"
                type="password"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                required
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="apiKey">Resend API Key</Label>
            <Input
              className="max-w-xs"
              id="apiKey"
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              required
            />
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  )
}
