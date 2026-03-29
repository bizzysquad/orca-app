'use client'

import React, { useState } from 'react'
import Sidebar from './Sidebar'
import DesktopTopBar from './DesktopTopBar'
import MobileHomeButton from './MobileHomeButton'
import { useTheme } from '@/context/ThemeContext'

interface AppShellProps {
  children: React.ReactNode
  notificationCount?: number
  userName?: string
}

export default function AppShell({ children, notificationCount = 0, userName = 'User' }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme } = useTheme()

  return (
    <div
      className="relative w-full min-h-screen flex overflow-x-hidden max-w-[100vw]"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        userName={userName}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-[240px] min-w-0 max-w-full overflow-x-hidden">
        {/* Desktop Top Bar */}
        <DesktopTopBar
          onMenuToggle={() => setSidebarOpen(true)}
          notificationCount={notificationCount}
          userName={userName}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ backgroundColor: theme.bg }}>
          <div className="w-full max-w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile floating scroll-to-top button */}
      <MobileHomeButton />
    </div>
  )
}
