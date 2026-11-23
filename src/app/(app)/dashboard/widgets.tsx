'use client'

// Dashboard building blocks (2026-11 redesign). Every widget lives at module
// level, not inside DashboardPage, so React keeps them mounted between renders
// (inline versions remounted on every keystroke and lost input focus).
//
// Visual rules: one neutral card style, text in text colors, color reserved
// for meaning (money in / owed / warning) and the single accent for actions.

import { useState } from 'react'
import Link from 'next/link'
import {
  Check, X, ChevronLeft, ChevronRight, Plus, ArrowUpRight, Circle,
  Dumbbell, ShoppingCart, Repeat, Disc3, PenTool, Clapperboard, Ticket, Car, Inbox,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { fmt } from '@/lib/utils'
import type { Bill, DailyPriority } from '@/lib/types'

export type PriorityItem = DailyPriority['items'][number]

// Income streams. Validated categorical slots 1 to 3 (blue, orange, aqua)
// against both the light and the dark card surface.
export const STREAMS = [
  { key: 'lyft', name: 'Lyft', light: '#2a78d6', dark: '#3987e5' },
  { key: 'dj', name: 'DJ Maskoff', light: '#eb6834', dark: '#d95926' },
  { key: 'bizzplug', name: 'BizzyPlug', light: '#1baf7a', dark: '#199e70' },
] as const
export type StreamKey = typeof STREAMS[number]['key']

export function useStreamColors(): Record<StreamKey, string> {
  const { isDark } = useTheme()
  return Object.fromEntries(STREAMS.map(s => [s.key, isDark ? s.dark : s.light])) as Record<StreamKey, string>
}

export function to12Hour(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h)) return time
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const fmt0 = (n: number) => `${n < 0 ? '-' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`

// ── Primitives ──────────────────────────────────────────────────────────────

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { theme } = useTheme()
  return (
    <section className={`rounded-2xl min-w-0 ${className}`} style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
      {children}
    </section>
  )
}

export function CardHeader({ title, sub, href, linkLabel = 'View', right }: {
  title: string
  sub?: string | null
  href?: string
  linkLabel?: string
  right?: React.ReactNode
}) {
  const { theme } = useTheme()
  return (
    <div className="flex items-start gap-3 px-5 pt-4 pb-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-[14px] font-semibold tracking-tight" style={{ color: theme.text }}>{title}</h2>
        {sub && <p className="text-xs mt-0.5" style={{ color: theme.subtext }}>{sub}</p>}
      </div>
      {right}
      {href && (
        <Link href={href} className="inline-flex items-center gap-0.5 text-xs font-medium h-6 px-2 -mr-2 rounded-md hover:opacity-70 shrink-0" style={{ color: theme.subtext }}>
          {linkLabel} <ArrowUpRight size={13} />
        </Link>
      )}
    </div>
  )
}

