import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { getStaff } from '@/lib/rsvp/staffAuth'
import { isValidEmail } from '@/lib/rsvp/request'
import { sendTemplatedEmail } from '@/lib/rsvp/email'
import { getRsvpAppUrl } from '@/lib/rsvp/url'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const staff = await getStaff(req)
  if (!staff) return NextResponse.json({ error: 'Staff login required' }, { status: 401 })

  const eventId = req.nextUrl.searchParams.get('event_id')
  const supabase = getRsvpAdmin()
  let query = supabase.from('rsvp_waitlist').select('*').order('created_at', { ascending: true })
  if (eventId) query = query.eq('event_id', eventId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ waitlist: data || [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eventId = String(body?.event_id || '')
    const name = String(body?.name || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const phone = String(body?.phone || '').trim()
    const partySize = Math.max(1, Math.min(20, Number(body?.party_size) || 1))

    if (!eventId || !name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })

    const supabase = getRsvpAdmin()
    const { data: event } = await supabase.from('rsvp_events').select('name, slug').eq('id', eventId).single()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('rsvp_waitlist')
      .insert({ event_id: eventId, name, email, phone, party_size: partySize })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await sendTemplatedEmail({
      templateKey: 'waitlist_confirmation',
      eventId,
      to: email,
      vars: { event_name: event.name, event_url: `${getRsvpAppUrl()}/RSVP/events/${event.slug}` },
    })

    return NextResponse.json({ waitlistEntry: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to join waitlist' }, { status: 500 })
  }
}
