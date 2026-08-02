'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, CalendarDays, Users, MessageSquareText, Mail, BarChart3, Loader2 } from 'lucide-react'

interface StaffSession {
  role: 'owner' | 'event_admin' | 'door_staff' | 'readonly_staff'
  roleLabel: string
  displayName: string
}

const NAV = [
  { href: '/RSVP/admin', label: 'Events', icon: CalendarDays, minRole: 'readonly_staff' },
  { href: '/RSVP/admin/guests', label: 'Guests', icon: Users, minRole: 'readonly_staff' },
  { href: '/RSVP/admin/suggestions', label: 'Suggestions', icon: MessageSquareText, minRole: 'readonly_staff' },
  { href: '/RSVP/admin/emails', label: 'Emails', icon: Mail, minRole: 'event_admin' },
  { href: '/RSVP/admin/analytics', label: 'Analytics', icon: BarChart3, minRole: 'readonly_staff' },
] as const

const RANK: Record<string, number> = { readonly_staff: 0, door_staff: 1, event_admin: 2, owner: 3 }

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [staff, setStaff] = useState<StaffSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rsvp/staff/login')
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => setStaff(data))
      .catch(() => router.replace(`/RSVP/admin/login?next=${encodeURIComponent(pathname || '/RSVP/admin')}`))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = async () => {
    await fetch('/api/rsvp/staff/login', { method: 'DELETE' })
    router.replace('/RSVP/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    )
  }

  if (!staff) return null

  const rank = RANK[staff.role] ?? 0

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-surface-card/95 backdrop-blur border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/RSVP/admin" className="shrink-0">
              <div className="text-2xs font-bold tracking-[0.15em] text-gold uppercase leading-none">DJ Maskoff</div>
              <div className="text-sm font-extrabold text-text-primary leading-tight">Events Admin</div>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {NAV.filter(n => rank >= RANK[n.minRole]).map(n => {
                const Icon = n.icon
                const active = pathname === n.href || (n.href !== '/RSVP/admin' && pathname?.startsWith(n.href))
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      active ? 'bg-gold/10 text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                    }`}
                  >
                    <Icon size={14} /> {n.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-text-primary">{staff.displayName}</div>
              <div className="text-2xs text-gold">{staff.roleLabel}</div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-text-secondary hover:text-danger hover:bg-danger/10 transition"
            >
              <LogOut size={14} /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
        <nav className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          {NAV.filter(n => rank >= RANK[n.minRole]).map(n => {
            const Icon = n.icon
            const active = pathname === n.href || (n.href !== '/RSVP/admin' && pathname?.startsWith(n.href))
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-semibold whitespace-nowrap transition ${
                  active ? 'bg-gold/10 text-gold' : 'text-text-secondary'
                }`}
              >
                <Icon size={12} /> {n.label}
              </Link>
            )
          })}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}

export function useStaffRank(role: string | undefined) {
  return role ? RANK[role] ?? 0 : 0
}