function SubLabel({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  return <p className="text-[11px] font-medium mb-2" style={{ color: theme.subtext }}>{children}</p>
}

function Empty({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  return <p className="text-[13px] py-1" style={{ color: theme.subtext }}>{children}</p>
}

function Bar({ pct, color }: { pct: number; color: string }) {
  const { theme } = useTheme()
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.text}12` }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { theme } = useTheme()
  return (
    <div className="rounded-xl px-3 py-2.5 min-w-0" style={{ backgroundColor: `${theme.text}08` }}>
      <p className="text-[11px] truncate" style={{ color: theme.subtext }}>{label}</p>
      <p className="text-[15px] font-semibold tnum truncate" style={{ color: tone || theme.text }}>{value}</p>
    </div>
  )
}

// ── Inbox (was alert chips) ─────────────────────────────────────────────────

export interface AlertChip {
  key: string
  label: string
  sub: string
  href: string
  icon: React.ElementType
}

export function Alerts({ alerts, onDismiss }: { alerts: AlertChip[]; onDismiss: (key: string) => void }) {
  const { theme } = useTheme()
  if (alerts.length === 0) return null
  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-1 p-2">
        <span className="hidden sm:flex items-center gap-2 px-3 text-[13px] font-semibold shrink-0" style={{ color: theme.text }}>
          <Inbox size={15} style={{ color: theme.accent }} /> Inbox
        </span>
        {alerts.map(a => (
          <div key={a.key} className="flex items-center rounded-xl min-w-0 sm:flex-1" style={{ backgroundColor: `${theme.accent}10` }}>
            <Link href={a.href} className="flex items-center gap-2.5 min-w-0 flex-1 pl-3 py-2">
              <a.icon size={15} style={{ color: theme.accent }} className="shrink-0" />
              <span className="text-[13px] font-medium truncate" style={{ color: theme.text }}>{a.label}</span>
              <span className="hidden md:inline text-xs truncate" style={{ color: theme.subtext }}>{a.sub}</span>
            </Link>
            <button onClick={() => onDismiss(a.key)} className="p-2 mr-0.5 rounded-lg hover:opacity-70" style={{ color: theme.subtext }} aria-label={`Dismiss ${a.label}`}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Key numbers ─────────────────────────────────────────────────────────────

export interface KpiDef {
  label: string
  value: string
  sub?: string
  href: string
  tone?: 'ok' | 'bad' | 'warn' | null
  progress?: { pct: number; tone: 'ok' | 'bad' | 'warn' }
}

export function KpiStrip({ items }: { items: KpiDef[] }) {
  const { theme } = useTheme()
  const toneColor = (t?: string | null) => (t === 'ok' ? theme.ok : t === 'bad' ? theme.bad : t === 'warn' ? theme.warn : theme.subtext)
  return (
    <Card>
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {items.map((k, i) => (
          <Link
            key={k.label}
            href={k.href}
            className={`group block px-5 py-4 min-w-0 transition-colors ${i % 2 ? 'border-l' : ''} ${i > 0 ? 'lg:border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''}`}
            style={{ borderColor: theme.border }}
          >
            <p className="text-xs font-medium flex items-center gap-1.5 truncate" style={{ color: theme.subtext }}>
              {k.tone && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: toneColor(k.tone) }} />}
              {k.label}
            </p>
            <p className="mt-1.5 text-[22px] md:text-[26px] font-semibold tnum tracking-tight leading-none truncate" style={{ color: theme.text }}>{k.value}</p>
            {k.progress && <div className="mt-2.5"><Bar pct={k.progress.pct} color={toneColor(k.progress.tone)} /></div>}
            {k.sub && <p className="mt-1.5 text-[11.5px] truncate" style={{ color: theme.subtext }}>{k.sub}</p>}
          </Link>
        ))}
      </div>
    </Card>
  )
}

// ── Financial performance (six month stacked income) ────────────────────────

export interface MonthIncome { month: string; year: number; lyft: number; dj: number; bizzplug: number; total: number }

