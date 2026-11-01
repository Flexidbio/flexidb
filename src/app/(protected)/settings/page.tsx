import { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { EmailSettings } from "@/components/settings/email-settings"
import { SecuritySettings } from "@/components/settings/security-settings"
import { DomainSettings } from "@/components/settings/domain-settings"
import { UserManagement } from "@/components/settings/user-management"
import { auth } from "@/auth"
import { Globe, Mail, Shield, User, Users } from "lucide-react"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings",
}

export default async function SettingsPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.isAdmin
  const tabClassName = "min-h-11 flex-1 gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm text-muted-foreground shadow-none transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="min-w-0 space-y-5">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList aria-label="Settings sections" className="h-auto w-max min-w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger value="profile" className={tabClassName}><User aria-hidden="true" className="h-4 w-4" />Profile</TabsTrigger>
            <TabsTrigger value="email" className={tabClassName}><Mail aria-hidden="true" className="h-4 w-4" />Email</TabsTrigger>
            <TabsTrigger value="security" className={tabClassName}><Shield aria-hidden="true" className="h-4 w-4" />Security</TabsTrigger>
            <TabsTrigger value="domain" className={tabClassName}><Globe aria-hidden="true" className="h-4 w-4" />Domain</TabsTrigger>
            {isAdmin && <TabsTrigger value="users" className={tabClassName}><Users aria-hidden="true" className="h-4 w-4" />Users</TabsTrigger>}
          </TabsList>
        </div>
        <TabsContent value="profile" className="max-w-3xl space-y-4">
          <ProfileSettings />
        </TabsContent>
        <TabsContent value="email" className="max-w-3xl space-y-4">
          <EmailSettings />
        </TabsContent>
        <TabsContent value="security" className="max-w-3xl space-y-4">
          <SecuritySettings />
        </TabsContent>
        <TabsContent value="domain" className="space-y-4">
          <DomainSettings session={session!} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
