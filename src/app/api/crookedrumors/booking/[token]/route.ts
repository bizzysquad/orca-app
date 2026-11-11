import { NextRequest, NextResponse } from 'next/server'
import { getBookingByToken, loadSite, recordStripePayment } from '@/lib/crooked/db'
import { getStripe } from '@/lib/crooked/stripe'
import { notifyPayment } from '@/lib/crooked/notify'
import type { Booking } from '@/lib/crooked/types'

export const dynamic = 'force-dynamic'

// Client-facing view of one booking (the token is the secret). When Stripe
// sends the client back with ?session_id=..., verify it here so the page
// shows "paid" right away even if the webhook hasn't landed yet.
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  let booking = await getBookingByToken(params.token)
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (sessionId && /^cs_[\w]+$/.test(sessionId)) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId)
      if (session.metadata?.bookingId === booking.id) {
        const result = await recordStripePayment(session as any)
        if (result) {
          booking = result.booking
          if (result.isNew) {
            const { site } = await loadSite()
            await notifyPayment(booking, site.settings, session.amount_total || 0, `${req.nextUrl.origin}/crookedrumor/booking/${booking.token}`)
          }
        }
      }
    } catch (err) {
      console.error('[crookedrumors booking verify]', err)
    }
  }

  return NextResponse.json({ booking: publicView(booking) })
}

function publicView(b: Booking) {
  const { admin_notes, id, ...rest } = b
  return rest
}
