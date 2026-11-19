'use client'

// Command center building blocks. Every widget lives at module level (not
// inside DashboardPage) so React keeps them mounted between renders. The old
// inline versions remounted on every keystroke, which is why the "add a
// priority" box used to lose focus after each letter.

import { useState } from 'react'
import Link from 'next/link'
import {
  Check, DollarSign, X, Mic2, Flame, Palette, ChevronLeft, ChevronRight,
  CheckSquare, Circle, Dumbbell, ShoppingCart, Clock, Plus, ArrowUpRight, Scale,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { fmt } from '@/lib/utils'
import type { Bill, DailyPriority } from '@/lib/types'

export const C = {
  gold: '#F59E0B',
  indigo: '#6366F1',
  green: '#10B981',
  red: '#EF4444',
  pink: '#EC4899',
  purple: '#9333EA',
  cyan: '#22D3EE',
}

export type PriorityItem = DailyPriority['items'][number]

export function to12Hour(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h)) return time
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// ── Primitives ──────────────────────────────────────────────────────────────

export function Card({ children, className = '', accent }: { children: React.ReactNode; className?: string; accent?: string }) {
  const { theme } = useTheme()
  return (
    <section
      className={`rounded-2xl ${className}`}
      style={{ backgroundColor: theme.card, border: `1px solid ${accent ? `${accent}33` : theme.border}`, boxShadow: theme.shadow }}
    >
      {children}
    </section>
  )
}

export function CardHeader({
  icon: Icon, title, accent, badge, href, linkLabel = 'Open',
}: {
  icon: React.ElementType
  title: string
  accent: string
  badge?: string | number | null
  href?: string
  linkLabel?: string
}) {
  const { theme } = useTheme()
  return (
    <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 md:px-5">
      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}1f`, color: accent }}>
        <Icon size={15} strokeWidth={2.2} />
      </span>
      <h2 className="text-[13px] font-semibold tracking-wide" style={{ color: theme.text }}>{title}</h2>
      {badge != null && badge !== '' && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accent}1f`, color: accent }}>{badge}</span>
      )}
      {href && (
        <Link href={href} className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold hover:opacity-70" style={{ color: accent }}>
          {linkLabel} <ArrowUpRight size={13} />
        </Link>
      )}
    </div>
  )
}

function SubLabel({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  return <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2" style={{ color: theme.subtext }}>{children}</p>
}

function Empty({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  return <p className="text-xs py-1" style={{ color: theme.subtext }}>{children}</p>
}

// ── Header + alerts ─────────────────────────────────────────────────────────

export function Header({ greeting, line, todayStr }: { greeting: string; line: string; todayStr: string }) {
  const { theme } = useTheme()
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.gold }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: C.gold }}>Command Center</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight" style={{ color: theme.text }}>{greeting}</h1>
        <p className="text-sm mt-1" style={{ color: theme.subtext }}>{line}</p>
      </div>
      <p className="text-sm font-medium shrink-0" style={{ color: theme.subtext }}>
        {new Date(todayStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
    </div>
  )
}

export interface AlertChip {
  key: string
  label: string
  sub: string
  href: string
  color: string
  icon: React.ElementType
}

export function Alerts({ alerts, onDismiss }: { alerts: AlertChip[]; onDismiss: (key: string) => void }) {
  const { theme } = useTheme()
  if (alerts.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {alerts.map(a => (
        <div key={a.key} className="flex items-center gap-2 rounded-xl pl-2 pr-1 py-1.5" style={{ background: `${a.color}14`, border: `1px solid ${a.color}33` }}>
          <Link href={a.href} className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${a.color}26`, color: a.color }}><a.icon size={14} /></span>
            <span className="text-sm font-semibold" style={{ color: theme.text }}>{a.label}</span>
            <span className="hidden sm:inline text-xs" style={{ color: theme.subtext }}>{a.sub}</span>
          </Link>
          <button onClick={() => onDismiss(a.key)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: theme.subtext }} aria-label={`Dismiss ${a.label}`}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── KPI row ─────────────────────────────────────────────────────────────────

export function Kpi({ label, value, sub, color, href, icon: Icon }: { label: string; value: string; sub?: string; color: string; href: string; icon: React.ElementType }) {
  const { theme } = useTheme()
  return (
    <Link href={href} className="group block rounded-2xl p-4 transition-transform hover:-translate-y-0.5" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: theme.subtext }}>{label}</span>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}1f`, color }}><Icon size={14} /></span>
      </div>
      <p className="mt-2 text-xl md:text-2xl font-bold tabular-nums tracking-tight" style={{ color }}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] truncate" style={{ color: theme.subtext }}>{sub}</p>}
    </Link>
  )
}

