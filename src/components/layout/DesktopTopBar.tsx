'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Menu, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

interface DesktopTopBarProps {
  onMenuToggle?: () => void
}

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/smart-stack': 'Smart Stack',
  '/bill-boss': 'Bill Boss',
  '/stack-circle': 'Stack Circle',
  '/task-list': 'Task List',
  '/settings': 'Settings',
  '/admin': 'Admin Panel',
}

export default function DesktopTopBar({ onMenuToggle }: DesktopTopBarProps) {
  const pathname = usePathname()
  const title = ROUTE_TITLES[pathname] || 'ORCA'
  const { theme, isDark, setIsDark } = useTheme()

  return (
    <div
      className={cn(
        'sticky top-0 z-40',
        'backdrop-blur-xl',
        'flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 transition-colors duration-200'
      )}
      style={{
        backgroundColor: theme.bg,
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Hamburger menu — mobile only */}
        <button
          onClick={onMenuToggle}
          className={cn(
            'md:hidden p-2 rounded-lg transition-colors duration-200',
            'hover:opacity-80'
          )}
          style={{ color: theme.textM }}
        >
          <Menu size={22} />
        </button>
        <h1
          className="text-lg sm:text-xl font-semibold"
          style={{ color: theme.text }}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Light / Dark Mode Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className={cn(
            'relative p-2 sm:p-2.5 rounded-lg transition-all duration-300',
            'hover:opacity-80'
          )}
          style={{
            color: isDark ? theme.gold : theme.gold,
            backgroundColor: `${theme.gold}15`,
          }}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
        </button>

        {/* Settings Link */}
        <Link
          href="/settings"
          className={cn(
            'p-2 sm:p-2.5 rounded-lg transition-colors duration-200',
            'hover:opacity-80'
          )}
          style={{ color: theme.textM }}
        >
          <Settings size={20} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  )
}
