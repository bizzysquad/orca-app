import { NextRequest, NextResponse } from 'next/server'
import { loadSite, promoUseCount } from '@/lib/crooked/db'
import { computeQuote } from '@/lib/crooked/pricing'

export const dynamic = 'force-dynamic'

// Checks a promo code against the client's current selection and returns
// the promo (only that one) so the booking page can preview the discount.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = String(body?.code || '').trim()
    if (!code) return NextResponse.json({ error: 'Enter a code' }, { status: 400 })

    const { site } = await loadSite()
    const promo = site.promos.find(p => p.code.toLowerCase() === code.toLowerCase())
    if (!promo) return NextResponse.json({ error: 'That code is not valid' }, { status: 404 })

    const used = promo.maxUses != null ? await promoUseCount(promo.code) : 0
    const quote = computeQuote(site, { packageId: String(body?.packageId || ''), addons: body?.addons || [], paymentChoice: 'full' }, promo, used)
    if (!quote) return NextResponse.json({ error: 'Pick a package first' }, { status: 400 })
    if (quote.promoError) return NextResponse.json({ error: quote.promoError }, { status: 400 })

    return NextResponse.json({ promo: { ...promo, maxUses: null } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not check code' }, { status: 500 })
  }
}
