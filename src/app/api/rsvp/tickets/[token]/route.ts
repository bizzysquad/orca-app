import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'

export const dynamic = 'force-dynamic'

// Public — the qr_token itself is the secret. Returns only what an
// attendee needs to see their own pass; never leaks other guests' data.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = getRsvpAdmin()
  const { data: ticket, error } = await supabase.from('rsvp_tickets').select('*').eq('qr_token', params.token).single()
  if (error || !ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  const [{ data: event }, { data: ticketType }] = await Promise.all([
    supabase.from('rsvp_events').select('name, slug, flyer_url, venue, address, city, state, start_time, end_time, age_requirement, dress_code, contact_email').eq('id', ticket.event_id).single(),
    ticket.ticket_type_id
      ? supabase.from('rsvp_ticket_types').select('name').eq('id', ticket.ticket_type_id).single()
      : Promise.resolve({ data: null }),
  ])

  return NextResponse.json({
    ticket: {
      ticket_number: ticket.ticket_number,
      holder_name: ticket.holder_name,
      guest_names: ticket.guest_names,
      status: ticket.status,
      checked_in_at: ticket.checked_in_at,
      verification_code: ticket.verification_code,
      qr_token: ticket.qr_token,
    },
    ticketTypeName: ticketType?.name || 'General Admission',
    event,
  })
}
