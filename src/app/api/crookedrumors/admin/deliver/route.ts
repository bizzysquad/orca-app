import { NextRequest, NextResponse } from 'next/server'
import { requireCrAdmin } from '@/lib/crooked/auth'
import { getCrAdmin, loadSite } from '@/lib/crooked/db'
import { sendDeliveryEmail } from '@/lib/crooked/notify'
import { safeUrl } from '@/lib/crooked/clients'

export const dynamic = 'force-dynamic'

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

// Statuses a booking can be moved to "delivered" from. Completed and
// cancelled bookings are left alone.
const CAN_MARK_DELIVERED = ['quote_requested', 'quoted', 'pending_payment', 'deposit_paid', 'paid', 'scheduled', 'in_production']

export async function POST(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  try {
    const body = await req.json().catch(() => ({}))
    const to = str(body?.to, 200).toLowerCase()
    const clientName = str(body?.clientName, 120)
    const subject = str(body?.subject, 150) || 'Your Crooked Rumor project is ready'
    const message = String(body?.message ?? '').trim().slice(0, 5000)
    const bookingId = str(body?.bookingId, 60) || null

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) return NextResponse.json({ error: 'Enter a valid client email' }, { status: 400 })
    if (!message) return NextResponse.json({ error: 'Write a message for the client' }, { status: 400 })

    const rawLinks: any[] = Array.isArray(body?.links) ? body.links.slice(0, 10) : []
    const links: { label: string; url: string }[] = []
    for (const l of rawLinks) {
      const url = safeUrl(l?.url)
      if (!url) return NextResponse.json({ error: `This link does not look valid: ${str(l?.url, 80) || '(empty)'}` }, { status: 400 })
      links.push({ label: str(l?.label, 60) || 'Download your files', url })
    }

    const supabase = getCrAdmin()
    let booking: { id: string; ref: string; token: string; status: string } | null = null
    if (bookingId) {
      const { data } = await supabase.from('cr_bookings').select('id, ref, token, status, client_email').eq('id', bookingId).maybeSingle()
      if (data) booking = data
    }

    const { site } = await loadSite()
    const origin = req.nextUrl.origin
    const result = await sendDeliveryEmail({
      to,
      clientName,
      subject,
      message,
      links,
      bookingUrl: booking ? `${origin}/crookedrumor/booking/${booking.token}` : null,
      bookAgainUrl: `${origin}/crookedrumor/book`,
      settings: site.settings,
    })

    // Log every attempt so failures are visible in the history too.
    const { error: logError } = await supabase.from('cr_deliveries').insert({
      client_email: to,
      client_name: clientName,
      booking_id: booking?.id || null,
      booking_ref: booking?.ref || '',
      subject,
      message,
      links,
      status: result.ok ? 'sent' : 'failed',
      error: result.ok ? '' : result.error.slice(0, 500),
      email_id: result.ok ? result.id : '',
    })
    if (logError) console.error('[crookedrumors deliver] log failed', logError.message)

    if (!result.ok) return NextResponse.json({ error: `Email did not send: ${result.error}` }, { status: 502 })

    let markedDelivered = false
    if (booking && body?.markDelivered === true && CAN_MARK_DELIVERED.includes(booking.status)) {
      const { error } = await supabase.from('cr_bookings').update({ status: 'delivered', updated_at: new Date().toISOString() }).eq('id', booking.id)
      markedDelivered = !error
    }

    return NextResponse.json({ ok: true, markedDelivered, logged: !logError })
  } catch (err: any) {
    console.error('[crookedrumors deliver]', err)
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 })
  }
}
