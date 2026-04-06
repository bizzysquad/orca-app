'use client'

import React, { useState } from 'react'
import Sidebar from './Sidebar'
import DesktopTopBar from './DesktopTopBar'
import MobileHomeButton from './MobileHomeButton'
import { useTheme } from '@/context/ThemeContext'

interface AppShellProps {
  children: React.ReactNode
  userName?: string
}

export default function AppShell({ children, userName = 'User' }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, isDark } = useTheme()

  const pageBg = theme.bg
  const textColor = theme.text

  return (
    <div
      className="relative w-full min-h-screen flex overflow-x-hidden max-w-[100vw]"
      style={{ backgroundColor: pageBg, color: textColor, transition: 'background 0.2s' }}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        userName={userName}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area — lg breakpoint matches V10 (1024px) */}
      <div className="flex-1 flex flex-col lg:ml-[240px] min-w-0 max-w-full overflow-x-hidden">
        {/* Desktop Top Bar */}
        <DesktopTopBar
          onMenuToggle={() => setSidebarOpen(true)}
          userName={userName}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ backgroundColor: pageBg, transition: 'background 0.2s' }}>
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
