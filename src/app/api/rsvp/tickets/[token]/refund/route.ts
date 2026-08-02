import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'
import { sendTemplatedEmail } from '@/lib/rsvp/email'

export const dynamic = 'force-dynamic'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key)
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const supabase = getRsvpAdmin()
    const { data: ticket } = await supabase.from('rsvp_tickets').select('*').eq('qr_token', params.token).single()
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const { data: order } = await supabase.from('rsvp_orders').select('*').eq('id', ticket.order_id).single()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.stripe_payment_intent_id) {
      const stripe = getStripe()
      await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })
      // charge.refunded webhook will also mark order/tickets refunded — updating
      // here too so the UI reflects it immediately without waiting on the webhook.
    }

    await supabase.from('rsvp_orders').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', order.id)
    const { data: updatedTicket } = await supabase.from('rsvp_tickets').update({ status: 'refunded' }).eq('id', ticket.id).select().single()

    const { data: event } = await supabase.from('rsvp_events').select('name').eq('id', ticket.event_id).single()
    await sendTemplatedEmail({
      templateKey: 'refund_confirmation',
      eventId: ticket.event_id,
      to: order.buyer_email,
      vars: { event_name: event?.name || 'the event' },
    })

    await logAudit(staff, 'refund_ticket', 'rsvp_tickets', ticket.id, { orderId: order.id })
    return NextResponse.json({ ticket: updatedTicket })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Refund failed' }, { status: 500 })
  }
}
