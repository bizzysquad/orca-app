'use client'

/**
 * ORCA Global Quick Actions Command Palette
 *
 * Triggered via Cmd+K / Ctrl+K or a floating button.
 * Available actions: add bill, log income, mark bill as paid,
 *                    create savings goal, add task
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Search, X, DollarSign, Receipt, CheckSquare, Target, Plus } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { orcaEvents } from '@/lib/eventBus'

interface QuickActionItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  color: string
  action: () => void
  keywords: string[]
}

interface QuickActionsProps {
  onAddBill?: () => void
  onLogIncome?: () => void
  onMarkBillPaid?: () => void
  onCreateGoal?: () => void
  onAddTask?: () => void
}

export function QuickActions({ onAddBill, onLogIncome, onMarkBillPaid, onCreateGoal, onAddTask }: QuickActionsProps) {
  const { theme } = useTheme()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const actions: QuickActionItem[] = [
    {
      id: 'add-bill',
      label: 'Add Bill',
      description: 'Create a new bill or recurring payment',
      icon: <Receipt size={18} />,
      color: '#EF4444',
      keywords: ['add', 'bill', 'payment', 'expense', 'new bill'],
      action: () => {
        setOpen(false)
        if (onAddBill) { onAddBill() }
        else { router.push('/bill-boss') }
      },
    },
    {
      id: 'log-income',
      label: 'Log Income',
      description: 'Record a payment received',
      icon: <DollarSign size={18} />,
      color: '#10B981',
      keywords: ['income', 'log', 'payment', 'received', 'earn', 'money'],
      action: () => {
        setOpen(false)
        if (onLogIncome) { onLogIncome() }
        else { router.push('/smart-stack?tab=income') }
        orcaEvents.broadcast('income.logged')
      },
    },
    {
      id: 'mark-paid',
      label: 'Mark Bill as Paid',
      description: 'Record payment for an upcoming bill',
      icon: <CheckSquare size={18} />,
      color: '#6366F1',
      keywords: ['paid', 'mark', 'bill', 'complete', 'done', 'pay'],
      action: () => {
        setOpen(false)
        if (onMarkBillPaid) { onMarkBillPaid() }
        else { router.push('/bill-boss') }
      },
    },
    {
      id: 'create-goal',
      label: 'Create Savings Goal',
      description: 'Set a new savings target',
      icon: <Target size={18} />,
      color: '#F59E0B',
      keywords: ['savings', 'goal', 'create', 'target', 'save'],
      action: () => {
        setOpen(false)
        if (onCreateGoal) { onCreateGoal() }
        else { router.push('/smart-stack?tab=savings') }
      },
    },
    {
      id: 'add-task',
      label: 'Add Task',
      description: 'Create a new task or reminder',
      icon: <Plus size={18} />,
      color: '#8B5CF6',
      keywords: ['task', 'add', 'todo', 'reminder', 'new task'],
      action: () => {
        setOpen(false)
        if (onAddTask) { onAddTask() }
        else { router.push('/task-list') }
        orcaEvents.broadcast('task.updated')
      },
    },
  ]

  const filteredActions = query.trim()
    ? actions.filter(a =>
        a.label.toLowerCase().includes(query.toLowerCase()) ||
        a.description.toLowerCase().includes(query.toLowerCase()) ||
        a.keywords.some(k => k.includes(query.toLowerCase()))
      )
    : actions

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [open])

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{ backgroundColor: theme.accent, color: '#fff' }}
        aria-label="Quick Actions (Cmd+K)"
        title="Quick Actions (Cmd+K)"
      >
        <Search size={20} />
      </motion.button>

      {/* Palette overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) setOpen(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: theme.border }}>
                <Search size={18} style={{ color: theme.textS }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: theme.text }}
                  aria-label="Search commands"
                />
                <div className="flex items-center gap-1">
                  <kbd className="text-[10px] px-1.5 py-0.5 rounded border font-mono" style={{ color: theme.textS, borderColor: theme.border }}>ESC</kbd>
                  <button onClick={() => setOpen(false)} style={{ color: theme.textS }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Actions List */}
              <div className="p-2 max-h-80 overflow-y-auto">
                {filteredActions.length === 0 ? (
                  <p className="text-center text-sm py-8" style={{ color: theme.textS }}>No commands found</p>
                ) : (
                  filteredActions.map(action => (
                    <button
                      key={action.id}
                      onClick={action.action}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all hover:opacity-80"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${theme.border}40`)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${action.color}20`, color: action.color }}>
                        {action.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: theme.text }}>{action.label}</p>
                        <p className="text-xs" style={{ color: theme.textS }}>{action.description}</p>
                      </div>
                      <ArrowRight size={14} className="ml-auto opacity-30" style={{ color: theme.textS }} />
                    </button>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2.5 border-t flex items-center gap-2" style={{ borderColor: theme.border }}>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded border font-mono" style={{ color: theme.textS, borderColor: theme.border }}>⌘K</kbd>
                <span className="text-[10px]" style={{ color: theme.textS }}>to open anywhere</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Re-export the ArrowRight we used
function ArrowRight({ size, className, style }: { size: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}>
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  )
}
