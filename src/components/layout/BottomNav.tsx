'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Scissors, Receipt, PiggyBank, TrendingUp,
  BarChart3, Users, ClipboardList, Settings,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

interface NavItem {
  name: string
  icon: React.ElementType
  href: string
}

// Icon lookup for admin-configured nav items
const navIconMap: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  'smart-stack': BarChart3,
  'bill-boss': Receipt,
  'task-list': ClipboardList,
  'stack-circle': Users,
  settings: Settings,
}

const navHrefMap: Record<string, string> = {
  dashboard: '/dashboard',
  'smart-stack': '/smart-stack',
  'bill-boss': '/bill-boss',
  'task-list': '/task-list',
  'stack-circle': '/stack-circle',
  settings: '/settings',
}

const defaultBottomItems: NavItem[] = [
  { name: 'Home', icon: LayoutDashboard, href: '/dashboard' },
  { name: 'Smart Stack', icon: BarChart3, href: '/smart-stack' },
  { name: 'Bills', icon: Receipt, href: '/bill-boss' },
  { name: 'Tasks', icon: ClipboardList, href: '/task-list' },
  { name: 'Settings', icon: Settings, href: '/settings' },
]

const BottomNav = React.forwardRef<HTMLDivElement, {}>((_props, ref) => {
  const pathname = usePathname()
  const { theme } = useTheme()

  // Read admin nav config for consistent naming/order/visibility
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

  const navItems: NavItem[] = (() => {
    if (adminNav && adminNav.length > 0) {
      return adminNav
        .filter((n: any) => n.visible !== false)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .slice(0, 5) // Max 5 items for bottom nav
        .map((n: any) => ({
          name: n.label || n.id,
          icon: navIconMap[n.id] || LayoutDashboard,
          href: navHrefMap[n.id] || '/dashboard',
        }))
    }
    return defaultBottomItems
  })()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div
      ref={ref}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'backdrop-blur-xl',
        'max-w-lg mx-auto w-full md:left-1/2 md:-translate-x-1/2',
      )}
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        backgroundColor: `${theme.nav}e6`,
        borderTop: `1px solid ${theme.border}99`,
      }}
    >
      <nav className="flex items-center justify-around px-2 pt-2 pb-1">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center gap-0.5',
                'px-4 py-2 rounded-xl',
                'transition-colors duration-200',
              )}
              style={{ color: active ? theme.gold : theme.textM }}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: `${theme.gold}0f` }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10">
                <Icon size={22} strokeWidth={active ? 1.8 : 1.5} />
              </div>
              <span
                className="text-2xs font-medium relative z-10"
                style={{ color: active ? theme.gold : theme.textM }}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
})

BottomNav.displayName = 'BottomNav'
export default BottomNav
