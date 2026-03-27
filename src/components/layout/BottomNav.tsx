'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Scissors, Receipt, PiggyBank, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

interface NavItem {
  name: string
  icon: React.ElementType
  href: string
}

const BottomNav = React.forwardRef<HTMLDivElement, {}>((_props, ref) => {
  const pathname = usePathname()
  const { theme } = useTheme()

  const navItems: NavItem[] = [
    { name: 'Home', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Split', icon: Scissors, href: '/check-spitter' },
    { name: 'Bills', icon: Receipt, href: '/bill-boss' },
    { name: 'Save', icon: PiggyBank, href: '/savings' },
    { name: 'Credit', icon: TrendingUp, href: '/credit-score' },
  ]

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
