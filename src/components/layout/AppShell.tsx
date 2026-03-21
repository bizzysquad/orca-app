'use client'

import React from 'react'
import Sidebar from './Sidebar'
import DesktopTopBar from './DesktopTopBar'

interface AppShellProps {
  children: React.ReactNode
  notificationCount?: number
  userName?: string
}

export default function AppShell({ children, notificationCount = 0, userName = 'User' }: AppShellProps) {
  return (
    <div className="relative w-full min-h-screen bg-[#09090b] text-[#fafafa] flex">
      {/* Sidebar Navigation */}
      <Sidebar userName={userName} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-[220px]">
        {/* Desktop Top Bar */}
        <DesktopTopBar notificationCount={notificationCount} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[720px] mx-auto w-full px-6 py-6 pb-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
