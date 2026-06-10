'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import BottomNav from './BottomNav'
import SettingsSheet from './SettingsSheet'
import { useTheme } from '@/context/ThemeContext'
import { QuickActions } from '@/components/QuickActions'
import { useOrcaData } from '@/context/OrcaDataContext'
import { createBrowserClient } from '@supabase/ssr'
import { useEffect } from 'react'

interface AppShellProps {
  children: React.ReactNode
  userName?: string
}

export default function AppShell({ children, userName = 'User' }: AppShellProps) {
  const { theme } = useTheme()
  const { data } = useOrcaData()
  const [settingsOpen, setSettingsOpen] = useState(false)
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

  return (
    <div
      className="relative w-full min-h-screen flex flex-col overflow-x-hidden max-w-[100vw]"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* ── Minimal Top Bar ── */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          backgroundColor: `${theme.bg}f0`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs"
            style={{ background: `linear-gradient(135deg, #6366F1, #4F46E5)`, color: '#fff' }}
          >
            O
          </div>
          <span className="font-black text-sm tracking-widest" style={{ color: theme.accent }}>
            ORCA
          </span>
        </Link>

        {/* Settings trigger */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 rounded-xl transition-opacity hover:opacity-70"
          style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          aria-label="Open settings"
        >
          <Settings2 size={16} style={{ color: theme.subtext }} />
        </button>
      </div>

      {/* ── Page Content ── */}
      <main className="flex-1 overflow-x-hidden" style={{ backgroundColor: theme.bg }}>
        {children}
      </main>

      {/* ── Bottom Navigation ── */}
      <BottomNav />

      {/* ── Settings / Admin Sheet ── */}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userName={displayName}
        userEmail={userEmail}
      />

      {/* ── Global Quick Actions (Cmd+K) ── */}
      <QuickActions />
    </div>
  )
}
