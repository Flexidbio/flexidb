"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from '@/components/auth-provider'

const getSettings = async (token: string) => {
  const response = await fetch('/settings', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!response.ok) throw new Error('Failed to fetch settings')
  return response.json()
}

const updateSettings = async (token: string, data: { domain: string, resend_api_key: string }) => {
  const response = await fetch('/settings', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) throw new Error('Failed to update settings')
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({ domain: '', resend_api_key: '' })
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings()
    }
  }, [isAuthenticated])

  const fetchSettings = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      const data = await getSettings(token)
      setSettings(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await updateSettings(token, settings)
        toast({
          title: "Settings updated",
          description: "Your settings have been successfully updated.",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update settings. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  if (!isAuthenticated) return null

  return (
    <Card className="w-[600px] mx-auto">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Manage your FlexiDB instance settings</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="Enter your  domain"
                value={settings.domain}
                onChange={(e) => setSettings({ ...settings, domain: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="resend_api_key">Resend API Key</Label>
              <Input
                id="resend_api_key"
                placeholder="Enter your Resend API key"
                value={settings.resend_api_key}
                onChange={(e) => setSettings({ ...settings, resend_api_key: e.target.value })}
                required
              />
            </div>
          </div>
          <Button className="w-full mt-4" type="submit">Save Settings</Button>
        </form>
      </CardContent>
    </Card>
  )
}