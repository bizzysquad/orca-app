import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { isValidEmail } from '@/lib/rsvp/request'
import { issueTickets } from '@/lib/rsvp/tickets'
import { sendTemplatedEmail } from '@/lib/rsvp/email'
import { getRsvpAppUrl } from '@/lib/rsvp/url'

export const dynamic = 'force-dynamic'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key)
}

const RSVP_OK_STATUSES = new Set(['rsvp_open', 'tickets_on_sale'])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eventId = String(body?.event_id || '')
    const ticketTypeId = body?.ticket_type_id ? String(body.ticket_type_id) : null
    const quantity = Math.max(1, Math.min(20, Number(body?.quantity) || 1))
    const buyerName = String(body?.buyer_name || '').trim()
    const buyerEmail = String(body?.buyer_email || '').trim().toLowerCase()
    const buyerPhone = String(body?.buyer_phone || '').trim()
    const promoCode = body?.promo_code ? String(body.promo_code).toUpperCase().trim() : null
    const answers = body?.answers && typeof body.answers === 'object' ? body.answers : {}
    const guestNames: string[] = Array.isArray(body?.guest_names) ? body.guest_names.slice(0, quantity) : []
    const marketingOptIn = !!body?.marketing_opt_in
    const agreedToPolicies = !!body?.agreed_to_policies

    if (!eventId || !buyerName || !buyerEmail) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }
    if (!isValidEmail(buyerEmail)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })

    const supabase = getRsvpAdmin()
    const { data: event } = await supabase.from('rsvp_events').select('*').eq('id', eventId).single()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (!RSVP_OK_STATUSES.has(event.status)) {
      return NextResponse.json({ error: 'RSVPs/tickets are not currently open for this event' }, { status: 400 })
    }
    if (event.policies && !agreedToPolicies) {
      return NextResponse.json({ error: 'You must agree to the event policies' }, { status: 400 })
    }

    // custom question validation
    for (const q of event.custom_rsvp_questions || []) {
      if (q.required && !answers[q.label]) {
        return NextResponse.json({ error: `Please answer: ${q.label}` }, { status: 400 })
      }
    }

    // ── FREE EVENT ────────────────────────────────────────────────────
    if (!event.is_paid) {
      if (event.rsvp_capacity != null) {
        const { count } = await supabase
          .from('rsvp_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .in('status', ['valid', 'checked_in'])
        if ((count || 0) + quantity > event.rsvp_capacity) {
          return NextResponse.json({ error: 'This event is at RSVP capacity.', soldOut: true }, { status: 409 })
        }
      }

      const { data: order, error: orderError } = await supabase
        .from('rsvp_orders')
        .insert({
          event_id: eventId,
          buyer_name: buyerName,
          buyer_email: buyerEmail,
          buyer_phone: buyerPhone,
          amount_cents: 0,
          status: 'free',
          answers,
          marketing_opt_in: marketingOptIn,
          agreed_to_policies: agreedToPolicies,
        })
        .select()
        .single()
      if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

      const tickets = await issueTickets({
        orderId: order.id,
        eventId,
        ticketTypeId: null,
        quantity,
        holderName: buyerName,
        holderEmail: buyerEmail,
        guestNames,
      })

      if (tickets[0]) {
        await sendTemplatedEmail({
          templateKey: 'rsvp_confirmation',
          eventId,
          to: buyerEmail,
          vars: { event_name: event.name, ticket_url: `${getRsvpAppUrl()}/RSVP/ticket/${tickets[0].qr_token}` },
        })
      }

      return NextResponse.json({ free: true, order, tickets })
    }

    // ── PAID EVENT ───────────────────────────────────────────────────
    if (!ticketTypeId) {
      return NextResponse.json({ error: 'Select a ticket type' }, { status: 400 })
    }
    const { data: ticketType } = await supabase.from('rsvp_ticket_types').select('*').eq('id', ticketTypeId).eq('event_id', eventId).single()
    if (!ticketType) return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })

    const now = new Date()
    if (ticketType.sales_start && new Date(ticketType.sales_start) > now) {
      return NextResponse.json({ error: 'This ticket type is not yet on sale' }, { status: 400 })
    }
    if (ticketType.sales_end && new Date(ticketType.sales_end) < now) {
      return NextResponse.json({ error: 'Sales have ended for this ticket type' }, { status: 400 })
    }
    if (ticketType.quantity_limit != null && ticketType.sold_count + quantity > ticketType.quantity_limit) {
      return NextResponse.json({ error: 'Not enough tickets remaining for this type.', soldOut: true }, { status: 409 })
    }

    let unitPriceCents = ticketType.price_cents
    let promoCodeId: string | null = null

    if (promoCode) {
      const { data: promo } = await supabase
        .from('rsvp_promo_codes')
        .select('*')
        .eq('event_id', eventId)
        .eq('code', promoCode)
        .single()
      if (!promo) {
        return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 })
      }
      if (promo.expires_at && new Date(promo.expires_at) < now) {
        return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
      }
      if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
        return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
      }
      promoCodeId = promo.id
      if (promo.discount_type === 'percent') {
        unitPriceCents = Math.round(unitPriceCents * (1 - promo.discount_value / 100))
      } else {
        unitPriceCents = Math.max(0, unitPriceCents - promo.discount_value * 100)
      }
    }

    const amountCents = Math.max(0, unitPriceCents * quantity)

    const { data: order, error: orderError } = await supabase
      .from('rsvp_orders')
      .insert({
        event_id: eventId,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone,
        amount_cents: amountCents,
        status: 'pending',
        promo_code_id: promoCodeId,
        answers,
        marketing_opt_in: marketingOptIn,
        agreed_to_policies: agreedToPolicies,
      })
      .select()
      .single()
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

    // Comp / fully-discounted tickets skip Stripe entirely
    if (amountCents <= 0 || ticketType.is_complimentary) {
      await supabase.from('rsvp_orders').update({ status: 'paid' }).eq('id', order.id)
      if (promoCodeId) {
        const { data: promo } = await supabase.from('rsvp_promo_codes').select('used_count').eq('id', promoCodeId).single()
        if (promo) await supabase.from('rsvp_promo_codes').update({ used_count: (promo.used_count || 0) + 1 }).eq('id', promoCodeId)
      }
      const tickets = await issueTickets({
        orderId: order.id, eventId, ticketTypeId, quantity, holderName: buyerName, holderEmail: buyerEmail, guestNames,
      })
      if (tickets[0]) {
        await sendTemplatedEmail({
          templateKey: 'digital_invitation',
          eventId,
          to: buyerEmail,
          vars: { event_name: event.name, ticket_url: `${getRsvpAppUrl()}/RSVP/ticket/${tickets[0].qr_token}` },
        })
      }
      return NextResponse.json({ free: true, order, tickets })
    }

    const stripe = getStripe()
    const appUrl = getRsvpAppUrl()

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: buyerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `${event.name} — ${ticketType.name}` },
            unit_amount: unitPriceCents,
          },
          quantity,
        },
      ],
      metadata: {
        orderId: order.id,
        eventId,
        ticketTypeId,
        quantity: String(quantity),
        buyerName,
        guestNames: JSON.stringify(guestNames).slice(0, 450),
      },
      success_url: `${appUrl}/RSVP/events/${event.slug}?order=${order.id}&checkout=success`,
      cancel_url: `${appUrl}/RSVP/events/${event.slug}?checkout=cancelled`,
    })

    await supabase.from('rsvp_orders').update({ stripe_session_id: session.id }).eq('id', order.id)

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[rsvp checkout]', err)
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 })
  }
}
