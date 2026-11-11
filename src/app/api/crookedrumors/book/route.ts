import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { getCrAdmin, loadSite, promoUseCount } from '@/lib/crooked/db'
import { computeQuote } from '@/lib/crooked/pricing'
import { createBookingCheckout } from '@/lib/crooked/stripe'
import { notifyNewBooking } from '@/lib/crooked/notify'
import type { Booking } from '@/lib/crooked/types'

export const dynamic = 'force-dynamic'

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

function newRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(5)
  return 'CR-' + Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body?.website) return NextResponse.json({ ok: true }) // honeypot: bots fill every field

    const kind: 'package' | 'custom' = body?.kind === 'custom' ? 'custom' : 'package'
    const c = body?.client || {}
    const p = body?.project || {}

    const client_name = str(c.name, 120)
    const client_email = str(c.email, 200).toLowerCase()
    if (!client_name) return NextResponse.json({ error: 'Please enter your name' }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })

    const project_date = /^\d{4}-\d{2}-\d{2}$/.test(str(p.date, 10)) ? str(p.date, 10) : null
    const details = str(p.details, 4000)
    if (kind === 'custom' && details.length < 10) return NextResponse.json({ error: 'Tell us a little about your project' }, { status: 400 })

    const { site, dbReady } = await loadSite()
    if (!dbReady) return NextResponse.json({ error: 'Booking is temporarily unavailable. Please try again soon.' }, { status: 503 })

    let pricing: Partial<Booking> = {
      items: [],
      custom_requests: [],
      subtotal_cents: 0,
      discount_cents: 0,
      total_cents: 0,
      deposit_cents: 0,
      package_id: null,
      package_name: null,
      category_name: str(p.service, 80) || null,
      promo_code: null,
      payment_choice: null,
      turnaround: '',
    }

    if (kind === 'package') {
      const sel = {
        packageId: str(body?.selection?.packageId, 80),
        addons: Array.isArray(body?.selection?.addons) ? body.selection.addons.slice(0, 30) : [],
        paymentChoice: body?.selection?.paymentChoice === 'deposit' ? 'deposit' : 'full',
      } as const
      const code = str(body?.promoCode, 40)
      const promo = code ? site.promos.find(x => x.code.toLowerCase() === code.toLowerCase()) || null : null
      const used = promo && promo.maxUses != null ? await promoUseCount(promo.code) : 0
      const quote = computeQuote(site, { ...sel, addons: [...sel.addons] }, promo, used)
      if (!quote) return NextResponse.json({ error: 'That package is no longer available' }, { status: 400 })
      if (code && !quote.promo) return NextResponse.json({ error: quote.promoError || 'That code is not valid' }, { status: 400 })

      const rush = quote.items.some(i => /rush/i.test(i.label))
      pricing = {
        items: quote.items,
        custom_requests: quote.customRequests,
        subtotal_cents: quote.subtotalCents,
        discount_cents: quote.discountCents,
        total_cents: quote.totalCents,
        deposit_cents: quote.depositCents,
        package_id: quote.pkg.id,
        package_name: quote.pkg.name,
        category_name: site.categories.find(x => x.id === quote.pkg.categoryId)?.name || null,
        promo_code: quote.promo?.code || null,
        payment_choice: quote.paymentChoice,
        turnaround: rush ? '24 hour rush (subject to availability)' : quote.pkg.specs.turnaround,
      }
    }

    const status: Booking['status'] = kind === 'custom' ? 'quote_requested' : pricing.total_cents! > 0 ? 'pending_payment' : 'scheduled'

    const row = {
      ref: newRef(),
      token: randomBytes(18).toString('base64url'),
      kind,
      status,
      ...pricing,
      client_name,
      client_email,
      client_phone: str(c.phone, 40),
      client_instagram: str(c.instagram, 80),
      company: str(c.company, 120),
      project_date,
      project_time: str(p.time, 40),
      location: str(p.location, 300),
      details,
      budget: str(p.budget, 80),
      referral: str(p.referral, 120),
    }

    const { data: booking, error } = await getCrAdmin().from('cr_bookings').insert(row).select('*').single()
    if (error || !booking) throw new Error(error?.message || 'Could not save booking')

    const origin = req.nextUrl.origin
    const bookingUrl = `${origin}/crookedrumors/booking/${booking.token}`

    let checkoutUrl: string | null = null
    let paymentError: string | null = null
    if (kind === 'package' && booking.total_cents > 0) {
      try {
        checkoutUrl = await createBookingCheckout(booking as Booking, booking.payment_choice === 'deposit' ? 'deposit' : 'full', origin)
      } catch (err: any) {
        // Booking is saved either way; the booking page offers a retry.
        console.error('[crookedrumors book] checkout failed', err)
        paymentError = err.message || 'Could not start payment'
      }
    }

    // Bookings that need payment get their confirmation from notifyPayment
    // once Stripe confirms the charge. Only quotes and $0 bookings email now.
    if (kind === 'custom' || booking.total_cents <= 0) {
      await notifyNewBooking(booking as Booking, site.settings, bookingUrl)
    }

    return NextResponse.json({ ok: true, token: booking.token, ref: booking.ref, checkoutUrl, paymentError })
  } catch (err: any) {
    console.error('[crookedrumors book]', err)
    return NextResponse.json({ error: err.message || 'Something went wrong' }, { status: 500 })
  }
}
