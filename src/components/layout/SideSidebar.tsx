'use client'

import React from 'react'
import { X, Search, SlidersHorizontal, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import NavList from './NavList'
import { openCustomize } from './CustomizePanel'
import { OrcaMark } from './OrcaMark'

interface SideSidebarProps {
  open: boolean
  onClose: () => void
  userName?: string
  onSettings?: () => void
}

// Mobile and tablet navigation drawer.
export default function SideSidebar({ open, onClose, userName, onSettings }: SideSidebarProps) {
  const { theme } = useTheme()

  const footer = [
    { label: 'Search', icon: Search, onClick: () => { onClose(); window.dispatchEvent(new CustomEvent('orca-open-quick-actions')) } },
    { label: 'Customize', icon: SlidersHorizontal, onClick: () => { onClose(); openCustomize('sidebar') } },
    { label: 'Settings', icon: Settings, onClick: () => { onClose(); onSettings?.() } },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] max-w-[85vw] flex flex-col lg:hidden"
            style={{ backgroundColor: theme.nav, borderRight: `1px solid ${theme.border}`, boxShadow: theme.shadowL }}
          >
            <div className="flex items-center justify-between px-4 h-14 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <OrcaMark />
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold tracking-tight leading-tight" style={{ color: theme.text }}>ORCA</p>
                  {userName && <p className="text-[11px] truncate" style={{ color: theme.subtext }}>{userName}</p>}
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: theme.subtext }} aria-label="Close navigation">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              <NavList onNavigate={onClose} />
            </div>

            <div className="px-3 py-3 grid grid-cols-3 gap-1.5 shrink-0" style={{ borderTop: `1px solid ${theme.border}` }}>
              {footer.map(b => (
                <button key={b.label} onClick={b.onClick} className="flex flex-col items-center gap-1 py-2 rounded-lg" style={{ color: theme.subtext, backgroundColor: `${theme.text}08` }}>
                  <b.icon size={16} />
                  <span className="text-[11px] font-medium">{b.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
