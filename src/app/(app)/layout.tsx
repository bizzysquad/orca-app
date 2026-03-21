import AppShell from '@/components/layout/AppShell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell userName="Alex Johnson" notificationCount={2}>
      {children}
    </AppShell>
  )
}
