'use client'

import React from 'react'
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
  const { theme, isDark } = useTheme()
  const { data } = useOrcaData()

  // Use OrcaData name (most up-to-date, editable in Settings) > server-passed userName > fallback
  const resolvedName = (data.user?.name && data.user.name.trim()) ? data.user.name : userName

  const navItems: NavItem[] = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', emoji: '🏠' },
    { name: 'Smart Stack', icon: BarChart3, href: '/smart-stack', emoji: '📊' },
    { name: 'Bill Boss', icon: Receipt, href: '/bill-boss', emoji: '📄' },
    { name: 'Task List', icon: ClipboardList, href: '/task-list', emoji: '📝' },
    { name: 'Stack Circle', icon: Users, href: '/stack-circle', emoji: '👥' },
    { name: 'Settings', icon: Settings, href: '/settings', emoji: '⚙️' },
  ]

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
            <Image src="/logo.svg" alt="ORCA" width={40} height={40} className="rounded-xl" style={{ boxShadow: `0 4px 12px ${theme.gold}33` }} />
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
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${theme.gold}, ${theme.goldD})` }}
            >
              <span className="font-bold text-xs" style={{ color: isDark ? '#0A0A0A' : '#ffffff' }}>{initials}</span>
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
