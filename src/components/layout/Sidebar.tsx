'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BarChart3,
  Receipt,
  Users,
  Settings,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  icon: React.ElementType
  href: string
  emoji: string
}

interface SidebarProps {
  userName?: string
}

export default function Sidebar({ userName = 'User' }: SidebarProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { name: 'Home', icon: LayoutDashboard, href: '/dashboard', emoji: '🏠' },
    { name: 'Smart Stack', icon: BarChart3, href: '/smart-stack', emoji: '📊' },
    { name: 'Bill Boss', icon: Receipt, href: '/bill-boss', emoji: '📄' },
    { name: 'Stack Circle', icon: Users, href: '/stack-circle', emoji: '👥' },
    { name: 'Settings', icon: Settings, href: '/settings', emoji: '⚙️' },
    { name: 'Admin', icon: Shield, href: '/admin', emoji: '🔧' },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname.startsWith(href)
  }

  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)

  return (
    <div
      className={cn(
        'fixed left-0 top-0 bottom-0 z-50',
        'w-[220px]',
        'bg-[#18181b]/90 backdrop-blur-xl border-r border-[#27272a]/60',
        'flex flex-col',
        'pt-6 pb-6'
      )}
    >
      {/* Logo and Brand */}
      <div className="flex items-center gap-3 px-5 mb-8 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4a843] to-[#b8860b] flex items-center justify-center shadow-lg shadow-[#d4a843]/20">
          <span className="text-[#0A0A0A] font-black text-sm">O</span>
        </div>
        <div className="flex flex-col">
          <h1 className="font-black text-base text-[#fafafa] tracking-[-1px]" style={{ color: '#d4a843' }}>ORCA</h1>
          <p className="text-[10px] text-[#a1a1aa] tracking-[2px] uppercase">Financial Control</p>
        </div>
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
              className={cn(
                'relative flex items-center gap-3',
                'px-4 py-3 rounded-xl',
                'transition-all duration-200',
                'text-sm font-medium',
                active
                  ? 'bg-[#d4a843]/10 text-[#d4a843]'
                  : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a]/40'
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[#d4a843]" />
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
      <div className="border-t border-[#27272a]/60 pt-4 px-3 flex-shrink-0">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#27272a]/30">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#d4a843] to-[#b8860b] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0A0A0A] font-bold text-xs">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#fafafa] truncate">{userName}</p>
            <p className="text-[10px] text-[#71717a] truncate">Active</p>
          </div>
        </div>
      </div>
    </div>
  )
}
