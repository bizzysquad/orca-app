'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Menu, Home, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

interface DesktopTopBarProps {
  onMenuToggle?: () => void
  notificationCount?: number
  userName?: string
}

export default function DesktopTopBar({ onMenuToggle, notificationCount = 0, userName = 'User' }: DesktopTopBarProps) {
  const router = useRouter()
  const { theme, isDark, toggleDark } = useTheme()
  const [customLogo, setCustomLogo] = useState<string | null>(null)

  // Read custom logo from localStorage
  useEffect(() => {
    const load = () => {
      try {
        const saved = localStorage.getItem('orca-custom-logo')
        setCustomLogo(saved)
      } catch {}
    }
    load()
    const handler = () => load()
    window.addEventListener('orca-logo-updated', handler)
    return () => {
      window.removeEventListener('orca-logo-updated', handler)
    }
  }, [])

  // Compute user initials
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const initials = getInitials(userName)

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
      {/* Left side: Hamburger + ORCA Logo + Text */}
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

        {/* ORCA Logo and Text */}
        <div className="flex items-center gap-2">
          {customLogo ? (
            <Image
              src={customLogo}
              alt="ORCA Logo"
              width={32}
              height={32}
              className="rounded"
            />
          ) : (
            <Image
              src="/logo.svg"
              alt="ORCA Logo"
              width={32}
              height={32}
              className="rounded"
            />
          )}
          <span
            className="font-bold text-lg"
            style={{ color: theme.gold }}
          >
            ORCA
          </span>
        </div>
      </div>

      {/* Right side: Home + Theme Toggle + Profile Circle */}
      <div className="flex items-center gap-2">
        {/* Home Button — navigates to Dashboard */}
        <button
          onClick={() => router.push('/dashboard')}
          className={cn(
            'p-2 rounded-lg transition-colors duration-200',
            'hover:opacity-80'
          )}
          style={{ color: theme.gold }}
          title="Go to Dashboard"
        >
          <Home size={20} strokeWidth={1.5} />
        </button>

        {/* Light/Dark Mode Toggle */}
        <button
          onClick={toggleDark}
          className={cn(
            'p-2 rounded-lg transition-colors duration-200',
            'hover:opacity-80'
          )}
          style={{ color: theme.textM }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
        </button>

        {/* Profile Circle with Initials */}
        <button
          onClick={() => router.push('/settings')}
          className={cn(
            'w-8 h-8 rounded-full transition-opacity duration-200',
            'hover:opacity-80 flex items-center justify-center',
            'font-bold text-xs'
          )}
          style={{
            background: `linear-gradient(135deg, ${theme.gold}, ${theme.goldD})`,
            color: theme.bg,
          }}
          title={userName}
        >
          {initials}
        </button>
      </div>
    </div>
  )
}
