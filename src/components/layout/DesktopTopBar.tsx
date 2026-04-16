'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, Sun, Moon, Search, Command } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

interface DesktopTopBarProps {
  onMenuToggle?: () => void
  notificationCount?: number
  userName?: string
}

// Page titles by route
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/smart-stack': 'Smart Stack',
  '/bill-boss': 'Bill Boss',
  '/stack-circle': 'Stack Circle',
  '/task-list': 'Task List',
  '/settings': 'Settings',
  '/admin': 'Admin',
}

export default function DesktopTopBar({
  onMenuToggle,
  notificationCount = 0,
  userName = 'User',
}: DesktopTopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, isDark, toggleDark } = useTheme()
  const [customLogo, setCustomLogo] = useState<string | null>(null)

  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem('orca-custom-logo')
        setCustomLogo(saved)
      } catch {}
    }
    load()
    const handler = () => load()
    window.addEventListener('orca-logo-updated', handler)
    return () => window.removeEventListener('orca-logo-updated', handler)
  }, [])

  const getInitials = (name: string): string =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const initials = getInitials(userName)

  // Find the current page title
  const currentTitle = Object.entries(PAGE_TITLES).find(([route]) =>
    route === '/dashboard' ? pathname === '/dashboard' || pathname === '/' : pathname.startsWith(route)
  )?.[1] ?? 'ORCA'

  // Trigger Quick Actions (Cmd+K)
  const triggerSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-40',
        'flex items-center justify-between px-4 sm:px-5 py-3 transition-colors duration-200'
      )}
      style={{
        backgroundColor: `${theme.bg}ee`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      {/* Left: Hamburger (mobile) + Logo */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg transition-colors hover:opacity-80 flex-shrink-0"
          style={{ color: theme.textM }}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        {/* Logo — hidden on desktop (sidebar has it), shown on mobile */}
        <Link href="/dashboard" className="flex items-center gap-2 lg:hidden flex-shrink-0">
          {customLogo ? (
            <img src={customLogo} alt="ORCA" width={28} height={28} className="rounded-lg object-cover" />
          ) : (
            <Image src="/logo.svg" alt="ORCA" width={28} height={28} className="rounded-lg" />
          )}
          <span className="font-black text-base" style={{ color: theme.accent, letterSpacing: '0.06em' }}>
            ORCA
          </span>
        </Link>

        {/* Desktop: current page title as breadcrumb */}
        <div className="hidden lg:block">
          <h2 className="text-sm font-semibold" style={{ color: theme.text }}>
            {currentTitle}
          </h2>
        </div>
      </div>

      {/* Center: Search/Quick Actions pill — desktop only */}
      <button
        onClick={triggerSearch}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-150 hover:opacity-80"
        style={{
          background: theme.surface || 'rgba(255,255,255,0.05)',
          border: `1px solid ${theme.border}`,
          color: theme.textM,
        }}
        title="Open command palette"
      >
        <Search size={13} />
        <span>Quick search</span>
        <kbd
          className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold"
          style={{ background: `${theme.border}`, color: theme.textM }}
        >
          <Command size={8} />K
        </kbd>
      </button>

      {/* Right: Theme toggle + Avatar */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg transition-all hover:opacity-80"
          style={{ color: theme.textM }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
        </button>

        {/* Avatar → Settings */}
        <button
          onClick={() => router.push('/settings')}
          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-opacity hover:opacity-80"
          style={{
            background: `${theme.accent}25`,
            border: `1.5px solid ${theme.accent}50`,
            color: theme.accent,
          }}
          title={`${userName} · Settings`}
        >
          {initials}
        </button>
      </div>
    </div>
  )
}
