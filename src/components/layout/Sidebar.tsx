'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart3,
  Receipt,
  Users,
  Settings,
  ClipboardList,
  X,
  Shield,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { useOrcaData } from '@/context/OrcaDataContext'

interface NavItem {
  name: string
  icon: React.ElementType
  href: string
  emoji: string
  id: string
}

interface SidebarProps {
  userName?: string
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ userName = 'User', open = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { theme, currentTheme, isDark } = useTheme()
  const { data } = useOrcaData()

  // Custom logo from admin — syncs via event + cross-tab storage
  const [customLogo, setCustomLogo] = useState<string | null>(null)
  useEffect(() => {
    setCustomLogo(localStorage.getItem('orca-custom-logo') || null)
    const handler = (e: any) => setCustomLogo(e?.detail?.logo || null)
    window.addEventListener('orca-logo-updated', handler)
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

  const navMeta: Record<string, { icon: React.ElementType; href: string; emoji: string; defaultLabel: string }> = {
    dashboard: { icon: LayoutDashboard, href: '/dashboard', emoji: '🏠', defaultLabel: 'Dashboard' },
    'smart-stack': { icon: BarChart3, href: '/smart-stack', emoji: '📊', defaultLabel: 'Smart Stack' },
    'bill-boss': { icon: Receipt, href: '/bill-boss', emoji: '📄', defaultLabel: 'Bill Boss' },
    'task-list': { icon: ClipboardList, href: '/task-list', emoji: '📝', defaultLabel: 'Task List' },
    'stack-circle': { icon: Users, href: '/stack-circle', emoji: '👥', defaultLabel: 'Stack Circle' },
    settings: { icon: Settings, href: '/settings', emoji: '⚙️', defaultLabel: 'Settings' },
    admin: { icon: Shield, href: '/admin', emoji: '🔐', defaultLabel: 'Admin' },
  }

  const [adminNav, setAdminNav] = useState<any[] | null>(null)
  useEffect(() => {
    const loadNav = () => {
      try {
        const saved = localStorage.getItem('orca-admin-nav')
        if (saved) setAdminNav(JSON.parse(saved))
      } catch {}
    }
    loadNav()
    const handler = () => loadNav()
    window.addEventListener('orca-nav-updated', handler)
    window.addEventListener('orca-sync-ready', handler)
    return () => {
      window.removeEventListener('orca-nav-updated', handler)
      window.removeEventListener('orca-sync-ready', handler)
    }
  }, [])

  const isAdmin = data.user?.email === 'mckiveja@gmail.com'
  const navItems: NavItem[] = (() => {
    if (adminNav && adminNav.length > 0) {
      let merged = [...adminNav]
      const requiredIds = Object.keys(navMeta)
      requiredIds.forEach(id => {
        if (!merged.some((n: any) => n.id === id)) {
          const meta = navMeta[id]
          merged.push({ id, label: meta.defaultLabel, order: merged.length + 1, visible: true })
        }
      })
      return merged
        .filter((n: any) => n.visible !== false && (n.id !== 'admin' || isAdmin) && n.id !== 'settings')
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((n: any) => {
          const meta = navMeta[n.id]
          if (!meta) return null
          return { id: n.id, name: n.label || meta.defaultLabel, icon: meta.icon, href: meta.href, emoji: meta.emoji }
        })
        .filter(Boolean) as NavItem[]
    }
    return Object.entries(navMeta)
      .filter(([id]) => (id !== 'admin' || isAdmin) && id !== 'settings')
      .map(([id, meta]) => ({
        id, name: meta.defaultLabel, icon: meta.icon, href: meta.href, emoji: meta.emoji,
      }))
  })()

  const navGroups = [
    { label: 'MAIN', items: navItems.filter(item => item.id === 'dashboard') },
    { label: 'FINANCE', items: navItems.filter(item => ['smart-stack', 'bill-boss'].includes(item.id)) },
    { label: 'COMMUNITY', items: navItems.filter(item => item.id === 'stack-circle') },
    { label: 'PRODUCTIVITY', items: navItems.filter(item => item.id === 'task-list') },
  ]

  const adminItem = isAdmin && navMeta.admin ? {
    id: 'admin', name: navMeta.admin.defaultLabel, icon: navMeta.admin.icon, href: navMeta.admin.href, emoji: navMeta.admin.emoji,
  } : null

  const settingsItem = navMeta.settings ? {
    id: 'settings', name: navMeta.settings.defaultLabel, icon: navMeta.settings.icon, href: navMeta.settings.href, emoji: navMeta.settings.emoji,
  } : null

  const isActivePath = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname.startsWith(href)
  }

  const initials = resolvedName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) || 'U'

