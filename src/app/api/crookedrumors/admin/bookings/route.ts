import { NextRequest, NextResponse } from 'next/server'
import { requireCrAdmin } from '@/lib/crooked/auth'
import { getCrAdmin, loadSite } from '@/lib/crooked/db'
import { depositFor } from '@/lib/crooked/pricing'
import { BOOKING_STATUSES } from '@/lib/crooked/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  const supabase = getCrAdmin()
  const { data, error } = await supabase.from('cr_bookings').select('*').order('created_at', { ascending: false }).limit(500)
  if (error) return NextResponse.json({ bookings: [], error: error.message, dbReady: false })
  const { data: payments } = await supabase.from('cr_payments').select('booking_id, amount_cents, kind, created_at').order('created_at')
  return NextResponse.json({ bookings: data, payments: payments || [], dbReady: true })
}

// Admin edits: status, notes, schedule, and the price (sending a quote or
// adjusting for custom add-ons). Changing the total re-derives the deposit.
export async function PATCH(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  try {
    const body = await req.json()
    const id = String(body?.id || '')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const supabase = getCrAdmin()
    const { data: current } = await supabase.from('cr_bookings').select('*').eq('id', id).single()
    if (!current) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.admin_notes === 'string') patch.admin_notes = body.admin_notes.slice(0, 5000)
    if (typeof body.project_date === 'string') patch.project_date = /^\d{4}-\d{2}-\d{2}$/.test(body.project_date) ? body.project_date : null
    if (typeof body.project_time === 'string') patch.project_time = body.project_time.slice(0, 40)
    if (typeof body.location === 'string') patch.location = body.location.slice(0, 300)
    if (typeof body.turnaround === 'string') patch.turnaround = body.turnaround.slice(0, 80)
    if (typeof body.package_name === 'string') patch.package_name = body.package_name.slice(0, 120)
    if (body.status && (BOOKING_STATUSES as readonly string[]).includes(body.status)) patch.status = body.status

    if (body.total_cents != null) {
      const total = Math.max(0, Math.round(Number(body.total_cents) || 0))
      const { site } = await loadSite()
      patch.total_cents = total
      patch.deposit_cents = depositFor(total, site.settings.payment).depositCents
      if (current.kind === 'custom') patch.subtotal_cents = total
      if (current.status === 'quote_requested' && !body.status && total > 0) patch.status = 'quoted'
    }
    if (body.deposit_cents != null) {
      patch.deposit_cents = Math.max(0, Math.round(Number(body.deposit_cents) || 0))
    }

    const { data, error } = await supabase.from('cr_bookings').update(patch).eq('id', id).select('*').single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ booking: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await getCrAdmin().from('cr_bookings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
