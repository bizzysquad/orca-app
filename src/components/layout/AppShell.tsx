'use client'

import React, { useState } from 'react'
import Sidebar from './Sidebar'
import DesktopTopBar from './DesktopTopBar'
import BottomNav from './BottomNav'
import { useTheme } from '@/context/ThemeContext'
import { QuickActions } from '@/components/QuickActions'

interface AppShellProps {
  children: React.ReactNode
  userName?: string
}

export default function AppShell({ children, userName = 'User' }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme } = useTheme()

  return (
    <div
      className="relative w-full min-h-screen flex overflow-x-hidden max-w-[100vw]"
      style={{ backgroundColor: theme.bg, color: theme.text, transition: 'background 0.2s' }}
    >
      {/* Sidebar — desktop only */}
      <Sidebar
        userName={userName}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-[240px] min-w-0 max-w-full overflow-x-hidden">
        {/* Desktop Top Bar */}
        <DesktopTopBar
          onMenuToggle={() => setSidebarOpen(true)}
          userName={userName}
        />

        {/* Content */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ backgroundColor: theme.bg, transition: 'background 0.2s' }}
        >
          <div className="w-full max-w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Quick Actions Command Palette (Cmd+K) */}
      <QuickActions />
    </div>
  )
}
