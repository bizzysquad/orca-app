'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ChevronRight, Users, Copy, ChevronLeft, ChevronUp, ChevronDown,
  DollarSign, Receipt, Palmtree, Calendar,
  GripVertical, Pin, PinOff, PiggyBank, Wallet,
  TrendingUp, ArrowUpRight, ArrowDownRight, CreditCard,
  Bell,
} from 'lucide-react'

import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt, fmtD, daysTo, calcAlloc, pct } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'
import { useTheme } from '@/context/ThemeContext'
import type { Bill } from '@/lib/types'
import {
  calcSafeToSpend,
  paymentsToEvents,
  getNextCycleDate,
  type IncomingPayment,
} from '@/lib/income-engine'

const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 24 } },
}

function CreditScoreRing({ score, limit, theme }: { score: number; limit: number; theme: any }) {
  const circ = 2 * Math.PI * 42
  const offset = circ - (score / limit) * circ

  let color = '#ef4444'
  let label = 'Poor'

  if (score >= 800) {
    color = '#22c55e'
    label = 'Excellent'
  } else if (score >= 740) {
    color = '#22c55e'
    label = 'Very Good'
  } else if (score >= 670) {
    color = '#f59e0b'
    label = 'Good'
  } else if (score >= 580) {
    color = '#f59e0b'
    label = 'Fair'
  }

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke={theme.border} strokeWidth="4" />
        <motion.circle
          cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ} strokeLinecap="round"
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <p className="text-xl font-bold" style={{ color: theme.text }}>{score}</p>
          <p className="text-xs font-semibold text-center" style={{ color }}>{label}</p>
        </motion.div>
      </div>
    </div>
  )
}

function ProgressBar({ current, target, color = '#6366F1', theme }: { current: number; target: number; color?: string; theme: any }) {
  const percentage = Math.min((current / target) * 100, 100)
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}

// Calendar event types
interface CalendarEvent {
  date: number
  type: 'paycheck' | 'bill' | 'dayoff' | 'task' | 'group'
  label: string
  amount?: number
}

