import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userName = user?.user_metadata?.full_name
    || user?.user_metadata?.display_name
    || user?.email?.split('@')[0]
    || 'User'

  return (
    <AppShell userName={userName} notificationCount={2}>
      {children}
    </AppShell>
  )
}
