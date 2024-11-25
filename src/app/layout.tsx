import { Providers } from "@/components/providers/providers"
import { cn } from "@/lib/utils"
import { Toaster } from "sonner"
import "./globals.css"
import { checkDatabaseConnection } from '@/lib/actions/db'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (process.env.NODE_ENV === 'production') {
    const { success, error } = await checkDatabaseConnection()
    if (!success) {
      console.error('Database connection failed:', error)
      return <div>Error connecting to database. Please try again later.</div>
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
        )}
      >
        <Providers>
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  )
}