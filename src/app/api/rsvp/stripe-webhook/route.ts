import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { issueTickets } from '@/lib/rsvp/tickets'
import { sendTemplatedEmail } from '@/lib/rsvp/email'
import { getRsvpAppUrl } from '@/lib/rsvp/url'

export const dynamic = 'force-dynamic'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key)
}

// Stripe requires the raw request body for signature verification — do not
// parse JSON before calling constructEvent.
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const rawBody = await req.text()
  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    console.error('[rsvp stripe webhook] signature verification failed', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getRsvpAdmin()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Stripe.Checkout.Session type isn't exported by the installed stripe
        // package version's types (same pre-existing gap as bizzyplug/checkout.ts).
        const session = event.data.object as any
        const orderId = session.metadata?.orderId
        if (!orderId) break

        const { data: order } = await supabase.from('rsvp_orders').select('*').eq('id', orderId).single()
        if (!order) break
        if (order.status === 'paid') break // already processed (webhook retry / duplicate)

        await supabase
          .from('rsvp_orders')
          .update({ status: 'paid', stripe_payment_intent_id: String(session.payment_intent || ''), updated_at: new Date().toISOString() })
          .eq('id', orderId)

        if (order.promo_code_id) {
          const { data: promo } = await supabase.from('rsvp_promo_codes').select('used_count').eq('id', order.promo_code_id).single()
          if (promo) await supabase.from('rsvp_promo_codes').update({ used_count: (promo.used_count || 0) + 1 }).eq('id', order.promo_code_id)
        }

        const quantity = Number(session.metadata?.quantity || '1')
        let guestNames: string[] = []
        try { guestNames = JSON.parse(session.metadata?.guestNames || '[]') } catch {}

        const tickets = await issueTickets({
          orderId,
          eventId: order.event_id,
          ticketTypeId: session.metadata?.ticketTypeId || null,
          quantity,
          holderName: session.metadata?.buyerName || order.buyer_name,
          holderEmail: order.buyer_email,
          guestNames,
        })

        if (tickets[0]) {
          const { data: eventRow } = await supabase.from('rsvp_events').select('name').eq('id', order.event_id).single()
          await sendTemplatedEmail({
            templateKey: 'payment_confirmation',
            eventId: order.event_id,
            to: order.buyer_email,
            vars: { event_name: eventRow?.name || 'your event', ticket_url: `${getRsvpAppUrl()}/RSVP/ticket/${tickets[0].qr_token}` },
          })
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = String(charge.payment_intent || '')
        if (!paymentIntentId) break
        const { data: order } = await supabase.from('rsvp_orders').select('id').eq('stripe_payment_intent_id', paymentIntentId).single()
        if (!order) break
        await supabase.from('rsvp_orders').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', order.id)
        await supabase.from('rsvp_tickets').update({ status: 'refunded' }).eq('order_id', order.id)
        break
      }

      default:
        break
    }
  } catch (err: any) {
    console.error('[rsvp stripe webhook] handler error', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
