import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'
import { issueTickets } from '@/lib/rsvp/tickets'

export const dynamic = 'force-dynamic'

// Staff-added guest: walk-in at the door, guest-list add, or complimentary
// ticket — issued directly without a payment/RSVP flow.
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req, 'door_staff')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const eventId = String(body?.event_id || '')
    const name = String(body?.name || '').trim()
    const email = String(body?.email || '').trim().toLowerCase() || `walkin-${Date.now()}@no-email.local`
    const ticketTypeId = body?.ticket_type_id ? String(body.ticket_type_id) : null

    if (!eventId || !name) return NextResponse.json({ error: 'Event and guest name are required' }, { status: 400 })

    const supabase = getRsvpAdmin()
    const { data: order, error: orderError } = await supabase
      .from('rsvp_orders')
      .insert({
        event_id: eventId,
        buyer_name: name,
        buyer_email: email,
        amount_cents: 0,
        status: 'free',
        answers: { source: 'walk-in', addedBy: `${staff.displayName} (${staff.role})` },
        agreed_to_policies: true,
      })
      .select()
      .single()
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

    const tickets = await issueTickets({
      orderId: order.id,
      eventId,
      ticketTypeId,
      quantity: 1,
      holderName: name,
      holderEmail: email,
    })

    await logAudit(staff, 'add_walk_in', 'rsvp_tickets', tickets[0]?.id || null, { name })
    return NextResponse.json({ order, tickets })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add guest' }, { status: 500 })
  }
}
