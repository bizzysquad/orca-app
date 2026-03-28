'use client'

import React, { useState } from 'react'
import Sidebar from './Sidebar'
import DesktopTopBar from './DesktopTopBar'
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
      className="relative w-full min-h-screen flex"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        userName={userName}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:ml-[220px]">
        {/* Desktop Top Bar */}
        <DesktopTopBar
          onMenuToggle={() => setSidebarOpen(true)}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: theme.bg }}>
          <div className="max-w-[720px] mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 pb-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
