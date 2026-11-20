import { NextRequest, NextResponse } from 'next/server'
import { loadBusy, loadSite } from '@/lib/crooked/db'
import { addDays, nowIn } from '@/lib/crooked/availability'

export const dynamic = 'force-dynamic'

const isDate = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

// Public: booked time spans for the calendar. Only dates and minutes, never
// who booked or what for.
export async function GET(req: NextRequest) {
  const { site } = await loadSite()
  const today = nowIn(site.availability.timezone).date
  const qFrom = req.nextUrl.searchParams.get('from')
  const qTo = req.nextUrl.searchParams.get('to')
  const from = isDate(qFrom) && qFrom! > today ? qFrom! : today
  let to = isDate(qTo) ? qTo! : addDays(from, 62)
  if (to > addDays(from, 200)) to = addDays(from, 200)
  const busy = await loadBusy(site, from, to)
  return NextResponse.json(
    { busy: busy.map(({ date, start, end }) => ({ date, start, end })) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
