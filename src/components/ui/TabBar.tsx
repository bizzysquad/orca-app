'use client'

import React, { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Tab {
  id: string
  label: string
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'bottom-border' | 'pill'
}

const TabBar: React.FC<TabBarProps> = ({ tabs, activeTab, onChange, variant = 'bottom-border' }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeTabRef.current && containerRef.current) {
      const container = containerRef.current
      const tab = activeTabRef.current

      if (tab.offsetLeft < container.scrollLeft || tab.offsetLeft + tab.offsetWidth > container.scrollLeft + container.offsetWidth) {
        container.scrollLeft = tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2
      }
    }
  }, [activeTab])

  if (variant === 'pill') {
    return (
      <div className="flex items-center gap-2 bg-brand-soft p-1.5 rounded-full w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-4 py-2 rounded-full font-medium transition-all duration-200 text-sm',
              activeTab === tab.id
                ? 'bg-gold text-black'
                : 'text-text-muted hover:text-gold'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-6 overflow-x-auto scrollbar-hide border-b border-surface-border/30 relative"
    >
      {tabs.map((tab) => (
        <div key={tab.id} ref={activeTab === tab.id ? activeTabRef : null} className="relative">
          <button
            onClick={() => onChange(tab.id)}
            className={cn(
              'py-4 px-2 font-medium text-sm whitespace-nowrap transition-colors duration-200',
              activeTab === tab.id ? 'text-gold' : 'text-text-muted hover:text-text-primary'
            )}
          >
            {tab.label}
          </button>

          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-1 bg-gold rounded-t-full"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default TabBar
