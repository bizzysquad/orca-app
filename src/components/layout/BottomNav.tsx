'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, DollarSign, Mic2, Activity, CalendarDays,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'

const BENTLEY_INDIGO = '#6366F1'

interface NavItem {
  id: string
  name: string
  icon: React.ElementType
  href: string
  accent?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', name: 'Home', icon: LayoutDashboard, href: '/dashboard', accent: BENTLEY_INDIGO },
  { id: 'planner', name: 'Plan', icon: CalendarDays, href: '/planner', accent: '#EC4899' },
  { id: 'money', name: 'Money', icon: DollarSign, href: '/bill-boss', accent: '#10B981' },
  { id: 'dj', name: 'DJ', icon: Mic2, href: '/dj', accent: '#F43F5E' },
  { id: 'life', name: 'Life', icon: Activity, href: '/fitness', accent: '#EC4899' },
]

const BottomNav = React.forwardRef<HTMLDivElement, {}>((_, ref) => {
  const pathname = usePathname()
  const { theme } = useTheme()

  const isActive = (item: NavItem) => {
    if (item.href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    if (item.href === '/bill-boss') return pathname.startsWith('/bill-boss') || pathname.startsWith('/smart-stack')
    if (item.href === '/dj') return pathname === '/dj' || pathname.startsWith('/dj/')
    if (item.href === '/fitness') return pathname.startsWith('/fitness') || pathname.startsWith('/grocery') || pathname.startsWith('/music')
    return pathname.startsWith(item.href)
  }

  return (
    <div
      ref={ref}
      className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto w-full md:left-1/2 md:-translate-x-1/2 lg:hidden"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        background: `${theme.nav}f0`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${theme.border}`,
      }}
    >
      <nav className="flex items-center justify-around px-2 pt-2 pb-1">
        {NAV_ITEMS.map(item => {
          const active = isActive(item)
          const Icon = item.icon
          const accent = item.accent || BENTLEY_INDIGO

          return (
            <Link
              key={item.id}
              href={item.href}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all"
            >
              {active && (
                <motion.div
                  layoutId="bentley-nav-active"
                  className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: `${accent}12` }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <div className="relative z-10">
                <Icon
                  size={22}
                  style={{ color: active ? accent : theme.subtext }}
                  strokeWidth={active ? 2 : 1.5}
                />
              </div>

              <span
                className="text-[10px] font-semibold relative z-10"
                style={{ color: active ? accent : theme.subtext }}
              >
                {item.name}
              </span>

              {/* Active dot */}
              {active && (
                <motion.div
                  layoutId={`dot-${item.id}`}
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ background: accent }}
                />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
})

BottomNav.displayName = 'BottomNav'
export default BottomNav
