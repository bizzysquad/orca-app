'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChevronRight, Users, Copy, ChevronLeft,
  DollarSign, Receipt, Palmtree, Calendar,
} from 'lucide-react'

import { getDemoData } from '@/lib/demo-data'
import { fmt, fmtD, daysTo, calcAlloc, pct } from '@/lib/utils'

const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 24 } },
}

function CreditScoreRing({ score, limit }: { score: number; limit: number }) {
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
    color = '#d4a843'
    label = 'Good'
  } else if (score >= 580) {
    color = '#f59e0b'
    label = 'Fair'
  }

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#27272a" strokeWidth="4" />
        <motion.circle
          cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ} strokeLinecap="round"
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <p className="text-xl font-bold text-fafafa">{score}</p>
          <p className="text-xs font-semibold text-center" style={{ color }}>{label}</p>
        </motion.div>
      </div>
    </div>
  )
}

function ProgressBar({ current, target, color = '#d4a843' }: { current: number; target: number; color?: string }) {
  const percentage = Math.min((current / target) * 100, 100)
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#27272a' }}>
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

function MonthlyCalendar({ events, month, year, onMonthChange, onDayClick, selectedDay }: {
  events: CalendarEvent[]
  month: number
  year: number
  onMonthChange: (dir: number) => void
  onDayClick?: (day: number) => void
  selectedDay?: number | null
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
    return '#71717a'
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
            ? 'bg-[#d4a843]/20 border border-[#d4a843]'
            : selectedDay === d
            ? 'bg-[#d4a843]/10 border border-[#d4a843]/50'
            : 'hover:bg-[#27272a]/50'
        }`}
      >
        <span className={`font-medium ${isToday ? 'text-[#d4a843]' : 'text-[#a1a1aa]'}`}>
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
    <div className="glass rounded-2xl p-4 sm:p-6 glass-hover depth-1">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(-1)} className="p-2 rounded-lg text-[#a1a1aa] hover:text-[#d4a843] transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-[#d4a843]" />
          <h3 className="font-semibold text-[#fafafa]">{monthName}</h3>
        </div>
        <button onClick={() => onMonthChange(1)} className="p-2 rounded-lg text-[#a1a1aa] hover:text-[#d4a843] transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] sm:text-xs font-semibold text-[#71717a] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 pt-3 border-t border-[#27272a]/60">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <span className="text-[10px] sm:text-xs text-[#a1a1aa]">Paycheck</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-[10px] sm:text-xs text-[#a1a1aa]">Bill Due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
          <span className="text-[10px] sm:text-xs text-[#a1a1aa]">Day Off</span>
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="mt-4 pt-3 border-t border-[#27272a]/60">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[#fafafa]">
              {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <button onClick={() => onDayClick?.(0)} className="text-xs text-[#a1a1aa] hover:text-[#fafafa]">Close</button>
          </div>
          {getEventsForDay(selectedDay).length > 0 ? (
            <div className="space-y-2">
              {getEventsForDay(selectedDay).map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#27272a]/40">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: eventDot(ev.type) }} />
                    <div>
                      <p className="text-sm font-medium text-[#fafafa]">{ev.label}</p>
                      <p className="text-xs text-[#71717a]">
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
            <p className="text-sm text-[#71717a]">No events scheduled</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const data = useMemo(() => getDemoData(), [])
  const { user, income, bills, goals, groups } = data
  const group = groups[0] || null

  const [calMonth, setCalMonth] = useState(2) // March 2026
  const [calYear, setCalYear] = useState(2026)
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
  const firstName = user.name.split(' ')[0]
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

    // Paycheck dates: biweekly from nextPay
    const nextPayDate = new Date(user.nextPay + 'T00:00:00')
    for (let i = -8; i <= 8; i++) {
      const d = new Date(nextPayDate)
      d.setDate(d.getDate() + i * 14)
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        events.push({ date: d.getDate(), type: 'paycheck', label: 'Paycheck', amount: paycheckAmt })
      }
    }

    // Bill due dates
    bills.forEach(bill => {
      const d = new Date(bill.due + 'T00:00:00')
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        events.push({ date: d.getDate(), type: 'bill', label: bill.name, amount: bill.amount })
      }
    })

    // Demo days off / vacation
    const demoVacation = [
      { month: 2, days: [25, 26, 27] },
      { month: 3, days: [14, 15] },
    ]
    demoVacation.forEach(v => {
      if (v.month === calMonth) {
        v.days.forEach(day => {
          events.push({ date: day, type: 'dayoff', label: 'Day Off' })
        })
      }
    })

    return events
  }, [calMonth, calYear, bills, user.nextPay, paycheckAmt])

  // Get upcoming events list for the calendar section
  const upcomingEvents = useMemo(() => {
    return calendarEvents
      .sort((a, b) => a.date - b.date)
      .slice(0, 5)
  }, [calendarEvents])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#09090b', color: '#fafafa' }}>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        className="px-3 sm:px-5 py-4 sm:py-6 pb-12 space-y-4 sm:space-y-6 max-w-4xl"
      >
        {/* Welcome Message */}
        <motion.div variants={fadeUp} className="space-y-1">
          <h1 className="text-3xl sm:text-5xl font-bold" style={{ color: '#d4a843' }}>
            Welcome back, {firstName}
          </h1>
          <p className="text-lg" style={{ color: '#a1a1aa' }}>
            Here&apos;s your financial snapshot
          </p>
        </motion.div>

        {/* Safe to Spend + Next Pay */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Safe to Spend Card */}
          <div className="glass-gold rounded-2xl p-6 glass-hover-gold inner-glow-gold">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm" style={{ color: '#a1a1aa' }}>Safe to Spend</p>
              <div className="flex bg-[#27272a]/60 rounded-lg p-0.5">
                <button
                  onClick={() => setSpendView('daily')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    spendView === 'daily'
                      ? 'bg-[#d4a843] text-[#09090b]'
                      : 'text-[#a1a1aa] hover:text-[#fafafa]'
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setSpendView('weekly')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    spendView === 'weekly'
                      ? 'bg-[#d4a843] text-[#09090b]'
                      : 'text-[#a1a1aa] hover:text-[#fafafa]'
                  }`}
                >
                  Weekly
                </button>
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: '#d4a843' }}>
              {spendView === 'weekly' ? fmt(allocation.sts) : fmt(allocation.daily)}
            </p>
            <p className="text-sm" style={{ color: '#71717a' }}>
              {spendView === 'weekly'
                ? `~${fmt(allocation.daily)}/day`
                : `~${fmt(allocation.sts)}/week`}
            </p>
          </div>

          {/* Next Pay Card */}
          <div className="glass rounded-2xl p-6 glass-hover depth-1">
            <p className="text-sm mb-2" style={{ color: '#a1a1aa' }}>Next Paycheck</p>
            <p className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: '#d4a843' }}>
              {fmt(paycheckAmt)}
            </p>
            <p className="text-sm" style={{ color: '#71717a' }}>
              {fmtD(user.nextPay)} · {daysTo(user.nextPay)}d
            </p>
          </div>
        </motion.div>

        {/* Allocated Card */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl p-6 w-full glass-hover"
          style={{
            background: allocation.short <= 0 ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: `1px solid ${allocation.short <= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          }}
        >
          <p className="text-sm mb-3" style={{ color: '#a1a1aa' }}>Allocated</p>
          <p className="text-3xl sm:text-4xl font-bold mb-1" style={{
            color: allocation.short <= 0 ? '#22c55e' : '#ef4444',
          }}>
            {fmt(allocation.br + allocation.sr)}
          </p>
          <p className="text-sm" style={{ color: '#71717a' }}>
            Bills + Savings + Spending
          </p>
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
          />

          {/* Upcoming Events List */}
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
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${iconColor}20` }}>
                        <Icon size={14} style={{ color: iconColor }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#fafafa]">{ev.label}</p>
                        <p className="text-xs text-[#71717a]">
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
        <motion.div
          variants={fadeUp}
          className="glass rounded-2xl p-6 cursor-pointer glass-hover depth-1"
          onClick={() => window.location.href = '/smart-stack'}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-2" style={{ color: '#a1a1aa' }}>Credit Score</p>
              <p className="text-lg font-semibold" style={{ color: '#a1a1aa' }}>
                {user.creditScore >= 800 ? 'Excellent' : user.creditScore >= 740 ? 'Very Good' : user.creditScore >= 670 ? 'Good' : user.creditScore >= 580 ? 'Fair' : 'Poor'}
              </p>
              <p className="text-xs mt-2" style={{ color: '#71717a' }}>
                {user.utilization}% utilization
              </p>
            </div>
            <CreditScoreRing score={user.creditScore} limit={850} />
          </div>
        </motion.div>

        {/* Upcoming Bills */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Upcoming Bills</h2>
            <Link
              href="/bill-boss"
              className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: '#d4a843' }}
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
                >
                  <div>
                    <p className="font-semibold">{bill.name}</p>
                    <p className="text-sm" style={{ color: '#71717a' }}>
                      {bill.cat} · {fmtD(bill.due)} · {days}d
                    </p>
                  </div>
                  <p className="font-bold" style={{ color: '#d4a843' }}>
                    {fmt(bill.amount)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Stack Circle Group Stats */}
        {group && (
          <motion.div
            variants={fadeUp}
            className="glass-gold rounded-2xl p-6 glass-hover-gold inner-glow-gold"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm mb-1" style={{ color: '#a1a1aa' }}>Stack Circle</p>
                <h3 className="text-2xl font-bold">{group.name}</h3>
                <p className="text-sm mt-2 flex items-center gap-1" style={{ color: '#71717a' }}>
                  <Users size={16} /> {group.members.length} members
                </p>
              </div>
              <div
                className="rounded-lg px-3 py-2 flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                style={{
                  backgroundColor: 'rgba(212, 168, 67, 0.15)',
                }}
              >
                <code className="text-sm font-mono" style={{ color: '#d4a843' }}>{group.code}</code>
                <Copy size={14} style={{ color: '#d4a843' }} />
              </div>
            </div>
            <div className="space-y-3">
              <ProgressBar current={group.current} target={group.target} color="#d4a843" />
              <div className="grid grid-cols-3 gap-2">
                {group.members.slice(0, 3).map((member, i) => (
                  <div key={i} className="text-center">
                    <p className="text-xs" style={{ color: '#71717a' }}>Member {i + 1}</p>
                    <p className="text-sm font-semibold">{pct(member.contrib || 0, group.target)}%</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Savings Goals */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Savings Goals</h2>
            <Link
              href="/smart-stack"
              className="text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ color: '#d4a843' }}
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
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{goal.name}</p>
                    <p className="text-sm font-semibold" style={{ color: '#d4a843' }}>
                      {percentage}%
                    </p>
                  </div>
                  <ProgressBar current={goal.current} target={goal.target} color="#d4a843" />
                  <p className="text-xs mt-2" style={{ color: '#71717a' }}>
                    {fmt(goal.current)} / {fmt(goal.target)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
