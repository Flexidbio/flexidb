import { Providers } from '@/components/providers/providers'
import { Inter } from 'next/font/google'
import { checkDatabaseConnection } from '@/lib/actions/db'

const inter = Inter({ subsets: ['latin'] })

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Only check database in production and don't show error unless connection actually fails
  let dbError = false;
  
  if (process.env.NODE_ENV === 'production') {
    try {
      const { success } = await checkDatabaseConnection();
      dbError = !success;
    } catch (error) {
      console.error('Database connection check failed:', error);
      dbError = true;
    }
  }

  // Only show error page if database connection actually failed
  if (dbError) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Database Connection Error</h1>
              <p>Unable to connect to the database. Please try again later.</p>
            </div>
          </div>
        </body>
      </html>
    )
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}