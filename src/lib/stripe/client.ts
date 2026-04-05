'use client'

import { loadStripe } from '@stripe/stripe-js'

let stripePromise: ReturnType<typeof loadStripe> | null = null

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

export async function createCheckoutSession(priceId: string) {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  const { sessionId } = await response.json()
  const stripe = await getStripe()

  if (stripe) {
    const { error } = await stripe.redirectToCheckout({ sessionId })
    if (error) throw error
  }
}
