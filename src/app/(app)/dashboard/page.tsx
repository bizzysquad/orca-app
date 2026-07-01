'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Check, DollarSign, Calendar, X,
  Mic2, Flame, Scale, Palette,
  ChevronLeft, ChevronRight, Target, Loader2,
  CheckSquare, Circle,
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

    // Credit card payments
    try {
      const cards = JSON.parse(localStorage.getItem('orca-credit-cards') || '[]')
      cards.forEach((c: any) => {
        (c.payments || []).forEach((p: any) => {
          if (p.date === dateStr && !p.paid) {
            events.push({ label: `${c.name}: $${p.amount}`, type: 'bill', color: '#8B5CF6' })
          }
        })
      })
    } catch {}

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
  const router = useRouter()
  // Stores the ISO timestamp when each notif type was dismissed
  const [dismissedAt, setDismissedAt] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('orca-dismissed-notifs-ts') || '{}') } catch { return {} }
  })

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
  // New quote requests
  const [newQuoteCount, setNewQuoteCount] = useState(0)
  const [newTestimonialCount, setNewTestimonialCount] = useState(0)
  const [bizzyplugNotifications, setBizzyplugNotifications] = useState<any[]>([])
  // Fitness
  const [todayCalories, setTodayCalories] = useState(0)
  const [currentWeight, setCurrentWeight] = useState(159)
  // Checking balance
  const [checkingBalance, setCheckingBalance] = useState(0)
  // Tasks
  const [tasks, setTasks] = useState<{ id: string; text: string; completed: boolean; priority: string; starred: boolean; category: string }[]>([])
  // Raw income source data (synced with Smart Stack)
  const [lyftSessions, setLyftSessions] = useState<any[]>([])
  const [djGigsList, setDjGigsList] = useState<any[]>([])
  const [bizzplugClientsList, setBizzplugClientsList] = useState<any[]>([])

  // Month-aware income totals — recalculate when calMonth/calYear changes
  const lyftNetIncome = useMemo(() => {
    const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
    return lyftSessions
      .filter((s: any) => s.date?.startsWith(key))
      .reduce((sum: number, s: any) => sum + (s.earnings || 0) - (s.gasExpense || 0), 0)
  }, [lyftSessions, calMonth, calYear])

  const djEarnedIncome = useMemo(() => {
    const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
    return djGigsList
      .filter((g: any) => g.date?.startsWith(key))
      .reduce((sum: number, gig: any) => {
        const dep = gig.depositPaid ? (gig.depositAmount || 0) : 0
        const parts = (gig.partialPayments || []).reduce((sp: number, p: any) => sp + p.amount, 0)
        return sum + dep + parts
      }, 0)
  }, [djGigsList, calMonth, calYear])

  const bizzplugEarnedIncome = useMemo(() => {
    const key = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
    return bizzplugClientsList
      .filter((c: any) => { const dt = c?.paidDate || c?.createdAt || ''; return dt.startsWith(key) && (c.paid || 0) > 0 })
      .reduce((sum: number, c: any) => sum + (c.paid || 0), 0)
  }, [bizzplugClientsList, calMonth, calYear])

  // Re-read all localStorage data when cloud sync merges new data
  useEffect(() => {
    const handleSyncReady = () => {
      try {
        const saved = localStorage.getItem('orca-dj-gigs')
        if (saved) { const parsed = JSON.parse(saved); setGigs(parsed); setDjGigsList(parsed) }
      } catch {}
      try {
        const ls = localStorage.getItem('orca-lyft-sessions')
        if (ls) setLyftSessions(JSON.parse(ls))
      } catch {}
      try {
        const biz = localStorage.getItem('orca-bizzplug-clients')
        if (biz) setBizzplugClientsList(JSON.parse(biz))
      } catch {}
    }
    window.addEventListener('orca-sync-ready', handleSyncReady)
    return () => window.removeEventListener('orca-sync-ready', handleSyncReady)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-dj-gigs')
      if (saved) { const parsed = JSON.parse(saved); setGigs(parsed); setDjGigsList(parsed) }
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
    // Load income source raw data (Lyft, DJ, BizzyPlug)
    try {
      const ls = localStorage.getItem('orca-lyft-sessions')
      if (ls) setLyftSessions(JSON.parse(ls))
    } catch {}
    try {
      const djData = localStorage.getItem('orca-dj-gigs')
      if (djData) setDjGigsList(JSON.parse(djData))
    } catch {}
    try {
      const biz = localStorage.getItem('orca-bizzplug-clients')
      if (biz) setBizzplugClientsList(JSON.parse(biz))
    } catch {}
    try {
      const t = localStorage.getItem('orca-tasks')
      if (t) setTasks(JSON.parse(t))
    } catch {}
    // Check for new BizzyPlug leads — fetch fresh from Supabase AND merge with localStorage
    const loadBPLeads = (projectList: any[]) => {
      if (!Array.isArray(projectList)) return
      const recentLeads = projectList.filter((p: any) => {
        if (!p || p.status !== 'new-lead' || !p.createdAt) return false
        const age = Date.now() - new Date(p.createdAt).getTime()
        return age < 7 * 24 * 60 * 60 * 1000
      })
      setBizzyplugNotifications(recentLeads)
      setBizzplugClientsList(projectList)
    }
    // Try Supabase first (most up-to-date, catches server-created leads)
    fetch('/api/bizzyplug/projects').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.projects?.length > 0) {
        loadBPLeads(d.projects)
        try { localStorage.setItem('orca-bizzplug-clients', JSON.stringify(d.projects)) } catch {}
      } else {
        // Fallback to localStorage
        try { const raw = localStorage.getItem('orca-bizzplug-clients'); if (raw) loadBPLeads(JSON.parse(raw)) } catch {}
      }
    }).catch(() => {
      try { const raw = localStorage.getItem('orca-bizzplug-clients'); if (raw) loadBPLeads(JSON.parse(raw)) } catch {}
    })
    // Check for new quote requests
    fetch('/api/dj/bookings').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.bookings) {
        const newCount = d.bookings.filter((b: any) => b.status === 'pending' && b.client_name !== '__DJ_GIG__' && b.client_name !== '__DJ_BLOCK__' && b.client_name !== '__BIZZYPLUG__').length
        setNewQuoteCount(newCount)
      }
    }).catch(() => {})
    // Check for new testimonials
    fetch('/api/dj/testimonials').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.all) {
        const recent = d.all.filter((t: any) => {
          if (!t.created_at) return false
          const age = Date.now() - new Date(t.created_at).getTime()
          return age < 7 * 24 * 60 * 60 * 1000
        }).length
        setNewTestimonialCount(recent)
      }
    }).catch(() => {})
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
    const monthEnd = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(new Date(calYear, calMonth + 1, 0).getDate()).padStart(2, '0')}`
    return gigs
      .filter(g => g.date >= todayStr && g.date <= monthEnd && g.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 2)
  }, [gigs, calMonth, calYear, todayStr])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <Loader2 size={24} className="animate-spin" style={{ color: BENTLEY_INDIGO }} />
      </div>
    )
  }

  const caloriesPct = Math.min(Math.round((todayCalories / 3200) * 100), 100)

  // ── Shared widget renderers ───────────────────────────────────────────────

  const dismissNotif = (key: string) => {
    const next = { ...dismissedAt, [key]: new Date().toISOString() }
    setDismissedAt(next)
    try { localStorage.setItem('orca-dismissed-notifs-ts', JSON.stringify(next)) } catch {}
  }

  // A notification is shown if there's a lead/quote NEWER than the last dismissal time
  const latestLeadDate = bizzyplugNotifications.length > 0
    ? bizzyplugNotifications.reduce((latest: string, n: any) => (n.createdAt || '') > latest ? (n.createdAt || '') : latest, '')
    : ''
  const showBP = bizzyplugNotifications.length > 0 && (!dismissedAt['bp'] || latestLeadDate > dismissedAt['bp'])
  const showQuotes = newQuoteCount > 0 && !dismissedAt['quotes']
  const showReviews = newTestimonialCount > 0 && !dismissedAt['reviews']

  const QuoteAlert = () => (!showBP && !showQuotes && !showReviews) ? null : (
    <div className="space-y-2">
      {showBP && (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: '#9333EA15', border: '1px solid #9333EA30' }}>
          <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => router.push('/bizzplug')}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#9333EA25' }}>
              <Palette size={16} style={{ color: '#9333EA' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: theme.text }}>{bizzyplugNotifications.length + ' New BizzyPlug Lead' + (bizzyplugNotifications.length !== 1 ? 's' : '')}</p>
              <p className="text-xs" style={{ color: theme.subtext }}>Tap to view in Projects</p>
            </div>
          </div>
          <button onClick={() => dismissNotif('bp')} className="p-1.5 rounded-lg shrink-0 hover:opacity-70" style={{ color: theme.subtext }}>
            <X size={14} />
          </button>
        </div>
      )}
      {showQuotes && (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: '#EC489915', border: '1px solid #EC489930' }}>
          <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => router.push('/dj')}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EC489925' }}>
              <Mic2 size={16} style={{ color: '#EC4899' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: theme.text }}>{newQuoteCount + ' New Quote' + (newQuoteCount !== 1 ? 's' : '')}</p>
              <p className="text-xs" style={{ color: theme.subtext }}>Tap to review in DJ Gig Manager</p>
            </div>
          </div>
          <button onClick={() => dismissNotif('quotes')} className="p-1.5 rounded-lg shrink-0 hover:opacity-70" style={{ color: theme.subtext }}>
            <X size={14} />
          </button>
        </div>
      )}
      {showReviews && (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: BENTLEY_GOLD + '12', border: '1px solid ' + BENTLEY_GOLD + '30' }}>
          <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => router.push('/dj')}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: BENTLEY_GOLD + '20' }}>
              <Flame size={16} style={{ color: BENTLEY_GOLD }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: theme.text }}>{newTestimonialCount + ' New Review' + (newTestimonialCount !== 1 ? 's' : '')}</p>
              <p className="text-xs" style={{ color: theme.subtext }}>View in Website tab</p>
            </div>
          </div>
          <button onClick={() => dismissNotif('reviews')} className="p-1.5 rounded-lg shrink-0 hover:opacity-70" style={{ color: theme.subtext }}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )

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

  const MonthlyIncome = () => {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(null)

    const monthlyData = useMemo(() => {
      const months: { month: string; monthNum: number; year: number; lyft: number; dj: number; bizzplug: number; total: number }[] = []
      for (let i = 5; i >= 0; i--) {
        let m = currentMonth - i
        let y = currentYear
        if (m < 0) { m += 12; y-- }
        const key = `${y}-${String(m + 1).padStart(2, '0')}`
        let lyft = 0
        let dj = 0
        let bizzplug = 0
        try {
          const ls = JSON.parse(localStorage.getItem('orca-lyft-sessions') || '[]')
          ls.forEach((s: any) => { if (s.date?.startsWith(key)) lyft += (s.earnings || 0) })
        } catch {}
        try {
          const gs = JSON.parse(localStorage.getItem('orca-dj-gigs') || '[]')
          gs.forEach((g: any) => {
            if (g.date?.startsWith(key)) {
              const dep = g.depositPaid ? (g.depositAmount || 0) : 0
              const parts = (g.partialPayments || []).reduce((s: number, p: any) => s + p.amount, 0)
              dj += dep + parts
            }
          })
        } catch {}
        try {
          let bc = JSON.parse(localStorage.getItem('orca-bizzplug-clients') || '[]')
          if (typeof bc === 'string') bc = JSON.parse(bc)
          if (Array.isArray(bc)) bc.forEach((c: any) => { const dt = c?.paidDate || c?.createdAt || ''; if (dt.startsWith(key) && (c.paid || 0) > 0) bizzplug += (c.paid || 0) })
        } catch {}
        months.push({ month: monthNames[m], monthNum: m, year: y, lyft, dj, bizzplug, total: lyft + dj + bizzplug })
      }
      return months
    }, [currentMonth, currentYear])

    const maxTotal = Math.max(...monthlyData.map(m => m.total), 1)
    const selected = selectedMonthIdx !== null ? monthlyData[selectedMonthIdx] : null

    return (
      <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={14} style={{ color: BENTLEY_GREEN }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Monthly Income</span>
          <span className="text-[9px] ml-auto" style={{ color: theme.subtext }}>Tap a month</span>
        </div>
        <div className="flex items-end gap-2" style={{ height: 100 }}>
          {monthlyData.map((m, i) => {
            const isSelected = selectedMonthIdx === i
            const isCurrent = i === monthlyData.length - 1
            return (
              <button
                key={i}
                onClick={() => setSelectedMonthIdx(isSelected ? null : i)}
                className="flex-1 flex flex-col items-center gap-1 transition-all"
                style={{ opacity: selectedMonthIdx !== null && !isSelected ? 0.4 : 1 }}
              >
                <span className="text-[9px] font-bold tabular-nums" style={{ color: m.total > 0 ? BENTLEY_GREEN : theme.subtext }}>{m.total > 0 ? `$${Math.round(m.total)}` : ''}</span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max((m.total / maxTotal) * 70, 4)}px`,
                    background: isSelected ? BENTLEY_GREEN : isCurrent ? BENTLEY_GREEN : `${BENTLEY_GREEN}50`,
                    boxShadow: isSelected ? `0 0 8px ${BENTLEY_GREEN}60` : 'none',
                  }}
                />
                <span className="text-[10px] font-semibold" style={{ color: isSelected || isCurrent ? theme.text : theme.subtext }}>{m.month}</span>
              </button>
            )
          })}
        </div>

        {/* Selected month detail */}
        {selected ? (
          <div className="mt-3 pt-2 border-t space-y-2" style={{ borderColor: `${theme.border}60` }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold" style={{ color: theme.text }}>{selected.month} {selected.year} Earnings</p>
              <p className="text-sm font-bold" style={{ color: BENTLEY_GREEN }}>{fmt(selected.total)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl p-2 text-center" style={{ backgroundColor: `#22D3EE10` }}>
                <p className="text-[9px] font-bold uppercase" style={{ color: theme.subtext }}>Lyft</p>
                <p className="text-sm font-bold" style={{ color: '#22D3EE' }}>{fmt(selected.lyft)}</p>
              </div>
              <div className="rounded-xl p-2 text-center" style={{ backgroundColor: `#EC489910` }}>
                <p className="text-[9px] font-bold uppercase" style={{ color: theme.subtext }}>DJ</p>
                <p className="text-sm font-bold" style={{ color: '#EC4899' }}>{fmt(selected.dj)}</p>
              </div>
              <div className="rounded-xl p-2 text-center" style={{ backgroundColor: `${BENTLEY_GOLD}10` }}>
                <p className="text-[9px] font-bold uppercase" style={{ color: theme.subtext }}>BizzyPlug</p>
                <p className="text-sm font-bold" style={{ color: BENTLEY_GOLD }}>{fmt(selected.bizzplug)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 mt-3 pt-2 border-t" style={{ borderColor: `${theme.border}60` }}>
            <div><p className="text-[9px] font-bold uppercase" style={{ color: theme.subtext }}>This Month</p><p className="text-sm font-bold" style={{ color: BENTLEY_GREEN }}>{fmt(monthlyData[monthlyData.length - 1]?.total || 0)}</p></div>
            <div><p className="text-[9px] font-bold uppercase" style={{ color: theme.subtext }}>Lyft</p><p className="text-sm font-bold" style={{ color: '#22D3EE' }}>{fmt(monthlyData[monthlyData.length - 1]?.lyft || 0)}</p></div>
            <div><p className="text-[9px] font-bold uppercase" style={{ color: theme.subtext }}>DJ</p><p className="text-sm font-bold" style={{ color: '#EC4899' }}>{fmt(monthlyData[monthlyData.length - 1]?.dj || 0)}</p></div>
            <div><p className="text-[9px] font-bold uppercase" style={{ color: theme.subtext }}>BizzyPlug</p><p className="text-sm font-bold" style={{ color: '#9333EA' }}>{fmt(monthlyData[monthlyData.length - 1]?.bizzplug || 0)}</p></div>
          </div>
        )}
      </div>
    )
  }

  const PRIORITY_COLORS: Record<string, string> = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' }

  const TaskListWidget = () => {
    const incomplete = tasks.filter(t => !t.completed)
    const starred = incomplete.filter(t => t.starred)
    const display = starred.length > 0 ? starred : incomplete
    const shown = display.slice(0, 5)
    const totalIncomplete = incomplete.length

    return (
      <Link href="/task-list">
        <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare size={14} style={{ color: BENTLEY_INDIGO }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Task List</span>
            </div>
            {totalIncomplete > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${BENTLEY_INDIGO}18`, color: BENTLEY_INDIGO }}>
                {totalIncomplete}
              </span>
            )}
          </div>
          {shown.length > 0 ? (
            <div className="space-y-1.5">
              {shown.map(t => (
                <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: `${BENTLEY_INDIGO}08` }}>
                  <Circle size={12} style={{ color: PRIORITY_COLORS[t.priority] || BENTLEY_INDIGO }} />
                  <span className="text-sm truncate flex-1" style={{ color: theme.text }}>{t.text}</span>
                  {t.starred && <span className="text-[10px]">⭐</span>}
                </div>
              ))}
              {totalIncomplete > 5 && (
                <p className="text-[10px] text-center pt-1" style={{ color: theme.subtext }}>+{totalIncomplete - 5} more</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-center py-3" style={{ color: theme.subtext }}>No tasks yet — tap to add</p>
          )}
        </div>
      </Link>
    )
  }

  const BizzyPlugPosterboard = () => {
    const newLeads = bizzplugClientsList.filter((p: any) => p.status === 'new-lead')
    if (newLeads.length === 0) return null
    const pendingValue = newLeads.reduce((s: number, p: any) => s + (p.quote || 0), 0)

    return (
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: '1px solid #9333EA30' }}>
        <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: `1px solid #9333EA20` }}>
          <div className="flex items-center gap-2">
            <Palette size={14} style={{ color: '#9333EA' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>BizzyPlug Work Board</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#9333EA18', color: '#9333EA' }}>
              {newLeads.length} active
            </span>
          </div>
          <Link href="/bizzplug">
            <span className="text-[10px] font-bold" style={{ color: '#9333EA' }}>View All →</span>
          </Link>
        </div>

        <div className="px-4 py-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: '#9333EA10' }}>
            <p className="text-[9px] font-bold uppercase mb-0.5" style={{ color: theme.subtext }}>Pending Value</p>
            <p className="text-sm font-bold" style={{ color: '#9333EA' }}>{fmt(pendingValue)}</p>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: `${BENTLEY_GREEN}10` }}>
            <p className="text-[9px] font-bold uppercase mb-0.5" style={{ color: theme.subtext }}>Earned This Mo.</p>
            <p className="text-sm font-bold" style={{ color: BENTLEY_GREEN }}>{fmt(bizzplugEarnedIncome)}</p>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-2">
          {newLeads.slice(0, 5).map((p: any) => {
            const paid = p.paid || 0
            const quote = p.quote || 0
            const pct = quote > 0 ? Math.min(100, Math.round((paid / quote) * 100)) : 0
            return (
              <Link key={p.id} href="/bizzplug">
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#9333EA15' }}>
                    <Palette size={13} style={{ color: '#9333EA' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{p.artistName}</p>
                    <p className="text-[10px] truncate" style={{ color: theme.subtext }}>
                      {p.projectType}
                      {p.deadline ? ` · Due ${p.deadline}` : ''}
                    </p>
                    {quote > 0 && (
                      <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? BENTLEY_GREEN : '#9333EA' }} />
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {quote > 0 ? (
                      <>
                        <p className="text-xs font-bold" style={{ color: paid >= quote ? BENTLEY_GREEN : '#9333EA' }}>{fmt(paid)}</p>
                        <p className="text-[10px]" style={{ color: theme.subtext }}>of {fmt(quote)}</p>
                      </>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#9333EA15', color: '#9333EA' }}>Quote TBD</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
          {newLeads.length > 5 && (
            <Link href="/bizzplug">
              <p className="text-[10px] text-center pt-1" style={{ color: theme.subtext }}>+{newLeads.length - 5} more — tap to view all</p>
            </Link>
          )}
        </div>
      </div>
    )
  }

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
          <motion.div variants={fadeUp}><QuoteAlert /></motion.div>
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
          <motion.div variants={fadeUp}><BizzyPlugPosterboard /></motion.div>
          <motion.div variants={fadeUp}><TaskListWidget /></motion.div>
          <motion.div variants={fadeUp}><FitnessBar /></motion.div>
          <motion.div variants={fadeUp}><MonthlyIncome /></motion.div>
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
          {(showBP || showQuotes || showReviews) && <motion.div variants={fadeUp} className="mb-6"><QuoteAlert /></motion.div>}

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
              <BizzyPlugPosterboard />
              <TaskListWidget />
              <FitnessBar />
              <MonthlyIncome />
              <UpcomingGigsList />
            </motion.div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
