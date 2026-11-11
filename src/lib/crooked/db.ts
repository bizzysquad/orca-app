import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_SITE } from './defaults'
import type { Booking, PublicSiteDoc, SiteDoc } from './types'

// Service-role client for Crooked Rumors. cr_* tables have RLS on with no
// policies (see supabase-migration-crookedrumors.sql), so every read/write
// goes through these server helpers. cache: 'no-store' keeps Next from
// caching the site doc — admin edits must show up on the next page load.
export function getCrAdmin() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })
}

export const SITE_ROW_ID = 'main'
export const MEDIA_BUCKET = 'crooked-rumors'

// Fills in any settings keys added after the doc was first saved, so new
// features never crash on an older stored doc.
export function normalizeSite(raw: Partial<SiteDoc> | null | undefined): SiteDoc {
  const d = raw || {}
  const s = (d.settings || {}) as Partial<SiteDoc['settings']>
  return {
    settings: {
      ...DEFAULT_SITE.settings,
      ...s,
      payment: { ...DEFAULT_SITE.settings.payment, ...(s.payment || {}) },
    },
    categories: Array.isArray(d.categories) ? d.categories : DEFAULT_SITE.categories,
    packages: Array.isArray(d.packages) ? d.packages : DEFAULT_SITE.packages,
    addons: Array.isArray(d.addons) ? d.addons : DEFAULT_SITE.addons,
    promos: Array.isArray(d.promos) ? d.promos : [],
    portfolio: Array.isArray(d.portfolio) ? d.portfolio : [],
  }
}

export async function loadSite(): Promise<{ site: SiteDoc; stored: boolean; dbReady: boolean; updatedAt: string | null }> {
  try {
    const { data, error } = await getCrAdmin().from('cr_site').select('data, updated_at').eq('id', SITE_ROW_ID).maybeSingle()
    if (error) return { site: normalizeSite(DEFAULT_SITE), stored: false, dbReady: false, updatedAt: null }
    if (!data) return { site: normalizeSite(DEFAULT_SITE), stored: false, dbReady: true, updatedAt: null }
    return { site: normalizeSite(data.data as SiteDoc), stored: true, dbReady: true, updatedAt: data.updated_at }
  } catch {
    return { site: normalizeSite(DEFAULT_SITE), stored: false, dbReady: false, updatedAt: null }
  }
}

export async function saveSite(site: SiteDoc): Promise<string> {
  const updatedAt = new Date().toISOString()
  const { error } = await getCrAdmin()
    .from('cr_site')
    .upsert({ id: SITE_ROW_ID, data: normalizeSite(site), updated_at: updatedAt })
  if (error) throw new Error(error.message)
  return updatedAt
}

export function toPublicSite(site: SiteDoc): PublicSiteDoc {
  const categories = site.categories.filter(c => !c.hidden)
  const catIds = new Set(categories.map(c => c.id))
  return {
    settings: { ...site.settings, notifyEmail: '' },
    categories,
    packages: site.packages.filter(p => !p.hidden && catIds.has(p.categoryId)),
    addons: site.addons.filter(a => !a.hidden),
    promos: [],
    hasPromos: site.promos.some(p => p.active),
    portfolio: site.portfolio.filter(p => !p.hidden),
  }
}

export async function promoUseCount(code: string): Promise<number> {
  const { count } = await getCrAdmin()
    .from('cr_bookings')
    .select('id', { count: 'exact', head: true })
    .ilike('promo_code', code)
    .gt('amount_paid_cents', 0)
  return count || 0
}

export async function getBookingByToken(token: string): Promise<Booking | null> {
  if (!token || token.length < 16) return null
  const { data } = await getCrAdmin().from('cr_bookings').select('*').eq('token', token).maybeSingle()
  return (data as Booking) || null
}

// Status a booking should move to after money comes in. Only advances from
// the pre-payment statuses so a booking the admin already moved on (e.g.
// "in_production") isn't dragged backwards.
export function statusAfterPayment(b: Pick<Booking, 'status' | 'total_cents'>, paidCents: number): Booking['status'] {
  const early = ['quote_requested', 'quoted', 'pending_payment', 'deposit_paid']
  if (!early.includes(b.status)) return b.status
  if (b.total_cents > 0 && paidCents >= b.total_cents) return 'paid'
  if (paidCents > 0) return 'deposit_paid'
  return b.status
}

// Idempotent: the unique stripe_session_id means the webhook and the success
// page can both call this for the same checkout and it only counts once.
export async function recordStripePayment(session: {
  id: string
  payment_status?: string | null
  amount_total?: number | null
  payment_intent?: unknown
  metadata?: Record<string, string> | null
}): Promise<{ booking: Booking; isNew: boolean } | null> {
  if (session.payment_status !== 'paid') return null
  const bookingId = session.metadata?.bookingId
  if (!bookingId) return null
  const supabase = getCrAdmin()

  const { data: inserted, error } = await supabase
    .from('cr_payments')
    .upsert(
      {
        booking_id: bookingId,
        stripe_session_id: session.id,
        stripe_payment_intent: String(session.payment_intent || ''),
        amount_cents: session.amount_total || 0,
        kind: session.metadata?.kind || 'payment',
      },
      { onConflict: 'stripe_session_id', ignoreDuplicates: true }
    )
    .select('id')
  if (error) throw new Error(error.message)

  const { data: booking } = await supabase.from('cr_bookings').select('*').eq('id', bookingId).single()
  if (!booking) return null
  if (!inserted || inserted.length === 0) return { booking: booking as Booking, isNew: false }

  const { data: payments } = await supabase.from('cr_payments').select('amount_cents').eq('booking_id', bookingId)
  const paid = (payments || []).reduce((s, p: any) => s + (p.amount_cents || 0), 0)
  const status = statusAfterPayment(booking as Booking, paid)
  const { data: updated } = await supabase
    .from('cr_bookings')
    .update({ amount_paid_cents: paid, status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select('*')
    .single()
  return { booking: (updated || booking) as Booking, isNew: true }
}
