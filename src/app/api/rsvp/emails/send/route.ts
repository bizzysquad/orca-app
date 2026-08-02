import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'
import { sendTemplatedEmail } from '@/lib/rsvp/email'
import { getRsvpAppUrl } from '@/lib/rsvp/url'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Recipient = { name: string; email: string }

async function resolveSegment(
  supabase: ReturnType<typeof getRsvpAdmin>,
  eventId: string,
  segment: string,
  dateId?: string
): Promise<Recipient[]> {
  const dedupe = (rows: Recipient[]) => {
    const seen = new Set<string>()
    return rows.filter(r => {
      const e = r.email.toLowerCase()
      if (!e || seen.has(e)) return false
      seen.add(e)
      return true
    })
  }

  switch (segment) {
    case 'voters': {
      const { data } = await supabase.from('rsvp_votes').select('voter_name, voter_email').eq('event_id', eventId)
      return dedupe((data || []).map(v => ({ name: v.voter_name, email: v.voter_email })))
    }
    case 'date_voters': {
      if (!dateId) return []
      const { data } = await supabase.from('rsvp_votes').select('voter_name, voter_email').eq('event_id', eventId).eq('date_id', dateId)
      return dedupe((data || []).map(v => ({ name: v.voter_name, email: v.voter_email })))
    }
    case 'attendees': {
      const { data } = await supabase.from('rsvp_tickets').select('holder_name, holder_email, status').eq('event_id', eventId).in('status', ['valid', 'checked_in'])
      return dedupe((data || []).map(t => ({ name: t.holder_name, email: t.holder_email })))
    }
    case 'paid_ticket_holders': {
      const { data: orders } = await supabase.from('rsvp_orders').select('buyer_name, buyer_email').eq('event_id', eventId).eq('status', 'paid')
      return dedupe((orders || []).map(o => ({ name: o.buyer_name, email: o.buyer_email })))
    }
    case 'waitlist': {
      const { data } = await supabase.from('rsvp_waitlist').select('name, email').eq('event_id', eventId)
      return dedupe((data || []).map(w => ({ name: w.name, email: w.email })))
    }
    case 'checked_in': {
      const { data } = await supabase.from('rsvp_tickets').select('holder_name, holder_email').eq('event_id', eventId).eq('status', 'checked_in')
      return dedupe((data || []).map(t => ({ name: t.holder_name, email: t.holder_email })))
    }
    case 'no_shows': {
      const { data } = await supabase.from('rsvp_tickets').select('holder_name, holder_email').eq('event_id', eventId).eq('status', 'valid')
      return dedupe((data || []).map(t => ({ name: t.holder_name, email: t.holder_email })))
    }
    case 'cancelled': {
      const { data } = await supabase.from('rsvp_tickets').select('holder_name, holder_email').eq('event_id', eventId).in('status', ['cancelled', 'refunded'])
      return dedupe((data || []).map(t => ({ name: t.holder_name, email: t.holder_email })))
    }
    default:
      return []
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const eventId = String(body?.event_id || '')
    const templateKey = String(body?.template_key || '')
    const segment = String(body?.segment || '')
    const dateId = body?.date_id ? String(body.date_id) : undefined
    const customEmails: string[] = Array.isArray(body?.custom_emails) ? body.custom_emails : []

    if (!eventId || !templateKey) return NextResponse.json({ error: 'event_id and template_key are required' }, { status: 400 })

    const supabase = getRsvpAdmin()
    const { data: event } = await supabase.from('rsvp_events').select('name, slug').eq('id', eventId).single()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    let recipients: Recipient[] =
      segment === 'custom'
        ? customEmails.filter(Boolean).map(e => ({ name: '', email: e }))
        : await resolveSegment(supabase, eventId, segment, dateId)

    if (recipients.length > 500) recipients = recipients.slice(0, 500) // keep a synchronous send well within function time limits

    const eventUrl = `${getRsvpAppUrl()}/RSVP/events/${event.slug}`

    let sent = 0
    for (const r of recipients) {
      const result = await sendTemplatedEmail({
        templateKey,
        eventId,
        to: r.email,
        vars: { event_name: event.name, event_url: eventUrl, guest_name: r.name },
        isMarketing: !['rsvp_confirmation', 'payment_confirmation', 'digital_invitation', 'ticket_transfer', 'waitlist_confirmation', 'refund_confirmation', 'event_cancellation', 'event_update'].includes(templateKey),
      })
      if (!('error' in result)) sent++
    }

    await logAudit(staff, 'send_campaign', 'rsvp_events', eventId, { templateKey, segment, recipientCount: recipients.length })

    return NextResponse.json({ success: true, recipientCount: recipients.length, sent })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send campaign' }, { status: 500 })
  }
}