export function CashflowCard({ months }: { months: MonthIncome[] }) {
  const { theme } = useTheme()
  const colors = useStreamColors()
  const [hover, setHover] = useState<number | null>(null)
  const last = months.length - 1
  const shownIdx = hover ?? last
  const shown = months[shownIdx]
  const prev = months[shownIdx - 1]
  const max = Math.max(...months.map(m => m.total), 1)
  // Three recessive gridlines at round values.
  const step = Math.pow(10, Math.floor(Math.log10(max)))
  const top = Math.ceil(max / step) * step
  const grid = [top, top * 2 / 3, top / 3]
  const H = 150
  const change = prev && prev.total > 0 ? ((shown.total - prev.total) / prev.total) * 100 : null
  const sixTotal = months.reduce((s, m) => s + m.total, 0)

  return (
    <Card>
      <CardHeader title="Financial performance" sub="Income by stream, last six months (Lyft before gas)" href="/smart-stack" linkLabel="Smart Stack" />
      <div className="px-5 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-4">
          <div>
            <p className="text-xs" style={{ color: theme.subtext }}>{shown.month} {shown.year}{hover === null ? ' (this month)' : ''}</p>
            <p className="text-[28px] font-semibold tnum tracking-tight leading-tight" style={{ color: theme.text }}>{fmt(shown.total)}</p>
            <p className="text-xs tnum" style={{ color: theme.subtext }}>
              {change === null ? 'No prior month to compare' : (
                <><span style={{ color: change >= 0 ? theme.ok : theme.bad }}>{change >= 0 ? '+' : ''}{change.toFixed(0)}%</span> vs {prev.month}</>
              )}
              <span className="mx-1.5">·</span>6 mo total {fmt0(sixTotal)}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Legend">
            {STREAMS.map(s => (
              <span key={s.key} className="inline-flex items-center gap-1.5 text-xs" style={{ color: theme.subtext }}>
                <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: colors[s.key] }} />
                {s.name}
                <span className="tnum font-medium" style={{ color: theme.text }}>{fmt0(shown[s.key])}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="relative" style={{ height: H + 22 }} onMouseLeave={() => setHover(null)}>
          {grid.map(g => (
            <div key={g} className="absolute left-0 right-0 flex items-center gap-2" style={{ top: H - (g / top) * H }}>
              <span className="text-[10px] tnum w-9 text-right -translate-y-1/2" style={{ color: theme.subtext }}>{fmt0(g)}</span>
              <div className="flex-1 h-px -translate-y-1/2" style={{ backgroundColor: theme.border, opacity: 0.6 }} />
            </div>
          ))}
          <div className="absolute left-0 right-0 h-px" style={{ top: H, marginLeft: 44, backgroundColor: theme.border }} />
          <div className="absolute inset-0 flex items-end gap-2 sm:gap-4" style={{ left: 44, height: H }}>
            {months.map((m, i) => {
              const active = i === shownIdx
              const segs = STREAMS.map(s => ({ key: s.key, v: m[s.key] })).filter(x => x.v > 0)
              return (
                <button
                  key={`${m.month}${m.year}`}
                  className="relative flex-1 h-full flex flex-col justify-end items-center outline-none"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setHover(hover === i ? null : i)}
                  aria-label={`${m.month} ${m.year}: ${fmt(m.total)}. ${STREAMS.map(s => `${s.name} ${fmt(m[s.key])}`).join(', ')}`}
                >
                  <div className="w-full max-w-[44px] flex flex-col-reverse gap-[2px] transition-opacity" style={{ opacity: active ? 1 : 0.55 }}>
                    {segs.map((sg, j) => (
                      <div
                        key={sg.key}
                        style={{
                          height: Math.max(2, (sg.v / top) * H - 2),
                          backgroundColor: colors[sg.key as StreamKey],
                          borderRadius: j === segs.length - 1 ? '4px 4px 0 0' : 0,
                        }}
                      />
                    ))}
                    {segs.length === 0 && <div style={{ height: 2, backgroundColor: theme.border }} />}
                  </div>
                  <span className="absolute -bottom-[20px] text-[11px]" style={{ color: active ? theme.text : theme.subtext, fontWeight: active ? 600 : 400 }}>{m.month}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}

// ── Income by business (this month) ─────────────────────────────────────────

export function IncomeMixCard({ monthLabel, values }: { monthLabel: string; values: Record<StreamKey, number> }) {
  const { theme } = useTheme()
  const colors = useStreamColors()
  const total = STREAMS.reduce((s, x) => s + values[x.key], 0)
  const max = Math.max(...STREAMS.map(s => values[s.key]), 1)
  return (
    <Card>
      <CardHeader title="Income by business" sub={`${monthLabel} · Lyft shown net of gas`} />
      <div className="px-5 pb-5 space-y-3.5">
        {STREAMS.map(s => {
          const v = values[s.key]
          return (
            <div key={s.key}>
              <div className="flex items-baseline justify-between text-[13px] mb-1.5">
                <span className="flex items-center gap-2" style={{ color: theme.text }}>
                  <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: colors[s.key] }} />{s.name}
                </span>
                <span className="tnum font-medium" style={{ color: theme.text }}>
                  {fmt(v)} <span className="text-xs font-normal" style={{ color: theme.subtext }}>{total > 0 ? `${Math.round((v / total) * 100)}%` : ''}</span>
                </span>
              </div>
              <Bar pct={(v / max) * 100} color={colors[s.key]} />
            </div>
          )
        })}
        <div className="flex items-baseline justify-between pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
          <span className="text-xs" style={{ color: theme.subtext }}>Total</span>
          <span className="text-[15px] font-semibold tnum" style={{ color: theme.text }}>{fmt(total)}</span>
        </div>
      </div>
    </Card>
  )
}

// ── Businesses overview ─────────────────────────────────────────────────────

export interface BusinessRow {
  id: string
  name: string
  href: string
  status: string
  metric?: string
  attention?: boolean
}

const BIZ_ICONS: Record<string, React.ElementType> = { dj: Disc3, bizzplug: PenTool, crookedrumor: Clapperboard, rsvp: Ticket, lyft: Car }

export function BusinessesCard({ rows }: { rows: BusinessRow[] }) {
  const { theme } = useTheme()
  return (
    <Card>
      <CardHeader title="Businesses" sub="Status across everything you run" />
      <ul className="px-2 pb-2">
        {rows.map(r => {
          const Icon = BIZ_ICONS[r.id] || Circle
          return (
            <li key={r.id}>
              <Link
                href={r.href}
                className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors"
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${theme.text}08`)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${theme.text}0a`, color: theme.text }}>
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium truncate flex items-center gap-2" style={{ color: theme.text }}>
                    {r.name}
                    {r.attention && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} aria-label="Needs attention" />}
                  </p>
                  <p className="text-xs truncate" style={{ color: theme.subtext }}>{r.status}</p>
                </div>
                {r.metric && <span className="text-[13px] font-semibold tnum shrink-0" style={{ color: theme.text }}>{r.metric}</span>}
                <ChevronRight size={15} className="shrink-0" style={{ color: theme.subtext }} />
              </Link>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

// ── Priorities (used by Today and the day view) ─────────────────────────────

export function PriorityList({ items, onAdd, onToggle, onDelete, placeholder }: {
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
    <div className="space-y-1">
      {items.map(p => (
        <div key={p.id} className="group flex items-center gap-3 px-2 py-1.5 rounded-lg">
          <button
            onClick={() => onToggle(p.id)}
            className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0 transition-colors"
            style={{ background: p.completed ? theme.accent : 'transparent', border: `1.5px solid ${p.completed ? theme.accent : theme.subtext}` }}
            aria-label={p.completed ? 'Mark not done' : 'Mark done'}
          >
            {p.completed && <Check size={11} color={theme.bg} strokeWidth={3} />}
          </button>
          <span className="flex-1 text-[13.5px] min-w-0 break-words" style={{ color: theme.text, textDecoration: p.completed ? 'line-through' : 'none', opacity: p.completed ? 0.5 : 1 }}>{p.text}</span>
          <button onClick={() => onDelete(p.id)} className="p-1 opacity-40 sm:opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity" style={{ color: theme.subtext }} aria-label="Remove"><X size={13} /></button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 flex items-center gap-2 rounded-lg px-2.5 h-9 min-w-0" style={{ backgroundColor: theme.input, border: `1px solid ${theme.border}` }}>
          <Plus size={14} style={{ color: theme.subtext }} className="shrink-0" />
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-[13.5px] outline-none"
            style={{ color: theme.text }}
          />
        </div>
        {text.trim() && (
          <button onClick={add} className="h-9 px-3 rounded-lg text-[13px] font-medium" style={{ backgroundColor: theme.accent, color: theme.bg }}>Add</button>
        )}
      </div>
    </div>
  )
}

// ── Today ───────────────────────────────────────────────────────────────────

export function TodayCard({ priorities, onAdd, onToggle, onDelete, schedule, lifeTasks }: {
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
      <CardHeader title="Today" sub={priorities.length ? `${done} of ${priorities.length} priorities done` : 'Set up to three priorities'} href="/planner" linkLabel="Planner" />
      <div className="px-5 pb-5 grid md:grid-cols-[1.4fr_1fr] gap-6">
        <div>
          <SubLabel>Priorities</SubLabel>
          <PriorityList items={priorities} onAdd={onAdd} onToggle={onToggle} onDelete={onDelete} placeholder="Add a priority" />
        </div>
        <div className="space-y-5">
          <div>
            <SubLabel>Schedule</SubLabel>
            {schedule.length === 0 ? <Empty>No blocks scheduled.</Empty> : (
              <ul className="space-y-2">
                {schedule.map(b => (
                  <li key={b.id} className="flex items-baseline gap-3 text-[13px]">
                    <span className="tnum w-[62px] shrink-0 text-xs" style={{ color: theme.subtext }}>{b.startTime}</span>
                    <span className="truncate" style={{ color: theme.text }}>{b.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {lifeTasks.length > 0 && (
            <div>
              <SubLabel>Recurring</SubLabel>
              <ul className="space-y-2">
                {lifeTasks.map((t, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-[13px]" style={{ color: theme.text }}>
                    {t.kind === 'grocery' ? <ShoppingCart size={13} style={{ color: theme.subtext }} /> : <Repeat size={13} style={{ color: theme.subtext }} />}
                    {t.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

// ── Calendar ────────────────────────────────────────────────────────────────

interface DayEvent { label: string; type: 'bill' | 'card' | 'gig' | 'task'; paid?: boolean }

function useEventColors() {
  const { theme } = useTheme()
  const s = useStreamColors()
  return { bill: theme.bad, card: theme.warn, gig: s.dj, task: theme.accent } as Record<DayEvent['type'], string>
}

export function DashboardCalendar({ bills, gigs, priorities, selectedDate, onDateSelect, month, year, onMonthChange }: {
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
  const ec = useEventColors()
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
      if (show) events.push({ label: b.name, type: 'bill', paid: b.status === 'paid' })
    })
    gigs.forEach(g => {
      if (g.date === dateStr && g.status !== 'cancelled') events.push({ label: `DJ: ${g.venue || g.clientName || 'Gig'}`, type: 'gig' })
    })
    cards.forEach((c: any) => {
      (c.payments || []).forEach((p: any) => {
        if (p.date === dateStr && !p.paid) events.push({ label: `${c.name}: $${p.amount}`, type: 'card' })
      })
    })
    const incomplete = (priorities[dateStr] || []).filter(p => !p.completed).length
    if (incomplete > 0) events.push({ label: `${incomplete} task${incomplete > 1 ? 's' : ''}`, type: 'task' })
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
        className="relative flex flex-col items-center justify-start pt-1.5 pb-1 rounded-lg transition-colors min-h-[44px] md:min-h-[50px]"
        style={{
          backgroundColor: isSelected ? `${theme.text}14` : 'transparent',
          opacity: isPast && !isToday && !isSelected ? 0.45 : 1,
        }}
        aria-label={`${dateStr}${events.length ? `, ${events.length} items` : ''}`}
        aria-pressed={isSelected}
      >
        <span
          className="text-xs tnum w-6 h-6 flex items-center justify-center rounded-full"
          style={{
            color: isToday ? theme.accent : theme.text,
            fontWeight: isToday || isSelected ? 700 : 500,
            boxShadow: isToday ? `inset 0 0 0 1.5px ${theme.accent}` : undefined,
          }}
        >{d}</span>
        {events.length > 0 && (
          <div className="flex gap-[3px] mt-1 flex-wrap justify-center px-1">
            {events.slice(0, 3).map((ev, i) => (
              <div key={i} className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: ec[ev.type], opacity: ev.paid ? 0.4 : 1 }} />
            ))}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[13.5px]" style={{ color: theme.text }}>{monthName}</h3>
        <div className="flex">
          <button onClick={() => onMonthChange(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70" style={{ color: theme.subtext }} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button onClick={() => onMonthChange(1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70" style={{ color: theme.subtext }} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10.5px] font-medium py-1" style={{ color: theme.subtext }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">{cells}</div>
      <div className="flex gap-4 mt-3 pt-3 flex-wrap" style={{ borderTop: `1px solid ${theme.border}` }}>
        {([['bill', 'Bill'], ['card', 'Card payment'], ['gig', 'DJ gig'], ['task', 'Tasks']] as const).map(([k, l]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: ec[k] }} />
            <span className="text-[11px]" style={{ color: theme.subtext }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DayDetail({ date, todayStr, bills, gigs, priorities, onAdd, onToggle, onDelete, todayShownElsewhere = false }: {
  todayShownElsewhere?: boolean
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
    <div className="p-5 space-y-5 h-full">
      <div>
        <p className="text-[11px] font-medium" style={{ color: theme.accent }}>{isToday ? 'Today' : 'Selected day'}</p>
        <p className="font-semibold text-[14px] mt-0.5" style={{ color: theme.text }}>{formatted}</p>
      </div>

      {dueBills.length > 0 && (
        <div>
          <SubLabel>Bills due</SubLabel>
          <ul className="space-y-1">
            {dueBills.map(b => (
              <li key={b.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="text-[13px] truncate" style={{ color: theme.text }}>{b.name}</span>
                <span className="text-[13px] font-medium tnum shrink-0 inline-flex items-center gap-1" style={{ color: b.status === 'paid' ? theme.ok : theme.text }}>
                  {b.status === 'paid' && <Check size={12} />}{fmt(b.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dayGigs.length > 0 && (
        <div>
          <SubLabel>DJ gigs</SubLabel>
          <ul className="space-y-1">
            {dayGigs.map((g: any) => (
              <li key={g.id} className="flex items-center gap-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] truncate" style={{ color: theme.text }}>{g.venue || g.clientName || 'Gig'}</p>
                  {g.startTime && <p className="text-xs" style={{ color: theme.subtext }}>{to12Hour(g.startTime)}{g.endTime ? ` to ${to12Hour(g.endTime)}` : ''}</p>}
                </div>
                {g.payment ? <span className="text-[13px] font-medium tnum" style={{ color: theme.text }}>{fmt(g.payment)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Today's priorities live in the Today widget when it is shown. */}
      {isToday && todayShownElsewhere ? (
        dueBills.length + dayGigs.length === 0 && <Empty>Nothing else on today. Priorities are in the Today widget.</Empty>
      ) : (
        <div>
          <SubLabel>Priorities</SubLabel>
          <PriorityList items={priorities} onAdd={onAdd} onToggle={onToggle} onDelete={onDelete} placeholder="Plan something for this day" />
        </div>
      )}
    </div>
  )
}

export function CalendarCard(props: React.ComponentProps<typeof DashboardCalendar> & { todayStr: string; dayProps: Omit<React.ComponentProps<typeof DayDetail>, 'date' | 'todayStr' | 'bills' | 'gigs'> }) {
  const { theme } = useTheme()
  const { todayStr, dayProps, ...cal } = props
  return (
    <Card>
      <div className="grid xl:grid-cols-[1fr_340px]">
        <DashboardCalendar {...cal} />
        <div className="border-t xl:border-t-0 xl:border-l" style={{ borderColor: theme.border }}>
          <DayDetail date={cal.selectedDate} todayStr={todayStr} bills={cal.bills} gigs={cal.gigs} {...dayProps} />
        </div>
      </div>
    </Card>
  )
}

// ── Health ──────────────────────────────────────────────────────────────────

export function HealthCard({ workoutTitle, workoutLogged, workoutTotal, meals, protein, proteinTarget, calories, calorieTarget, weight }: {
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
  return (
    <Card>
      <CardHeader title="Health" sub={`${weight} lbs current`} href="/fitness" />
      <div className="px-5 pb-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${theme.text}0a`, color: theme.text }}><Dumbbell size={16} strokeWidth={1.75} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-medium truncate" style={{ color: theme.text }}>{workoutTitle}</p>
            <p className="text-xs" style={{ color: theme.subtext }}>{workoutTotal > 0 ? `${workoutLogged} of ${workoutTotal} exercises logged` : 'Nothing to log today'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {meals.map(m => (
            <span key={m.label} className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-1 rounded-md" style={{ backgroundColor: m.logged ? `${theme.accent}18` : `${theme.text}08`, color: m.logged ? theme.text : theme.subtext }}>
              {m.logged ? <Check size={11} strokeWidth={3} style={{ color: theme.accent }} /> : <Circle size={9} />} {m.label}
            </span>
          ))}
        </div>
        {[{ k: 'Protein', v: Math.round(protein), t: proteinTarget, u: 'g' }, { k: 'Calories', v: calories, t: calorieTarget, u: '' }].map(x => (
          <div key={x.k}>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: theme.subtext }}>{x.k}</span>
              <span className="font-medium tnum" style={{ color: theme.text }}>{x.v}{x.u} <span style={{ color: theme.subtext }}>/ {x.t}{x.u}</span></span>
            </div>
            <Bar pct={(x.v / x.t) * 100} color={theme.accent} />
          </div>
        ))}
      </div>
    </Card>
  )
}

// ── Bills ───────────────────────────────────────────────────────────────────

export function BillsCard({ upcoming, todayStr, dueSoonTotal, wellsRequired }: {
  upcoming: { bill: Bill; due: Date }[]
  todayStr: string
  dueSoonTotal: number
  wellsRequired: number
}) {
  const { theme } = useTheme()
  const today = new Date(todayStr + 'T00:00:00').getTime()
  return (
    <Card>
      <CardHeader title="Upcoming bills" sub={upcoming.length ? `Next ${upcoming.length} due` : null} href="/bill-boss" linkLabel="Bill Boss" />
      <div className="px-5 pb-5">
        {upcoming.length === 0 ? <Empty>Nothing due. You are clear.</Empty> : (
          <ul>
            {upcoming.map(({ bill: b, due }, i) => {
              const dueStr = due.toISOString().slice(0, 10)
              const overdue = dueStr < todayStr
              const days = Math.ceil((due.getTime() - today) / 86400000)
              const when = overdue ? 'Overdue' : days === 0 ? 'Due today' : days === 1 ? 'Tomorrow' : `In ${days} days`
              const urgent = overdue || days <= 1
              return (
                <li key={b.id + dueStr} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                  <div className="w-10 text-center shrink-0">
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: theme.subtext }}>{due.toLocaleDateString('en-US', { month: 'short' })}</p>
                    <p className="text-[15px] font-semibold tnum leading-tight" style={{ color: theme.text }}>{due.getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-medium truncate" style={{ color: theme.text }}>{b.name}</p>
                    <p className="text-[11.5px] flex items-center gap-1.5" style={{ color: urgent ? theme.bad : theme.subtext }}>
                      {urgent && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.bad }} />}{when}
                    </p>
                  </div>
                  <span className="text-[13.5px] font-semibold tnum" style={{ color: theme.text }}>{fmt(b.amount)}</span>
                </li>
              )
            })}
          </ul>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Stat label="Still owed on these" value={fmt(dueSoonTotal)} tone={dueSoonTotal > 0 ? theme.bad : undefined} />
          <Stat label="Wells balance needed" value={fmt(wellsRequired)} />
        </div>
      </div>
    </Card>
  )
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export function TasksCard({ tasks }: { tasks: { id: string; text: string; completed: boolean; priority: string; starred: boolean }[] }) {
  const { theme } = useTheme()
  const incomplete = tasks.filter(t => !t.completed)
  const starred = incomplete.filter(t => t.starred)
  const shown = (starred.length > 0 ? starred : incomplete).slice(0, 5)
  const dot: Record<string, string> = { high: theme.bad, medium: theme.warn, low: theme.subtext }
  return (
    <Card>
      <CardHeader title={starred.length ? 'Starred tasks' : 'Tasks'} sub={incomplete.length ? `${incomplete.length} open` : null} href="/task-list" />
      <div className="px-5 pb-5">
        {shown.length === 0 ? <Empty>No open tasks.</Empty> : (
          <ul className="space-y-2">
            {shown.map(t => (
              <li key={t.id} className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot[t.priority] || theme.subtext }} />
                <span className="text-[13.5px] truncate flex-1" style={{ color: theme.text }}>{t.text}</span>
              </li>
            ))}
          </ul>
        )}
        {incomplete.length > shown.length && (
          <Link href="/task-list" className="block text-xs pt-3 hover:opacity-70" style={{ color: theme.subtext }}>+{incomplete.length - shown.length} more</Link>
        )}
      </div>
    </Card>
  )
}

// ── BizzyPlug pipeline ──────────────────────────────────────────────────────

export function BizzyPlugCard({ leads, earnedThisMonth }: { leads: any[]; earnedThisMonth: number }) {
  const { theme } = useTheme()
  const pending = leads.reduce((s: number, p: any) => s + (p.quote || 0), 0)
  return (
    <Card>
      <CardHeader title="BizzyPlug pipeline" sub={leads.length ? `${leads.length} open project${leads.length === 1 ? '' : 's'}` : null} href="/bizzplug" />
      <div className="px-5 pb-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Pending value" value={fmt(pending)} />
          <Stat label="Earned this month" value={fmt(earnedThisMonth)} tone={earnedThisMonth > 0 ? theme.ok : undefined} />
        </div>
        {leads.length === 0 ? <Empty>No open projects right now.</Empty> : (
          <ul>
            {leads.slice(0, 5).map((p: any, i: number) => {
              const paid = p.paid || 0
              const quote = p.quote || 0
              const pct = quote > 0 ? Math.min(100, Math.round((paid / quote) * 100)) : 0
              return (
                <li key={p.id} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                  <Link href="/bizzplug" className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium truncate" style={{ color: theme.text }}>{p.artistName}</p>
                      <p className="text-[11.5px] truncate" style={{ color: theme.subtext }}>{p.projectType}{p.deadline ? ` · Due ${p.deadline}` : ''}</p>
                      {quote > 0 && <div className="mt-1.5 max-w-[200px]"><Bar pct={pct} color={pct >= 100 ? theme.ok : theme.accent} /></div>}
                    </div>
                    <div className="text-right shrink-0">
                      {quote > 0 ? (
                        <>
                          <p className="text-[13px] font-semibold tnum" style={{ color: theme.text }}>{fmt(paid)}</p>
                          <p className="text-[11px] tnum" style={{ color: theme.subtext }}>of {fmt(quote)}</p>
                        </>
                      ) : <span className="text-[11px] px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: `${theme.text}0a`, color: theme.subtext }}>Quote TBD</span>}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        {leads.length > 5 && <Link href="/bizzplug" className="block text-xs hover:opacity-70" style={{ color: theme.subtext }}>+{leads.length - 5} more</Link>}
      </div>
    </Card>
  )
}

// ── Gigs ────────────────────────────────────────────────────────────────────

export function GigsCard({ gigs }: { gigs: any[] }) {
  const { theme } = useTheme()
  return (
    <Card>
      <CardHeader title="Upcoming gigs" sub="DJ Maskoff, rest of this month" href="/dj" />
      <div className="px-5 pb-5">
        {gigs.length === 0 ? <Empty>No gigs booked for the rest of the month.</Empty> : (
          <ul>
            {gigs.map((g: any, i: number) => {
              const d = new Date(g.date + 'T00:00:00')
              return (
                <li key={g.id} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                  <Link href="/dj" className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <div className="w-10 text-center shrink-0">
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: theme.subtext }}>{d.toLocaleDateString('en-US', { month: 'short' })}</p>
                      <p className="text-[15px] font-semibold tnum leading-tight" style={{ color: theme.text }}>{d.getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium truncate" style={{ color: theme.text }}>{g.venue || g.clientName || 'Gig'}</p>
                      <p className="text-[11.5px]" style={{ color: theme.subtext }}>{shortDate(d)}{g.startTime ? ` · ${to12Hour(g.startTime)}` : ''}</p>
                    </div>
                    {g.contractAmount > 0 && <span className="text-[13px] font-semibold tnum" style={{ color: theme.text }}>{fmt(g.contractAmount)}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
