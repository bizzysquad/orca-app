'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import {
  addDays, dayState, freeSpans, monthGrid, nowIn, rangeLabel, startTimes, timeLabel,
  type Availability, type BusySpan, type DayState,
} from '@/lib/crooked/availability'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const CELL: Record<DayState, string> = {
  open: 'bg-[var(--cr-paper)] hover:bg-[#fff1dc] border-[var(--cr-ink)] cursor-pointer',
  limited: 'bg-[#fff1dc] hover:bg-[#ffe4bd] border-[var(--cr-ink)] cursor-pointer',
  full: 'bg-[var(--cr-tan)]/60 border-transparent text-[var(--cr-ink)]/45 line-through',
  closed: 'bg-transparent border-transparent text-[var(--cr-ink)]/30',
  past: 'bg-transparent border-transparent text-[var(--cr-ink)]/20',
}

export function fmtLongDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// Loads booked spans once for the whole bookable window.
export function useBusy(av: Availability) {
  const [busy, setBusy] = useState<BusySpan[] | null>(null)
  useEffect(() => {
    if (!av.enabled) return setBusy([])
    const today = nowIn(av.timezone).date
    fetch(`/api/crookedrumors/availability?from=${today}&to=${addDays(today, Math.min(200, Math.max(1, av.maxAdvanceDays)))}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setBusy(Array.isArray(d.busy) ? d.busy : []))
      .catch(() => setBusy([]))
  }, [av.enabled, av.timezone, av.maxAdvanceDays])
  return busy
}

export default function AvailabilityCalendar({
  av,
  durationMins,
  value,
  onChange,
  time,
  onTime,
  footer,
}: {
  av: Availability
  durationMins: number
  value: string
  onChange: (date: string) => void
  // Pass time + onTime to make the client pick a start time.
  time?: string
  onTime?: (label: string) => void
  footer?: (date: string) => React.ReactNode
}) {
  const busy = useBusy(av)
  const now = useMemo(() => nowIn(av.timezone), [av.timezone])
  const lastDay = addDays(now.date, Math.max(1, av.maxAdvanceDays))
  const startMonth = value || now.date
  const [ym, setYm] = useState({ y: Number(startMonth.slice(0, 4)), m: Number(startMonth.slice(5, 7)) - 1 })

  const cells = monthGrid(ym.y, ym.m)
  const firstOfMonth = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-01`
  const canPrev = firstOfMonth > now.date.slice(0, 8) + '01'
  const canNext = (cells[cells.length - 1] || '') < lastDay
  const shift = (n: number) => setYm(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }))

  const state = (d: string): DayState => dayState(av, d, busy || [], durationMins, now)
  const times = value && busy ? startTimes(av, value, busy, durationMins, now) : []
  const spans = value && busy ? freeSpans(av, value, busy) : []

  // Drop a picked date/time that's no longer valid (e.g. a different package
  // with a longer shoot).
  useEffect(() => {
    if (!busy || !value) return
    const st = state(value)
    if (st !== 'open' && st !== 'limited') {
      onChange('')
      onTime?.('')
    } else if (onTime && time && !times.map(timeLabel).includes(time)) onTime('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, durationMins])

  return (
    <div className="cr-card-flat !border-[3px] p-3 sm:p-4 bg-[var(--cr-paper)]">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} className="p-2 rounded-lg border-2 border-[var(--cr-ink)] disabled:opacity-25" aria-label="Previous month">
          <ChevronLeft size={18} strokeWidth={3} />
        </button>
        <div className="cr-display text-xl sm:text-2xl flex items-center gap-2">
          {MONTHS[ym.m]} {ym.y} {!busy && <Loader2 size={16} className="animate-spin" />}
        </div>
        <button type="button" onClick={() => shift(1)} disabled={!canNext} className="p-2 rounded-lg border-2 border-[var(--cr-ink)] disabled:opacity-25" aria-label="Next month">
          <ChevronRight size={18} strokeWidth={3} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[11px] font-black uppercase text-[var(--cr-muted)] py-1">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const st = busy ? state(d) : 'closed'
          const pickable = st === 'open' || st === 'limited'
          const sel = d === value
          return (
            <button
              key={d}
              type="button"
              disabled={!pickable}
              onClick={() => { onChange(d); onTime?.('') }}
              aria-pressed={sel}
              aria-label={`${fmtLongDate(d)}: ${st === 'limited' ? 'limited availability' : st === 'open' ? 'available' : st === 'full' ? 'booked' : 'unavailable'}`}
              className={`relative aspect-square sm:aspect-[1.15] rounded-lg border-2 text-sm sm:text-base font-extrabold transition-colors ${
                sel ? 'bg-[var(--cr-ink)] text-[var(--cr-paper)] border-[var(--cr-ink)] shadow-[3px_3px_0_var(--cr-red)]' : CELL[st]
              }`}
            >
              {Number(d.slice(8))}
              {st === 'limited' && !sel && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--cr-red)]" />}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold uppercase tracking-wide text-[var(--cr-muted)]">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-[var(--cr-ink)] bg-[var(--cr-paper)]" /> Open</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-[var(--cr-ink)] bg-[#fff1dc]" /> Some times taken</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[var(--cr-tan)]/60" /> Booked</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-[var(--cr-ink)]/20" /> Unavailable</span>
      </div>

      {value && busy && (
        <div className="mt-4 border-t-2 border-[var(--cr-tan)] pt-4">
          <div className="font-black">{fmtLongDate(value)}</div>
          {onTime ? (
            times.length ? (
              <>
                <div className="text-xs font-bold uppercase tracking-wide text-[var(--cr-muted)] mt-1 mb-2">Pick a start time</div>
                <div className="flex flex-wrap gap-2">
                  {times.map(t => {
                    const label = timeLabel(t)
                    const on = time === label
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onTime(label)}
                        aria-pressed={on}
                        className={`px-3 py-2 rounded-lg border-2 border-[var(--cr-ink)] text-sm font-extrabold ${on ? 'bg-[var(--cr-red)] text-[var(--cr-paper)] border-[var(--cr-red)]' : 'bg-[var(--cr-paper)] hover:bg-[#fff1dc]'}`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm font-semibold text-[var(--cr-red)]">No start times left that day. Try another date.</p>
            )
          ) : (
            <p className="mt-1 text-sm text-[var(--cr-ink-soft)]">
              Open {spans.map(([s, e]) => rangeLabel(s, e)).join(', ') || 'by request'}
            </p>
          )}
          {footer?.(value)}
        </div>
      )}
    </div>
  )
}
