// Crooked Rumor availability. Pure functions shared by the public calendar,
// the booking step, the admin calendar, and the booking API (which re-checks
// the picked time so nobody can book a blocked or taken slot).
//
// All dates are yyyy-mm-dd and all times are minutes after midnight in the
// business time zone (settings.timezone). Nothing here converts zones except
// nowIn(), which reads the current date/time in that zone.

export interface WeeklyHours {
  open: boolean
  start: string // HH:MM
  end: string // HH:MM
}

export interface AvailabilityBlock {
  id: string
  startDate: string
  endDate: string // same as startDate for a single day
  allDay: boolean
  start: string // HH:MM, used when !allDay
  end: string
  note: string // private, stripped from the public site
}

export interface Availability {
  enabled: boolean // false = booking falls back to a plain date box
  showOnSite: boolean // the Availability section on the home page
  timezone: string
  weekly: WeeklyHours[] // index 0 = Sunday
  blocks: AvailabilityBlock[]
  stepMins: number // start time spacing offered to clients
  defaultDurationMins: number // packages without their own shoot length
  bufferMins: number // gap kept before and after every booked shoot
  minNoticeDays: number
  maxAdvanceDays: number
  title: string
  sub: string
}

// A booked shoot, as the public API exposes it (no client info).
export interface BusySpan {
  date: string
  start: number
  end: number
}

export type DayState = 'past' | 'closed' | 'full' | 'limited' | 'open'

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const DEFAULT_AVAILABILITY: Availability = {
  enabled: true,
  showOnSite: true,
  timezone: 'America/New_York',
  weekly: [
    { open: true, start: '10:00', end: '20:00' },
    { open: true, start: '10:00', end: '20:00' },
    { open: true, start: '10:00', end: '20:00' },
    { open: true, start: '10:00', end: '20:00' },
    { open: true, start: '10:00', end: '20:00' },
    { open: true, start: '10:00', end: '20:00' },
    { open: true, start: '10:00', end: '20:00' },
  ],
  blocks: [],
  stepMins: 60,
  defaultDurationMins: 120,
  bufferMins: 30,
  minNoticeDays: 2,
  maxAdvanceDays: 120,
  title: 'Check our availability',
  sub: 'Pick an open day to see start times, then lock it in when you book.',
}

// Bookings that hold their time slot. Unpaid requests do not block.
export const BLOCKING_STATUSES = ['deposit_paid', 'paid', 'scheduled', 'in_production', 'delivered', 'completed']

export const toMins = (hhmm: string): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '')
  return m ? Math.min(1440, Number(m[1]) * 60 + Number(m[2])) : 0
}

export const toHHMM = (mins: number): string => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

export function timeLabel(mins: number): string {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// Reads a start time back out of a booking's project_time. Handles our own
// "2:00 PM" labels and loose typed ones ("2pm", "14:30"). null = no clear time.
export function parseTimeLabel(s: string): number | null {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i.exec(s || '')
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2] || 0)
  const ap = (m[3] || '').toLowerCase()
  if (!ap && !m[2]) return null // a bare number like "2" is too vague
  if (h > 23 || min > 59) return null
  if (ap.startsWith('p') && h < 12) h += 12
  if (ap.startsWith('a') && h === 12) h = 0
  return h * 60 + min
}

export function rangeLabel(start: number, end: number): string {
  return `${timeLabel(start)} to ${timeLabel(end)}`
}

export function durationLabel(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return [h ? `${h} hr` : '', m ? `${m} min` : ''].filter(Boolean).join(' ') || '0 min'
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const weekdayOf = (date: string): number => new Date(date + 'T12:00:00Z').getUTCDay()

// Current date and minute in the business time zone.
export function nowIn(timezone: string): { date: string; mins: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date())
    const get = (t: string) => parts.find(p => p.type === t)?.value || '00'
    return { date: `${get('year')}-${get('month')}-${get('day')}`, mins: Number(get('hour')) * 60 + Number(get('minute')) }
  } catch {
    const d = new Date()
    return { date: d.toISOString().slice(0, 10), mins: d.getHours() * 60 + d.getMinutes() }
  }
}

type Span = [number, number]

