'use client'

// RSVP staff admin shell (2026-11 redesign): ORCA look and accent, its own
// staff login and roles. Public RSVP/ticket pages keep the gold brand; inside
// the admin, the legacy gold utility classes are re-themed to the ORCA accent.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, CalendarDays, Users, MessageSquareText, Mail, BarChart3, Loader2, Settings, ScanLine, ExternalLink } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { OrcaMark } from '@/components/layout/OrcaMark'

interface StaffSession {
  role: 'owner' | 'event_admin' | 'door_staff' | 'readonly_staff'
  roleLabel: string
  displayName: string
}

const NAV = [
  { href: '/RSVP/admin', label: 'Events', icon: CalendarDays, minRole: 'readonly_staff' },
  { href: '/RSVP/admin/guests', label: 'Guests', icon: Users, minRole: 'readonly_staff' },
  { href: '/RSVP/scan', label: 'Perk scanner', icon: ScanLine, minRole: 'door_staff' },
  { href: '/RSVP/admin/suggestions', label: 'Suggestions', icon: MessageSquareText, minRole: 'readonly_staff' },
  { href: '/RSVP/admin/emails', label: 'Emails', icon: Mail, minRole: 'event_admin' },
  { href: '/RSVP/admin/analytics', label: 'Analytics', icon: BarChart3, minRole: 'readonly_staff' },
  { href: '/RSVP/admin/settings', label: 'Settings', icon: Settings, minRole: 'owner' },
] as const

const RANK: Record<string, number> = { readonly_staff: 0, door_staff: 1, event_admin: 2, owner: 3 }

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, isDark } = useTheme()
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

  // Legacy RSVP components use gold utility classes; map them to the ORCA accent here.
  const scoped = `
    .rsvp-admin { --gold-primary: ${theme.accent}; --gold-highlight: ${theme.accent}; --gold-deep: ${theme.accent}; background: ${theme.bg}; color: ${theme.text}; }
    .rsvp-admin .bg-gold-gradient { background: ${theme.accent} !important; color: ${theme.bg} !important; }
    .rsvp-admin .text-brand-black { color: ${theme.bg} !important; }
    .rsvp-admin .hover\\:shadow-gold:hover, .rsvp-admin .shadow-gold { box-shadow: none !important; }
    .rsvp-admin .text-gold { color: ${theme.accent} !important; }
    .rsvp-admin .border-gold { border-color: ${theme.accent} !important; }
    .rsvp-admin .bg-gold\\/10, .rsvp-admin .bg-gold\\/15, .rsvp-admin .bg-gold-liquid\\/10 { background-color: ${theme.accent}1f !important; }
    .rsvp-admin .bg-surface-card { background-color: ${theme.card} !important; }
    .rsvp-admin .bg-surface-elevated { background-color: ${theme.surface} !important; }
    .rsvp-admin .bg-brand-soft { background-color: ${theme.input} !important; }
    .rsvp-admin .border-surface-border { border-color: ${theme.border} !important; }
    .rsvp-admin .text-text-primary { color: ${theme.text} !important; }
    .rsvp-admin .text-text-secondary, .rsvp-admin .text-text-muted { color: ${theme.subtext} !important; }
    .rsvp-admin .rounded-2xl { border-radius: 16px; }
    .rsvp-admin input, .rsvp-admin select, .rsvp-admin textarea { color-scheme: ${isDark ? 'dark' : 'light'}; }
  `

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <Loader2 className="animate-spin" size={24} style={{ color: theme.subtext }} />
      </div>
    )
  }
  if (!staff) return null

  const rank = RANK[staff.role] ?? 0
  const items = NAV.filter(n => rank >= RANK[n.minRole])
  const isActive = (href: string) => pathname === href || (href !== '/RSVP/admin' && pathname?.startsWith(href)) || (href === '/RSVP/admin' && pathname?.startsWith('/RSVP/admin/events'))

  return (
    <div className="rsvp-admin min-h-screen" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <style>{scoped}</style>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 w-[232px] z-30" style={{ backgroundColor: theme.nav, borderRight: `1px solid ${theme.border}` }}>
        <Link href="/RSVP/admin" className="flex items-center gap-2.5 h-14 px-4 shrink-0">
          <OrcaMark />
          <div className="leading-tight">
            <p className="text-[14px] font-semibold" style={{ color: theme.text }}>RSVP admin</p>
            <p className="text-[11px]" style={{ color: theme.subtext }}>DJ Maskoff events</p>
          </div>
        </Link>
        <nav className="flex-1 px-3 py-3 space-y-px" aria-label="RSVP admin">
          {items.map(n => {
            const active = isActive(n.href)
            const Icon = n.icon
            return (
              <Link key={n.href} href={n.href} aria-current={active ? 'page' : undefined}
                className="flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13.5px] transition-colors"
                style={{ backgroundColor: active ? `${theme.text}0d` : undefined, color: active ? theme.text : theme.subtext, fontWeight: active ? 600 : 500 }}>
                <Icon size={17} strokeWidth={active ? 2 : 1.75} style={{ color: active ? theme.accent : undefined }} /> {n.label}
              </Link>
            )
          })}
          <a href="/RSVP" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13.5px]" style={{ color: theme.subtext }}>
            <ExternalLink size={17} strokeWidth={1.75} /> Public site
          </a>
        </nav>
        <div className="px-3 py-3" style={{ borderTop: `1px solid ${theme.border}` }}>
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold" style={{ backgroundColor: `${theme.accent}22`, color: theme.accent }}>{staff.displayName.charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate" style={{ color: theme.text }}>{staff.displayName}</p>
              <p className="text-[11px]" style={{ color: theme.subtext }}>{staff.roleLabel}</p>
            </div>
            <button onClick={logout} title="Sign out" aria-label="Sign out" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: theme.subtext }}><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="lg:hidden sticky top-0 z-40" style={{ backgroundColor: `${theme.bg}f2`, backdropFilter: 'blur(16px)', borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/RSVP/admin" className="flex items-center gap-2"><OrcaMark size={24} /><span className="text-[14px] font-semibold" style={{ color: theme.text }}>RSVP admin</span></Link>
          <div className="flex items-center gap-1">
            <span className="text-[12px] mr-1" style={{ color: theme.subtext }}>{staff.displayName}</span>
            <button onClick={logout} aria-label="Sign out" className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: theme.subtext }}><LogOut size={16} /></button>
          </div>
        </div>
        <nav className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar" aria-label="RSVP admin">
          {items.map(n => {
            const active = isActive(n.href)
            const Icon = n.icon
            return (
              <Link key={n.href} href={n.href} className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12.5px] whitespace-nowrap"
                style={{ backgroundColor: active ? `${theme.text}0d` : undefined, color: active ? theme.text : theme.subtext, fontWeight: active ? 600 : 500 }}>
                <Icon size={14} style={{ color: active ? theme.accent : undefined }} /> {n.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="lg:ml-[232px] max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-24">{children}</main>
    </div>
  )
}

export function useStaffRank(role: string | undefined) {
  return role ? RANK[role] ?? 0 : 0
}
