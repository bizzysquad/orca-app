// Recurring DJ events (residencies): "every Fri and Sat at Club X".
//
// A series is a rule. ORCA turns it into real DJGig entries for the next few
// weeks, so each night has its own payments, shows on the website calendar,
// and counts as income everywhere a normal gig does.

import type { DJGig, GigType } from '@/lib/types'

export const RECURRING_KEY = 'orca-dj-recurring'

export interface GigSeries {
  id: string
  name: string            // e.g. "Club X residency"
  clientName: string      // who pays; defaults to the name
  venue: string
  eventAddress?: string
  eventType: GigType
  days: number[]          // 0 = Sunday ... 6 = Saturday
  startTime: string       // "22:00"
  endTime: string         // "02:00"
  rate: number            // per night
  depositAmount: number
  startDate: string       // YYYY-MM-DD
  endDate?: string        // YYYY-MM-DD, optional
  weeksAhead: number      // how far ahead to keep nights created
  paused: boolean
  skipped: string[]       // dates removed by hand; never recreated
  notes?: string
  createdAt: string
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DEFAULT_GEAR = [
  'Controller / CDJs', 'Mixer', 'Laptop + software', 'Headphones', 'Power strips / cables',
  'Speaker cables', 'USB drives (music)', 'Phone charger', 'Business cards', 'Invoice ready',
]

function paidSoFar(g: DJGig): number {
  return (g.depositPaid ? g.depositAmount || 0 : 0) + (g.partialPayments || []).reduce((s, p) => s + p.amount, 0)
}

// A night that can still be changed by editing the series: in the future,
// confirmed, and nothing paid on it yet.
export function isEditableOccurrence(g: DJGig, todayISO: string): boolean {
  return g.date >= todayISO && g.status === 'confirmed' && paidSoFar(g) === 0
}

// Every date this series should have, from today (or its start) through the window.
export function seriesDates(s: GigSeries, today: Date = new Date()): string[] {
  if (s.paused || s.days.length === 0) return []
  const out: string[] = []
  const start = new Date(Math.max(new Date(s.startDate + 'T00:00:00').getTime(), new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()))
  const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + Math.max(1, s.weeksAhead || 8) * 7)
  const end = s.endDate ? new Date(Math.min(new Date(s.endDate + 'T00:00:00').getTime(), horizon.getTime())) : horizon
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (s.days.includes(d.getDay())) {
      const iso = localISO(d)
      if (!s.skipped.includes(iso)) out.push(iso)
    }
  }
  return out
}

function nightFromSeries(s: GigSeries, date: string, idSeed: string): DJGig {
  return {
    id: `${s.id}-${date}-${idSeed}`,
    clientName: s.clientName || s.name,
    eventType: s.eventType,
    date,
    startTime: s.startTime,
    endTime: s.endTime,
    venue: s.venue,
    eventAddress: s.eventAddress,
    status: 'confirmed',
    contractAmount: s.rate,
    fee: s.rate,
    depositAmount: s.depositAmount,
    depositPaid: false,
    partialPayments: [],
    balancePaid: false,
    gearChecklist: DEFAULT_GEAR.map((item, i) => ({ id: String(i), item, checked: false })),
    notes: s.notes ? `${s.name}: ${s.notes}` : `Recurring: ${s.name}`,
    createdAt: new Date().toISOString(),
    seriesId: s.id,
  }
}

// Brings the gig list in line with every series:
// - future editable nights pick up the series' current details
// - future editable nights that no longer match (day removed, past end date,
//   series paused or deleted) are removed
// - missing nights inside the window are created
// Paid, completed or cancelled nights are never touched.
export function reconcileSeries(gigs: DJGig[], seriesList: GigSeries[], today: Date = new Date()): { gigs: DJGig[]; changed: boolean } {
  const todayISO = localISO(today)
  const byId = new Map(seriesList.map(s => [s.id, s]))
  let changed = false
  const next: DJGig[] = []

  for (const g of gigs) {
    if (!g.seriesId) { next.push(g); continue }
    const s = byId.get(g.seriesId)
    if (!isEditableOccurrence(g, todayISO)) { next.push(g); continue }
    const wanted = s ? seriesDates(s, today) : []
    if (!s || !wanted.includes(g.date)) { changed = true; continue }
    const updated: DJGig = {
      ...g,
      clientName: s.clientName || s.name,
      eventType: s.eventType,
      startTime: s.startTime,
      endTime: s.endTime,
      venue: s.venue,
      eventAddress: s.eventAddress,
      contractAmount: s.rate,
      fee: s.rate,
      depositAmount: s.depositAmount,
    }
    if (JSON.stringify(updated) !== JSON.stringify(g)) changed = true
    next.push(updated)
  }

  for (const s of seriesList) {
    const have = new Set(next.filter(g => g.seriesId === s.id).map(g => g.date))
    for (const date of seriesDates(s, today)) {
      if (!have.has(date)) {
        next.push(nightFromSeries(s, date, Math.random().toString(36).slice(2, 6)))
        changed = true
      }
    }
  }
  return { gigs: changed ? next : gigs, changed }
}

export function readSeries(): GigSeries[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECURRING_KEY) || '[]')
    return Array.isArray(v) ? v : []
  } catch { return [] }
}

export function describeSeries(s: GigSeries): string {
  const days = [...s.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => WEEKDAYS[d]).join(', ')
  return `Every ${days || '…'}`
}
