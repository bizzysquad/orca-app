'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Check, DollarSign, Receipt, Calendar,
  Mic2, Car, Plus, Trash2, Flame, Scale, MessageSquare,
  ChevronLeft, ChevronRight, Send, X, Target, Loader2,
  Coffee, Utensils,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useOrcaData } from '@/context/OrcaDataContext'
import { fmt } from '@/lib/utils'
import type { DailyPriority, WeightLog, MealLog, Bill } from '@/lib/types'

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'
const BENTLEY_GREEN = '#10B981'
const BENTLEY_RED = '#EF4444'

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

// ── Bentley Chat Panel ──
function BentleyDayPlan({ date, priorities, bills, groceryItems }: {
  date: string
  priorities: DailyPriority['items']
  bills: Bill[]
  groceryItems: any[]
}) {
  const { theme } = useTheme()
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [autoLoaded, setAutoLoaded] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadDayPlan = useCallback(async () => {
    if (autoLoaded) return
    setAutoLoaded(true)
    setLoading(true)
    const incompleteTasks = priorities.filter(p => !p.completed).length
    const dueBills = bills.filter(b => b.due === date && b.status !== 'paid')
    const availableFood = groceryItems.filter((g: any) => !g.consumed).slice(0, 8).map((g: any) => g.name).join(', ')
    const prompt = `Give me a quick day plan for today (${date}). Include: 1) The top 3 tasks I should focus on, 2) A suggested meal plan for hitting 3,200 calories and 180g protein. Available food: ${availableFood || 'not specified'}. ${dueBills.length > 0 ? `Bills due today: ${dueBills.map(b => b.name + ' $' + b.amount).join(', ')}.` : ''} ${incompleteTasks} tasks still to complete. Keep it tight — bullet points, no fluff.`
    try {
      const res = await fetch('/api/bentley', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          context: `The user wants a day plan for ${date}.`,
        }),
      })
      const data = await res.json()
      setMessages([{ role: 'assistant', content: data.message || 'Ready to build your day plan. What do you need?' }])
    } catch {
      setMessages([{ role: 'assistant', content: "I'm here. Tell me what's on your plate today and I'll help you build a plan." }])
    } finally {
      setLoading(false)
    }
  }, [date, priorities, bills, groceryItems, autoLoaded])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    const next = [...messages, { role: 'user' as const, content: userMsg }]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch('/api/bentley', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message || '...' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <motion.button
        variants={fadeUp}
        onClick={() => { setOpen(true); loadDayPlan() }}
        className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
        style={{ background: `linear-gradient(135deg, ${BENTLEY_GOLD}15, ${BENTLEY_INDIGO}10)`, border: `1px solid ${BENTLEY_GOLD}30` }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${BENTLEY_GOLD}, #D97706)` }}>
          <Sparkles size={18} color="#fff" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm" style={{ color: BENTLEY_GOLD }}>Bentley's Day Plan</p>
          <p className="text-xs mt-0.5" style={{ color: theme.subtext }}>Tap to get your game plan: tasks + meal suggestions</p>
        </div>
        <ChevronRight size={16} style={{ color: BENTLEY_GOLD }} />
      </motion.button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${BENTLEY_GOLD}40` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: `${BENTLEY_GOLD}15`, borderBottom: `1px solid ${BENTLEY_GOLD}25` }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${BENTLEY_GOLD}, #D97706)` }}>
            <Sparkles size={13} color="#fff" />
          </div>
          <span className="text-sm font-bold" style={{ color: BENTLEY_GOLD }}>Bentley</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${BENTLEY_GOLD}20`, color: BENTLEY_GOLD }}>Day Plan</span>
        </div>
        <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg" style={{ color: theme.subtext }}>
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto" style={{ background: theme.card }}>
        {messages.length === 0 && loading && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 px-4 py-3 rounded-2xl" style={{ background: theme.bg }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: BENTLEY_GOLD, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background: msg.role === 'user' ? BENTLEY_INDIGO : theme.bg,
                color: msg.role === 'user' ? '#fff' : theme.text,
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 px-4 py-3 rounded-2xl" style={{ background: theme.bg }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: BENTLEY_GOLD, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ background: theme.card, borderColor: theme.border }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask Bentley anything about your day..."
            className="flex-1 px-3 py-2.5 rounded-xl border text-sm"
            style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl disabled:opacity-40"
            style={{ background: BENTLEY_INDIGO, color: '#fff' }}
          >
            <Send size={15} />
          </button>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {['Build my meal plan', 'What should I focus on?', 'Quick wins for today'].map(q => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="px-2.5 py-1 rounded-full text-xs border"
              style={{ borderColor: theme.border, color: theme.subtext }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
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
                    {g.startTime && <p className="text-xs" style={{ color: theme.subtext }}>{g.startTime}{g.endTime ? ` – ${g.endTime}` : ''}</p>}
                  </div>
                  {g.payment && <span className="text-xs font-bold" style={{ color: '#EC4899' }}>{fmt(g.payment)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: BENTLEY_INDIGO }}>
            Tasks ({priorities.filter(p => p.completed).length}/{priorities.length})
          </p>
          <div className="space-y-1.5">
            {priorities.map((item, i) => {
              const color = AREA_COLORS[item.area] || BENTLEY_INDIGO
              return (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => onTogglePriority(item.id)}
                    className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: item.completed ? color : theme.border,
                      backgroundColor: item.completed ? color : 'transparent',
                    }}
                  >
                    {item.completed && <Check size={10} color="#fff" />}
                  </button>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: item.completed ? theme.subtext : theme.text,
                      textDecoration: item.completed ? 'line-through' : 'none',
                    }}
                  >
                    {item.text}
                  </span>
                  <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${color}18`, color }}>
                    {item.area}
                  </div>
                  <button
                    onClick={() => onDeletePriority(item.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                    style={{ color: theme.subtext }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Add task */}
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newTask.trim()) {
                  onAddPriority(newTask.trim(), newArea)
                  setNewTask('')
                }
              }}
              placeholder="Add a task for this day..."
              className="flex-1 px-3 py-2 rounded-xl border text-xs"
              style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
            />
            <select
              value={newArea}
              onChange={e => setNewArea(e.target.value)}
              className="px-2 py-2 rounded-xl border text-xs"
              style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}
            >
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button
              onClick={() => { if (newTask.trim()) { onAddPriority(newTask.trim(), newArea); setNewTask('') } }}
              disabled={!newTask.trim()}
              className="p-2 rounded-xl disabled:opacity-40"
              style={{ backgroundColor: BENTLEY_INDIGO, color: '#fff' }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
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
  // Grocery items
  const [groceryItems, setGroceryItems] = useState<any[]>([])
  // Fitness
  const [todayCalories, setTodayCalories] = useState(0)
  const [currentWeight, setCurrentWeight] = useState(159)
  // Checking balance
  const [checkingBalance, setCheckingBalance] = useState(0)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-dj-gigs')
      if (saved) setGigs(JSON.parse(saved))
    } catch {}
    try {
      const saved = localStorage.getItem('orca-grocery')
      if (saved) setGroceryItems(JSON.parse(saved))
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
    // Load all priority dates this month
    const loadPriorities: Record<string, DailyPriority['items']> = {}
    for (let d = 1; d <= 31; d++) {
      const ds = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      try {
        const saved = localStorage.getItem(`orca-priorities-${ds}`)
        if (saved) loadPriorities[ds] = JSON.parse(saved)
      } catch {}
    }
    // Default today priorities if none
    if (!loadPriorities[todayStr]) {
      loadPriorities[todayStr] = [
        { id: '1', text: 'Hit your calorie goal (3,200 cal)', area: 'fitness', completed: false, addedByBentley: true },
        { id: '2', text: 'Work on your top business task', area: 'business', completed: false, addedByBentley: true },
        { id: '3', text: 'Check music release pipeline', area: 'music', completed: false, addedByBentley: true },
      ]
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

  const totalDue = useMemo(() =>
    bills.filter(b => b.status !== 'paid').reduce((s, b) => s + b.amount, 0),
    [bills]
  )

  const upcomingGigs = useMemo(() =>
    gigs.filter(g => g.date >= todayStr && g.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 2),
    [gigs, todayStr]
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <Loader2 size={24} className="animate-spin" style={{ color: BENTLEY_INDIGO }} />
      </div>
    )
  }

  const caloriesPct = Math.min(Math.round((todayCalories / 3200) * 100), 100)

  return (
    <div className="min-h-screen pb-16" style={{ background: theme.bg, color: theme.text }}>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        className="px-4 pt-5 pb-4 max-w-lg mx-auto space-y-4"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: BENTLEY_GOLD }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>ORCA</span>
            </div>
            <h1 className="text-2xl font-bold leading-tight" style={{ color: theme.text }}>{greeting}</h1>
            <p className="text-sm mt-0.5" style={{ color: theme.subtext }}>{line}</p>
          </div>
          <Link href="/bentley">
            <motion.div
              whileTap={{ scale: 0.93 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: `${BENTLEY_GOLD}18`, border: `1px solid ${BENTLEY_GOLD}40`, color: BENTLEY_GOLD }}
            >
              <MessageSquare size={13} />
              Bentley
            </motion.div>
          </Link>
        </motion.div>

        {/* Quick stats row */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2">
          <Link href="/bill-boss">
            <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-xs mb-0.5" style={{ color: theme.subtext }}>Bills Due</p>
              <p className="font-bold text-base" style={{ color: BENTLEY_RED }}>{fmt(totalDue)}</p>
            </div>
          </Link>
          <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <p className="text-xs mb-0.5" style={{ color: theme.subtext }}>Balance</p>
            <p className="font-bold text-base" style={{ color: BENTLEY_INDIGO }}>{checkingBalance > 0 ? fmt(checkingBalance) : '—'}</p>
          </div>
          <Link href="/dj">
            <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-xs mb-0.5" style={{ color: theme.subtext }}>DJ Gigs</p>
              <p className="font-bold text-base" style={{ color: '#EC4899' }}>{upcomingGigs.length}</p>
            </div>
          </Link>
        </motion.div>

        {/* Calendar */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} style={{ color: BENTLEY_INDIGO }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Command Calendar</span>
          </div>
          <DashboardCalendar
            bills={bills}
            gigs={gigs}
            priorities={allPriorities}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            month={calMonth}
            year={calYear}
            onMonthChange={handleMonthChange}
          />
        </motion.div>

        {/* Day Detail */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} style={{ color: BENTLEY_INDIGO }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>
              {selectedDate === todayStr ? "Today's Plan" : 'Day View'}
            </span>
          </div>
          <DayDetail
            date={selectedDate}
            bills={bills}
            gigs={gigs}
            priorities={selectedPriorities}
            onTogglePriority={handleTogglePriority}
            onAddPriority={handleAddPriority}
            onDeletePriority={handleDeletePriority}
          />
        </motion.div>

        {/* Bentley Day Plan */}
        <motion.div variants={fadeUp}>
          <BentleyDayPlan
            date={selectedDate}
            priorities={selectedPriorities}
            bills={bills}
            groceryItems={groceryItems}
          />
        </motion.div>

        {/* Fitness quick bar */}
        <motion.div variants={fadeUp}>
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
        </motion.div>
      </motion.div>
    </div>
  )
}
