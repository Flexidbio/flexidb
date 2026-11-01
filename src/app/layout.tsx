import { Providers } from '@/components/providers/providers'
import { Inter, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import "./globals.css"

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
})
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${plexMono.variable} ${inter.className}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}