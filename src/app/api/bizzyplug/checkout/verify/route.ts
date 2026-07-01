import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key)
}

export async function GET(req: NextRequest) {
  try {
    const stripe = getStripe()
    const sessionId = req.nextUrl.searchParams.get('session_id')
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })
    }

    return NextResponse.json({
      paid: true,
      email: session.customer_email,
      amount: session.amount_total,
      metadata: session.metadata,
    })
  } catch (err: any) {
    console.error('Stripe verify error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
