'use client'

import React from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import NavList from './NavList'

const BENTLEY_INDIGO = '#6366F1'

interface SideSidebarProps {
  open: boolean
  onClose: () => void
  userName?: string
}

export default function SideSidebar({ open, onClose, userName }: SideSidebarProps) {
  const { theme } = useTheme()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72 flex flex-col shadow-2xl"
            style={{ backgroundColor: theme.bg, borderRight: `1px solid ${theme.border}` }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor: theme.border }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff' }}
                >
                  O
                </div>
                <div>
                  <p className="font-black text-sm tracking-widest" style={{ color: BENTLEY_INDIGO }}>
                    ORCA
                  </p>
                  {userName && (
                    <p className="text-xs truncate max-w-[140px]" style={{ color: theme.textM }}>
                      {userName}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl transition-opacity hover:opacity-70"
                style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
                aria-label="Close navigation"
              >
                <X size={16} style={{ color: theme.textM }} />
              </button>
            </div>

            {/* Nav Items */}
            <div className="flex-1 overflow-y-auto px-3 py-5">
              <NavList onNavigate={onClose} />
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: theme.border }}>
              <p className="text-[11px] text-center" style={{ color: theme.textM }}>
                ORCA
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
