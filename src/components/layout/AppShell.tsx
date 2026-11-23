'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, Settings, RefreshCw, Check, AlertCircle, Search, SlidersHorizontal,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import SettingsSheet from './SettingsSheet'
import SideSidebar from './SideSidebar'
import NavList from './NavList'
import CustomizePanel, { openCustomize } from './CustomizePanel'
import { OrcaMark } from './OrcaMark'
import { NAV_ITEMS, NAV_GROUPS, isNavActive } from './navConfig'
import { useTheme } from '@/context/ThemeContext'
import { QuickActions } from '@/components/QuickActions'
import { useOrcaData } from '@/context/OrcaDataContext'
import { useLayoutPrefs, prefOps } from '@/lib/layoutPrefs'
import { createBrowserClient } from '@supabase/ssr'

interface AppShellProps {
  children: React.ReactNode
  userName?: string
}

const openPalette = () => window.dispatchEvent(new CustomEvent('orca-open-quick-actions'))

export default function AppShell({ children, userName = 'User' }: AppShellProps) {
  const { theme } = useTheme()
  const { data, forceSync, syncState } = useOrcaData()
  const { prefs, update } = useLayoutPrefs()
  const pathname = usePathname()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | undefined>()
  const [syncIcon, setSyncIcon] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [isMac, setIsMac] = useState(false)

  const handleSync = useCallback(async () => {
    setSyncIcon('syncing')
    const result = await forceSync()
    if (result.ok) {
      setSyncIcon('done')
      setTimeout(() => setSyncIcon('idle'), 2000)
    } else {
      setSyncIcon('error')
      setTimeout(() => setSyncIcon('idle'), 3000)
    }
  }, [forceSync])

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || ''))
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
  const initials = displayName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'

  const activeItem = NAV_ITEMS.find(n => isNavActive(n, pathname))
  const activeGroup = NAV_GROUPS.find(g => activeItem && g.items.includes(activeItem))
  const rail = prefs.sidebarCollapsed
  const sideW = rail ? 68 : 244

  const iconBtn = 'w-9 h-9 rounded-lg flex items-center justify-center transition-colors'
  const hover = (on: boolean) => (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.backgroundColor = on ? `${theme.text}0d` : '' }

  return (
    <div
      className="flex min-h-screen max-w-[100vw] overflow-x-hidden"
      style={{ backgroundColor: theme.bg, color: theme.text, ['--orca-side' as any]: `${sideW}px` }}
    >
      {/* ── Desktop sidebar (lg+) ─────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 transition-[width] duration-200"
        style={{ width: sideW, backgroundColor: theme.nav, borderRight: `1px solid ${theme.border}` }}
      >
        <div className={`flex items-center h-14 shrink-0 ${rail ? 'justify-center' : 'gap-2.5 px-4'}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0" aria-label="ORCA home">
            <OrcaMark />
            {!rail && <span className="text-[15px] font-semibold tracking-tight" style={{ color: theme.text }}>ORCA</span>}
          </Link>
        </div>

        {!rail && (
          <div className="px-3 pb-2">
            <button
              onClick={openPalette}
              className="w-full flex items-center gap-2 h-9 px-2.5 rounded-lg text-[13px]"
              style={{ backgroundColor: theme.input, border: `1px solid ${theme.border}`, color: theme.subtext }}
            >
              <Search size={14} />
              <span className="flex-1 text-left">Search or jump to</span>
              <kbd className="text-[10px] font-mono-num px-1.5 rounded" style={{ border: `1px solid ${theme.border}` }}>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto no-scrollbar py-3 ${rail ? 'px-2' : 'px-3'}`}>
          <NavList rail={rail} />
        </div>

        <div className={`shrink-0 py-3 space-y-px ${rail ? 'px-2' : 'px-3'}`} style={{ borderTop: `1px solid ${theme.border}` }}>
          {[
            { label: 'Customize', icon: SlidersHorizontal, onClick: () => openCustomize('sidebar') },
            { label: 'Settings', icon: Settings, onClick: () => setSettingsOpen(true) },
            { label: rail ? 'Expand sidebar' : 'Collapse sidebar', icon: rail ? PanelLeftOpen : PanelLeftClose, onClick: () => update(prefOps.toggleSidebar) },
          ].map(b => (
            <button
              key={b.label}
              onClick={b.onClick}
              title={rail ? b.label : undefined}
              aria-label={b.label}
              className={`flex items-center rounded-lg transition-colors ${rail ? 'justify-center h-10 w-10 mx-auto' : 'gap-2.5 px-2.5 h-9 w-full'}`}
              style={{ color: theme.subtext }}
              onMouseEnter={hover(true)}
              onMouseLeave={hover(false)}
            >
              <b.icon size={17} strokeWidth={1.75} className="shrink-0" />
              {!rail && <span className="text-[13.5px] font-medium">{b.label}</span>}
            </button>
          ))}
          <div className={`flex items-center pt-2 ${rail ? 'justify-center' : 'gap-2.5 px-2.5'}`}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ backgroundColor: `${theme.accent}22`, color: theme.accent }} title={displayName}>{initials}</span>
            {!rail && (
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: theme.text }}>{displayName}</p>
                {userEmail && <p className="text-[11px] truncate" style={{ color: theme.subtext }}>{userEmail}</p>}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-[var(--orca-side)] transition-[margin] duration-200">
        <header
          className="sticky top-0 z-40 flex items-center gap-2 px-3 sm:px-4 lg:px-8 h-14 shrink-0"
          style={{
            backgroundColor: `${theme.bg}e6`,
            backdropFilter: 'saturate(140%) blur(16px)',
            WebkitBackdropFilter: 'saturate(140%) blur(16px)',
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <button onClick={() => setSidebarOpen(true)} className={`${iconBtn} lg:hidden`} style={{ color: theme.text }} aria-label="Open navigation">
            <Menu size={19} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden" aria-label="ORCA home">
            <OrcaMark size={24} />
            <span className="text-[15px] font-semibold tracking-tight hidden sm:inline">ORCA</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1.5 text-[13px] min-w-0" aria-label="Breadcrumb">
            {activeGroup?.label && <><span style={{ color: theme.subtext }}>{activeGroup.label}</span><span style={{ color: theme.border }}>/</span></>}
            <span className="font-medium truncate" style={{ color: theme.text }}>{activeItem?.name ?? 'ORCA'}</span>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={openPalette}
              className={`${iconBtn} ${rail ? '' : 'lg:hidden'}`}
              style={{ color: theme.subtext }}
              aria-label="Search and quick actions"
              onMouseEnter={hover(true)}
              onMouseLeave={hover(false)}
            >
              <Search size={17} />
            </button>
            <button
              onClick={handleSync}
              disabled={syncIcon === 'syncing'}
              className={iconBtn}
              style={{ color: theme.subtext }}
              aria-label="Sync data"
              title={syncIcon === 'error' ? (syncState.lastError || 'Sync failed') : 'Sync all data'}
              onMouseEnter={hover(true)}
              onMouseLeave={hover(false)}
            >
              {syncIcon === 'done' ? <Check size={17} style={{ color: theme.ok }} />
                : syncIcon === 'error' ? <AlertCircle size={17} style={{ color: theme.warn }} />
                : <RefreshCw size={16} className={syncIcon === 'syncing' ? 'animate-spin' : ''} style={{ color: syncIcon === 'syncing' ? theme.accent : undefined }} />}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className={`${iconBtn} lg:hidden`}
              style={{ color: theme.subtext }}
              aria-label="Open settings"
            >
              <Settings size={17} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden" style={{ backgroundColor: theme.bg }}>
          {children}
        </main>
      </div>

      <SideSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={displayName}
        onSettings={() => { setSidebarOpen(false); setSettingsOpen(true) }}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userName={displayName}
        userEmail={userEmail}
      />

      <CustomizePanel />
      <QuickActions />
    </div>
  )
}
