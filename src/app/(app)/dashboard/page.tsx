'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChevronRight, Users, Copy, ChevronLeft, ChevronUp, ChevronDown,
  DollarSign, Receipt, Palmtree, Calendar, Home,
  GripVertical, Settings, Pin, PinOff, PiggyBank, Wallet,
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
    color = theme.gold
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

function ProgressBar({ current, target, color = '#d4a843', theme }: { current: number; target: number; color?: string; theme: any }) {
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
    if (type === 'paycheck') return '#22c55e'
    if (type === 'bill') return '#ef4444'
    if (type === 'dayoff') return '#3b82f6'
    if (type === 'task') return '#a855f7'
    if (type === 'group') return '#f97316'
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
          backgroundColor: isToday ? `${theme.gold}20` : selectedDay === d ? `${theme.gold}10` : 'transparent',
          borderColor: isToday ? theme.gold : selectedDay === d ? `${theme.gold}50` : 'transparent',
        }}
      >
        <span style={{ color: isToday ? theme.gold : theme.textS, fontWeight: 500 }}>
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
    <div className="glass rounded-2xl p-4 sm:p-6 glass-hover depth-1" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(-1)} className="p-2 rounded-lg transition-colors" style={{ color: theme.textS }}>
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={16} style={{ color: theme.gold }} />
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
          <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Payment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Bill Due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Day Off</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#a855f7]" />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Task</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#f97316]" />
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
              backgroundColor: isPinned ? `${theme.gold}30` : theme.border,
              color: isPinned ? theme.gold : theme.textM,
              borderColor: isPinned ? theme.gold : theme.border,
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
                  backgroundColor: isFirst ? theme.border : theme.gold,
                  color: isFirst ? theme.textM : theme.bgS,
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
                  backgroundColor: isLast ? theme.border : theme.gold,
                  color: isLast ? theme.textM : theme.bgS,
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:cursor-not-allowed"
              >
                <ChevronDown size={16} />
              </motion.button>
            </div>
          )}
          <span style={{ color: theme.textS }} className="text-sm font-medium">
            {sectionLabels[id] || id}
            {isPinned && <span style={{ color: theme.gold }} className="ml-2 text-xs font-bold">PINNED</span>}
          </span>
        </motion.div>
      )}
      <div style={isReordering ? { borderColor: isPinned ? `${theme.gold}60` : `${theme.gold}40`, borderWidth: 1, borderStyle: isPinned ? 'solid' : 'dashed', borderRadius: 12, padding: 4 } : {}}>
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
      if (key.includes('payment') || key.includes('savings') || key.includes('bills')) {
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
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'financial-cards',
    'spend-paycheck',
    'rent-tracker',
    'calendar',
    'credit-score',
    'stack-circle',
  ])

  // Load section order from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('orca-dashboard-order')
    if (saved) {
      try {
        setSectionOrder(JSON.parse(saved))
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

  // Rent tracker data
  const rentTracker = useMemo(() => {
    const rentAmount = user.rentAmount || 0
    if (rentAmount <= 0) return null
    // Check for rent-specific savings or payment entries marked for rent
    let savedTowardRent = 0
    try {
      if (typeof window !== 'undefined') {
        const savedAccounts = localStorage.getItem('orca-savings-accounts')
        if (savedAccounts) {
          const accounts = JSON.parse(savedAccounts)
          const rentAcct = accounts.find((a: any) => a.name?.toLowerCase().includes('rent'))
          if (rentAcct) savedTowardRent = rentAcct.amount || 0
        }
      }
    } catch {}
    // Also check rent entries for current month
    const currentMonth = new Date().toISOString().slice(0, 7)
    const currentRent = data.rent?.find(r => r.month === currentMonth)
    const isPaid = currentRent?.status === 'paid'
    return {
      total: rentAmount,
      saved: isPaid ? rentAmount : savedTowardRent,
      remaining: isPaid ? 0 : Math.max(0, rentAmount - savedTowardRent),
      isPaid,
      dueDay: 1, // Typically 1st of month
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.rentAmount, data.rent, syncReady])

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
  }, [group, syncReady])

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
  }, [calMonth, calYear, bills, group, syncReady])

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

  const renderSection = (sectionId: string, index: number) => {
    switch (sectionId) {
      case 'financial-cards':
        return (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sortedSectionOrder.length - 1} isReordering={isReordering} isPinned={pinnedSections.includes(sectionId)} onTogglePin={handleTogglePin} theme={theme}>
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Bills Card */}
              <Link href="/bill-boss" className="block">
              <div className="rounded-2xl p-6 glass-hover cursor-pointer transition-all active:scale-[0.98]" style={{
                background: `rgba(239, 68, 68, 0.06)`,
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: `1px solid rgba(239, 68, 68, 0.2)`,
              }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm" style={{ color: theme.textS }}>Bills</p>
                  <Receipt size={16} style={{ color: '#ef4444' }} />
                </div>
                <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: '#ef4444' }}>
                  –{fmt(billsDueThisWeek)}
                </p>
                <p className="text-xs font-medium mb-1" style={{ color: theme.textS }}>
                  {billsDueToday > 0 ? `${fmt(billsDueToday)} due today` : 'Due this week'}
                </p>
                {nextBill ? (
                  <p className="text-xs" style={{ color: theme.textM }}>
                    Next: {nextBill.name} · {fmtD(nextBill.due)} · –{fmt(nextBill.amount)}
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: theme.textM }}>
                    No upcoming bills
                  </p>
                )}
              </div>
              </Link>

              {/* Savings Card */}
              <Link href="/smart-stack?tab=savings" className="block">
                <div className="rounded-2xl p-6 glass-hover cursor-pointer transition-all active:scale-[0.98]" style={{
                  background: `rgba(34, 197, 94, 0.06)`,
                  backdropFilter: 'blur(16px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                  border: `1px solid rgba(34, 197, 94, 0.2)`,
                }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm" style={{ color: theme.textS }}>Savings</p>
                    <PiggyBank size={16} style={{ color: '#22c55e' }} />
                  </div>
                  <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: '#22c55e' }}>
                    {fmt(totalSavings)}
                  </p>
                  {savingsGoalTotal > 0 ? (
                    <>
                      <div className="w-full h-1.5 rounded-full overflow-hidden mt-2 mb-1" style={{ backgroundColor: `${theme.border}60` }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((totalSavings / savingsGoalTotal) * 100, 100)}%`, backgroundColor: '#22c55e' }} />
                      </div>
                      <p className="text-xs" style={{ color: theme.textM }}>
                        {Math.round((totalSavings / savingsGoalTotal) * 100)}% of {fmt(savingsGoalTotal)} goal
                      </p>
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: theme.textM }}>Total saved</p>
                  )}
                </div>
              </Link>
            </motion.div>

          </DraggableSection>
        )

      case 'spend-paycheck':
        return (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sortedSectionOrder.length - 1} isReordering={isReordering} isPinned={pinnedSections.includes(sectionId)} onTogglePin={handleTogglePin} theme={theme}>
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Safe to Spend Card */}
              <div className="glass-gold rounded-2xl p-6 glass-hover-gold inner-glow-gold" style={{ backgroundColor: theme.card }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm" style={{ color: theme.textS }}>Safe to Spend</p>
                    <p className="text-[10px] mt-0.5" style={{ color: theme.textM }}>After bills & savings</p>
                  </div>
                  <div className="flex rounded-lg p-0.5" style={{ backgroundColor: `${theme.border}60` }}>
                    <button
                      onClick={() => setSpendView('daily')}
                      className="px-3 py-1 rounded-md text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: spendView === 'daily' ? theme.gold : 'transparent',
                        color: spendView === 'daily' ? theme.bg : theme.textS,
                      }}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setSpendView('weekly')}
                      className="px-3 py-1 rounded-md text-xs font-semibold transition-all"
                      style={{
                        backgroundColor: spendView === 'weekly' ? theme.gold : 'transparent',
                        color: spendView === 'weekly' ? theme.bg : theme.textS,
                      }}
                    >
                      Weekly
                    </button>
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: theme.gold }}>
                  {spendView === 'weekly' ? fmt(safeToSpend.weekly) : fmt(safeToSpend.daily)}
                </p>
                <p className="text-sm mb-2" style={{ color: theme.textM }}>
                  {spendView === 'weekly'
                    ? `~${fmt(safeToSpend.daily)}/day`
                    : `~${fmt(safeToSpend.weekly)}/week`}
                </p>
                {/* Detailed Breakdown */}
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: `1px solid ${theme.border}50` }}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textM }}>How it's calculated</p>
                  {checkingBalance > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.gold }} />
                        <span className="text-xs" style={{ color: theme.textS }}>Checking Balance</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: theme.text }}>{fmt(checkingBalance)}</span>
                    </div>
                  )}
                  {safeToSpend.totalIncome > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                        <span className="text-xs" style={{ color: theme.textS }}>Incoming Payments</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>+{fmt(safeToSpend.totalIncome)}</span>
                    </div>
                  )}
                  {safeToSpend.totalBills > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                        <span className="text-xs" style={{ color: theme.textS }}>Bills Reserved</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>-{fmt(safeToSpend.totalBills)}</span>
                    </div>
                  )}
                  {(() => {
                    const savingsReserved = goals
                      .filter(g => g.active && g.current < g.target)
                      .reduce((sum, g) => sum + (g.cVal || 0), 0)
                    return savingsReserved > 0 ? (
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
                          <span className="text-xs" style={{ color: theme.textS }}>Savings Reserved</span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: '#3b82f6' }}>-{fmt(savingsReserved)}</span>
                      </div>
                    ) : null
                  })()}
                  {(user.safeToSpendBuffer || 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.textM }} />
                        <span className="text-xs" style={{ color: theme.textS }}>Buffer</span>
                      </div>
                      <span className="text-xs font-semibold" style={{ color: theme.textM }}>-{fmt(user.safeToSpendBuffer || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 mt-1" style={{ borderTop: `1px solid ${theme.border}30` }}>
                    <span className="text-xs font-bold" style={{ color: theme.gold }}>Safe to Spend</span>
                    <span className="text-sm font-bold" style={{ color: theme.gold }}>{fmt(safeToSpend.amount)}</span>
                  </div>
                </div>
              </div>

              {/* Next Payment Card — sourced exclusively from Incoming Payments */}
              <Link href="/smart-stack" className="block">
                <div className="glass rounded-2xl p-6 glass-hover depth-1 cursor-pointer transition-all active:scale-[0.98]" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm" style={{ color: theme.textS }}>Next Payment</p>
                    <Wallet size={16} style={{ color: '#22c55e' }} />
                  </div>
                  {nextIncomingPayment ? (
                    <>
                      <p className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: '#22c55e' }}>
                        +{fmt(nextIncomingPayment.amount)}
                      </p>
                      <p className="text-xs sm:text-sm truncate" style={{ color: theme.textM }}>
                        {nextIncomingPayment.description} · {fmtD(nextIncomingPayment.date)} · {daysTo(nextIncomingPayment.date)}d
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: theme.textM }}>
                        —
                      </p>
                      <p className="text-sm" style={{ color: theme.textM }}>
                        No upcoming payments
                      </p>
                    </>
                  )}
                </div>
              </Link>
            </motion.div>
          </DraggableSection>
        )

      case 'rent-tracker':
        return rentTracker ? (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sortedSectionOrder.length - 1} isReordering={isReordering} isPinned={pinnedSections.includes(sectionId)} onTogglePin={handleTogglePin} theme={theme}>
            <motion.div variants={fadeUp} className="glass rounded-2xl p-6 glass-hover depth-1" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Home size={18} style={{ color: theme.gold }} />
                  <p className="text-base font-semibold" style={{ color: theme.text }}>Rent Tracker</p>
                </div>
                {rentTracker.isPaid && (
                  <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>PAID</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs mb-1" style={{ color: theme.textM }}>Saved Toward Rent</p>
                  <p className="text-2xl font-bold" style={{ color: rentTracker.isPaid ? '#22c55e' : theme.gold }}>{fmt(rentTracker.saved)}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: theme.textM }}>Remaining</p>
                  <p className="text-2xl font-bold" style={{ color: rentTracker.remaining > 0 ? '#ef4444' : '#22c55e' }}>{fmt(rentTracker.remaining)}</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.border}60` }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((rentTracker.saved / rentTracker.total) * 100, 100)}%`,
                    backgroundColor: rentTracker.isPaid ? '#22c55e' : theme.gold,
                  }}
                />
              </div>
              <p className="text-xs mt-2" style={{ color: theme.textM }}>
                {fmt(rentTracker.saved)} of {fmt(rentTracker.total)} rent
                {!rentTracker.isPaid && rentTracker.remaining > 0 && ` · ${fmt(rentTracker.remaining)} to go`}
              </p>
            </motion.div>
          </DraggableSection>
        ) : null

      case 'calendar':
        return (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sortedSectionOrder.length - 1} isReordering={isReordering} isPinned={pinnedSections.includes(sectionId)} onTogglePin={handleTogglePin} theme={theme}>
            <motion.div variants={fadeUp}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold" style={{ color: theme.text }}>Calendar</h2>
                <div className="flex rounded-lg p-0.5" style={{ backgroundColor: `${theme.border}60` }}>
                  <button
                    onClick={() => setCalendarView('monthly')}
                    className="px-3 py-1 rounded-md text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: calendarView === 'monthly' ? theme.gold : 'transparent',
                      color: calendarView === 'monthly' ? theme.bg : theme.textS,
                    }}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setCalendarView('weekly')}
                    className="px-3 py-1 rounded-md text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: calendarView === 'weekly' ? theme.gold : 'transparent',
                      color: calendarView === 'weekly' ? theme.bg : theme.textS,
                    }}
                  >
                    Week
                  </button>
                </div>
              </div>

              {calendarView === 'weekly' ? (
                <div className="glass rounded-2xl p-4 sm:p-6 glass-hover depth-1" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg hover:opacity-70 transition-opacity" style={{ color: theme.textS }}>
                      <ChevronLeft size={18} />
                    </button>
                    <p className="font-semibold text-sm" style={{ color: theme.text }}>
                      {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg hover:opacity-70 transition-opacity" style={{ color: theme.textS }}>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {weekDates.map((date, i) => {
                      const isToday = date.toDateString() === new Date().toDateString()
                      const dayEvents = calendarEvents.filter(e => e.date === date.getDate() && date.getMonth() === calMonth && date.getFullYear() === calYear)
                      return (
                        <div key={i} className="text-center p-2 rounded-lg" style={{ backgroundColor: isToday ? `${theme.gold}20` : 'transparent', border: isToday ? `1px solid ${theme.gold}` : 'none' }}>
                          <p className="text-[10px] font-semibold mb-1" style={{ color: theme.textM }}>
                            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]}
                          </p>
                          <p className="text-sm font-bold mb-1" style={{ color: isToday ? theme.gold : theme.text }}>{date.getDate()}</p>
                          {dayEvents.length > 0 && (
                            <div className="flex justify-center gap-0.5">
                              {dayEvents.slice(0, 2).map((ev, j) => {
                                const eventColor = ev.type === 'paycheck' ? '#22c55e' : ev.type === 'bill' ? '#ef4444' : ev.type === 'dayoff' ? '#3b82f6' : ev.type === 'task' ? '#a855f7' : ev.type === 'group' ? '#f97316' : theme.textM
                                return (
                                  <div key={j} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: eventColor }} />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <MonthlyCalendar
                  events={calendarEvents}
                  month={calMonth}
                  year={calYear}
                  onMonthChange={handleMonthChange}
                  onDayClick={(day) => setSelectedDay(day === 0 ? null : day)}
                  selectedDay={selectedDay}
                  theme={theme}
                />
              )}

              {upcomingEvents.length > 0 && (
                <div className="mt-3 space-y-2">
                  {upcomingEvents.map((ev, i) => {
                    const getIconColor = (type: string) => {
                      if (type === 'paycheck') return '#22c55e'
                      if (type === 'bill') return '#ef4444'
                      if (type === 'task') return '#a855f7'
                      if (type === 'group') return '#f97316'
                      return '#3b82f6'
                    }
                    const getIcon = (type: string) => {
                      if (type === 'paycheck') return DollarSign
                      if (type === 'bill') return Receipt
                      return Palmtree
                    }
                    const iconColor = getIconColor(ev.type)
                    const Icon = getIcon(ev.type)
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="glass rounded-xl p-3 flex items-center justify-between glass-hover depth-1"
                        style={{ backgroundColor: theme.card, borderColor: theme.border }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${iconColor}20` }}>
                            <Icon size={14} style={{ color: iconColor }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: theme.text }}>{ev.label}</p>
                            <p className="text-xs" style={{ color: theme.textM }}>
                              {new Date(calYear, calMonth, ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        {ev.amount && (
                          <p className="text-sm font-bold" style={{ color: iconColor }}>
                            {ev.type === 'bill' ? '-' : '+'}{fmt(ev.amount)}
                          </p>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </DraggableSection>
        )

      case 'credit-score': {
        const hasAnyScore = user.creditScore > 0 || (user.creditScoreTransUnion || 0) > 0 || (user.creditScoreEquifax || 0) > 0 || (user.creditScoreExperian || 0) > 0
        const bureauScores = [
          { name: 'TransUnion', score: user.creditScoreTransUnion || 0 },
          { name: 'Equifax', score: user.creditScoreEquifax || 0 },
          { name: 'Experian', score: user.creditScoreExperian || 0 },
        ].filter(b => b.score > 0)
        const primaryScore = user.creditScore || Math.max(...bureauScores.map(b => b.score), 0)
        return hasAnyScore ? (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sortedSectionOrder.length - 1} isReordering={isReordering} isPinned={pinnedSections.includes(sectionId)} onTogglePin={handleTogglePin} theme={theme}>
            <motion.div
              variants={fadeUp}
              className="glass rounded-2xl p-6 cursor-pointer glass-hover depth-1"
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              onClick={() => window.location.href = '/smart-stack'}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm mb-2" style={{ color: theme.textS }}>Credit Score</p>
                  <p className="text-lg font-semibold" style={{ color: theme.textS }}>
                    {primaryScore >= 800 ? 'Excellent' : primaryScore >= 740 ? 'Very Good' : primaryScore >= 670 ? 'Good' : primaryScore >= 580 ? 'Fair' : 'Poor'}
                  </p>
                  <p className="text-xs mt-2" style={{ color: theme.textM }}>
                    {user.utilization}% utilization
                  </p>
                </div>
                <CreditScoreRing score={primaryScore} limit={850} theme={theme} />
              </div>
              {bureauScores.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                  {[
                    { name: 'TransUnion', score: user.creditScoreTransUnion || 0 },
                    { name: 'Equifax', score: user.creditScoreEquifax || 0 },
                    { name: 'Experian', score: user.creditScoreExperian || 0 },
                  ].map(bureau => (
                    <div key={bureau.name} className="text-center">
                      <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: theme.textM }}>{bureau.name}</p>
                      <p className="text-base font-bold mt-0.5" style={{ color: bureau.score > 0 ? theme.text : theme.textM }}>
                        {bureau.score > 0 ? bureau.score : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </DraggableSection>
        ) : null
      }

      case 'stack-circle':
        return stackCircleStats.totalGroups > 0 ? (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sortedSectionOrder.length - 1} isReordering={isReordering} isPinned={pinnedSections.includes(sectionId)} onTogglePin={handleTogglePin} theme={theme}>
            <Link href="/stack-circle" className="block">
              <motion.div
                variants={fadeUp}
                className="glass-gold rounded-2xl p-6 glass-hover-gold inner-glow-gold cursor-pointer transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users size={18} style={{ color: theme.gold }} />
                    <p className="text-base font-semibold" style={{ color: theme.text }}>Stack Circle</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: `${theme.gold}15`, color: theme.gold }}>
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
                    <p className="text-lg font-bold" style={{ color: '#22c55e' }}>{fmt(stackCircleStats.totalSaved)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: theme.textM }}>Goal</p>
                    <p className="text-lg font-bold" style={{ color: theme.gold }}>{fmt(stackCircleStats.totalTarget)}</p>
                  </div>
                </div>
                {/* Progress bar */}
                {stackCircleStats.totalTarget > 0 && (
                  <ProgressBar current={stackCircleStats.totalSaved} target={stackCircleStats.totalTarget} color={theme.gold} theme={theme} />
                )}
                {/* Show first group name */}
                {group && (
                  <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${theme.border}40` }}>
                    <p className="text-sm font-medium" style={{ color: theme.textS }}>{group.name}</p>
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs font-mono" style={{ color: theme.gold }}>{group.code}</code>
                      <Copy size={12} style={{ color: theme.gold }} />
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
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh' }} className="overflow-x-hidden">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="px-3 sm:px-5 py-4 sm:py-6 pb-12 space-y-4 sm:space-y-6 max-w-4xl w-full"
      >
        {/* Welcome Message */}
        <motion.div variants={fadeUp} className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-2xl sm:text-5xl font-bold truncate" style={{ color: theme.gold }}>
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
              backgroundColor: isReordering ? theme.gold : theme.card,
              color: isReordering ? theme.bgS : theme.textM,
              borderColor: isReordering ? theme.gold : theme.border,
            }}
            className="border rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2 mt-2 shrink-0"
          >
            <GripVertical size={14} />
            {isReordering ? 'Done' : 'Reorder'}
          </motion.button>
        </motion.div>

        {/* Render sections in order — pinned first, then unpinned */}
        {sortedSectionOrder.map((sectionId, index) => renderSection(sectionId, index))}
      </motion.div>
    </div>
  )
}
