import Stripe from 'stripe'
import type { Booking } from './types'

// Same Stripe account as BizzyPlug and RSVP (STRIPE_SECRET_KEY). Payments
// are confirmed two ways: the success page verifies the session directly,
// and the existing /api/rsvp/stripe-webhook endpoint routes any session with
// metadata.source === 'crookedrumors' to recordStripePayment. Either one is
// enough; together they are idempotent.

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('Payments are not configured yet')
  return new Stripe(key)
}

export type PayKind = 'deposit' | 'full' | 'balance'

export function amountFor(b: Pick<Booking, 'total_cents' | 'deposit_cents' | 'amount_paid_cents'>, kind: PayKind): number {
  const balance = Math.max(0, b.total_cents - b.amount_paid_cents)
  if (kind === 'deposit') return b.amount_paid_cents > 0 ? 0 : Math.min(b.deposit_cents, balance)
  return balance
}

const KIND_LABEL: Record<PayKind, string> = { deposit: 'Deposit', full: 'Payment in full', balance: 'Remaining balance' }

export async function createBookingCheckout(b: Booking, kind: PayKind, origin: string): Promise<string> {
  const amount = amountFor(b, kind)
  if (amount < 50) throw new Error('Nothing to pay right now')
  const stripe = getStripe()
  const what = b.package_name || 'Custom project'
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: b.client_email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: {
            name: `Crooked Rumors: ${what}`,
            description: `${KIND_LABEL[kind]} · Booking ${b.ref}`,
          },
        },
      },
    ],
    payment_intent_data: { description: `Crooked Rumors ${b.ref} (${KIND_LABEL[kind]})` },
    metadata: { source: 'crookedrumors', bookingId: b.id, ref: b.ref, kind },
    success_url: `${origin}/crookedrumors/booking/${b.token}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/crookedrumors/booking/${b.token}?canceled=1`,
  })
  if (!session.url) throw new Error('Could not start checkout')
  return session.url
}
