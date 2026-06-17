'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, Settings2, LayoutDashboard, CreditCard,
  TrendingUp, Mic2, Activity, Briefcase, CheckSquare,
} from 'lucide-react'
import SettingsSheet from './SettingsSheet'
import SideSidebar from './SideSidebar'
import BottomNav from './BottomNav'
import { useTheme } from '@/context/ThemeContext'
import { QuickActions } from '@/components/QuickActions'
import { useOrcaData } from '@/context/OrcaDataContext'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect } from 'react'

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'

const SIDEBAR_NAV = [
  { id: 'dashboard',  name: 'Home',        icon: LayoutDashboard, href: '/dashboard', accent: BENTLEY_INDIGO },
  { id: 'bill-boss',  name: 'Bill Boss',   icon: CreditCard,      href: '/bill-boss', accent: '#10B981' },
  { id: 'smart-stack',name: 'Smart Stack', icon: TrendingUp,      href: '/smart-stack', accent: '#10B981' },
  { id: 'dj',         name: 'DJ Maskoff',  icon: Mic2,            href: '/dj',        accent: '#F43F5E' },
  { id: 'fitness',    name: 'Fitness',     icon: Activity,        href: '/fitness',   accent: '#EC4899' },
  { id: 'bizzplug',   name: 'BizzyPlug',  icon: Briefcase,       href: '/bizzplug',  accent: BENTLEY_GOLD },
  { id: 'task-list',  name: 'Task List',   icon: CheckSquare,     href: '/task-list', accent: BENTLEY_INDIGO },
]

interface AppShellProps {
  children: React.ReactNode
  userName?: string
}

export default function AppShell({ children, userName = 'User' }: AppShellProps) {
  const { theme } = useTheme()
  const { data } = useOrcaData()
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | undefined>()

  useEffect(() => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      supabase.auth.getUser().then(({ data: d }) => {
        if (d.user?.email) setUserEmail(d.user.email)
      })
    } catch {}
  }, [])

  const displayName = (data?.user?.name?.trim()) || userName

  const isNavActive = (item: typeof SIDEBAR_NAV[0]) => {
    if (item.href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    if (item.href === '/dj') return pathname === '/dj' || pathname.startsWith('/dj/')
    if (item.href === '/fitness') return pathname.startsWith('/fitness') || pathname.startsWith('/grocery') || pathname.startsWith('/music')
    if (item.href === '/bill-boss') return pathname.startsWith('/bill-boss')
    return pathname.startsWith(item.href)
  }

  const activeItem = SIDEBAR_NAV.find(n => isNavActive(n))

  return (
    <div
      className="flex min-h-screen max-w-[100vw] overflow-x-hidden"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* ── Desktop Sidebar (lg+) ─────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30"
        style={{ width: 240, backgroundColor: theme.card, borderRight: `1px solid ${theme.border}` }}
      >
        {/* Logo / brand */}
        <div
          className="flex items-center gap-3 px-4 py-4 shrink-0"
          style={{ borderBottom: `1px solid ${theme.border}` }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff' }}
          >
            O
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm tracking-widest" style={{ color: BENTLEY_INDIGO }}>ORCA</p>
            <p className="text-[10px] truncate" style={{ color: theme.subtext }}>{displayName}</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {SIDEBAR_NAV.map(item => {
            const active = isNavActive(item)
            const Icon = item.icon
            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group"
                style={{
                  backgroundColor: active ? `${item.accent}18` : 'transparent',
                  color: active ? item.accent : theme.subtext,
                  fontWeight: active ? 600 : 400,
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.5} className="shrink-0" />
                <span className="text-sm leading-none">{item.name}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.accent }} />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Settings footer */}
        <div className="px-3 py-3 shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all hover:opacity-70 text-left"
            style={{ color: theme.subtext }}
          >
            <Settings2 size={18} strokeWidth={1.5} className="shrink-0" />
            <span className="text-sm">Settings</span>
          </button>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-[240px]">

        {/* Top Bar */}
        <div
          className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 shrink-0"
          style={{
            backgroundColor: `${theme.bg}f0`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl transition-opacity hover:opacity-70"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              aria-label="Open navigation"
            >
              <Menu size={16} style={{ color: theme.subtext }} />
            </button>

            {/* Logo — mobile only */}
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff' }}
              >
                O
              </div>
              <span className="font-black text-sm tracking-widest" style={{ color: theme.accent }}>ORCA</span>
            </Link>

            {/* Page title — desktop only */}
            <span
              className="hidden lg:block text-sm font-semibold"
              style={{ color: theme.text }}
            >
              {activeItem?.name ?? 'ORCA'}
            </span>
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl transition-opacity hover:opacity-70"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            aria-label="Open settings"
          >
            <Settings2 size={16} style={{ color: theme.subtext }} />
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden" style={{ backgroundColor: theme.bg }}>
          {children}
        </main>

        {/* Bottom Nav — mobile only (lg:hidden lives inside BottomNav itself) */}
        <BottomNav />
      </div>

      {/* Mobile SideSidebar overlay */}
      <SideSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={displayName}
      />

      {/* Settings sheet */}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userName={displayName}
        userEmail={userEmail}
      />

      {/* Global Quick Actions (Cmd+K) */}
      <QuickActions />
    </div>
  )
}
