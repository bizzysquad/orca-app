'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChevronRight, Users, Copy, ChevronLeft, ChevronUp, ChevronDown,
  DollarSign, Receipt, Palmtree, Calendar,
  GripVertical, Settings,
} from 'lucide-react'

import { useOrcaData } from '@/context/OrcaDataContext'
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

function DraggableSection({ id, children, index, onMoveUp, onMoveDown, isFirst, isLast, isReordering, theme }: {
  id: string
  children: React.ReactNode
  index: number
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  isFirst: boolean
  isLast: boolean
  isReordering: boolean
  theme: any
}) {
  const sectionLabels: Record<string, string> = {
    'financial-cards': 'Financial Overview',
    'spend-paycheck': 'Next Payment',
    'calendar': 'Calendar',
    'credit-score': 'Credit Score',
    'upcoming-bills': 'Upcoming Bills',
    'stack-circle': 'Stack Circle',
    'savings-goals': 'Savings Goals',
  }

  return (
    <motion.div variants={fadeUp} className="relative">
      {isReordering && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 mb-2"
        >
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
          <span style={{ color: theme.textS }} className="text-sm font-medium">{sectionLabels[id] || id}</span>
        </motion.div>
      )}
      <div style={isReordering ? { borderColor: `${theme.gold}40`, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 4 } : {}}>
        {children}
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const { theme } = useTheme()
  const { data, loading } = useOrcaData()
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
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    'financial-cards',
    'spend-paycheck',
    'calendar',
    'credit-score',
    'upcoming-bills',
    'stack-circle',
    'savings-goals',
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
  const paycheckAmt = useMemo(() => {
    const rate = parseFloat(user.payRate) || 0
    const hrs = parseFloat(user.hoursPerDay) || 8
    const mult: Record<string, number> = { weekly: 5, biweekly: 10, semimonthly: 10.83, monthly: 21.67 }
    return rate * hrs * (mult[user.payFreq] || 10)
  }, [user])

  const totalSavings = useMemo(() => {
    return goals.reduce((sum, g) => sum + g.current, 0)
  }, [goals])

  const allUpcomingBills = useMemo(
    () => bills.filter(b => b.status === 'upcoming').sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()),
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
          events.push({ date: d.getDate(), type: 'paycheck', label: 'Payment', amount: paycheckAmt })
        }
      }
    }

    bills.forEach(bill => {
      const d = new Date(bill.due + 'T00:00:00')
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        events.push({ date: d.getDate(), type: 'bill', label: bill.name, amount: bill.amount })
      }
    })

    // Add tasks from window.__ORCA_TASKS
    if (typeof window !== 'undefined' && (window as any).__ORCA_TASKS) {
      const tasks = (window as any).__ORCA_TASKS
      tasks.forEach((task: any) => {
        if (task.dueDate) {
          const taskDate = new Date(task.dueDate + 'T00:00:00')
          if (taskDate.getMonth() === calMonth && taskDate.getFullYear() === calYear) {
            events.push({ date: taskDate.getDate(), type: 'task', label: task.title || 'Task' })
          }
        }
      })
    }

    // Add group date if group exists
    if (group?.date) {
      const groupDate = new Date(group.date + 'T00:00:00')
      if (groupDate.getMonth() === calMonth && groupDate.getFullYear() === calYear) {
        events.push({ date: groupDate.getDate(), type: 'group', label: `${group.name} Event` })
      }
    }

    return events
  }, [calMonth, calYear, bills, user.nextPay, paycheckAmt, group])

  const upcomingEvents = useMemo(() => {
    return calendarEvents
      .sort((a, b) => a.date - b.date)
      .slice(0, 5)
  }, [calendarEvents])

  // Drag and drop handlers
  const [isReordering, setIsReordering] = useState(false)

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...sectionOrder]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    setSectionOrder(newOrder)
    localStorage.setItem('orca-dashboard-order', JSON.stringify(newOrder))
  }

  const handleMoveDown = (index: number) => {
    if (index >= sectionOrder.length - 1) return
    const newOrder = [...sectionOrder]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    setSectionOrder(newOrder)
    localStorage.setItem('orca-dashboard-order', JSON.stringify(newOrder))
  }

  const renderSection = (sectionId: string, index: number) => {
    switch (sectionId) {
      case 'financial-cards':
        return (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sectionOrder.length - 1} isReordering={isReordering} theme={theme}>
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
          </DraggableSection>
        )

      case 'spend-paycheck':
        return (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sectionOrder.length - 1} isReordering={isReordering} theme={theme}>
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

              {/* Next Payment Card */}
              <div className="glass rounded-2xl p-6 glass-hover depth-1" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
                <p className="text-sm mb-2" style={{ color: theme.textS }}>
                  Next Payment
                </p>
                <p className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: theme.gold }}>
                  {fmt(paycheckAmt)}
                </p>
                {user.nextPay && (
                  <p className="text-sm" style={{ color: theme.textM }}>
                    {fmtD(user.nextPay)} · {daysTo(user.nextPay)}d
                  </p>
                )}
              </div>
            </motion.div>
          </DraggableSection>
        )

      case 'calendar':
        return (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sectionOrder.length - 1} isReordering={isReordering} theme={theme}>
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

      case 'credit-score':
        return user.creditScore > 0 ? (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sectionOrder.length - 1} isReordering={isReordering} theme={theme}>
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
          </DraggableSection>
        ) : null

      case 'upcoming-bills':
        return (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sectionOrder.length - 1} isReordering={isReordering} theme={theme}>
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
                {allUpcomingBills.map((bill, i) => {
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
          </DraggableSection>
        )

      case 'stack-circle':
        return group ? (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sectionOrder.length - 1} isReordering={isReordering} theme={theme}>
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
          </DraggableSection>
        ) : null

      case 'savings-goals':
        return topGoals.length > 0 ? (
          <DraggableSection key={sectionId} id={sectionId} index={index} onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} isFirst={index === 0} isLast={index === sectionOrder.length - 1} isReordering={isReordering} theme={theme}>
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
    <div style={{ backgroundColor: theme.bg, color: theme.text, minHeight: '100vh' }}>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="px-3 sm:px-5 py-4 sm:py-6 pb-12 space-y-4 sm:space-y-6 max-w-4xl"
      >
        {/* Welcome Message */}
        <motion.div variants={fadeUp} className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-5xl font-bold" style={{ color: theme.gold }}>
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, {firstName}
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

        {/* Render sections in order */}
        {sectionOrder.map((sectionId, index) => renderSection(sectionId, index))}
      </motion.div>
    </div>
  )
}