function subtract(spans: Span[], cut: Span): Span[] {
  const out: Span[] = []
  for (const [s, e] of spans) {
    if (cut[1] <= s || cut[0] >= e) out.push([s, e])
    else {
      if (cut[0] > s) out.push([s, cut[0]])
      if (cut[1] < e) out.push([cut[1], e])
    }
  }
  return out
}

export const blocksOn = (av: Availability, date: string) => av.blocks.filter(b => b.startDate <= date && date <= (b.endDate || b.startDate))

// Open hours for a day: the weekly schedule minus admin blocks.
export function openSpans(av: Availability, date: string): Span[] {
  const w = av.weekly[weekdayOf(date)]
  if (!w || !w.open) return []
  const s = toMins(w.start)
  const e = toMins(w.end)
  if (e <= s) return []
  let spans: Span[] = [[s, e]]
  for (const b of blocksOn(av, date)) {
    if (b.allDay) return []
    spans = subtract(spans, [toMins(b.start), toMins(b.end)])
  }
  return spans
}

export function inBookingRange(av: Availability, date: string, today: string): boolean {
  return date >= addDays(today, Math.max(0, av.minNoticeDays)) && date <= addDays(today, Math.max(1, av.maxAdvanceDays))
}

// Start times a client can pick for a shoot of `durationMins` on `date`.
export function startTimes(av: Availability, date: string, busy: BusySpan[], durationMins: number, now: { date: string; mins: number }): number[] {
  if (date < now.date || !inBookingRange(av, date, now.date)) return []
  const step = Math.max(15, av.stepMins || 60)
  const dur = Math.max(15, durationMins || av.defaultDurationMins || 60)
  const buf = Math.max(0, av.bufferMins || 0)
  const taken = busy.filter(b => b.date === date)
  const out: number[] = []
  for (const [s, e] of openSpans(av, date)) {
    // Align to the step grid so times read cleanly (10:00, 11:00…).
    for (let t = Math.ceil(s / step) * step; t + dur <= e; t += step) {
      if (date === now.date && t <= now.mins) continue
      if (taken.some(b => t < b.end + buf && t + dur + buf > b.start)) continue
      out.push(t)
    }
  }
  return out
}

export function dayState(av: Availability, date: string, busy: BusySpan[], durationMins: number, now: { date: string; mins: number }): DayState {
  if (date < now.date) return 'past'
  const w = av.weekly[weekdayOf(date)]
  if (!w?.open || !inBookingRange(av, date, now.date)) return 'closed'
  if (blocksOn(av, date).some(b => b.allDay)) return 'closed'
  const times = startTimes(av, date, busy, durationMins, now)
  if (!times.length) return 'full'
  const touched = busy.some(b => b.date === date) || blocksOn(av, date).length > 0
  return touched ? 'limited' : 'open'
}

// The whole open stretches of a day with taken time removed. Used for the
// public calendar's "open hours" readout.
export function freeSpans(av: Availability, date: string, busy: BusySpan[]): Span[] {
  const buf = Math.max(0, av.bufferMins || 0)
  let spans = openSpans(av, date)
  for (const b of busy.filter(x => x.date === date)) spans = subtract(spans, [b.start - buf, b.end + buf])
  return spans.filter(([s, e]) => e - s >= 30)
}

// Month grid: leading blanks (null) so day 1 lands on its weekday.
export function monthGrid(year: number, month0: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month0, 1, 12))
  const days = new Date(Date.UTC(year, month0 + 1, 0, 12)).getUTCDate()
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null)
  for (let d = 1; d <= days; d++) cells.push(`${year}-${String(month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  return cells
}

export function normalizeAvailability(raw: Partial<Availability> | null | undefined): Availability {
  const r = raw || {}
  const weekly = Array.isArray(r.weekly) && r.weekly.length === 7 ? r.weekly : DEFAULT_AVAILABILITY.weekly
  return {
    ...DEFAULT_AVAILABILITY,
    ...r,
    weekly: weekly.map(w => ({ open: !!w.open, start: w.start || '10:00', end: w.end || '20:00' })),
    blocks: (Array.isArray(r.blocks) ? r.blocks : []).map(b => ({
      id: b.id,
      startDate: b.startDate,
      endDate: b.endDate && b.endDate >= b.startDate ? b.endDate : b.startDate,
      allDay: b.allDay !== false,
      start: b.start || '09:00',
      end: b.end || '17:00',
      note: b.note || '',
    })),
  }
}
