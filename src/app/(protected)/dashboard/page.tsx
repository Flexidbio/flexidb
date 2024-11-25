import { Suspense } from "react"
import { DatabaseList } from "@/components/database/database-list"
import { Loader2 } from "lucide-react"
import { auth } from "@/lib/auth/auth"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {session?.user?.name}</h1>
        <p className="text-muted-foreground">
          Manage your database instances
        </p>
      </div>
      
      <Suspense fallback={
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
        <DatabaseList />
      </Suspense>
    </div>
  )
}