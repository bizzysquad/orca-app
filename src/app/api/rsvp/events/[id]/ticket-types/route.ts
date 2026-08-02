import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const types = Array.isArray(body?.ticketTypes) ? body.ticketTypes : []
    const supabase = getRsvpAdmin()

    const { data: existing } = await supabase.from('rsvp_ticket_types').select('id').eq('event_id', params.id)
    const keep = new Set(types.filter((t: any) => t.id).map((t: any) => t.id))
    const toDelete = (existing || []).filter((r: any) => !keep.has(r.id)).map((r: any) => r.id)
    if (toDelete.length) await supabase.from('rsvp_ticket_types').delete().in('id', toDelete)

    const results = []
    for (let i = 0; i < types.length; i++) {
      const t = types[i]
      if (!t.name) continue
      const row = {
        name: t.name,
        description: t.description || '',
        price_cents: Math.max(0, Number(t.price_cents) || 0),
        quantity_limit: t.quantity_limit ? Number(t.quantity_limit) : null,
        sales_start: t.sales_start || null,
        sales_end: t.sales_end || null,
        is_complimentary: !!t.is_complimentary,
        sort_order: i,
      }
      if (t.id) {
        const { data } = await supabase.from('rsvp_ticket_types').update(row).eq('id', t.id).select().single()
        if (data) results.push(data)
      } else {
        const { data } = await supabase
          .from('rsvp_ticket_types')
          .insert({ ...row, event_id: params.id })
          .select()
          .single()
        if (data) results.push(data)
      }
    }

    await logAudit(staff, 'update_ticket_types', 'rsvp_events', params.id, { count: results.length })
    return NextResponse.json({ ticketTypes: results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save ticket types' }, { status: 500 })
  }
}
