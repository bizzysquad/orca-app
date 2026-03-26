'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Bell, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title?: string
  notificationCount?: number
}

const TopBar = React.forwardRef<HTMLDivElement, TopBarProps>(
  ({ title = 'ORCA', notificationCount = 0 }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'fixed top-0 left-0 right-0 z-50',
          'bg-brand-soft/90 backdrop-blur-xl',
          'border-b border-surface-border/60',
          'flex items-center justify-between px-5 py-3.5',
          'max-w-lg mx-auto w-full md:left-1/2 md:-translate-x-1/2'
        )}
      >
        <div className="flex-shrink-0">
          <Image src="/logo-sm.png" alt="ORCA" width={28} height={28} priority className="rounded-lg" />
        </div>

        <h1 className="flex-1 text-center font-semibold text-sm text-text-primary tracking-[0.15em] uppercase">
          {title}
        </h1>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Link
            href="/notifications"
            className="relative p-2.5 rounded-lg text-text-muted hover:text-gold transition-colors duration-200"
          >
            <Bell size={18} strokeWidth={1.5} />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-2xs font-bold flex items-center justify-center" style={{ backgroundColor: '#d4a843', color: '#09090b' }}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </Link>

          <Link
            href="/settings"
            className="p-2.5 rounded-lg text-text-muted hover:text-gold transition-colors duration-200"
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
