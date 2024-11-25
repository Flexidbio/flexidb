import { Providers } from '@/components/providers/providers'

import { checkDatabaseConnection } from '@/lib/actions/db'
import { Toaster } from 'sonner'
import "./globals.css"
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (process.env.NODE_ENV === 'production') {
    const { success, error } = await checkDatabaseConnection()
    if (!success) {
      return (
        <html lang="en">
          <body >
            <div>Error connecting to database. Please try again later.</div>
          </body>
        </html>
      )
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}