// ── Priorities (used by Today and the day view) ─────────────────────────────

export function PriorityList({
  items, onAdd, onToggle, onDelete, placeholder,
}: {
  items: PriorityItem[]
  onAdd: (text: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  placeholder: string
}) {
  const { theme } = useTheme()
  const [text, setText] = useState('')
  const add = () => {
    if (!text.trim()) return
    onAdd(text.trim())
    setText('')
  }
  return (
    <div className="space-y-1.5">
      {items.map(p => (
        <div key={p.id} className="group flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: theme.bg }}>
          <button
            onClick={() => onToggle(p.id)}
            className="w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0"
            style={{ background: p.completed ? C.green : 'transparent', border: `1.5px solid ${p.completed ? C.green : theme.border}` }}
            aria-label={p.completed ? 'Mark not done' : 'Mark done'}
          >
            {p.completed && <Check size={11} color="#fff" strokeWidth={3} />}
          </button>
          <span className="flex-1 text-sm min-w-0 break-words" style={{ color: theme.text, textDecoration: p.completed ? 'line-through' : 'none', opacity: p.completed ? 0.55 : 1 }}>{p.text}</span>
          <button onClick={() => onDelete(p.id)} className="p-1 opacity-60 hover:opacity-100" style={{ color: theme.subtext }} aria-label="Remove"><X size={13} /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2"
          style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, ['--tw-ring-color' as any]: `${C.gold}55` }}
        />
        <button onClick={add} className="px-3 rounded-xl" style={{ background: `${C.gold}1f`, color: C.gold }} aria-label="Add priority"><Plus size={16} /></button>
      </div>
    </div>
  )
}

// ── Today ───────────────────────────────────────────────────────────────────

export function TodayCard({
  priorities, onAdd, onToggle, onDelete, schedule, lifeTasks,
}: {
  priorities: PriorityItem[]
  onAdd: (text: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  schedule: { id: string; startTime: string; label: string }[]
  lifeTasks: { kind: string; label: string }[]
}) {
  const { theme } = useTheme()
  const done = priorities.filter(p => p.completed).length
  return (
    <Card>
      <CardHeader icon={CheckSquare} title="Today" accent={C.gold} badge={priorities.length ? `${done}/${priorities.length} done` : null} href="/planner" linkLabel="Planner" />
      <div className="px-4 pb-4 md:px-5 md:pb-5 grid md:grid-cols-[1.4fr_1fr] gap-5">
        <div>
          <SubLabel>Priorities</SubLabel>
          <PriorityList items={priorities} onAdd={onAdd} onToggle={onToggle} onDelete={onDelete} placeholder="Add a priority for today..." />
        </div>
        <div className="space-y-5">
          <div>
            <SubLabel>Schedule</SubLabel>
            {schedule.length === 0 ? <Empty>No blocks scheduled.</Empty> : (
              <ul className="space-y-1.5">
                {schedule.map(b => (
                  <li key={b.id} className="flex items-center gap-2.5 text-sm">
                    <Clock size={12} style={{ color: theme.subtext }} className="shrink-0" />
                    <span className="tabular-nums w-[60px] shrink-0 text-xs" style={{ color: theme.subtext }}>{b.startTime}</span>
                    <span className="truncate" style={{ color: theme.text }}>{b.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <SubLabel>Recurring</SubLabel>
            {lifeTasks.length === 0 ? <Empty>No recurring tasks today.</Empty> : (
              <ul className="space-y-1.5">
                {lifeTasks.map((t, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm" style={{ color: theme.text }}>
                    {t.kind === 'grocery' ? <ShoppingCart size={13} style={{ color: C.indigo }} /> : <CheckSquare size={13} style={{ color: C.indigo }} />}
                    {t.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Calendar ────────────────────────────────────────────────────────────────

interface DayEvent { label: string; type: 'bill' | 'gig' | 'task'; color: string; paid?: boolean }

export function DashboardCalendar({
  bills, gigs, priorities, selectedDate, onDateSelect, month, year, onMonthChange,
}: {
  bills: Bill[]
  gigs: any[]
  priorities: Record<string, PriorityItem[]>
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

  let cards: any[] = []
  try { cards = JSON.parse(localStorage.getItem('orca-credit-cards') || '[]') } catch {}

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
      if (show) events.push({ label: b.name, type: 'bill', color: C.red, paid: b.status === 'paid' })
    })
    gigs.forEach(g => {
      if (g.date === dateStr && g.status !== 'cancelled') events.push({ label: `DJ: ${g.venue || g.clientName || 'Gig'}`, type: 'gig', color: C.pink })
    })
    cards.forEach((c: any) => {
      (c.payments || []).forEach((p: any) => {
        if (p.date === dateStr && !p.paid) events.push({ label: `${c.name}: $${p.amount}`, type: 'bill', color: '#8B5CF6' })
      })
    })
    const incomplete = (priorities[dateStr] || []).filter(p => !p.completed).length
    if (incomplete > 0) events.push({ label: `${incomplete} task${incomplete > 1 ? 's' : ''}`, type: 'task', color: C.indigo })
    return events
  }

  const cells: React.ReactNode[] = []
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
        className="relative flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl transition-colors min-h-[46px] md:min-h-[52px]"
        style={{
          backgroundColor: isSelected ? C.indigo : isToday ? `${C.gold}1f` : 'transparent',
          border: isToday && !isSelected ? `1px solid ${C.gold}66` : '1px solid transparent',
          opacity: isPast && !isToday ? 0.5 : 1,
        }}
        aria-label={`${dateStr}${events.length ? `, ${events.length} items` : ''}`}
      >
        <span className="text-xs font-semibold tabular-nums" style={{ color: isSelected ? '#fff' : isToday ? C.gold : theme.text }}>{d}</span>
        {events.length > 0 && (
          <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-1">
            {events.slice(0, 3).map((ev, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? '#ffffffaa' : ev.color }} />
            ))}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onMonthChange(-1)} className="p-2 rounded-xl hover:opacity-70" style={{ color: theme.subtext }} aria-label="Previous month"><ChevronLeft size={17} /></button>
        <h3 className="font-semibold text-sm" style={{ color: theme.text }}>{monthName}</h3>
        <button onClick={() => onMonthChange(1)} className="p-2 rounded-xl hover:opacity-70" style={{ color: theme.subtext }} aria-label="Next month"><ChevronRight size={17} /></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold py-1" style={{ color: theme.subtext }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">{cells}</div>
      <div className="flex gap-4 mt-3 pt-3 border-t flex-wrap" style={{ borderColor: theme.border }}>
        {[{ color: C.red, label: 'Bill' }, { color: '#8B5CF6', label: 'Card payment' }, { color: C.pink, label: 'DJ gig' }, { color: C.indigo, label: 'Tasks' }].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[10px]" style={{ color: theme.subtext }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DayDetail({
  date, todayStr, bills, gigs, priorities, onAdd, onToggle, onDelete,
}: {
  date: string
  todayStr: string
  bills: Bill[]
  gigs: any[]
  priorities: PriorityItem[]
  onAdd: (text: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { theme } = useTheme()
  const formatted = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const dueBills = bills.filter(b => {
    const rec = b.recurrence || 'one-time'
    if (rec === 'one-time') return b.due === date
    if (rec === 'monthly') return new Date(b.due + 'T00:00:00').getDate() === new Date(date + 'T00:00:00').getDate()
    return false
  })
  const dayGigs = gigs.filter(g => g.date === date && g.status !== 'cancelled')
  const isToday = date === todayStr

  return (
    <div className="p-4 md:p-5 space-y-4 h-full">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>{isToday ? 'Today' : 'Day view'}</p>
        <p className="font-semibold text-sm mt-0.5" style={{ color: theme.text }}>{formatted}</p>
      </div>

      {dueBills.length > 0 && (
        <div>
          <SubLabel>Bills due</SubLabel>
          <div className="space-y-1.5">
            {dueBills.map(b => (
              <div key={b.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: `${C.red}12` }}>
                <span className="text-sm truncate" style={{ color: theme.text }}>{b.name}</span>
                <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: b.status === 'paid' ? C.green : C.red }}>
                  {b.status === 'paid' ? <Check size={12} className="inline mr-1" /> : null}{fmt(b.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dayGigs.length > 0 && (
        <div>
          <SubLabel>DJ gigs</SubLabel>
          <div className="space-y-1.5">
            {dayGigs.map((g: any) => (
              <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: `${C.pink}12` }}>
                <Mic2 size={13} style={{ color: C.pink }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: theme.text }}>{g.venue || g.clientName || 'Gig'}</p>
                  {g.startTime && <p className="text-xs" style={{ color: theme.subtext }}>{to12Hour(g.startTime)}{g.endTime ? ` to ${to12Hour(g.endTime)}` : ''}</p>}
                </div>
                {g.payment ? <span className="text-xs font-semibold" style={{ color: C.pink }}>{fmt(g.payment)}</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's priorities live in the Today card; other days are edited here. */}
      {isToday ? (
        dueBills.length + dayGigs.length === 0 && <Empty>Nothing else scheduled today. Priorities are in the Today card above.</Empty>
      ) : (
        <div>
          <SubLabel>Priorities</SubLabel>
          <PriorityList items={priorities} onAdd={onAdd} onToggle={onToggle} onDelete={onDelete} placeholder="Plan something for this day..." />
        </div>
      )}
    </div>
  )
}

// ── Right rail cards ────────────────────────────────────────────────────────

function Bar({ pct, color }: { pct: number; color: string }) {
  const { theme } = useTheme()
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
    </div>
  )
}

export function HealthCard({
  workoutTitle, workoutLogged, workoutTotal, meals, protein, proteinTarget, calories, calorieTarget, weight,
}: {
  workoutTitle: string
  workoutLogged: number
  workoutTotal: number
  meals: { label: string; logged: boolean }[]
  protein: number
  proteinTarget: number
  calories: number
  calorieTarget: number
  weight: number
}) {
  const { theme } = useTheme()
  const calPct = Math.round((calories / calorieTarget) * 100)
  return (
    <Card>
      <CardHeader icon={Flame} title="Health" accent={C.green} href="/fitness" />
      <div className="px-4 pb-4 md:px-5 md:pb-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${C.green}1f`, color: C.green }}><Dumbbell size={16} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{workoutTitle}</p>
            <p className="text-xs" style={{ color: theme.subtext }}>{workoutTotal > 0 ? `${workoutLogged}/${workoutTotal} exercises logged` : 'Nothing to log today'}</p>
          </div>
          <span className="text-xs font-semibold inline-flex items-center gap-1 shrink-0" style={{ color: theme.subtext }}><Scale size={12} style={{ color: C.green }} />{weight} lbs</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {meals.map(m => (
            <span key={m.label} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg" style={{ backgroundColor: m.logged ? `${C.green}1a` : theme.bg, color: m.logged ? C.green : theme.subtext }}>
              {m.logged ? <Check size={11} strokeWidth={3} /> : <Circle size={10} />} {m.label}
            </span>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: theme.subtext }}>Protein</span>
              <span className="font-semibold tabular-nums" style={{ color: theme.text }}>{Math.round(protein)}g <span style={{ color: theme.subtext }}>/ {proteinTarget}g</span></span>
            </div>
            <Bar pct={(protein / proteinTarget) * 100} color={C.green} />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: theme.subtext }}>Calories</span>
              <span className="font-semibold tabular-nums" style={{ color: theme.text }}>{calories} <span style={{ color: theme.subtext }}>/ {calorieTarget}</span></span>
            </div>
            <Bar pct={calPct} color={calPct > 80 ? C.green : calPct > 40 ? C.gold : C.red} />
          </div>
        </div>
      </div>
    </Card>
  )
}

export function BillsCard({
  upcoming, todayStr, dueSoonTotal, wellsRequired,
}: {
  upcoming: { bill: Bill; due: Date }[]
  todayStr: string
  dueSoonTotal: number
  wellsRequired: number
}) {
  const { theme } = useTheme()
  const today = new Date(todayStr + 'T00:00:00').getTime()
  return (
    <Card>
      <CardHeader icon={DollarSign} title="Upcoming Bills" accent={C.red} badge={upcoming.length || null} href="/bill-boss" linkLabel="Bill Boss" />
      <div className="px-4 pb-4 md:px-5 md:pb-5">
        {upcoming.length === 0 ? <Empty>Nothing due. You&apos;re clear.</Empty> : (
          <ul className="divide-y" style={{ borderColor: theme.border }}>
            {upcoming.map(({ bill: b, due }) => {
              const dueStr = due.toISOString().slice(0, 10)
              const overdue = dueStr < todayStr
              const days = Math.ceil((due.getTime() - today) / 86400000)
              const when = overdue ? 'Overdue' : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `In ${days} days`
              return (
                <li key={b.id + dueStr} className="flex items-center gap-3 py-2.5" style={{ borderColor: theme.border }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: theme.text }}>{b.name}</p>
                    <p className="text-[11px]" style={{ color: overdue || days <= 1 ? C.red : theme.subtext }}>{when} · {shortDate(due)}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: overdue ? C.red : theme.text }}>{fmt(b.amount)}</span>
                </li>
              )
            })}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-xl p-2.5" style={{ background: theme.bg }}>
            <p className="text-[10px]" style={{ color: theme.subtext }}>Still owed on these</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: C.red }}>{fmt(dueSoonTotal)}</p>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: theme.bg }}>
            <p className="text-[10px]" style={{ color: theme.subtext }}>Wells balance needed</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: theme.text }}>{fmt(wellsRequired)}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

const PRIORITY_COLORS: Record<string, string> = { high: C.red, medium: C.gold, low: C.green }

export function TasksCard({ tasks }: { tasks: { id: string; text: string; completed: boolean; priority: string; starred: boolean }[] }) {
  const { theme } = useTheme()
  const incomplete = tasks.filter(t => !t.completed)
  const starred = incomplete.filter(t => t.starred)
  const shown = (starred.length > 0 ? starred : incomplete).slice(0, 5)
  return (
    <Card>
      <CardHeader icon={CheckSquare} title={starred.length ? 'Starred Tasks' : 'Task List'} accent={C.indigo} badge={incomplete.length || null} href="/task-list" />
      <div className="px-4 pb-4 md:px-5 md:pb-5">
        {shown.length === 0 ? <Empty>No open tasks.</Empty> : (
          <ul className="space-y-1.5">
            {shown.map(t => (
              <li key={t.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ backgroundColor: theme.bg }}>
                <Circle size={11} style={{ color: PRIORITY_COLORS[t.priority] || C.indigo }} className="shrink-0" />
                <span className="text-sm truncate flex-1" style={{ color: theme.text }}>{t.text}</span>
              </li>
            ))}
          </ul>
        )}
        {incomplete.length > shown.length && (
          <Link href="/task-list" className="block text-[11px] text-center pt-2 hover:opacity-70" style={{ color: theme.subtext }}>+{incomplete.length - shown.length} more</Link>
        )}
      </div>
    </Card>
  )
}

export function BizzyPlugCard({ leads, earnedThisMonth }: { leads: any[]; earnedThisMonth: number }) {
  const { theme } = useTheme()
  if (leads.length === 0) return null
  const pending = leads.reduce((s: number, p: any) => s + (p.quote || 0), 0)
  return (
    <Card>
      <CardHeader icon={Palette} title="BizzyPlug Work Board" accent={C.purple} badge={`${leads.length} active`} href="/bizzplug" />
      <div className="px-4 pb-4 md:px-5 md:pb-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-2.5" style={{ background: theme.bg }}>
            <p className="text-[10px]" style={{ color: theme.subtext }}>Pending value</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: C.purple }}>{fmt(pending)}</p>
          </div>
          <div className="rounded-xl p-2.5" style={{ background: theme.bg }}>
            <p className="text-[10px]" style={{ color: theme.subtext }}>Earned this month</p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: C.green }}>{fmt(earnedThisMonth)}</p>
          </div>
        </div>
        <ul className="space-y-1.5">
          {leads.slice(0, 5).map((p: any) => {
            const paid = p.paid || 0
            const quote = p.quote || 0
            const pct = quote > 0 ? Math.min(100, Math.round((paid / quote) * 100)) : 0
            return (
              <li key={p.id}>
                <Link href="/bizzplug" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:opacity-80" style={{ backgroundColor: theme.bg }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: theme.text }}>{p.artistName}</p>
                    <p className="text-[11px] truncate" style={{ color: theme.subtext }}>{p.projectType}{p.deadline ? ` · Due ${p.deadline}` : ''}</p>
                    {quote > 0 && <div className="mt-1.5"><Bar pct={pct} color={pct >= 100 ? C.green : C.purple} /></div>}
                  </div>
                  <div className="text-right shrink-0">
                    {quote > 0 ? (
                      <>
                        <p className="text-xs font-semibold tabular-nums" style={{ color: paid >= quote ? C.green : C.purple }}>{fmt(paid)}</p>
                        <p className="text-[10px]" style={{ color: theme.subtext }}>of {fmt(quote)}</p>
                      </>
                    ) : <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${C.purple}1f`, color: C.purple }}>Quote TBD</span>}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        {leads.length > 5 && <Link href="/bizzplug" className="block text-[11px] text-center hover:opacity-70" style={{ color: theme.subtext }}>+{leads.length - 5} more</Link>}
      </div>
    </Card>
  )
}

export function GigsCard({ gigs }: { gigs: any[] }) {
  const { theme } = useTheme()
  if (gigs.length === 0) return null
  return (
    <Card>
      <CardHeader icon={Mic2} title="Upcoming Gigs" accent={C.pink} href="/dj" />
      <ul className="px-4 pb-4 md:px-5 md:pb-5 space-y-1.5">
        {gigs.map((g: any) => (
          <li key={g.id}>
            <Link href="/dj" className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl hover:opacity-80" style={{ backgroundColor: `${C.pink}12` }}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: theme.text }}>{g.venue || g.clientName || 'Gig'}</p>
                <p className="text-[11px]" style={{ color: theme.subtext }}>{shortDate(new Date(g.date + 'T00:00:00'))}{g.startTime ? ` · ${to12Hour(g.startTime)}` : ''}</p>
              </div>
              {g.contractAmount > 0 && <span className="text-xs font-semibold tabular-nums" style={{ color: C.pink }}>{fmt(g.contractAmount)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export interface MonthIncome { month: string; year: number; lyft: number; dj: number; bizzplug: number; total: number }

export function IncomeCard({ months }: { months: MonthIncome[] }) {
  const { theme } = useTheme()
  const [sel, setSel] = useState<number | null>(null)
  const max = Math.max(...months.map(m => m.total), 1)
  const shown = sel !== null ? months[sel] : months[months.length - 1]
  return (
    <Card>
      <CardHeader icon={DollarSign} title="Monthly Income" accent={C.green} href="/smart-stack" linkLabel="Smart Stack" />
      <div className="px-4 pb-4 md:px-5 md:pb-5">
        <div className="flex items-end gap-2 h-[110px]">
          {months.map((m, i) => {
            const active = sel === i || (sel === null && i === months.length - 1)
            return (
              <button key={i} onClick={() => setSel(sel === i ? null : i)} className="flex-1 flex flex-col items-center justify-end gap-1 h-full" style={{ opacity: sel !== null && sel !== i ? 0.45 : 1 }} aria-label={`${m.month} ${m.year}: ${fmt(m.total)}`}>
                <span className="text-[9px] font-semibold tabular-nums" style={{ color: m.total > 0 ? C.green : theme.subtext }}>{m.total > 0 ? `$${Math.round(m.total)}` : ''}</span>
                <div className="w-full rounded-t-md" style={{ height: `${Math.max((m.total / max) * 72, 4)}px`, background: active ? C.green : `${C.green}55` }} />
                <span className="text-[10px] font-medium" style={{ color: active ? theme.text : theme.subtext }}>{m.month}</span>
              </button>
            )
          })}
        </div>
        {shown && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs font-medium" style={{ color: theme.subtext }}>{shown.month} {shown.year}</p>
              <p className="text-base font-bold tabular-nums" style={{ color: C.green }}>{fmt(shown.total)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{ k: 'Lyft', v: shown.lyft, c: C.cyan }, { k: 'DJ', v: shown.dj, c: C.pink }, { k: 'BizzyPlug', v: shown.bizzplug, c: C.purple }].map(x => (
                <div key={x.k} className="rounded-xl p-2" style={{ backgroundColor: `${x.c}12` }}>
                  <p className="text-[10px]" style={{ color: theme.subtext }}>{x.k}</p>
                  <p className="text-xs font-semibold tabular-nums" style={{ color: x.c }}>{fmt(x.v)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

