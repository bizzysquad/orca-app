import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { services, form } = body

    if (!services?.length || !form?.artistName || !form?.email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = services.map(
      (svc: { name: string; price: number }) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: svc.name },
          unit_amount: Math.round(svc.price * 100),
        },
        quantity: 1,
      })
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: form.email,
      metadata: {
        artistName: form.artistName,
        email: form.email,
        instagram: form.instagram || '',
        songName: form.songName || '',
        details: form.details || '',
        deadline: form.deadline || '',
        notes: form.notes || '',
        projectType: services.map((s: { name: string }) => s.name).join(', '),
      },
      success_url: `${appUrl}/bizzyplug/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/bizzyplug/checkout/cancel`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
