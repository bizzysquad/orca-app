'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChevronRight, Users, Copy, ChevronLeft,
  DollarSign, Receipt, Palmtree, Calendar,
  Target, TrendingUp, Zap, ArrowRight,
} from 'lucide-react'

import { getDemoData } from '@/lib/demo-data'
import { fmt, fmtD, daysTo, calcAlloc, pct } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'
import { useTheme } from '@/context/ThemeContext'

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
  type: 'paycheck' | 'bill' | 'dayoff'
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
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Paycheck</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Bill Due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
          <span className="text-[10px] sm:text-xs" style={{ color: theme.textS }}>Day Off</span>
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

// ── Projection Calculator Component ──
function ProjectionCalculator({ theme }: { theme: any }) {
  const [goalAmount, setGoalAmount] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [timeUnit, setTimeUnit] = useState<'weeks' | 'months' | 'years'>('months')
  const [result, setResult] = useState<{ perWeek: number; perMonth: number; perDay: number } | null>(null)

  const calculate = () => {
    const goal = parseFloat(goalAmount)
    const time = parseFloat(timeframe)
    if (!goal || !time || goal <= 0 || time <= 0) return

    let totalWeeks = time
    if (timeUnit === 'months') totalWeeks = time * 4.33
    if (timeUnit === 'years') totalWeeks = time * 52

    const perWeek = goal / totalWeeks
    const perMonth = perWeek * 4.33
    const perDay = perWeek / 7

    setResult({ perWeek, perMonth, perDay })
  }

  return (
    <div className="glass rounded-2xl p-5 sm:p-6 glass-hover depth-1" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.gold}20` }}>
          <Target size={16} style={{ color: theme.gold }} />
        </div>
        <div>
          <h3 className="font-semibold" style={{ color: theme.text }}>Projection Calculator</h3>
          <p className="text-xs" style={{ color: theme.textM }}>How much do you need to save?</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: theme.textS }}>Goal Amount ($)</label>
          <input
            type="number"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            placeholder="e.g. 5000"
            className="w-full rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none"
            style={{
              backgroundColor: `${theme.border}60`,
              borderColor: theme.border,
              color: theme.text,
              border: `1px solid ${theme.border}`,
            }}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs mb-1 block" style={{ color: theme.textS }}>Timeframe</label>
            <input
              type="number"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              placeholder="e.g. 6"
              className="w-full rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none"
              style={{
                backgroundColor: `${theme.border}60`,
                borderColor: theme.border,
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
            />
          </div>
          <div className="w-28">
            <label className="text-xs mb-1 block" style={{ color: theme.textS }}>Unit</label>
            <select
              value={timeUnit}
              onChange={(e) => setTimeUnit(e.target.value as 'weeks' | 'months' | 'years')}
              className="w-full rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none"
              style={{
                backgroundColor: `${theme.border}60`,
                borderColor: theme.border,
                color: theme.text,
                border: `1px solid ${theme.border}`,
              }}
            >
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all"
          style={{
            backgroundColor: theme.gold,
            color: theme.bg,
          }}
        >
          Calculate
        </button>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-2 pt-3 border-t"
            style={{ borderColor: `${theme.border}60` }}
          >
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)' }}>
              <p className="text-xs" style={{ color: theme.textS }}>Per Day</p>
              <p className="text-sm font-bold text-[#22c55e]">{fmt(result.perDay)}</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: `${theme.gold}10` }}>
              <p className="text-xs" style={{ color: theme.textS }}>Per Week</p>
              <p className="text-sm font-bold" style={{ color: theme.gold }}>{fmt(result.perWeek)}</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <p className="text-xs" style={{ color: theme.textS }}>Per Month</p>
              <p className="text-sm font-bold text-[#3b82f6]">{fmt(result.perMonth)}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── Income Log Component (for non-hourly workers) ──
function IncomeLog({ theme }: { theme: any }) {
  const [entries, setEntries] = useState<{ id: string; amount: string; label: string; date: string }[]>([])
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')

  const addEntry = () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    setEntries(prev => [
      { id: Date.now().toString(), amount: amount, label: label || 'Income', date: today },
      ...prev,
    ])
    setAmount('')
    setLabel('')
  }

  const weekTotal = entries.reduce((sum, e) => sum + parseFloat(e.amount), 0)

  return (
    <div className="glass rounded-2xl p-5 sm:p-6 glass-hover depth-1" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}>
          <DollarSign size={16} className="text-[#22c55e]" />
        </div>
        <div>
          <h3 className="font-semibold" style={{ color: theme.text }}>Log Your Income</h3>
          <p className="text-xs" style={{ color: theme.textM }}>Track what you made today or this week</p>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="What was it for?"
          className="flex-1 rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none"
          style={{
            backgroundColor: `${theme.border}60`,
            borderColor: theme.border,
            color: theme.text,
            border: `1px solid ${theme.border}`,
          }}
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="$0"
          className="w-24 rounded-lg px-3 py-2.5 text-sm transition-colors focus:outline-none"
          style={{
            backgroundColor: `${theme.border}60`,
            borderColor: theme.border,
            color: theme.text,
            border: `1px solid ${theme.border}`,
          }}
        />
        <button
          onClick={addEntry}
          className="px-3 py-2.5 rounded-lg font-semibold text-sm transition-all"
          style={{
            backgroundColor: '#22c55e',
            color: theme.bg,
          }}
        >
          +
        </button>
      </div>

      {entries.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs" style={{ color: theme.textM }}>This week&apos;s total</p>
            <p className="text-sm font-bold text-[#22c55e]">{fmt(weekTotal)}</p>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: `${theme.border}40` }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text }}>{entry.label}</p>
                  <p className="text-xs" style={{ color: theme.textM }}>{entry.date}</p>
                </div>
                <p className="text-sm font-bold text-[#22c55e]">+{fmt(parseFloat(entry.amount))}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {entries.length === 0 && (
        <p className="text-xs text-center py-3" style={{ color: theme.textS }}>No income logged yet today</p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { theme } = useTheme()
  const data = useMemo(() => getDemoData(), [])
  const { user, income, bills, goals, groups } = data
  const group = groups[0] || null

  // Fetch real user name from Supabase
  const [realUserName, setRealUserName] = useState<string | null>(null)
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.full_name
        || data.user?.user_metadata?.display_name
        || data.user?.email?.split('@')[0]
        || null
      setRealUserName(name)
    })
  }, [])

  const firstName = realUserName
    ? realUserName.split(' ')[0]
    : user.name.split(' ')[0]

  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [spendView, setSpendView] = useState<'weekly' | 'daily'>('weekly')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const handleMonthChange = (dir: number) => {
    let m = calMonth + dir
    let y = calYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCalMonth(m)
    setCalYear(y)
  }

  const allocation = useMemo(() => calcAlloc(income, bills, goals), [income, bills, goals])
  const paycheckAmt = useMemo(() => {
    const rate = parseFloat(user.payRate) || 0
    const hrs = parseFloat(user.hoursPerDay) || 8
    const mult: Record<string, number> = { weekly: 5, biweekly: 10, semimonthly: 10.83, monthly: 21.67 }
    return rate * hrs * (mult[user.payFreq] || 10)
  }, [user])

  const totalSavings = useMemo(() => {
    return goals.reduce((sum, g) => sum + g.current, 0)
  }, [goals])

  const upcomingBills = useMemo(
    () => bills.filter(b => b.status === 'upcoming').sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()).slice(0, 3),
    [bills]
  )
  const topGoals = useMemo(
    () => goals.filter(g => g.active).sort((a, b) => pct(b.current, b.target) - pct(a.current, a.target)).slice(0, 2),
    [goals]
  )

  // Build calendar events for the selected month
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = []

    if (user.nextPay) {
      const nextPayDate = new Date(user.nextPay + 'T00:00:00')
      for (let i = -8; i <= 8; i++) {
        const d = new Date(nextPayDate)
        d.setDate(d.getDate() + i * 14)
        if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
          events.push({ date: d.getDate(), type: 'paycheck', label: 'Paycheck', amount: paycheckAmt })
        }
      }
    }

    bills.forEach(bill => {
      const d = new Date(bill.due + 'T00:00:00')
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        events.push({ date: d.getDate(), type: 'bill', label: bill.name, amount: bill.amount })
      }
    })

    return events
  }, [calMonth, calYear, bills, user.nextPay, paycheckAmt])

  const upcomingEvents = useMemo(() => {
    return calendarEvents
      .sort((a, b) => a.date - b.date)
      .slice(0, 5)
  }, [calendarEvents])

  return (
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh' }}>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="px-3 sm:px-5 py-4 sm:py-6 pb-12 space-y-4 sm:space-y-6 max-w-4xl"
      >
        {/* Welcome Message */}
        <motion.div variants={fadeUp} className="space-y-1">
          <h1 className="text-3xl sm:text-5xl font-bold" style={{ color: theme.gold }}>
            Welcome back, {firstName}
          </h1>
          <p className="text-lg" style={{ color: theme.textS }}>
            Here&apos;s your financial snapshot
          </p>
        </motion.div>

        {/* Quick Actions for new/all users */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <Link href="/smart-stack" className="glass rounded-xl p-4 glass-hover depth-1 flex items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${theme.gold}20` }}>
              <TrendingUp size={18} style={{ color: theme.gold }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: theme.text }}>Smart Stack</p>
              <p className="text-xs" style={{ color: theme.textM }}>Budget & savings</p>
            </div>
          </Link>
          <Link href="/bill-boss" className="glass rounded-xl p-4 glass-hover depth-1 flex items-center gap-3" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}>
              <Receipt size={18} className="text-[#ef4444]" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: theme.text }}>Bill Boss</p>
              <p className="text-xs" style={{ color: theme.textM }}>Manage bills</p>
            </div>
          </Link>
        </motion.div>

        {/* Income Log (for non-hourly workers) */}
        <motion.div variants={fadeUp}>
          <IncomeLog theme={theme} />
        </motion.div>

        {/* Projection Calculator */}
        <motion.div variants={fadeUp}>
          <ProjectionCalculator theme={theme} />
        </motion.div>

        {/* Bills and Savings - Side by Side Grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Bills Card */}
          <div className="rounded-2xl p-6 glass-hover" style={{
            background: `rgba(212, 168, 67, 0.06)`,
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: `1px solid ${theme.gold}20`,
          }}>
            <p className="text-sm mb-3" style={{ color: theme.textS }}>Bills</p>
            <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: theme.gold }}>
              {fmt(allocation.br)}
            </p>
            <p className="text-sm" style={{ color: theme.textM }}>
              Bill reserve
            </p>
          </div>

          {/* Savings Card */}
          <div className="rounded-2xl p-6 glass-hover" style={{
            background: `rgba(34, 197, 94, 0.06)`,
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: `1px solid rgba(34, 197, 94, 0.2)`,
          }}>
            <p className="text-sm mb-3" style={{ color: theme.textS }}>Savings</p>
            <p className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: '#22c55e' }}>
              {fmt(totalSavings)}
            </p>
            <p className="text-sm" style={{ color: theme.textM }}>
              Total saved
            </p>
          </div>
        </motion.div>

        {/* Safe to Spend + Next Paycheck/Cash Flow */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Safe to Spend Card */}
          <div className="glass-gold rounded-2xl p-6 glass-hover-gold inner-glow-gold" style={{ backgroundColor: theme.card }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm" style={{ color: theme.textS }}>Safe to Spend</p>
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
              {spendView === 'weekly' ? fmt(allocation.sts) : fmt(allocation.daily)}
            </p>
            <p className="text-sm" style={{ color: theme.textM }}>
              {spendView === 'weekly'
                ? `~${fmt(allocation.daily)}/day`
                : `~${fmt(allocation.sts)}/week`}
            </p>
          </div>

          {/* Next Paycheck / Cash Flow Card */}
          <div className="glass rounded-2xl p-6 glass-hover depth-1" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
            <p className="text-sm mb-2" style={{ color: theme.textS }}>
              {user.employmentType === 'self-employed' ? 'Cash Flow' : 'Next Paycheck'}
            </p>
            <p className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: theme.gold }}>
              {fmt(paycheckAmt)}
            </p>
            {user.nextPay ? (
              <p className="text-sm" style={{ color: theme.textM }}>
                {fmtD(user.nextPay)} · {daysTo(user.nextPay)}d
              </p>
            ) : (
              <p className="text-sm" style={{ color: theme.textM }}>
                Set up in Settings
              </p>
            )}
          </div>
        </motion.div>

        {/* Monthly Calendar */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Calendar</h2>
          </div>
          <MonthlyCalendar
            events={calendarEvents}
            month={calMonth}
            year={calYear}
            onMonthChange={handleMonthChange}
            onDayClick={(day) => setSelectedDay(day === 0 ? null : day)}
            selectedDay={selectedDay}
            theme={theme}
          />

          {upcomingEvents.length > 0 && (
            <div className="mt-3 space-y-2">
              {upcomingEvents.map((ev, i) => {
                const iconColor = ev.type === 'paycheck' ? '#22c55e' : ev.type === 'bill' ? '#ef4444' : '#3b82f6'
                const Icon = ev.type === 'paycheck' ? DollarSign : ev.type === 'bill' ? Receipt : Palmtree
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

        {/* Credit Score Card */}
        {user.creditScore > 0 && (
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
                  {user.creditScore >= 800 ? 'Excellent' : user.creditScore >= 740 ? 'Very Good' : user.creditScore >= 670 ? 'Good' : user.creditScore >= 580 ? 'Fair' : 'Poor'}
                </p>
                <p className="text-xs mt-2" style={{ color: theme.textM }}>
                  {user.utilization}% utilization
                </p>
              </div>
              <CreditScoreRing score={user.creditScore} limit={850} theme={theme} />
            </div>
          </motion.div>
        )}

        {/* Upcoming Bills */}
        {upcomingBills.length > 0 && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Upcoming Bills</h2>
              <Link
                href="/bill-boss"
                className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: theme.gold }}
              >
                See All <ChevronRight size={16} />
              </Link>
            </div>
            <div className="space-y-3">
              {upcomingBills.map((bill, i) => {
                const days = daysTo(bill.due)
                return (
                  <motion.div
                    key={bill.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass rounded-xl p-4 flex items-center justify-between glass-hover depth-1"
                    style={{ backgroundColor: theme.card, borderColor: theme.border }}
                  >
                    <div>
                      <p className="font-semibold" style={{ color: theme.text }}>{bill.name}</p>
                      <p className="text-sm" style={{ color: theme.textM }}>
                        {bill.cat} · {fmtD(bill.due)} · {days}d
                      </p>
                    </div>
                    <p className="font-bold" style={{ color: theme.gold }}>
                      {fmt(bill.amount)}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Stack Circle Group Stats */}
        {group && (
          <motion.div
            variants={fadeUp}
            className="glass-gold rounded-2xl p-6 glass-hover-gold inner-glow-gold"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm mb-1" style={{ color: theme.textS }}>Stack Circle</p>
                <h3 className="text-2xl font-bold" style={{ color: theme.text }}>{group.name}</h3>
                <p className="text-sm mt-2 flex items-center gap-1" style={{ color: theme.textM }}>
                  <Users size={16} /> {group.members.length} members
                </p>
              </div>
              <div
                className="rounded-lg px-3 py-2 flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                style={{
                  backgroundColor: `${theme.gold}15`,
                }}
              >
                <code className="text-sm font-mono" style={{ color: theme.gold }}>{group.code}</code>
                <Copy size={14} style={{ color: theme.gold }} />
              </div>
            </div>
            <div className="space-y-3">
              <ProgressBar current={group.current} target={group.target} color={theme.gold} theme={theme} />
              <div className="grid grid-cols-3 gap-2">
                {group.members.slice(0, 3).map((member, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs" style={{ color: theme.textM }}>Member {i + 1}</p>
                    <p className="text-sm font-semibold" style={{ color: theme.text }}>{pct(member.contrib || 0, group.target)}%</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Savings Goals */}
        {topGoals.length > 0 && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Savings Goals</h2>
              <Link
                href="/smart-stack"
                className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: theme.gold }}
              >
                See All <ChevronRight size={16} />
              </Link>
            </div>
            <div className="space-y-4">
              {topGoals.map((goal, i) => {
                const percentage = pct(goal.current, goal.target)
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass rounded-xl p-4 glass-hover depth-1"
                    style={{ backgroundColor: theme.card, borderColor: theme.border }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold" style={{ color: theme.text }}>{goal.name}</p>
                      <p className="text-sm font-semibold" style={{ color: theme.gold }}>
                        {percentage}%
                      </p>
                    </div>
                    <ProgressBar current={goal.current} target={goal.target} color={theme.gold} theme={theme} />
                    <p className="text-xs mt-2" style={{ color: theme.textM }}>
                      {fmt(goal.current)} / {fmt(goal.target)}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
