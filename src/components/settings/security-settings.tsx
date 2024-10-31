"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function SecuritySettings() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (data.newPassword !== data.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "New passwords do not match",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update password')
      }

      setData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
      
      toast({
        title: "Success",
        description: "Password updated successfully",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update password",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Security Settings</h2>
        <p className="text-muted-foreground">
          Update your password and security preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            className="max-w-xs"

            id="currentPassword"
            type="password"
            value={data.currentPassword}
            onChange={(e) => setData({ ...data, currentPassword: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            className="max-w-xs"
            id="newPassword"
            type="password"
            value={data.newPassword}
            onChange={(e) => setData({ ...data, newPassword: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            className="max-w-xs"
            id="confirmPassword"
            type="password"
            value={data.confirmPassword}
            onChange={(e) => setData({ ...data, confirmPassword: e.target.value })}
            required
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  )
}