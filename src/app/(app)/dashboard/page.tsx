'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Check, DollarSign, Calendar,
  Mic2, Flame, Scale,
  ChevronLeft, ChevronRight, Target, Loader2,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt } from '@/lib/utils'
import type { DailyPriority, WeightLog, MealLog, Bill } from '@/lib/types'

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'
const BENTLEY_GREEN = '#10B981'
const BENTLEY_RED = '#EF4444'

function to12Hour(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

const fadeUp = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

function getGreeting(name: string) {
  const h = new Date().getHours()
  const firstName = name?.split(' ')[0] || 'Boss'
  if (h < 6) return { greeting: `Working late, ${firstName}?`, line: "Respect the grind. Don't forget sleep is gains too." }
  if (h < 12) return { greeting: `Morning briefing, ${firstName}.`, line: "Stack the priorities early. The day isn't waiting." }
  if (h < 17) return { greeting: `Midday check-in, ${firstName}.`, line: "How's the execution? Intentions mean nothing without action." }
  return { greeting: `Evening report, ${firstName}.`, line: "What did you actually finish today? Let's review." }
}

function gid() { return Math.random().toString(36).slice(2, 10) }

interface DayEvent {
  label: string
  type: 'bill' | 'gig' | 'task'
  color: string
  paid?: boolean
}


// ── Main Calendar Component ──
function DashboardCalendar({
  bills,
  gigs,
  priorities,
  selectedDate,
  onDateSelect,
  month,
  year,
  onMonthChange,
}: {
  bills: Bill[]
  gigs: any[]
  priorities: Record<string, DailyPriority['items']>
  selectedDate: string
  onDateSelect: (date: string) => void
  month: number
  year: number
  onMonthChange: (dir: number) => void
}) {
  const { theme } = useTheme()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const getEventsForDay = (day: number): DayEvent[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const events: DayEvent[] = []

    bills.forEach(b => {
      const due = new Date(b.due + 'T00:00:00')
      const rec = b.recurrence || 'one-time'
      let show = false
      if (rec === 'one-time') show = b.due === dateStr
      else if (rec === 'monthly') show = due.getDate() === day
      else if (rec === 'yearly') show = due.getDate() === day && due.getMonth() === month
      if (show) events.push({ label: b.name, type: 'bill', color: BENTLEY_RED, paid: b.status === 'paid' })
    })

    gigs.forEach(g => {
      if (g.date === dateStr && g.status !== 'cancelled') {
        events.push({ label: `DJ: ${g.venue || g.clientName || 'Gig'}`, type: 'gig', color: '#EC4899' })
      }
    })

    const dayPriorities = priorities[dateStr] || []
    const incomplete = dayPriorities.filter(p => !p.completed).length
    if (incomplete > 0) events.push({ label: `${incomplete} task${incomplete > 1 ? 's' : ''}`, type: 'task', color: BENTLEY_INDIGO })

    return events
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />)

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const events = getEventsForDay(d)
    const isToday = dateStr === todayStr
    const isSelected = dateStr === selectedDate
    const isPast = dateStr < todayStr

    cells.push(
      <button
        key={d}
        onClick={() => onDateSelect(dateStr)}
        className="relative flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl transition-all min-h-[52px]"
        style={{
          backgroundColor: isSelected
            ? BENTLEY_INDIGO
            : isToday
            ? `${BENTLEY_GOLD}20`
            : 'transparent',
          border: isToday && !isSelected ? `1px solid ${BENTLEY_GOLD}60` : `1px solid transparent`,
          opacity: isPast && !isToday ? 0.5 : 1,
        }}
      >
        <span
          className="text-xs font-bold"
          style={{
            color: isSelected ? '#fff' : isToday ? BENTLEY_GOLD : theme.text,
          }}
        >
          {d}
        </span>
        {events.length > 0 && (
          <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-1">
            {events.slice(0, 3).map((ev, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: isSelected ? '#ffffff80' : ev.color }}
              />
            ))}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(-1)} className="p-2 rounded-xl" style={{ color: theme.subtext }}>
          <ChevronLeft size={17} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={15} style={{ color: BENTLEY_INDIGO }} />
          <h3 className="font-bold text-sm" style={{ color: theme.text }}>{monthName}</h3>
        </div>
        <button onClick={() => onMonthChange(1)} className="p-2 rounded-xl" style={{ color: theme.subtext }}>
          <ChevronRight size={17} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold py-1" style={{ color: theme.subtext }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">{cells}</div>

      {/* Legend */}
      <div className="flex gap-3 mt-3 pt-2.5 border-t flex-wrap" style={{ borderColor: `${theme.border}60` }}>
        {[
          { color: BENTLEY_RED, label: 'Bill' },
          { color: '#EC4899', label: 'DJ Gig' },
          { color: BENTLEY_INDIGO, label: 'Tasks' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[10px]" style={{ color: theme.subtext }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Day Detail Panel ──
function DayDetail({
  date,
  bills,
  gigs,
  priorities,
  onTogglePriority,
  onAddPriority,
  onDeletePriority,
}: {
  date: string
  bills: Bill[]
  gigs: any[]
  priorities: DailyPriority['items']
  onTogglePriority: (id: string) => void
  onAddPriority: (text: string, area: string) => void
  onDeletePriority: (id: string) => void
}) {
  const { theme } = useTheme()
  const [newTask, setNewTask] = useState('')
  const [newArea, setNewArea] = useState('personal')

  const formatted = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const dueBills = bills.filter(b => {
    const rec = b.recurrence || 'one-time'
    if (rec === 'one-time') return b.due === date
    if (rec === 'monthly') {
      const d = new Date(b.due + 'T00:00:00')
      const dateObj = new Date(date + 'T00:00:00')
      return d.getDate() === dateObj.getDate()
    }
    return false
  })

  const dayGigs = gigs.filter(g => g.date === date && g.status !== 'cancelled')

  const AREAS = ['personal', 'business', 'fitness', 'dj', 'lyft', 'music', 'money']
  const AREA_COLORS: Record<string, string> = {
    fitness: BENTLEY_GREEN, money: '#10B981', music: '#A78BFA',
    business: BENTLEY_GOLD, dj: '#EC4899', lyft: '#F97316', personal: BENTLEY_INDIGO,
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <p className="font-bold text-sm" style={{ color: theme.text }}>{formatted}</p>
        <p className="text-xs mt-0.5" style={{ color: theme.subtext }}>
          {dueBills.length + dayGigs.length + priorities.length} items
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Bills */}
        {dueBills.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: BENTLEY_RED }}>Bills Due</p>
            <div className="space-y-1.5">
              {dueBills.map(b => (
                <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ backgroundColor: `${BENTLEY_RED}10` }}>
                  <div className="flex items-center gap-2">
                    <DollarSign size={13} style={{ color: BENTLEY_RED }} />
                    <span className="text-sm font-medium" style={{ color: theme.text }}>{b.name}</span>
                    {b.status === 'paid' && <Check size={12} style={{ color: BENTLEY_GREEN }} />}
                  </div>
                  <span className="text-sm font-bold" style={{ color: b.status === 'paid' ? BENTLEY_GREEN : BENTLEY_RED }}>
                    {b.status === 'paid' ? '✓ ' : '–'}{fmt(b.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DJ Gigs */}
        {dayGigs.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#EC4899' }}>DJ Gigs</p>
            <div className="space-y-1.5">
              {dayGigs.map((g: any) => (
                <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: '#EC489910' }}>
                  <Mic2 size={13} style={{ color: '#EC4899' }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: theme.text }}>{g.venue || g.clientName || 'Gig'}</p>
                    {g.startTime && <p className="text-xs" style={{ color: theme.subtext }}>{to12Hour(g.startTime)}{g.endTime ? ` – ${to12Hour(g.endTime)}` : ''}</p>}
                  </div>
                  {g.payment && <span className="text-xs font-bold" style={{ color: '#EC4899' }}>{fmt(g.payment)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { theme } = useTheme()
  const { data, loading } = useOrcaData()
  const { user, bills } = data

  const displayName = user?.name?.trim() || 'Boss'
  const { greeting, line } = getGreeting(displayName)

  const todayStr = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())

  // All priorities keyed by date
  const [allPriorities, setAllPriorities] = useState<Record<string, DailyPriority['items']>>({})

  // DJ gigs
  const [gigs, setGigs] = useState<any[]>([])
  // Fitness
  const [todayCalories, setTodayCalories] = useState(0)
  const [currentWeight, setCurrentWeight] = useState(159)
  // Checking balance
  const [checkingBalance, setCheckingBalance] = useState(0)
  // Income source totals (synced with Smart Stack)
  const [lyftNetIncome, setLyftNetIncome] = useState(0)
  const [djEarnedIncome, setDjEarnedIncome] = useState(0)
  const [bizzplugEarnedIncome, setBizzplugEarnedIncome] = useState(0)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-dj-gigs')
      if (saved) setGigs(JSON.parse(saved))
    } catch {}
    try {
      const wl = localStorage.getItem('orca-weight-logs')
      const ml = localStorage.getItem('orca-meal-logs')
      if (wl) {
        const logs: WeightLog[] = JSON.parse(wl)
        const latest = logs.sort((a, b) => b.date.localeCompare(a.date))[0]
        if (latest) setCurrentWeight(latest.weight)
      }
      if (ml) {
        const meals: MealLog[] = JSON.parse(ml)
        const todayMeals = meals.filter(m => m.date === todayStr)
        setTodayCalories(todayMeals.reduce((s, m) => s + m.calories, 0))
      }
    } catch {}
    try {
      const s = localStorage.getItem('orca-user-settings')
      if (s) { const p = JSON.parse(s); if (p.checkingBalance > 0) setCheckingBalance(p.checkingBalance) }
    } catch {}
    // Load income source data (Lyft, DJ, BizzyPlug)
    try {
      const ls = localStorage.getItem('orca-lyft-sessions')
      if (ls) {
        const sessions = JSON.parse(ls)
        const net = sessions.reduce((s: number, x: any) => s + (x.earnings || 0) - (x.gasExpense || 0), 0)
        setLyftNetIncome(net)
      }
    } catch {}
    try {
      const djData = localStorage.getItem('orca-dj-gigs')
      if (djData) {
        const djList = JSON.parse(djData)
        const earned = djList.reduce((s: number, gig: any) => {
          const dep = gig.depositPaid ? (gig.depositAmount || 0) : 0
          const parts = (gig.partialPayments || []).reduce((sp: number, p: any) => sp + p.amount, 0)
          return s + dep + parts
        }, 0)
        setDjEarnedIncome(earned)
      }
    } catch {}
    try {
      const biz = localStorage.getItem('orca-bizzplug-clients')
      if (biz) {
        const clients = JSON.parse(biz)
        const paid = clients.reduce((s: number, c: any) => s + (c.paid || 0), 0)
        setBizzplugEarnedIncome(paid)
      }
    } catch {}
    // Load all priority dates — scan last 6 months and next 6 months
    const loadPriorities: Record<string, DailyPriority['items']> = {}
    const now = new Date()
    for (let monthOffset = -6; monthOffset <= 6; monthOffset++) {
      const ref = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
      const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        try {
          const saved = localStorage.getItem(`orca-priorities-${ds}`)
          if (saved) loadPriorities[ds] = JSON.parse(saved)
        } catch {}
      }
    }
    setAllPriorities(loadPriorities)
  }, [todayStr])

  const selectedPriorities = allPriorities[selectedDate] || []

  const handleTogglePriority = useCallback((id: string) => {
    setAllPriorities(prev => {
      const items = (prev[selectedDate] || []).map(p => p.id === id ? { ...p, completed: !p.completed } : p)
      const next = { ...prev, [selectedDate]: items }
      try { localStorage.setItem(`orca-priorities-${selectedDate}`, JSON.stringify(items)) } catch {}
      return next
    })
  }, [selectedDate])

  const handleAddPriority = useCallback((text: string, area: string) => {
    const newItem = { id: gid(), text, area, completed: false, addedByBentley: false }
    setAllPriorities(prev => {
      const items = [...(prev[selectedDate] || []), newItem]
      const next = { ...prev, [selectedDate]: items }
      try { localStorage.setItem(`orca-priorities-${selectedDate}`, JSON.stringify(items)) } catch {}
      return next
    })
  }, [selectedDate])

  const handleDeletePriority = useCallback((id: string) => {
    setAllPriorities(prev => {
      const items = (prev[selectedDate] || []).filter(p => p.id !== id)
      const next = { ...prev, [selectedDate]: items }
      try { localStorage.setItem(`orca-priorities-${selectedDate}`, JSON.stringify(items)) } catch {}
      return next
    })
  }, [selectedDate])

  const handleMonthChange = (dir: number) => {
    let m = calMonth + dir
    let y = calYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCalMonth(m)
    setCalYear(y)
  }

  const upcomingBills = useMemo(() =>
    bills.filter(b => b.status !== 'paid').sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3),
    [bills]
  )

  // Bills due in the currently viewed calendar month (month-aware, handles recurrence + partial payments)
  const totalDue = useMemo(() => {
    const monthEnd = new Date(calYear, calMonth + 1, 0)
    let total = 0
    bills.forEach(b => {
      const rec = b.recurrence || 'one-time'
      const dueDate = new Date(b.due + 'T00:00:00')
      let appearsThisMonth = false
      if (rec === 'one-time') {
        appearsThisMonth = dueDate.getMonth() === calMonth && dueDate.getFullYear() === calYear
      } else if (rec === 'monthly') {
        appearsThisMonth = dueDate <= monthEnd
      } else if (rec === 'yearly') {
        appearsThisMonth = dueDate.getMonth() === calMonth && calYear >= dueDate.getFullYear()
      }
      if (!appearsThisMonth) return
      // Cycle-aware paid check
      const cycleAllocs = (rec !== 'one-time' && b.alloc.length > 0)
        ? b.alloc.filter(a => { const ad = new Date(a.date + 'T00:00:00'); return ad.getMonth() === calMonth && ad.getFullYear() === calYear })
        : b.alloc
      const paid = cycleAllocs.filter(a => a.paid).reduce((s, a) => s + a.amount, 0)
      if (paid >= b.amount) return
      if (b.status === 'paid' && rec === 'one-time') return
      if (rec === 'monthly' && b.status === 'paid' && b.paidDate) {
        const pd = new Date(b.paidDate + 'T00:00:00')
        if (pd.getMonth() === calMonth && pd.getFullYear() === calYear) return
      }
      total += Math.max(0, b.amount - paid)
    })
    return total
  }, [bills, calMonth, calYear])

  const upcomingGigs = useMemo(() => {
    const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
    const monthEnd = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(new Date(calYear, calMonth + 1, 0).getDate()).padStart(2, '0')}`
    return gigs
      .filter(g => g.date >= monthStart && g.date <= monthEnd && g.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 2)
  }, [gigs, calMonth, calYear])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <Loader2 size={24} className="animate-spin" style={{ color: BENTLEY_INDIGO }} />
      </div>
    )
  }

  const caloriesPct = Math.min(Math.round((todayCalories / 3200) * 100), 100)

  // ── Shared widget renderers ───────────────────────────────────────────────

  const QuickStatsRow = () => (
    <div className="grid grid-cols-3 gap-2">
      <Link href="/bill-boss">
        <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <p className="text-xs mb-0.5" style={{ color: theme.subtext }}>Bills Due</p>
          <p className="font-bold text-base" style={{ color: BENTLEY_RED }}>{fmt(totalDue)}</p>
        </div>
      </Link>
      <Link href="/smart-stack">
        <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <p className="text-xs mb-0.5" style={{ color: theme.subtext }}>Income</p>
          <p className="font-bold text-base" style={{ color: BENTLEY_GREEN }}>
            {(lyftNetIncome + djEarnedIncome + bizzplugEarnedIncome) > 0
              ? fmt(lyftNetIncome + djEarnedIncome + bizzplugEarnedIncome)
              : checkingBalance > 0 ? fmt(checkingBalance) : '—'}
          </p>
        </div>
      </Link>
      <Link href="/dj">
        <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <p className="text-xs mb-0.5" style={{ color: theme.subtext }}>DJ Gigs</p>
          <p className="font-bold text-base" style={{ color: '#EC4899' }}>{upcomingGigs.length}</p>
        </div>
      </Link>
    </div>
  )

  const FitnessBar = () => (
    <Link href="/fitness">
      <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame size={14} style={{ color: BENTLEY_GREEN }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Fitness Today</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold" style={{ color: theme.subtext }}>
            <span><Scale size={11} className="inline mr-1" style={{ color: BENTLEY_GREEN }} />{currentWeight} lbs</span>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-xs" style={{ color: theme.subtext }}>Calories</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${caloriesPct}%`, backgroundColor: caloriesPct > 80 ? BENTLEY_GREEN : caloriesPct > 40 ? BENTLEY_GOLD : BENTLEY_RED }} />
          </div>
          <span className="text-xs font-bold tabular-nums" style={{ color: theme.text }}>{todayCalories}/{3200}</span>
        </div>
      </div>
    </Link>
  )

  const UpcomingGigsList = () => upcomingGigs.length === 0 ? null : (
    <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Mic2 size={14} style={{ color: '#EC4899' }} />
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Upcoming Gigs</span>
      </div>
      <div className="space-y-2">
        {upcomingGigs.map((g: any) => (
          <Link key={g.id} href="/dj">
            <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ backgroundColor: '#EC489910' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{g.venue || g.clientName || 'Gig'}</p>
                <p className="text-xs" style={{ color: theme.subtext }}>{g.date}{g.startTime ? ` · ${g.startTime}` : ''}</p>
              </div>
              <span className="text-xs font-bold ml-2" style={{ color: '#EC4899' }}>{g.contractAmount > 0 ? fmt(g.contractAmount) : ''}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-16 lg:pb-0" style={{ background: theme.bg, color: theme.text }}>
      <div className="px-4 pt-5 lg:px-8 lg:pt-8 max-w-lg mx-auto lg:max-w-none">

        {/* ── MOBILE layout (single column) ── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          className="lg:hidden space-y-4 pb-4"
        >
          {/* Header */}
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: BENTLEY_GOLD }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>ORCA</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: theme.text }}>{greeting}</h1>
            <p className="text-sm mt-0.5" style={{ color: theme.subtext }}>{line}</p>
          </motion.div>
          <motion.div variants={fadeUp}><QuickStatsRow /></motion.div>
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} style={{ color: BENTLEY_INDIGO }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Command Calendar</span>
            </div>
            <DashboardCalendar bills={bills} gigs={gigs} priorities={allPriorities} selectedDate={selectedDate} onDateSelect={setSelectedDate} month={calMonth} year={calYear} onMonthChange={handleMonthChange} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} style={{ color: BENTLEY_INDIGO }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>{selectedDate === todayStr ? "Today's Plan" : 'Day View'}</span>
            </div>
            <DayDetail date={selectedDate} bills={bills} gigs={gigs} priorities={selectedPriorities} onTogglePriority={handleTogglePriority} onAddPriority={handleAddPriority} onDeletePriority={handleDeletePriority} />
          </motion.div>
          <motion.div variants={fadeUp}><FitnessBar /></motion.div>
        </motion.div>

        {/* ── DESKTOP layout (two columns) ── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          className="hidden lg:block pb-8"
        >
          {/* Desktop header */}
          <motion.div variants={fadeUp} className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: BENTLEY_GOLD }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>ORCA</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight" style={{ color: theme.text }}>{greeting}</h1>
            <p className="text-sm mt-1" style={{ color: theme.subtext }}>{line}</p>
          </motion.div>

          {/* Stats row — full width */}
          <motion.div variants={fadeUp} className="mb-6"><QuickStatsRow /></motion.div>

          {/* Two-column grid */}
          <div className="grid grid-cols-[1fr_340px] gap-6 items-start">

            {/* Left column */}
            <motion.div variants={fadeUp} className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} style={{ color: BENTLEY_INDIGO }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Command Calendar</span>
                </div>
                <DashboardCalendar bills={bills} gigs={gigs} priorities={allPriorities} selectedDate={selectedDate} onDateSelect={setSelectedDate} month={calMonth} year={calYear} onMonthChange={handleMonthChange} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} style={{ color: BENTLEY_INDIGO }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>{selectedDate === todayStr ? "Today's Plan" : 'Day View'}</span>
                </div>
                <DayDetail date={selectedDate} bills={bills} gigs={gigs} priorities={selectedPriorities} onTogglePriority={handleTogglePriority} onAddPriority={handleAddPriority} onDeletePriority={handleDeletePriority} />
              </div>
            </motion.div>

            {/* Right column */}
            <motion.div variants={fadeUp} className="space-y-4">
              <FitnessBar />
              <UpcomingGigsList />
            </motion.div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