function MonthlyCalendar({ events, month, year, onMonthChange, onDayClick, selectedDay, theme }: {
  events: CalendarEvent[]
  month: number
  year: number
  onMonthChange: (dir: number) => void
  onDayClick?: (day: number) => void
  selectedDay?: number | null
  theme: any
}) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayDate = new Date()
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month
  const todayDay = isCurrentMonth ? todayDate.getDate() : -1

  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const getEventsForDay = (day: number) => events.filter(e => e.date === day)

  const eventDot = (type: string) => {
    if (type === 'paycheck') return '#10B981'
    if (type === 'bill') return '#EF4444'
    if (type === 'dayoff') return '#3b82f6'
    if (type === 'task') return '#a855f7'
    if (type === 'group') return '#F59E0B'
    return theme.textM
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="aspect-square" />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = getEventsForDay(d)
    const isToday = d === todayDay
    cells.push(
      <div
        key={d}
        onClick={() => onDayClick?.(d)}
        className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all text-xs sm:text-sm cursor-pointer ${
          isToday
            ? 'border'
            : selectedDay === d
            ? 'border'
            : 'hover:opacity-70'
        }`}
        style={{
          backgroundColor: isToday ? '#6366F120' : selectedDay === d ? '#6366F110' : 'transparent',
          borderColor: isToday ? '#6366F1' : selectedDay === d ? '#6366F150' : 'transparent',
        }}
      >
        <span style={{ color: isToday ? '#6366F1' : theme.textS, fontWeight: 500 }}>
          {d}
        </span>
        {dayEvents.length > 0 && (
          <div className="flex gap-0.5 mt-0.5">
            {dayEvents.slice(0, 3).map((ev, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: eventDot(ev.type) }}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(-1)} className="p-2 rounded-lg transition-colors" style={{ color: theme.textS }}>
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={16} style={{ color: '#0891B2' }} />
          <h3 className="font-semibold" style={{ color: theme.text }}>{monthName}</h3>
        </div>
        <button onClick={() => onMonthChange(1)} className="p-2 rounded-lg transition-colors" style={{ color: theme.textS }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] sm:text-xs font-semibold py-1" style={{ color: theme.textM }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells}
      </div>

      <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 pt-3 border-t" style={{ borderColor: `${theme.border}60` }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Payment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Bill Due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Day Off</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#a855f7' }} />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Task</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Group</span>
        </div>
      </div>

      {selectedDay && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: `${theme.border}60` }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: theme.text }}>
              {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <button onClick={() => onDayClick?.(0)} className="text-xs" style={{ color: theme.textS }}>Close</button>
          </div>
          {getEventsForDay(selectedDay).length > 0 ? (
            <div className="space-y-2">
              {getEventsForDay(selectedDay).map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: `${theme.border}40` }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: eventDot(ev.type) }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: theme.text }}>{ev.label}</p>
                      <p className="text-xs" style={{ color: theme.textM }}>
                        {new Date(year, month, selectedDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {ev.amount && (
                    <p className="text-sm font-bold" style={{ color: eventDot(ev.type) }}>
                      {ev.type === 'bill' ? '-' : '+'}{fmt(ev.amount)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: theme.textM }}>No events scheduled</p>
          )}
        </div>
      )}
    </div>
  )
}

function DraggableSection({ id, children, index, onMoveUp, onMoveDown, isFirst, isLast, isReordering, isPinned, onTogglePin, theme }: {
  id: string
  children: React.ReactNode
  index: number
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  isFirst: boolean
  isLast: boolean
  isReordering: boolean
  isPinned: boolean
  onTogglePin: (id: string) => void
  theme: any
}) {
  const sectionLabels: Record<string, string> = {
    'financial-cards': 'Financial Overview',
    'spend-paycheck': 'Spending & Income',
    'rent-tracker': 'Rent Tracker',
    'calendar': 'Calendar',
    'credit-score': 'Credit Score',
    'stack-circle': 'Stack Circle',
  }

  return (
    <motion.div variants={fadeUp} className="relative">
      {isReordering && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 mb-2"
        >
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => onTogglePin(id)}
            style={{
              backgroundColor: isPinned ? '#6366F130' : theme.border,
              color: isPinned ? '#6366F1' : theme.textM,
              borderColor: isPinned ? '#6366F1' : theme.border,
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center border"
            title={isPinned ? 'Unpin from top' : 'Pin to top'}
          >
            {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
          </motion.button>
          {!isPinned && (
            <div className="flex items-center gap-1">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => onMoveUp(index)}
                disabled={isFirst}
                style={{
                  backgroundColor: isFirst ? theme.border : '#6366F1',
                  color: isFirst ? theme.textM : '#fff',
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:cursor-not-allowed"
              >
                <ChevronUp size={16} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => onMoveDown(index)}
                disabled={isLast}
                style={{
                  backgroundColor: isLast ? theme.border : '#6366F1',
                  color: isLast ? theme.textM : '#fff',
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:cursor-not-allowed"
              >
                <ChevronDown size={16} />
              </motion.button>
            </div>
          )}
          <span style={{ color: theme.textS }} className="text-sm font-medium">
            {sectionLabels[id] || id}
            {isPinned && <span style={{ color: '#6366F1' }} className="ml-2 text-xs font-bold">PINNED</span>}
          </span>
        </motion.div>
      )}
      <div style={isReordering ? { borderColor: isPinned ? '#6366F160' : '#6366F140', borderWidth: 1, borderStyle: isPinned ? 'solid' : 'dashed', borderRadius: 12, padding: 4 } : {}}>
        {children}
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { theme } = useTheme()
  const { data, loading } = useOrcaData()
  const { user, income, goals, groups } = data
  const group = groups[0] || null

  // Re-render trigger for when cloud data is hydrated into localStorage
  const [syncReady, setSyncReady] = useState(0)
  useEffect(() => {
    const handler = () => setSyncReady(c => c + 1)
    window.addEventListener('orca-sync-ready', handler)
    return () => window.removeEventListener('orca-sync-ready', handler)
  }, [])

  // Re-render trigger for local writes (e.g. Smart Stack adds a payment)
  const [localWriteTick, setLocalWriteTick] = useState(0)
  useEffect(() => {
    const handler = (e: any) => {
      const key = e?.detail?.key || ''
      if (key.includes('payment') || key.includes('savings') || key.includes('bills') || key.includes('task') || key.includes('stack-circle')) {
        setLocalWriteTick(c => c + 1)
      }
    }
    window.addEventListener('orca-local-write', handler)
    return () => window.removeEventListener('orca-local-write', handler)
  }, [])

  // Bills: use context data, fallback to localStorage
  const bills: Bill[] = useMemo(() => {
    if (data.bills && data.bills.length > 0) return data.bills
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('orca-bills')
        if (saved) return JSON.parse(saved) as Bill[]
      } catch {}
    }
    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.bills, syncReady])

  // Fetch real user name from Supabase auth, with fallback chain
  const [realUserName, setRealUserName] = useState<string | null>(null)
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data: authData }) => {
      const name = authData.user?.user_metadata?.full_name
        || authData.user?.user_metadata?.display_name
        || authData.user?.email?.split('@')[0]
        || null
      setRealUserName(name)
    })
  }, [])

  // Priority: OrcaData user.name (persisted / editable in Settings) > Supabase auth name > fallback
  const displayName = useMemo(() => {
    if (user.name && user.name.trim() && user.name !== '') return user.name
    if (realUserName) return realUserName
    return ''
  }, [user.name, realUserName])

  const firstName = displayName ? displayName.split(' ')[0] : ''

  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calendarView, setCalendarView] = useState<'monthly' | 'weekly'>('monthly')
  const [weekOffset, setWeekOffset] = useState(0)
  const [spendView, setSpendView] = useState<'weekly' | 'daily'>('weekly')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedWeekDay, setSelectedWeekDay] = useState<Date | null>(null)
  const [safeToSpendView, setSafeToSpendView] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'financial-cards',
    'spend-paycheck',
    'calendar',
    'credit-score',
    'stack-circle',
  ])

  // Load section order from localStorage — merge in any new sections that were added
  useEffect(() => {
    const defaultSections = ['financial-cards', 'spend-paycheck', 'calendar', 'credit-score', 'stack-circle']
    const saved = localStorage.getItem('orca-dashboard-order')
    if (saved) {
      try {
        // Filter out any removed sections (e.g. task-list was removed from dashboard)
        const parsed: string[] = JSON.parse(saved).filter((s: string) => defaultSections.includes(s))
        // Find any sections that exist in defaults but not in saved order
        const missing = defaultSections.filter(s => !parsed.includes(s))
        if (missing.length > 0) {
          const merged = [...parsed, ...missing]
          setSectionOrder(merged)
          localStorage.setItem('orca-dashboard-order', JSON.stringify(merged))
        } else {
          setSectionOrder(parsed)
        }
      } catch (e) {
        // Keep default order if parsing fails
      }
    }
  }, [])

  const handleMonthChange = (dir: number) => {
    let m = calMonth + dir
    let y = calYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCalMonth(m)
    setCalYear(y)
  }

  const allocation = useMemo(() => calcAlloc(income, bills, goals), [income, bills, goals])

  // Checking / Spending Account balance (from Settings)
  const checkingBalance = useMemo(() => {
    // Primary: context data
    if (user.checkingBalance && user.checkingBalance > 0) return user.checkingBalance
    // Fallback: localStorage user-settings
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('orca-user-settings')
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed.checkingBalance && parsed.checkingBalance > 0) return parsed.checkingBalance
        }
      } catch {}
    }
    return 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.checkingBalance, syncReady, localWriteTick])

  // Safe to Spend — checking balance + upcoming income minus ALL upcoming unpaid bills
  const safeToSpend = useMemo(() => {
    // Get all upcoming income
    let payments: any[] = []
    if (data.incomingPayments && data.incomingPayments.length > 0) {
      payments = data.incomingPayments
    }
    if (payments.length === 0 && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('orca-payment-entries')
        if (stored) payments = JSON.parse(stored)
      } catch {}
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Total income from all upcoming expected payments
    const totalIncome = payments
      .filter((p: any) => new Date(p.date + 'T23:59:59') >= today && p.status !== 'received')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

    // Total of ALL upcoming unpaid bills
    const totalBills = bills
      .filter(b => b.status !== 'paid')
      .reduce((sum, b) => sum + b.amount, 0)

    // Savings allocation
    const savingsPerCycle = goals
      .filter(g => g.active && g.current < g.target)
      .reduce((sum, g) => sum + (g.cVal || 0), 0)

    const buffer = user.safeToSpendBuffer || 0

    // Available funds = checking balance + upcoming income
    const totalAvailable = checkingBalance + totalIncome
    const totalObligations = totalBills + savingsPerCycle + buffer
    const amount = Math.max(0, totalAvailable - totalObligations)

    // Days until next 30-day window for daily/weekly rate
    const daysInWindow = 30
    return {
      amount,
      weekly: (amount / daysInWindow) * 7,
      daily: amount / daysInWindow,
      totalIncome,
      totalBills,
      totalAvailable,
      totalObligations,
      checkingBalance,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bills, goals, user.safeToSpendBuffer, data.incomingPayments, checkingBalance, syncReady, localWriteTick])

  const totalSavings = useMemo(() => {
    // Include savings accounts from localStorage
    let total = goals.reduce((sum, g) => sum + g.current, 0)
    if (typeof window !== 'undefined') {
      try {
        const savedAccounts = localStorage.getItem('orca-savings-accounts')
        if (savedAccounts) {
          const accounts = JSON.parse(savedAccounts)
          const acctTotal = accounts.reduce((sum: number, a: any) => sum + (a.amount || 0), 0)
          // Only add if goals don't already include savings-acct- entries
          if (!goals.some(g => g.id?.startsWith('savings-acct-'))) {
            total += acctTotal
          }
        }
      } catch {}
    }
    return total
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, syncReady])

  const allUpcomingBills = useMemo(
    () => bills.filter(b => b.status === 'upcoming').sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()),
    [bills]
  )

  // Next upcoming bill for preview on dashboard
  const nextBill = useMemo(() => allUpcomingBills[0] || null, [allUpcomingBills])

  // Bills due this week (or today)
  const billsDueThisWeek = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    return bills
      .filter(b => {
        if (b.status === 'paid') return false
        const due = new Date(b.due + 'T00:00:00')
        return due >= today && due <= endOfWeek
      })
      .reduce((sum, b) => sum + b.amount, 0)
  }, [bills])

  const billsDueToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return bills
      .filter(b => b.status !== 'paid' && b.due === today)
      .reduce((sum, b) => sum + b.amount, 0)
  }, [bills])

  // Also check all bills sorted by due date for the next one coming up
  const nextBillAny = useMemo(() => {
    if (nextBill) return nextBill
    const sorted = [...bills].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
    return sorted[0] || null
  }, [nextBill, bills])

  // Next incoming payment from payment entries — reads context first, then localStorage fallback
  const nextIncomingPayment = useMemo(() => {
    let entries: any[] = []
    // Primary: context data (written by Smart Stack on add/edit)
    if (data.incomingPayments && data.incomingPayments.length > 0) {
      entries = data.incomingPayments
    }
    // Fallback: localStorage
    if (entries.length === 0 && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('orca-payment-entries')
        if (stored) entries = JSON.parse(stored)
      } catch {}
    }
    if (entries.length === 0) return null
    const upcoming = entries
      .filter((p: any) => {
        const pDate = new Date(p.date + 'T23:59:59')
        return pDate >= new Date() && p.status !== 'received'
      })
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return upcoming[0] || null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.incomingPayments, syncReady, localWriteTick])

  // Total income from all upcoming payment entries (for Safe to Spend clarity)
  const totalUpcomingIncome = useMemo(() => {
    let entries: any[] = []
    if (data.incomingPayments && data.incomingPayments.length > 0) {
      entries = data.incomingPayments
    }
    if (entries.length === 0 && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('orca-payment-entries')
        if (stored) entries = JSON.parse(stored)
      } catch {}
    }
    return entries
      .filter((p: any) => new Date(p.date + 'T23:59:59') >= new Date() && p.status !== 'received')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.incomingPayments, syncReady, localWriteTick])

  // Savings goal total for progress tracking
  const savingsGoalTotal = useMemo(() => {
    let goalTotal = goals.reduce((sum, g) => sum + g.target, 0)
    if (typeof window !== 'undefined') {
      try {
        const savedAccounts = localStorage.getItem('orca-savings-accounts')
        if (savedAccounts) {
          const accounts = JSON.parse(savedAccounts)
          const acctGoalTotal = accounts.reduce((sum: number, a: any) => sum + (a.goal || 0), 0)
          if (!goals.some(g => g.id?.startsWith('savings-acct-'))) {
            goalTotal += acctGoalTotal
          }
        }
      } catch {}
    }
    return goalTotal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals, syncReady])

  // Stack Circle stats from localStorage (all groups)
  const stackCircleStats = useMemo(() => {
    const allGroups: any[] = []
    if (group) allGroups.push(group)
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('orca-stack-circle-groups')
        if (saved) {
          const parsed = JSON.parse(saved)
          parsed.forEach((g: any) => {
            if (!allGroups.some(eg => eg.id === g.id)) allGroups.push(g)
          })
        }
      }
    } catch {}
    return {
      groups: allGroups,
      totalGroups: allGroups.length,
      totalMembers: allGroups.reduce((sum: number, g: any) => sum + (g.members?.length || 0), 0),
      totalSaved: allGroups.reduce((sum: number, g: any) => sum + (g.current || 0), 0),
      totalTarget: allGroups.reduce((sum: number, g: any) => sum + (g.target || 0), 0),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, syncReady, localWriteTick])

  // Build calendar events for the selected month — Incoming Payments are the only income source
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = []

    bills.forEach(bill => {
      const d = new Date(bill.due + 'T00:00:00')
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        events.push({ date: d.getDate(), type: 'bill', label: bill.name, amount: bill.amount })
      }
    })

    // Add tasks from localStorage (deduplicated)
    if (typeof window !== 'undefined') {
      const seenTasks = new Set<string>()
      const allTasks: any[] = []
      try {
        const savedTasks = localStorage.getItem('orca-tasks')
        if (savedTasks) allTasks.push(...JSON.parse(savedTasks))
      } catch {}
      if ((window as any).__ORCA_TASKS) {
        allTasks.push(...(window as any).__ORCA_TASKS)
      }
      allTasks.forEach((task: any) => {
        if (task.dueDate) {
          const taskDate = new Date(task.dueDate + 'T00:00:00')
          if (taskDate.getMonth() === calMonth && taskDate.getFullYear() === calYear) {
            const label = task.title || task.name || task.text || 'Task'
            const key = `${taskDate.getDate()}-${label}`
            if (!seenTasks.has(key)) {
              seenTasks.add(key)
              events.push({ date: taskDate.getDate(), type: 'task', label })
            }
          }
        }
      })
    }

    // Add group dates from all groups in localStorage
    if (typeof window !== 'undefined') {
      try {
        const savedGroups = localStorage.getItem('orca-stack-circle-groups')
        if (savedGroups) {
          const allGroups = JSON.parse(savedGroups)
          allGroups.forEach((g: any) => {
            if (g.date) {
              const gd = new Date(g.date + 'T00:00:00')
              if (gd.getMonth() === calMonth && gd.getFullYear() === calYear) {
                events.push({ date: gd.getDate(), type: 'group', label: g.customName || g.name || 'Stack Circle' })
              }
            }
          })
        }
      } catch {}

      // Add Incoming Payment entries (expand recurring into visible month)
      try {
        const savedPayments = localStorage.getItem('orca-payment-entries')
        if (savedPayments) {
          const payments = JSON.parse(savedPayments)
          payments.forEach((p: any) => {
            if (!p.date) return
            const baseDate = new Date(p.date + 'T00:00:00')
            const recurrence = p.recurrence || 'none'

            if (recurrence === 'none') {
              // One-time: show only if in viewed month
              if (baseDate.getMonth() === calMonth && baseDate.getFullYear() === calYear) {
                events.push({ date: baseDate.getDate(), type: 'paycheck', label: p.description || 'Payment', amount: p.amount })
              }
            } else {
              // Recurring: generate occurrences for the viewed month
              const intervalDays = recurrence === 'weekly' ? 7 : recurrence === 'biweekly' ? 14 : 0
              const monthStart = new Date(calYear, calMonth, 1)
              const monthEnd = new Date(calYear, calMonth + 1, 0)

              if (recurrence === 'monthly') {
                // Monthly: same day each month (clamped to month length)
                const day = Math.min(baseDate.getDate(), monthEnd.getDate())
                const candidate = new Date(calYear, calMonth, day)
                if (candidate >= baseDate) {
                  events.push({ date: candidate.getDate(), type: 'paycheck', label: p.description || 'Payment', amount: p.amount })
                }
              } else if (intervalDays > 0) {
                // Weekly / biweekly: step from base date into the viewed month
                const cursor = new Date(baseDate)
                // Fast-forward to near the month start
                if (cursor < monthStart) {
                  const daysGap = Math.floor((monthStart.getTime() - cursor.getTime()) / (86400000 * intervalDays)) * intervalDays
                  cursor.setDate(cursor.getDate() + daysGap)
                }
                // Step backward once in case we overshot
                while (cursor > monthEnd) cursor.setDate(cursor.getDate() - intervalDays)
                // Walk forward and collect hits
                while (cursor <= monthEnd) {
                  if (cursor >= monthStart && cursor >= baseDate) {
                    events.push({ date: cursor.getDate(), type: 'paycheck', label: p.description || 'Payment', amount: p.amount })
                  }
                  cursor.setDate(cursor.getDate() + intervalDays)
                }
              }
            }
          })
        }
      } catch {}
    }

    // Fallback: add group date from context if exists
    if (group?.date) {
      const groupDate = new Date(group.date + 'T00:00:00')
      if (groupDate.getMonth() === calMonth && groupDate.getFullYear() === calYear) {
        if (!events.some(e => e.type === 'group' && e.date === groupDate.getDate())) {
          events.push({ date: groupDate.getDate(), type: 'group', label: `${group.name} Event` })
        }
      }
    }

    return events
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calMonth, calYear, bills, group, syncReady, localWriteTick])

  // Compute current week dates for weekly view
  const weekDates = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - dayOfWeek + (weekOffset * 7))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      return d
    })
  }, [weekOffset])

  // Build events scoped to the visible week (handles cross-month weeks)
  const weeklyEvents = useMemo(() => {
    if (!weekDates.length) return new Map<string, CalendarEvent[]>()
    const weekStart = weekDates[0]
    const weekEnd = weekDates[6]
    const dateKey = (d: Date) => d.toISOString().slice(0, 10)
    const inWeek = (d: Date) => d >= weekStart && d <= weekEnd
    const map = new Map<string, CalendarEvent[]>()
    weekDates.forEach(d => map.set(dateKey(d), []))

    const pushEv = (d: Date, ev: CalendarEvent) => {
      const k = dateKey(d)
      if (map.has(k)) map.get(k)!.push(ev)
    }

    // Bills
    bills.forEach(bill => {
      const d = new Date(bill.due + 'T00:00:00')
      if (inWeek(d)) pushEv(d, { date: d.getDate(), type: 'bill', label: bill.name, amount: bill.amount })
    })

    // Tasks
    if (typeof window !== 'undefined') {
      const seenTasks = new Set<string>()
      const allTasks: any[] = []
      try { const s = localStorage.getItem('orca-tasks'); if (s) allTasks.push(...JSON.parse(s)) } catch {}
      if ((window as any).__ORCA_TASKS) allTasks.push(...(window as any).__ORCA_TASKS)
      allTasks.forEach((task: any) => {
        if (task.dueDate) {
          const td = new Date(task.dueDate + 'T00:00:00')
          if (inWeek(td)) {
            const label = task.title || task.name || task.text || 'Task'
            const key = `${dateKey(td)}-${label}`
            if (!seenTasks.has(key)) { seenTasks.add(key); pushEv(td, { date: td.getDate(), type: 'task', label }) }
          }
        }
      })

      // Groups
      try {
        const sg = localStorage.getItem('orca-stack-circle-groups')
        if (sg) JSON.parse(sg).forEach((g: any) => {
          if (g.date) { const gd = new Date(g.date + 'T00:00:00'); if (inWeek(gd)) pushEv(gd, { date: gd.getDate(), type: 'group', label: g.customName || g.name || 'Stack Circle' }) }
        })
      } catch {}

      // Payments
      try {
        const sp = localStorage.getItem('orca-payment-entries')
        if (sp) JSON.parse(sp).forEach((p: any) => {
          if (!p.date) return
          const base = new Date(p.date + 'T00:00:00')
          const rec = p.recurrence || 'none'
          if (rec === 'none') { if (inWeek(base)) pushEv(base, { date: base.getDate(), type: 'paycheck', label: p.description || 'Payment', amount: p.amount }) }
          else if (rec === 'monthly') {
            // Check if this month's occurrence falls in the week
            weekDates.forEach(wd => {
              const candidate = new Date(wd.getFullYear(), wd.getMonth(), Math.min(base.getDate(), new Date(wd.getFullYear(), wd.getMonth() + 1, 0).getDate()))
              if (candidate >= base && dateKey(candidate) === dateKey(wd)) pushEv(candidate, { date: candidate.getDate(), type: 'paycheck', label: p.description || 'Payment', amount: p.amount })
            })
          } else {
            const interval = rec === 'weekly' ? 7 : rec === 'biweekly' ? 14 : 0
            if (interval > 0) {
              const cursor = new Date(base)
              if (cursor < weekStart) {
                const gap = Math.floor((weekStart.getTime() - cursor.getTime()) / (86400000 * interval)) * interval
                cursor.setDate(cursor.getDate() + gap)
              }
              while (cursor <= weekEnd) {
                if (cursor >= weekStart && cursor >= base) pushEv(new Date(cursor), { date: cursor.getDate(), type: 'paycheck', label: p.description || 'Payment', amount: p.amount })
                cursor.setDate(cursor.getDate() + interval)
              }
            }
          }
        })
      } catch {}
    }

    if (group?.date) {
      const gd = new Date(group.date + 'T00:00:00')
      if (inWeek(gd)) {
        const k = dateKey(gd)
        if (map.has(k) && !map.get(k)!.some(e => e.type === 'group')) pushEv(gd, { date: gd.getDate(), type: 'group', label: `${group.name} Event` })
      }
    }

    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDates, bills, group, syncReady, localWriteTick])

  const upcomingEvents = useMemo(() => {
    return calendarEvents
      .sort((a, b) => a.date - b.date)
      .slice(0, 5)
  }, [calendarEvents])

  // Drag and drop handlers
  const [isReordering, setIsReordering] = useState(false)
  const [pinnedSections, setPinnedSections] = useState<string[]>([])

  // Load pinned sections from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-dashboard-pinned')
      if (saved) setPinnedSections(JSON.parse(saved))
    } catch {}
  }, [])

  const handleTogglePin = (id: string) => {
    setPinnedSections(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      localStorage.setItem('orca-dashboard-pinned', JSON.stringify(next))
      return next
    })
  }

  // Sort sections: pinned first (in their original order), then unpinned
  const sortedSectionOrder = useMemo(() => {
    const pinned = sectionOrder.filter(s => pinnedSections.includes(s))
    const unpinned = sectionOrder.filter(s => !pinnedSections.includes(s))
    return [...pinned, ...unpinned]
  }, [sectionOrder, pinnedSections])

  const handleMoveUp = (index: number) => {
    // Find index in the unpinned portion only
    const unpinned = sortedSectionOrder.filter(s => !pinnedSections.includes(s))
    const unpinnedIndex = unpinned.indexOf(sortedSectionOrder[index])
    if (unpinnedIndex <= 0) return
    ;[unpinned[unpinnedIndex - 1], unpinned[unpinnedIndex]] = [unpinned[unpinnedIndex], unpinned[unpinnedIndex - 1]]
    const newOrder = [...pinnedSections.filter(s => sectionOrder.includes(s)), ...unpinned]
    setSectionOrder(newOrder)
    localStorage.setItem('orca-dashboard-order', JSON.stringify(newOrder))
  }

  const handleMoveDown = (index: number) => {
    const unpinned = sortedSectionOrder.filter(s => !pinnedSections.includes(s))
    const unpinnedIndex = unpinned.indexOf(sortedSectionOrder[index])
    if (unpinnedIndex < 0 || unpinnedIndex >= unpinned.length - 1) return
    ;[unpinned[unpinnedIndex], unpinned[unpinnedIndex + 1]] = [unpinned[unpinnedIndex + 1], unpinned[unpinnedIndex]]
    const newOrder = [...pinnedSections.filter(s => sectionOrder.includes(s)), ...unpinned]
    setSectionOrder(newOrder)
    localStorage.setItem('orca-dashboard-order', JSON.stringify(newOrder))
  }

  // Calculate actual user credit score
  const userCreditScore = useMemo(() => {
    // Try to get from context data first
    if (user?.creditScore) {
      return user.creditScore
    }

    // If per-bureau scores exist, calculate average
    if (user?.creditScoreTransUnion || user?.creditScoreEquifax || user?.creditScoreExperian) {
      const scores = [
        user.creditScoreTransUnion,
        user.creditScoreEquifax,
        user.creditScoreExperian,
      ].filter((score): score is number => typeof score === 'number')
      if (scores.length > 0) {
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      }
    }

    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('orca-user-settings')
        if (saved) {
          const settings = JSON.parse(saved)
          if (settings.creditScore) return settings.creditScore
        }
      } catch {}
    }

    // Default fallback
    return 648
  }, [user?.creditScore, user?.creditScoreTransUnion, user?.creditScoreEquifax, user?.creditScoreExperian])

  const renderSection = (sectionId: string, index: number) => {
    switch (sectionId) {
      case 'financial-cards':
        return (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sortedSectionOrder.length - 1} isReordering={isReordering} isPinned={pinnedSections.includes(sectionId)} onTogglePin={handleTogglePin} theme={theme}>
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Next Payment Card */}
              <Link href="/smart-stack">
                <div className="rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm" style={{ color: theme.textS }}>
                      <TrendingUp className="w-4 h-4" style={{ color: '#10B981' }} />
                      Next Payment
                    </div>
                    <ArrowUpRight className="w-4 h-4" style={{ color: '#10B981' }} />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#10B981' }}>
                    {nextIncomingPayment ? `+${fmt(nextIncomingPayment.amount)}` : '$0.00'}
                  </div>
                  <div className="text-sm mt-1" style={{ color: theme.textS }}>
                    {nextIncomingPayment
                      ? `${nextIncomingPayment.description || 'Income'} · ${new Date(nextIncomingPayment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${daysTo(nextIncomingPayment.date)}d`
                      : 'No upcoming payments'}
                  </div>
                </div>
              </Link>

              {/* Bills Due Card */}
              <Link href="/bill-boss">
                <div className="rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm" style={{ color: theme.textS }}>
                      <Receipt className="w-4 h-4" style={{ color: '#EF4444' }} />
                      Bills Due
                    </div>
                    <ArrowDownRight className="w-4 h-4" style={{ color: '#EF4444' }} />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#EF4444' }}>
                    {nextBill ? `−${fmt(nextBill.amount)}` : '$0.00'}
                  </div>
                  <div className="text-sm mt-1" style={{ color: theme.textS }}>
                    {nextBill
                      ? `Next: ${nextBill.name} · ${new Date(nextBill.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${fmt(billsDueThisWeek)} this week`
                      : 'All paid up'}
                  </div>
                </div>
              </Link>

              {/* Total Saved Card */}
              <Link href="/smart-stack?tab=savings">
                <div className="rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm" style={{ color: theme.textS }}>
                      <PiggyBank className="w-4 h-4" style={{ color: '#6366F1' }} />
                      Total Saved
                    </div>
                    <ArrowUpRight className="w-4 h-4" style={{ color: '#6366F1' }} />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#6366F1' }}>
                    {fmt(totalSavings)}
                  </div>
                  <div className="text-sm mt-1" style={{ color: theme.textS }}>
                    Across all accounts
                  </div>
                </div>
              </Link>
            </motion.div>
          </DraggableSection>
        )

      case 'spend-paycheck':
        return null

      case 'calendar':
        return (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sortedSectionOrder.length - 1} isReordering={isReordering} isPinned={pinnedSections.includes(sectionId)} onTogglePin={handleTogglePin} theme={theme}>
            <MonthlyCalendar events={calendarEvents} month={calMonth} year={calYear} onMonthChange={handleMonthChange} onDayClick={setSelectedDay} selectedDay={selectedDay} theme={theme} />
          </DraggableSection>
        )

      case 'credit-score':
        return (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sortedSectionOrder.length - 1} isReordering={isReordering} isPinned={pinnedSections.includes(sectionId)} onTogglePin={handleTogglePin} theme={theme}>
            <Link href="/settings?tab=financial">
              <motion.div variants={fadeUp} className="rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold" style={{ color: theme.text }}>Credit Score</h3>
                  <Link href="/settings?tab=financial" onClick={(e) => e.stopPropagation()}>
                    <button className="text-xs hover:opacity-80" style={{ color: '#6366F1' }}>Update</button>
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <CreditScoreRing score={userCreditScore} limit={850} theme={theme} />
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>Fair</div>
                    <div className="text-xs mt-0.5" style={{ color: theme.textS }}>34% utilization</div>
                    <div className="text-xs mt-1" style={{ color: theme.textS }}>Range: 300–850</div>
                    <div className="mt-2 rounded-full overflow-hidden" style={{ height: 5, background: theme.border, width: 120 }}>
                      <div className="h-full rounded-full" style={{ width: `${(userCreditScore / 850) * 100}%`, background: '#F59E0B' }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          </DraggableSection>
        )

      case 'stack-circle':
        return group ? (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sortedSectionOrder.length - 1} isReordering={isReordering} isPinned={pinnedSections.includes(sectionId)} onTogglePin={handleTogglePin} theme={theme}>
            <Link href="/stack-circle">
              <motion.div variants={fadeUp} className="rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users size={18} style={{ color: '#6366F1' }} />
                    <p className="text-base font-semibold" style={{ color: theme.text }}>Stack Circle</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#6366F115', color: '#6366F1' }}>
                    {stackCircleStats.totalGroups} group{stackCircleStats.totalGroups !== 1 ? 's' : ''}
                  </span>
                </div>
                {/* Aggregate stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <p className="text-xs" style={{ color: theme.textM }}>Members</p>
                    <p className="text-lg font-bold" style={{ color: theme.text }}>{stackCircleStats.totalMembers}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: theme.textM }}>Saved</p>
                    <p className="text-lg font-bold" style={{ color: '#10B981' }}>{fmt(stackCircleStats.totalSaved)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: theme.textM }}>Goal</p>
                    <p className="text-lg font-bold" style={{ color: '#6366F1' }}>{fmt(stackCircleStats.totalTarget)}</p>
                  </div>
                </div>
                {/* Progress bar */}
                {stackCircleStats.totalTarget > 0 && (
                  <ProgressBar current={stackCircleStats.totalSaved} target={stackCircleStats.totalTarget} color="#6366F1" theme={theme} />
                )}
                {/* Show first group name */}
                {group && (
                  <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${theme.border}40` }}>
                    <p className="text-sm font-medium" style={{ color: theme.textS }}>{group.name}</p>
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs font-mono" style={{ color: '#6366F1' }}>{group.code}</code>
                      <Copy size={12} style={{ color: '#6366F1' }} />
                    </div>
                  </div>
                )}
              </motion.div>
            </Link>
          </DraggableSection>
        ) : null

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh' }} className="overflow-x-hidden max-w-full">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="px-3 sm:px-5 py-4 sm:py-6 pb-12 space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full"
      >
        {/* Welcome Message */}
        <motion.div variants={fadeUp} className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-5xl font-bold truncate" style={{ color: theme.text }}>
              {firstName
                ? `${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, ${firstName}`
                : 'Welcome back'}
            </h1>
            <p className="text-lg" style={{ color: theme.textS }}>
              Here's your financial snapshot
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsReordering(!isReordering)}
            style={{
              backgroundColor: isReordering ? '#6366F1' : theme.card,
              color: isReordering ? '#fff' : theme.textM,
              borderColor: isReordering ? '#6366F1' : theme.border,
            }}
            className="border rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 mt-2 shrink-0"
          >
            <GripVertical size={14} />
            {isReordering ? 'Done' : 'Reorder'}
          </motion.button>
        </motion.div>

        {/* Safe to Spend Hero Card */}
        <motion.div variants={fadeUp} className="rounded-2xl p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: '#fff' }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm opacity-70">Safe to Spend</span>
                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>After bills & savings</span>
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1 }}>{fmt(safeToSpend.amount)}</div>
              <div className="text-sm opacity-60 mt-1">
                {safeToSpendView === 'daily' ? fmt(safeToSpend.daily) : safeToSpendView === 'weekly' ? fmt(safeToSpend.weekly) : fmt(safeToSpend.amount)} / {safeToSpendView} available
              </div>
              <div className="flex gap-2 mt-4">
                {['daily', 'weekly', 'monthly'].map(v => (
                  <button key={v} onClick={() => setSafeToSpendView(v as 'daily' | 'weekly' | 'monthly')} className="px-3 py-1 rounded-lg text-xs transition-all capitalize"
                    style={{ background: v === safeToSpendView ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', fontWeight: v === safeToSpendView ? 700 : 400 }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.12)', minWidth: 200 }}>
              <div className="text-xs opacity-60 uppercase tracking-widest mb-3" style={{ fontWeight: 700 }}>How it's calculated</div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: '#34D399' }} /><span className="opacity-80">Incoming</span></div>
                <span style={{ color: '#34D399', fontWeight: 700 }}>+{fmt(safeToSpend.totalIncome)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: '#F87171' }} /><span className="opacity-80">Bills Reserved</span></div>
                <span style={{ color: '#F87171', fontWeight: 700 }}>−{fmt(safeToSpend.totalBills)}</span>
              </div>
              <div className="pt-2 flex justify-between items-center text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                <span style={{ fontWeight: 700 }}>Safe to Spend</span>
                <span style={{ fontWeight: 800 }}>{fmt(safeToSpend.amount)}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Render sections in order — pinned first, then unpinned */}
        {sortedSectionOrder.map((sectionId, index) => renderSection(sectionId, index))}
      </motion.div>
    </div>
  )
}
