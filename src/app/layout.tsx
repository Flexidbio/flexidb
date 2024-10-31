import { Providers } from "@/components/providers/providers"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
        
          <Providers>{children}</Providers>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}