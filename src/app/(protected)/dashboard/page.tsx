import { Suspense } from "react"
import { DatabaseList, DatabaseListSkeleton } from "@/components/database/database-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/db/prisma"

export default async function DashboardPage() {
  const session = await auth()

  const dbCount = await prisma.databaseInstance.count({
    where: { userId: session?.user?.id }
  })
  const runningCount = await prisma.databaseInstance.count({
    where: { userId: session?.user?.id, status: "running" }
  })
  const stoppedCount = await prisma.databaseInstance.count({
    where: { userId: session?.user?.id, status: "stopped" }
  })

  const stats = [
    { label: "Total instances", value: dbCount, dot: "bg-muted-foreground", tone: "text-foreground" },
    { label: "Live", value: runningCount, dot: "bg-success", tone: "text-success" },
    { label: "Stopped", value: stoppedCount, dot: "bg-muted-foreground/60", tone: "text-foreground" },
  ]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Databases</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Provision and manage your database instances.
          </p>
        </div>
        <Button asChild className="h-11 shrink-0 gap-2 self-start sm:self-auto">
          <Link href="/dashboard/database/create">
            <Plus aria-hidden="true" className="h-4 w-4" />
            New database
          </Link>
        </Button>
      </div>

      <dl aria-label="Database overview" className="grid grid-cols-3 divide-x rounded-xl border bg-card py-5 sm:py-6">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0 px-4 sm:px-6">
            <dt className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
              <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
              {s.label}
            </dt>
            <dd className={`tabular mt-2 text-3xl font-semibold tracking-tight ${s.tone}`}>
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <Suspense fallback={<DatabaseListSkeleton />}>
        <DatabaseList />
      </Suspense>
    </div>
  )
}
