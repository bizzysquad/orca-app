import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ORCA Admin Console',
  description: 'Admin dashboard for ORCA Financial Command Center',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen transition-colors duration-200">
      {children}
    </div>
  )
}
