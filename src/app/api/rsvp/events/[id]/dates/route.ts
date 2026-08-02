import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

// PUT replaces the whole proposed-dates list for an event — simplest
// contract for an admin UI that edits the list as one form. Any existing
// date rows not present in the payload (matched by id) are deleted, which
// cascades to their votes (acceptable pre-launch; the UI warns for this).
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const dates = Array.isArray(body?.dates) ? body.dates : []
    const supabase = getRsvpAdmin()

    const { data: existing } = await supabase.from('rsvp_proposed_dates').select('id').eq('event_id', params.id)
    const keepIds = new Set(dates.filter((d: any) => d.id).map((d: any) => d.id))
    const toDelete = (existing || []).filter((r: any) => !keepIds.has(r.id)).map((r: any) => r.id)
    if (toDelete.length) {
      await supabase.from('rsvp_proposed_dates').delete().in('id', toDelete)
    }

    const results = []
    for (let i = 0; i < dates.length; i++) {
      const d = dates[i]
      if (!d.label || !d.date) continue
      if (d.id) {
        const { data } = await supabase
          .from('rsvp_proposed_dates')
          .update({ label: d.label, date: d.date, sort_order: i, is_winner: !!d.is_winner })
          .eq('id', d.id)
          .select()
          .single()
        if (data) results.push(data)
      } else {
        const { data } = await supabase
          .from('rsvp_proposed_dates')
          .insert({ event_id: params.id, label: d.label, date: d.date, sort_order: i, is_winner: !!d.is_winner })
          .select()
          .single()
        if (data) results.push(data)
      }
    }

    await logAudit(staff, 'update_proposed_dates', 'rsvp_events', params.id, { count: results.length })
    return NextResponse.json({ dates: results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save dates' }, { status: 500 })
  }
}
