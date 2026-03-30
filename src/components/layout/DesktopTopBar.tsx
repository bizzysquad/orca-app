'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, Sun, Moon, Home, Search, ChevronRight, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { useOrcaData } from '@/context/OrcaDataContext'

interface DesktopTopBarProps {
  onMenuToggle?: () => void
  userName?: string
}

export default function DesktopTopBar({ onMenuToggle, userName = 'User' }: DesktopTopBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, isDark, toggleDark, currentTheme } = useTheme()
  const { data } = useOrcaData()
  const [customLogo, setCustomLogo] = useState<string | null>(null)

  useEffect(() => {
    const load = () => {
      try { setCustomLogo(localStorage.getItem('orca-custom-logo') || null) } catch {}
    }
    load()
    const handler = (e: any) => {
      const logo = e?.detail?.logo || null
      setCustomLogo(logo)
    }
    window.addEventListener('orca-logo-updated', handler)
    // Also listen for storage events (cross-tab sync)
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'orca-custom-logo') setCustomLogo(e.newValue || null)
    }
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('orca-logo-updated', handler)
      window.removeEventListener('storage', storageHandler)
    }
  }, [])

  const resolvedName = (data.user?.name && data.user.name.trim()) ? data.user.name : userName
  const initials = resolvedName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
  const isAdmin = data.user?.email === 'mckiveja@gmail.com'

  const getPageTitle = () => {
    if (pathname === '/' || pathname === '/dashboard') return 'Dashboard'
    if (pathname.startsWith('/smart-stack')) return 'Smart Stack'
    if (pathname.startsWith('/bill-boss')) return 'Bill Boss'
    if (pathname.startsWith('/stack-circle')) return 'Stack Circle'
    if (pathname.startsWith('/task-list')) return 'Task List'
    if (pathname.startsWith('/settings')) return 'Settings'
    if (pathname.startsWith('/admin')) return 'Admin Panel'
    return 'ORCA'
  }

  // V10 themed header colors
  const headerBg = isDark ? currentTheme.headerBg : '#FFFFFF'
  const headerBorder = isDark ? `${currentTheme.primary}22` : '#E2E8F0'
  const textColor = isDark ? '#F1F5F9' : '#0F172A'
  const mutedColor = isDark ? '#64748B' : '#94A3B8'
  const searchBg = isDark ? currentTheme.sidebarBg : '#F8FAFC'
  const searchBorder = isDark ? `${currentTheme.primary}30` : '#E2E8F0'

  return (
    <header
      className="flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-40"
      style={{
        background: headerBg,
        borderBottom: `1px solid ${headerBorder}`,
        height: 60,
        flexShrink: 0,
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      {/* Mobile hamburger */}
      <button onClick={onMenuToggle} className="lg:hidden p-1.5 rounded-lg" style={{ color: mutedColor }}>
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        {customLogo ? (
          <img src={customLogo} alt="ORCA" className="w-7 h-7 rounded-lg object-cover" />
        ) : (
          <Image src="/logo.svg" alt="ORCA" width={28} height={28} className="rounded-lg object-cover" />
        )}
        <span style={{ color: currentTheme.primaryLight, fontWeight: 900, fontSize: 13, letterSpacing: '0.06em' }}>ORCA</span>
      </div>

      {/* Desktop breadcrumb */}
      <div className="hidden lg:flex items-center gap-2">
        <span style={{ color: mutedColor, fontSize: 13 }}>ORCA</span>
        <ChevronRight className="w-3.5 h-3.5" style={{ color: mutedColor }} />
        <span style={{ color: textColor, fontSize: 13, fontWeight: 600 }}>{getPageTitle()}</span>
      </div>

      {/* Search */}
      <div
        className="hidden sm:flex items-center gap-2 ml-3 flex-1"
        style={{
          maxWidth: 300,
          background: searchBg,
          border: `1px solid ${searchBorder}`,
          borderRadius: 12,
          padding: '6px 14px',
          transition: 'background 0.2s',
        }}
      >
        <Search className="w-4 h-4 flex-shrink-0" style={{ color: mutedColor }} />
        <input type="text" placeholder="Search anything..." className="bg-transparent outline-none text-sm w-full" style={{ color: textColor }} />
      </div>

      <div className="flex-1" />

      {/* Right-side actions */}
      <div className="flex items-center gap-2">
        {/* Dark/Light toggle */}
        <button
          onClick={toggleDark}
          className="p-2 rounded-xl transition-all hover:scale-105"
          style={{
            background: isDark ? `${currentTheme.primary}25` : '#F1F5F9',
            color: isDark ? currentTheme.primaryLight : '#64748B',
          }}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Home */}
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 rounded-xl transition-all hover:scale-105"
          style={{
            background: (pathname === '/' || pathname === '/dashboard') ? `${currentTheme.primary}25` : 'transparent',
            color: (pathname === '/' || pathname === '/dashboard') ? currentTheme.primaryLight : mutedColor,
          }}
          title="Go to Dashboard"
        >
          <Home className="w-5 h-5" />
        </button>

        {/* Admin quick-access */}
        {isAdmin && (
          <button
            onClick={() => router.push('/admin')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#D97706', fontWeight: 700, border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <Shield className="w-3.5 h-3.5" />
            Admin
          </button>
        )}

        {/* Profile avatar */}
        <button
          onClick={() => router.push('/settings')}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white cursor-pointer flex-shrink-0"
          style={{ background: currentTheme.primary, fontSize: 11, fontWeight: 800 }}
          title={resolvedName}
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
