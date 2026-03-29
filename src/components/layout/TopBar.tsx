'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Settings, Home, Palette, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

interface TopBarProps {
  title?: string
  notificationCount?: number
}

const TopBar = React.forwardRef<HTMLDivElement, TopBarProps>(
  ({ title = 'ORCA', notificationCount = 0 }, ref) => {
    const { theme, themeId, setThemeId, allThemes, isDark, toggleDark } = useTheme()

    const [customLogo, setCustomLogo] = useState<string | null>(null)
    useEffect(() => {
      setCustomLogo(localStorage.getItem('orca-custom-logo') || null)
      const handler = (e: any) => setCustomLogo(e.detail?.logo || null)
      window.addEventListener('orca-logo-updated', handler)
      return () => window.removeEventListener('orca-logo-updated', handler)
    }, [])

    return (
      <div
        ref={ref}
        className={cn(
          'fixed top-0 left-0 right-0 z-50',
          'backdrop-blur-xl',
          'border-b',
          'flex items-center justify-between px-5 py-3.5',
          'max-w-lg mx-auto w-full md:left-1/2 md:-translate-x-1/2'
        )}
        style={{
          backgroundColor: `${theme.bgS}e6`,
          borderColor: `${theme.border}99`,
        }}
      >
        <div className="flex-shrink-0">
          {customLogo ? (
            <Image src={customLogo} alt="ORCA Logo" width={28} height={28} className="rounded object-contain" />
          ) : (
            <Image src="/logo.svg" alt="ORCA Logo" width={28} height={28} priority className="rounded" />
          )}
        </div>

        <h1 className="flex-1 text-center font-semibold text-sm tracking-[0.15em] uppercase" style={{ color: theme.text }}>
          {title}
        </h1>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Home button */}
          <Link
            href="/dashboard"
            className="p-2.5 rounded-lg transition-colors duration-200"
            style={{ color: theme.gold }}
          >
            <Home size={18} strokeWidth={1.5} />
          </Link>
          {/* Light/Dark Mode Toggle */}
          <button
            onClick={toggleDark}
            className="p-2.5 rounded-lg transition-colors duration-200"
            style={{ color: theme.gold }}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          </button>
          {/* Theme color cycle */}
          <button
            onClick={() => {
              const ids = allThemes.map(t => t.id)
              const idx = ids.indexOf(themeId)
              const next = ids[(idx + 1) % ids.length]
              setThemeId(next)
            }}
            className="p-2.5 rounded-lg transition-colors duration-200"
            style={{ color: theme.textM }}
            title={`Theme: ${theme.name}`}
          >
            <Palette size={18} strokeWidth={1.5} />
          </button>
          {/* Settings Link */}
          <Link
            href="/settings"
            className="p-2.5 rounded-lg transition-colors duration-200"
            style={{ color: theme.textM }}
          >
            <Settings size={18} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    )
  }
)

TopBar.displayName = 'TopBar'
export default TopBar
