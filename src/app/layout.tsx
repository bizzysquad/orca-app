import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'

export const metadata: Metadata = {
  title: 'ORCA — Organize Resources Control Assets',
  description: 'Personal AI operating system powered by Bentley. Manage fitness, music, business, money, DJ gigs, groceries, and life — all in one command center.',
  icons: { icon: '/logo-sm.png' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ORCA',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#EAF3FF',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/logo-sm.png" />
      </head>
      <body className="min-h-screen antialiased overflow-x-hidden">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
