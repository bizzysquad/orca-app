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
    const codes = Array.isArray(body?.promoCodes) ? body.promoCodes : []
    const supabase = getRsvpAdmin()

    const { data: existing } = await supabase.from('rsvp_promo_codes').select('id').eq('event_id', params.id)
    const keep = new Set(codes.filter((c: any) => c.id).map((c: any) => c.id))
    const toDelete = (existing || []).filter((r: any) => !keep.has(r.id)).map((r: any) => r.id)
    if (toDelete.length) await supabase.from('rsvp_promo_codes').delete().in('id', toDelete)

    const results = []
    for (const c of codes) {
      if (!c.code) continue
      const row = {
        code: String(c.code).toUpperCase().trim(),
        discount_type: c.discount_type === 'amount' ? 'amount' : 'percent',
        discount_value: Math.max(0, Number(c.discount_value) || 0),
        max_uses: c.max_uses ? Number(c.max_uses) : null,
        expires_at: c.expires_at || null,
      }
      if (c.id) {
        const { data, error } = await supabase.from('rsvp_promo_codes').update(row).eq('id', c.id).select().single()
        if (data) results.push(data)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      } else {
        const { data, error } = await supabase
          .from('rsvp_promo_codes')
          .insert({ ...row, event_id: params.id })
          .select()
          .single()
        if (data) results.push(data)
        if (error) return NextResponse.json({ error: `Code "${row.code}": ${error.message}` }, { status: 500 })
      }
    }

    await logAudit(staff, 'update_promo_codes', 'rsvp_events', params.id, { count: results.length })
    return NextResponse.json({ promoCodes: results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save promo codes' }, { status: 500 })
  }
}
