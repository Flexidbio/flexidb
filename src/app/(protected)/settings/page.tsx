import { Metadata } from "next"
import { auth } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { EmailSettings } from "@/components/settings/email-settings"
import { SecuritySettings } from "@/components/settings/security-settings"
import { DomainSettings } from "@/components/settings/domain-settings"
export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings",
}

export default async function SettingsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/auth/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="domain">Domain</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="email" className="space-y-4">
          <EmailSettings />
        </TabsContent>
        <TabsContent value="security" className="space-y-4">
          <SecuritySettings />
        </TabsContent>
        <TabsContent value="domain" className="space-y-4">
          <DomainSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
