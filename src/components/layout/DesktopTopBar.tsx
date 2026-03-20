'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DesktopTopBarProps {
  notificationCount?: number
}

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/smart-stack': 'Smart Stack',
  '/bill-boss': 'Bill Boss',
  '/stack-circle': 'Stack Circle',
  '/settings': 'Settings',
  '/admin': 'Admin Panel',
}

export default function DesktopTopBar({ notificationCount = 0 }: DesktopTopBarProps) {
  const pathname = usePathname()
  const title = ROUTE_TITLES[pathname] || 'ORCA'

  return (
    <div
      className={cn(
        'sticky top-0 z-40',
        'bg-[#09090b]/80 backdrop-blur-xl',
        'border-b border-[#27272a]/60',
        'flex items-center justify-between px-8 py-4'
      )}
    >
      <h1 className="text-xl font-semibold text-[#fafafa]">{title}</h1>

      <div className="flex items-center gap-2">
        <button className="relative p-2.5 rounded-lg text-[#a1a1aa] hover:text-[#d4a843] transition-colors duration-200">
          <Bell size={20} strokeWidth={1.5} />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#d4a843] text-[#0A0A0A] text-[10px] font-bold flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
        <Link
          href="/settings"
          className="p-2.5 rounded-lg text-[#a1a1aa] hover:text-[#d4a843] transition-colors duration-200"
        >
          <Settings size={20} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  )
}
