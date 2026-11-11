import { NextRequest, NextResponse } from 'next/server'
import { getBookingByToken } from '@/lib/crooked/db'
import { amountFor, createBookingCheckout, PayKind } from '@/lib/crooked/stripe'

export const dynamic = 'force-dynamic'

const PAYABLE = ['quoted', 'pending_payment', 'deposit_paid', 'paid', 'scheduled', 'in_production', 'delivered']

// Starts a Stripe Checkout for a deposit, full payment, or the remaining
// balance. Amounts always come from the stored booking, never the client.
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const booking = await getBookingByToken(params.token)
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (!PAYABLE.includes(booking.status)) return NextResponse.json({ error: 'This booking is not ready for payment' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    let kind: PayKind = body?.kind === 'deposit' ? 'deposit' : 'full'
    if (booking.amount_paid_cents > 0) kind = 'balance'
    if (kind === 'deposit' && (booking.deposit_cents <= 0 || booking.deposit_cents >= booking.total_cents)) kind = 'full'
    if (amountFor(booking, kind) <= 0) return NextResponse.json({ error: 'Nothing is due on this booking' }, { status: 400 })

    const url = await createBookingCheckout(booking, kind, req.nextUrl.origin)
    return NextResponse.json({ url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not start payment' }, { status: 500 })
  }
}
