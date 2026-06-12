'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Sparkles, DollarSign, Briefcase, Activity,
  X, CreditCard, Star, Mic2, Car, Palette, ChevronDown, ChevronRight, Building2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'

interface SubItem {
  id: string
  name: string
  href: string
  icon: React.ElementType
}

interface NavItem {
  id: string
  name: string
  icon: React.ElementType
  href: string
  accent: string
  children?: SubItem[]
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', name: 'Home', icon: LayoutDashboard, href: '/dashboard', accent: BENTLEY_INDIGO },
  { id: 'bentley', name: 'Bentley', icon: Sparkles, href: '/bentley', accent: BENTLEY_GOLD },
  {
    id: 'finances', name: 'Finances', icon: DollarSign, href: '/bill-boss', accent: '#10B981',
    children: [
      { id: 'bill-boss', name: 'Bill Boss', href: '/bill-boss', icon: CreditCard },
      { id: 'smart-stack', name: 'Smart Smart', href: '/smart-stack', icon: Star },
    ],
  },
  {
    id: 'work', name: 'Work', icon: Briefcase, href: '/work', accent: '#F59E0B',
    children: [
      { id: 'dj-hub', name: 'DJ Business Hub', href: '/dj-hub', icon: Building2 },
      { id: 'dj', name: 'DJ Gig Manager', href: '/dj', icon: Mic2 },
      { id: 'lyft', name: 'Lyft Metrics', href: '/lyft', icon: Car },
      { id: 'bizzplug', name: 'BizzyPlug', href: '/bizzplug', icon: Palette },
    ],
  },
  { id: 'life', name: 'Life', icon: Activity, href: '/fitness', accent: '#EC4899' },
]

interface SideSidebarProps {
  open: boolean
  onClose: () => void
  userName?: string
}

export default function SideSidebar({ open, onClose, userName }: SideSidebarProps) {
  const pathname = usePathname()
  const { theme } = useTheme()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['finances', 'work']))

  const isParentActive = (item: NavItem): boolean => {
    if (item.href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    if (item.id === 'finances') return pathname.startsWith('/bill-boss') || pathname.startsWith('/smart-stack')
    if (item.id === 'work') return pathname.startsWith('/work') || pathname.startsWith('/dj') || pathname.startsWith('/lyft') || pathname.startsWith('/bizzplug') || pathname.startsWith('/dj-hub')
    if (item.id === 'life') return pathname.startsWith('/fitness') || pathname.startsWith('/grocery')
    return pathname.startsWith(item.href)
  }

  const isChildActive = (href: string): boolean =>
    pathname === href || pathname.startsWith(href + '/')

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {NAV_ITEMS.map(item => {
                const active = isParentActive(item)
                const Icon = item.icon
                const accent = item.accent
                const hasChildren = item.children && item.children.length > 0
                const expanded = expandedItems.has(item.id)

                return (
                  <div key={item.id}>
                    {/* Parent row */}
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        onClick={() => { if (!hasChildren) onClose() }}
                        className="flex-1 flex items-center gap-3 px-3 py-3 rounded-xl transition-all"
                        style={{
                          backgroundColor: active ? `${accent}18` : 'transparent',
                          color: active ? accent : theme.textM,
                        }}
                      >
                        {item.id === 'bentley' ? (
                          <div
                            className="p-1.5 rounded-full shrink-0"
                            style={{
                              background: active
                                ? `linear-gradient(135deg, ${BENTLEY_GOLD}, #D97706)`
                                : `${BENTLEY_GOLD}20`,
                            }}
                          >
                            <Icon size={14} style={{ color: active ? '#fff' : BENTLEY_GOLD }} />
                          </div>
                        ) : (
                          <Icon size={19} strokeWidth={active ? 2.2 : 1.5} className="shrink-0" />
                        )}
                        <span className="font-semibold text-sm leading-none">{item.name}</span>
                        {active && !hasChildren && (
                          <div
                            className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: accent }}
                          />
                        )}
                      </Link>

                      {hasChildren && (
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="p-2 rounded-lg transition-opacity hover:opacity-70 ml-0.5"
                          style={{ color: active ? accent : theme.textM }}
                          aria-label={expanded ? 'Collapse' : 'Expand'}
                        >
                          {expanded
                            ? <ChevronDown size={14} />
                            : <ChevronRight size={14} />
                          }
                        </button>
                      )}
                    </div>

                    {/* Sub-items */}
                    <AnimatePresence initial={false}>
                      {hasChildren && expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="ml-4 pl-3 mt-0.5 mb-1 space-y-0.5 border-l"
                            style={{ borderColor: `${accent}35` }}
                          >
                            {item.children!.map(child => {
                              const childActive = isChildActive(child.href)
                              const ChildIcon = child.icon
                              return (
                                <Link
                                  key={child.id}
                                  href={child.href}
                                  onClick={onClose}
                                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all"
                                  style={{
                                    backgroundColor: childActive ? `${accent}12` : 'transparent',
                                    color: childActive ? accent : theme.textM,
                                    fontWeight: childActive ? 600 : 400,
                                  }}
                                >
                                  <ChildIcon size={14} className="shrink-0" />
                                  <span className="text-sm">{child.name}</span>
                                  {childActive && (
                                    <div
                                      className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: accent }}
                                    />
                                  )}
                                </Link>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: theme.border }}>
              <p className="text-[11px] text-center" style={{ color: theme.textM }}>
                ORCA · Powered by Bentley AI
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
