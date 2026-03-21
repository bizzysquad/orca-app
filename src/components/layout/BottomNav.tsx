'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Scissors, Receipt, PiggyBank, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  icon: React.ElementType
  href: string
}

const BottomNav = React.forwardRef<HTMLDivElement, {}>((_props, ref) => {
  const pathname = usePathname()

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
        'bg-brand-soft/90 backdrop-blur-xl',
        'border-t border-surface-border/60',
        'max-w-lg mx-auto w-full md:left-1/2 md:-translate-x-1/2',
      )}
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
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
                active ? 'text-gold' : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-gold/[0.06] rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10">
                <Icon size={22} strokeWidth={active ? 1.8 : 1.5} />
              </div>
              <span className={cn('text-2xs font-medium relative z-10', active ? 'text-gold' : 'text-text-muted')}>
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
