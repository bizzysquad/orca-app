import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ORCA - Financial Command Center',
  description: 'Premium paycheck-based financial command center. Split income, manage bills, build savings, and boost your credit score.',
  icons: { icon: '/logo-sm.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-brand-black text-text-primary min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
