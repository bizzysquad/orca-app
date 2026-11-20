'use client'

import { useEffect, useMemo, useState } from 'react'
import { Ban, ChevronLeft, ChevronRight, Trash2, Video } from 'lucide-react'
import type { Booking, SiteDoc } from '@/lib/crooked/types'
import {
  BLOCKING_STATUSES, WEEKDAYS, addDays, blocksOn, dayState, durationLabel, monthGrid, nowIn, parseTimeLabel, rangeLabel, toMins,
  type Availability, type AvailabilityBlock, type BusySpan,
} from '@/lib/crooked/availability'
import type { SetDoc } from './AdminApp'
import { Field, Panel, Text, Toggle, newId } from './ui'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const ZONES = [
  ['America/New_York', 'Eastern'],
  ['America/Chicago', 'Central'],
  ['America/Denver', 'Mountain'],
  ['America/Phoenix', 'Arizona'],
  ['America/Los_Angeles', 'Pacific'],
] as const
const DURATIONS = [30, 60, 90, 120, 150, 180, 240, 300, 360, 480]

type BookedRow = BusySpan & { booking: Booking }

const fmtDay = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function CalendarTab({ doc, setDoc }: { doc: SiteDoc; setDoc: SetDoc }) {
  const av = doc.availability
  const upd = (patch: Partial<Availability>) => setDoc(d => ({ ...d, availability: { ...d.availability, ...patch } }))
  const now = useMemo(() => nowIn(av.timezone), [av.timezone])

  const [bookings, setBookings] = useState<Booking[]>([])
  useEffect(() => {
    fetch('/api/crookedrumors/admin/bookings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setBookings(Array.isArray(d.bookings) ? d.bookings : []))
      .catch(() => {})
  }, [])

  // Same rule the public site uses: paid / scheduled bookings hold time.
  const booked: BookedRow[] = useMemo(
    () =>
      bookings
        .filter(b => b.project_date && BLOCKING_STATUSES.includes(b.status))
        .map(b => {
          const start = parseTimeLabel(b.project_time || '')
          const len = doc.packages.find(p => p.id === b.package_id)?.durationMins || av.defaultDurationMins
          return start == null
            ? { date: b.project_date!, start: 0, end: 1440, booking: b }
            : { date: b.project_date!, start, end: Math.min(1440, start + len), booking: b }
        }),
    [bookings, doc.packages, av.defaultDurationMins]
  )
  const pending = useMemo(() => bookings.filter(b => b.project_date && ['pending_payment', 'quote_requested', 'quoted'].includes(b.status)), [bookings])

  const [ym, setYm] = useState({ y: Number(now.date.slice(0, 4)), m: Number(now.date.slice(5, 7)) - 1 })
  const [sel, setSel] = useState(now.date)
  const shift = (n: number) => setYm(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }))

  const setWeekly = (i: number, patch: Partial<Availability['weekly'][number]>) => upd({ weekly: av.weekly.map((w, j) => (j === i ? { ...w, ...patch } : w)) })
  const addBlock = (b: Omit<AvailabilityBlock, 'id'>) => upd({ blocks: [...av.blocks, { ...b, id: newId('block') }].sort((x, y) => x.startDate.localeCompare(y.startDate)) })
  const removeBlock = (id: string) => upd({ blocks: av.blocks.filter(b => b.id !== id) })

  const upcoming = av.blocks.filter(b => (b.endDate || b.startDate) >= now.date)
  const past = av.blocks.length - upcoming.length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="cr-display text-3xl">Calendar</h2>
        <p className="text-sm text-[var(--cr-muted)] mt-1">
          Set your normal hours, then block off days or times you can&apos;t shoot. Paid and scheduled bookings block their time on their own. Click <b>Save</b> when you&apos;re done.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 items-start">
        {/* Month view */}
        <Panel
          title={`${MONTHS[ym.m]} ${ym.y}`}
          actions={
            <div className="flex gap-1.5">
              <button onClick={() => shift(-1)} className="p-1.5 rounded-lg border-2 border-[var(--cr-ink)]" aria-label="Previous month"><ChevronLeft size={16} strokeWidth={3} /></button>
              <button onClick={() => { setYm({ y: Number(now.date.slice(0, 4)), m: Number(now.date.slice(5, 7)) - 1 }); setSel(now.date) }} className="px-2 rounded-lg border-2 border-[var(--cr-ink)] text-xs font-black uppercase">Today</button>
              <button onClick={() => shift(1)} className="p-1.5 rounded-lg border-2 border-[var(--cr-ink)]" aria-label="Next month"><ChevronRight size={16} strokeWidth={3} /></button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-[11px] font-black uppercase text-[var(--cr-muted)] py-1">{d}</div>
            ))}
            {monthGrid(ym.y, ym.m).map((d, i) => {
              if (!d) return <div key={i} />
              const st = dayState(av, d, booked, av.defaultDurationMins, now)
              const dayBlocks = blocksOn(av, d)
              const dayBooked = booked.filter(b => b.date === d)
              const allDayBlock = dayBlocks.some(b => b.allDay)
              const weeklyOff = !av.weekly[new Date(d + 'T12:00:00Z').getUTCDay()]?.open
              return (
                <button
                  key={d}
                  onClick={() => setSel(d)}
                  className={`min-h-[56px] sm:min-h-[68px] rounded-lg border-2 p-1 text-left flex flex-col gap-0.5 ${
                    d === sel ? 'border-[var(--cr-red)] shadow-[2px_2px_0_var(--cr-red)]' : 'border-[var(--cr-ink)]/20'
                  } ${st === 'past' ? 'opacity-40' : ''} ${allDayBlock ? 'bg-[repeating-linear-gradient(135deg,#f2e3cf,#f2e3cf_6px,transparent_6px,transparent_12px)]' : weeklyOff ? 'bg-[var(--cr-tan)]/40' : 'bg-[var(--cr-paper)]'}`}
                >
                  <span className={`text-xs font-black ${d === now.date ? 'bg-[var(--cr-ink)] text-[var(--cr-paper)] rounded px-1' : ''}`}>{Number(d.slice(8))}</span>
                  {dayBooked.slice(0, 2).map(b => (
                    <span key={b.booking.id} className="truncate text-[10px] font-bold leading-tight bg-[var(--cr-red)] text-[var(--cr-paper)] rounded px-1">{b.booking.client_name.split(' ')[0]}</span>
                  ))}
                  {dayBooked.length > 2 && <span className="text-[10px] font-bold">+{dayBooked.length - 2}</span>}
                  {dayBlocks.length > 0 && !allDayBlock && <span className="truncate text-[10px] font-bold leading-tight bg-[var(--cr-ink)] text-[var(--cr-paper)] rounded px-1">Blocked</span>}
                  {allDayBlock && <span className="text-[10px] font-black uppercase leading-tight">Off</span>}
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold uppercase text-[var(--cr-muted)]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[var(--cr-red)]" /> Booked</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[var(--cr-ink)]" /> Blocked hours</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[repeating-linear-gradient(135deg,#e3cfb4,#e3cfb4_3px,transparent_3px,transparent_6px)] border border-[var(--cr-ink)]/20" /> Day off</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[var(--cr-tan)]/60" /> Closed weekly</span>
          </div>
        </Panel>

        <DayPanel
          key={sel}
          date={sel}
          av={av}
          now={now}
          booked={booked.filter(b => b.date === sel)}
          pending={pending.filter(b => b.project_date === sel)}
          onAdd={addBlock}
          onRemove={removeBlock}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Panel title="Weekly hours">
          <p className="text-sm text-[var(--cr-muted)] -mt-2 mb-3">Your normal schedule. Clients can only book inside these hours.</p>
          <div className="space-y-2">
            {av.weekly.map((w, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="w-28"><Toggle on={w.open} onChange={v => setWeekly(i, { open: v })} label={WEEKDAYS[i].slice(0, 3)} /></div>
                {w.open ? (
                  <>
                    <input type="time" className="cr-input !text-[15px] !py-2 !w-auto" value={w.start} onChange={e => setWeekly(i, { start: e.target.value })} aria-label={`${WEEKDAYS[i]} start`} />
                    <span className="text-sm font-bold">to</span>
                    <input type="time" className="cr-input !text-[15px] !py-2 !w-auto" value={w.end} onChange={e => setWeekly(i, { end: e.target.value })} aria-label={`${WEEKDAYS[i]} end`} />
                    {toMins(w.end) <= toMins(w.start) && <span className="text-xs font-bold text-[var(--cr-red)]">End must be after start</span>}
                  </>
                ) : (
                  <span className="text-sm font-semibold text-[var(--cr-muted)]">Closed</span>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { const first = av.weekly.find(w => w.open); if (first) upd({ weekly: av.weekly.map(w => (w.open ? { ...w, start: first.start, end: first.end } : w)) }) }}
            className="mt-3 text-xs font-bold underline"
          >
            Copy the first open day&apos;s hours to every open day
          </button>
        </Panel>

        <Panel title="Booking rules">
          <div className="flex flex-wrap gap-x-6 gap-y-3 mb-4">
            <Toggle on={av.enabled} onChange={v => upd({ enabled: v })} label="Clients pick from the calendar" />
            <Toggle on={av.showOnSite} onChange={v => upd({ showOnSite: v })} label="Show calendar on the home page" />
          </div>
          {!av.enabled && <p className="mb-4 text-sm font-bold text-[var(--cr-red)]">Off: booking goes back to a plain date box and nothing is blocked.</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Default shoot length" hint="Packages can set their own on the Packages tab">
              <select className="cr-input !text-[15px] !py-2.5" value={av.defaultDurationMins} onChange={e => upd({ defaultDurationMins: Number(e.target.value) })}>
                {DURATIONS.map(m => <option key={m} value={m}>{durationLabel(m)}</option>)}
              </select>
            </Field>
            <Field label="Break between shoots" hint="Travel and setup time kept free">
              <select className="cr-input !text-[15px] !py-2.5" value={av.bufferMins} onChange={e => upd({ bufferMins: Number(e.target.value) })}>
                {[0, 15, 30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m ? durationLabel(m) : 'None'}</option>)}
              </select>
            </Field>
            <Field label="Start times every">
              <select className="cr-input !text-[15px] !py-2.5" value={av.stepMins} onChange={e => upd({ stepMins: Number(e.target.value) })}>
                {[30, 60].map(m => <option key={m} value={m}>{durationLabel(m)}</option>)}
              </select>
            </Field>
            <Field label="Time zone">
              <select className="cr-input !text-[15px] !py-2.5" value={av.timezone} onChange={e => upd({ timezone: e.target.value })}>
                {ZONES.map(([z, n]) => <option key={z} value={z}>{n}</option>)}
              </select>
            </Field>
            <Field label="Minimum notice (days)" hint="0 = same day booking allowed">
              <input className="cr-input !text-[15px] !py-2.5" inputMode="numeric" value={av.minNoticeDays} onChange={e => upd({ minNoticeDays: Math.min(60, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
            </Field>
            <Field label="Book up to (days ahead)">
              <input className="cr-input !text-[15px] !py-2.5" inputMode="numeric" value={av.maxAdvanceDays} onChange={e => upd({ maxAdvanceDays: Math.min(365, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)) })} />
            </Field>
            <Field label="Home page title" className="sm:col-span-2"><Text value={av.title} onChange={v => upd({ title: v })} /></Field>
            <Field label="Home page text" className="sm:col-span-2"><Text value={av.sub} onChange={v => upd({ sub: v })} /></Field>
          </div>
        </Panel>
      </div>

      <Panel title="Upcoming blocks">
        {upcoming.length === 0 ? (
          <p className="text-sm font-semibold">Nothing blocked. Click a day on the calendar to block it.</p>
        ) : (
          <ul className="divide-y-2 divide-[var(--cr-tan)]">
            {upcoming.map(b => <BlockRow key={b.id} b={b} onRemove={() => removeBlock(b.id)} />)}
          </ul>
        )}
        {past > 0 && (
          <button onClick={() => upd({ blocks: av.blocks.filter(b => (b.endDate || b.startDate) >= now.date) })} className="mt-3 text-xs font-bold underline">
            Clear {past} past block{past > 1 ? 's' : ''}
          </button>
        )}
      </Panel>
    </div>
  )
}

function BlockRow({ b, onRemove }: { b: AvailabilityBlock; onRemove: () => void }) {
  return (
    <li className="py-2.5 flex items-center gap-3">
      <Ban size={16} className="shrink-0 text-[var(--cr-red)]" />
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-sm">
          {fmtDay(b.startDate)}{b.endDate && b.endDate !== b.startDate ? ` through ${fmtDay(b.endDate)}` : ''}
          <span className="font-semibold text-[var(--cr-muted)]"> · {b.allDay ? 'All day' : rangeLabel(toMins(b.start), toMins(b.end))}</span>
        </div>
        {b.note ? <div className="text-xs text-[var(--cr-muted)] truncate">{b.note}</div> : null}
      </div>
      <button onClick={onRemove} className="p-2 rounded-lg hover:bg-[var(--cr-tan)]" aria-label="Remove block" title="Remove block"><Trash2 size={16} /></button>
    </li>
  )
}

function DayPanel({
  date, av, now, booked, pending, onAdd, onRemove,
}: {
  date: string
  av: Availability
  now: { date: string; mins: number }
  booked: BookedRow[]
  pending: Booking[]
  onAdd: (b: Omit<AvailabilityBlock, 'id'>) => void
  onRemove: (id: string) => void
}) {
  const w = av.weekly[new Date(date + 'T12:00:00Z').getUTCDay()]
  const [allDay, setAllDay] = useState(true)
  const [start, setStart] = useState(w?.start || '09:00')
  const [end, setEnd] = useState(w?.end || '17:00')
  const [through, setThrough] = useState(date)
  const [note, setNote] = useState('')
  const blocks = blocksOn(av, date)
  const badTime = !allDay && toMins(end) <= toMins(start)

  return (
    <Panel title={new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}>
      <p className="text-sm font-semibold -mt-2 mb-3">
        {w?.open ? `Normal hours ${rangeLabel(toMins(w.start), toMins(w.end))}` : 'Closed on your weekly schedule'}
        {date < now.date ? ' · in the past' : ''}
      </p>

      {booked.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {booked.map(b => (
            <div key={b.booking.id} className="flex items-center gap-2 rounded-lg bg-[var(--cr-red)] text-[var(--cr-paper)] px-3 py-2 text-sm">
              <Video size={15} className="shrink-0" />
              <span className="font-extrabold truncate">{b.booking.client_name}</span>
              <span className="ml-auto shrink-0 text-xs font-bold">{b.start === 0 && b.end === 1440 ? 'Time not set, holds the day' : rangeLabel(b.start, b.end)}</span>
            </div>
          ))}
        </div>
      )}
      {pending.length > 0 && (
        <p className="mb-3 text-xs font-semibold text-[var(--cr-muted)]">
          {pending.length} unpaid request{pending.length > 1 ? 's' : ''} for this day ({pending.map(b => b.client_name.split(' ')[0]).join(', ')}). They don&apos;t block time until paid or marked scheduled.
        </p>
      )}

      {blocks.length > 0 && (
        <ul className="mb-4 divide-y-2 divide-[var(--cr-tan)] border-y-2 border-[var(--cr-tan)]">
          {blocks.map(b => <BlockRow key={b.id} b={b} onRemove={() => onRemove(b.id)} />)}
        </ul>
      )}

      <div className="rounded-xl border-2 border-dashed border-[var(--cr-ink)]/40 p-3 space-y-3">
        <div className="text-[11px] font-black uppercase tracking-[0.1em]">Block time</div>
        <div className="flex gap-2">
          {[true, false].map(v => (
            <button key={String(v)} type="button" onClick={() => setAllDay(v)} className={`px-3 py-1.5 rounded-full border-2 border-[var(--cr-ink)] text-xs font-extrabold uppercase ${allDay === v ? 'bg-[var(--cr-ink)] text-[var(--cr-paper)]' : ''}`}>
              {v ? 'Whole day' : 'Some hours'}
            </button>
          ))}
        </div>
        {!allDay && (
          <div className="flex flex-wrap items-center gap-2">
            <input type="time" className="cr-input !text-[15px] !py-2 !w-auto" value={start} onChange={e => setStart(e.target.value)} aria-label="Block start" />
            <span className="text-sm font-bold">to</span>
            <input type="time" className="cr-input !text-[15px] !py-2 !w-auto" value={end} onChange={e => setEnd(e.target.value)} aria-label="Block end" />
            {badTime && <span className="text-xs font-bold text-[var(--cr-red)]">End must be after start</span>}
          </div>
        )}
        <Field label="Through (for several days in a row)">
          <input type="date" className="cr-input !text-[15px] !py-2.5" min={date} max={addDays(date, 365)} value={through} onChange={e => setThrough(e.target.value || date)} />
        </Field>
        <Field label="Private note (optional)" hint="Only you see this"><Text value={note} onChange={setNote} placeholder="e.g. Out of town" /></Field>
        <button
          type="button"
          disabled={badTime}
          onClick={() => {
            onAdd({ startDate: date, endDate: through >= date ? through : date, allDay, start, end, note: note.trim() })
            setNote('')
          }}
          className="cr-btn cr-btn-ink cr-btn-sm"
        >
          <Ban size={14} strokeWidth={3} /> Block {through > date ? 'these days' : allDay ? 'this day' : 'these hours'}
        </button>
      </div>
    </Panel>
  )
}
