import { Providers } from '@/components/providers/providers'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
import "./globals.css"
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}