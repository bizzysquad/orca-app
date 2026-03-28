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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { useOrcaData } from '@/context/OrcaDataContext'

interface NavItem {
  name: string
  icon: React.ElementType
  href: string
  emoji: string
}

interface SidebarProps {
  userName?: string
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ userName = 'User', open = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const { data } = useOrcaData()

  // Custom logo from admin
  const [customLogo, setCustomLogo] = useState<string | null>(null)
  useEffect(() => {
    setCustomLogo(localStorage.getItem('orca-custom-logo') || null)
    const handler = (e: any) => setCustomLogo(e.detail?.logo || null)
    window.addEventListener('orca-logo-updated', handler)
    return () => window.removeEventListener('orca-logo-updated', handler)
  }, [])

  // Use OrcaData name (most up-to-date, editable in Settings) > server-passed userName > fallback
  const resolvedName = (data.user?.name && data.user.name.trim()) ? data.user.name : userName

  // Icon and route lookup by nav id
  const navMeta: Record<string, { icon: React.ElementType; href: string; emoji: string; defaultLabel: string }> = {
    dashboard: { icon: LayoutDashboard, href: '/dashboard', emoji: '🏠', defaultLabel: 'Dashboard' },
    'smart-stack': { icon: BarChart3, href: '/smart-stack', emoji: '📊', defaultLabel: 'Smart Stack' },
    'bill-boss': { icon: Receipt, href: '/bill-boss', emoji: '📄', defaultLabel: 'Bill Boss' },
    'task-list': { icon: ClipboardList, href: '/task-list', emoji: '📝', defaultLabel: 'Task List' },
    'stack-circle': { icon: Users, href: '/stack-circle', emoji: '👥', defaultLabel: 'Stack Circle' },
    settings: { icon: Settings, href: '/settings', emoji: '⚙️', defaultLabel: 'Settings' },
  }

  // Read admin nav config from localStorage for custom labels, order, visibility
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

  // Build final nav items: admin config (ordered, filtered, renamed) merged with icon/route metadata
  const navItems: NavItem[] = (() => {
    if (adminNav && adminNav.length > 0) {
      // Ensure required nav items are present even if saved config is missing them
      let merged = [...adminNav]
      const requiredIds = Object.keys(navMeta)
      requiredIds.forEach(id => {
        if (!merged.some((n: any) => n.id === id)) {
          const meta = navMeta[id]
          merged.push({ id, label: meta.defaultLabel, order: merged.length + 1, visible: true })
        }
      })
      return merged
        .filter((n: any) => n.visible !== false)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((n: any) => {
          const meta = navMeta[n.id]
          if (!meta) return null
          return { name: n.label || meta.defaultLabel, icon: meta.icon, href: meta.href, emoji: meta.emoji }
        })
        .filter(Boolean) as NavItem[]
    }
    // Fallback: default hardcoded nav
    return Object.entries(navMeta).map(([, meta]) => ({
      name: meta.defaultLabel, icon: meta.icon, href: meta.href, emoji: meta.emoji,
    }))
  })()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname.startsWith(href)
  }

  const initials = resolvedName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2) || 'U'

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm md:hidden"
          style={{ backgroundColor: theme.overlay }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50',
          'w-[220px]',
          'border-r',
          'flex flex-col',
          'pt-6 pb-6',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0'
        )}
        style={{
          backgroundColor: theme.nav,
          borderColor: `${theme.border}66`,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        {/* Logo and Brand */}
        <div className="flex items-center justify-between px-5 mb-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            {customLogo ? (
              <img src={customLogo} alt="ORCA" width={40} height={40} className="rounded-xl object-contain" style={{ boxShadow: `0 4px 12px ${theme.gold}33` }} />
            ) : (
              <Image src="/logo.svg" alt="ORCA" width={40} height={40} className="rounded-xl" style={{ boxShadow: `0 4px 12px ${theme.gold}33` }} />
            )}
            <div className="flex flex-col">
              <h1 className="font-black text-base tracking-[-1px]" style={{ color: theme.gold }}>ORCA</h1>
              <p className="text-[10px] tracking-[2px] uppercase" style={{ color: theme.textS }}>Financial Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: theme.textS }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'relative flex items-center gap-3',
                  'px-4 py-3 rounded-xl',
                  'transition-all duration-300 ease-out',
                  'text-sm font-medium',
                )}
                style={{
                  color: active ? theme.gold : theme.textS,
                  backgroundColor: active ? theme.goldBg2 : 'transparent',
                }}
              >
                {active && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                    style={{ backgroundColor: theme.gold }}
                  />
                )}
                <Icon
                  size={18}
                  strokeWidth={active ? 2 : 1.5}
                  className="flex-shrink-0"
                />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Profile at Bottom */}
        <div className="pt-4 px-3 flex-shrink-0" style={{ borderTop: `1px solid ${theme.border}99` }}>
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ backgroundColor: `${theme.border}20` }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${theme.gold}, ${theme.goldD})` }}
            >
              <span className="font-bold text-xs" style={{ color: theme.bg }}>{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: theme.text }}>{resolvedName}</p>
              <p className="text-[10px] truncate" style={{ color: theme.textM }}>Active</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