  const renderNavItem = (item: NavItem) => {
    const active = isActivePath(item.href)
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
        style={{
          background: active ? currentTheme.navActiveBg : 'transparent',
          fontWeight: active ? 600 : 400,
          color: active ? '#FFFFFF' : '#94A3B8',
        }}
      >
        <Icon
          className="w-4 h-4 flex-shrink-0"
          style={{ color: active ? currentTheme.navActiveIcon : '#475569' }}
        />
        <span className="flex-1 truncate">{item.name}</span>
        {active && <ChevronRight className="w-3 h-3" style={{ color: currentTheme.navActiveIcon }} />}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50',
          'w-[240px]',
          'flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
        style={{
          background: `linear-gradient(180deg, ${currentTheme.sidebarGradientFrom} 0%, ${currentTheme.sidebarGradientTo} 100%)`,
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: `1px solid ${currentTheme.sidebarBorderColor}` }}>
          {customLogo ? (
            <img src={customLogo} alt="ORCA" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" style={{ boxShadow: `0 0 12px ${currentTheme.primary}44` }} />
          ) : (
            <Image src="/logo.svg" alt="ORCA" width={36} height={36} className="rounded-xl object-cover flex-shrink-0" style={{ boxShadow: `0 0 12px ${currentTheme.primary}44` }} />
          )}
          <div className="min-w-0">
            <div style={{ color: currentTheme.primaryLight, fontWeight: 900, fontSize: 14, letterSpacing: '0.06em' }}>ORCA</div>
            <div style={{ color: '#475569', fontSize: 9, letterSpacing: '0.1em', fontWeight: 600 }}>FINANCIAL CONTROL</div>
          </div>
          <button className="ml-auto lg:hidden p-1 rounded-lg text-slate-400 hover:text-white flex-shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {navGroups.map(group => {
            if (!group.items || group.items.length === 0) return null
            return (
              <div key={group.label}>
                <div className="px-3 mb-1.5" style={{ color: `${currentTheme.primaryLight}55`, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em' }}>
                  {group.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {group.items.map(item => renderNavItem(item))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Bottom nav: Settings + Admin */}
        <div className="px-3 py-3" style={{ borderTop: `1px solid ${currentTheme.sidebarBorderColor}`, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {settingsItem && renderNavItem(settingsItem)}

          {adminItem && (
            <Link
              href={adminItem.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
              style={{
                background: isActivePath(adminItem.href) ? 'rgba(245,158,11,0.15)' : 'transparent',
                fontWeight: isActivePath(adminItem.href) ? 600 : 400,
                color: isActivePath(adminItem.href) ? '#FBBF24' : '#94A3B8',
              }}
            >
              <Shield className="w-4 h-4 flex-shrink-0" style={{ color: isActivePath(adminItem.href) ? '#F59E0B' : '#475569' }} />
              <span className="flex-1">Admin Panel</span>
              <span className="ml-auto px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontWeight: 700 }}>ADMIN</span>
            </Link>
          )}
        </div>

        {/* User profile */}
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${currentTheme.sidebarBorderColor}` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: currentTheme.primary, fontSize: 11, fontWeight: 800 }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white truncate" style={{ fontSize: 13, fontWeight: 600 }}>{resolvedName}</div>
              <div className="truncate" style={{ color: '#475569', fontSize: 10 }}>{data.user?.email || 'Active'}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
