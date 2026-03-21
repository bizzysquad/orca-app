import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ORCA - Financial Command Center',
  description: 'Organize Resources Control Assets',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#09090b', minHeight: '100vh' }}>
      {children}
    </div>
  )
}
