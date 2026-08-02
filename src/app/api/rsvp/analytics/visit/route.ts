import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eventId = body?.event_id ? String(body.event_id) : null
    const path = String(body?.path || '').slice(0, 300)
    const referrer = String(body?.referrer || '').slice(0, 300)
    if (!path) return NextResponse.json({ ok: false }, { status: 400 })

    const supabase = getRsvpAdmin()
    await supabase.from('rsvp_page_visits').insert({ event_id: eventId, path, referrer })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
