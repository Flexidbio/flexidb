"use client"

import { useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSettings, updateEmailSettings } from "@/lib/actions/settings"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { JsonValue } from "@prisma/client/runtime/library"
import { Eye, EyeOff } from "lucide-react"
import { EmailProvider } from "@prisma/client"


interface SmtpConfig {
  host: string
  port: number
  username: string
  password: string
}

interface ResendConfig {
  apiKey: string
}

interface Settings {
  id: string
  createdAt: Date
  updatedAt: Date
  domain: string | null
  allowSignups: boolean
  smtpConfig: JsonValue
  resendConfig: JsonValue
  emailProvider: EmailProvider
  emailFrom: string
}

export function EmailSettings() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<{
    emailProvider: EmailProvider;
    emailFrom: string;
    smtpConfig: SmtpConfig;
    resendConfig: ResendConfig;
  }>({
    emailProvider: EmailProvider.SMTP,
    emailFrom: '',
    smtpConfig: {
      host: '',
      port: 587,
      username: '',
      password: '',
    },
    resendConfig: {
      apiKey: '',
    }
  })
  const [showApiKey, setShowApiKey] = useState(false)
  
  const { data: settings } = useQuery<Settings, Error, Settings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const result = await getSettings();
      if (!result) throw new Error('Settings not found');
      return result as Settings;
    },
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        emailProvider: settings.emailProvider ,
        emailFrom: settings.emailFrom || '',
        smtpConfig: settings.smtpConfig ? JSON.parse(JSON.stringify(settings.smtpConfig)) as SmtpConfig : {
          host: '',
          port: 587,
          username: '',
          password: '',
        },
        resendConfig: settings.resendConfig ? JSON.parse(JSON.stringify(settings.resendConfig)) as ResendConfig : {
          apiKey: '',
        },
      })
    }
  }, [settings])

  const handleInputChange = (path: string, value: string | number) => {
    setFormData(prev => {
      const newData = { ...prev }
      const keys = path.split('.')
      let current: any = newData
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: updateEmailSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success("Email settings updated")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const config = {
      emailProvider: formData.emailProvider,
      emailFrom: formData.emailFrom,
      smtpConfig: formData.emailProvider === EmailProvider.SMTP ? formData.smtpConfig : undefined,
      resendConfig: formData.emailProvider === EmailProvider.RESEND ? formData.resendConfig : undefined,
    }
    updateSettings(config)
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
              variant={formData.emailProvider === EmailProvider.SMTP ? 'default' : 'outline'}
              onClick={() => setFormData(prev => ({ ...prev, emailProvider: EmailProvider.SMTP }))}
            >
              SMTP
            </Button>
            <Button
              type="button"
              variant={formData.emailProvider === EmailProvider.RESEND ? 'default' : 'outline'}
              onClick={() => setFormData(prev => ({ ...prev, emailProvider: EmailProvider.RESEND }))}
            >
              Resend
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="emailFrom">From Address</Label>
          <Input
            className="max-w-xs"
            id="emailFrom"
            value={formData.emailFrom}
            onChange={(e) => handleInputChange('emailFrom', e.target.value)}
            placeholder="noreply@example.com"
            required
          />
        </div>

        {formData.emailProvider === EmailProvider.SMTP ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="host">SMTP Host</Label>
              <Input
                className="max-w-xs"
                id="host"
                value={formData.smtpConfig.host}
                onChange={(e) => handleInputChange('smtpConfig.host', e.target.value)}
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
                value={formData.smtpConfig.port}
                onChange={(e) => handleInputChange('smtpConfig.port', Number(e.target.value))}
                placeholder="587"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">SMTP Username</Label>
              <Input
                className="max-w-xs"
                id="username"
                value={formData.smtpConfig.username}
                onChange={(e) => handleInputChange('smtpConfig.username', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">SMTP Password</Label>
              <Input
                className="max-w-xs"
                id="password"
                type="password"
                value={formData.smtpConfig.password}
                onChange={(e) => handleInputChange('smtpConfig.password', e.target.value)}
                required
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="apiKey">Resend API Key</Label>
            <div className="flex max-w-xs">
              <Input
                className="rounded-r-none"
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={formData.resendConfig.apiKey}
                onChange={(e) => handleInputChange('resendConfig.apiKey', e.target.value)}
                required
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-l-none border-l-0"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  )
}
