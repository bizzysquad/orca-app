import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'
import { sanitizePerkInput } from '@/lib/rsvp/perkInput'

export const dynamic = 'force-dynamic'

// PATCH: edit a perk, including pause/resume (is_paused) and cap changes
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const input = sanitizePerkInput(await req.json(), true)
    if ('error' in input) return NextResponse.json({ error: input.error }, { status: 400 })
    if (!Object.keys(input.values).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const supabase = getRsvpAdmin()
    const { data, error } = await supabase.from('rsvp_perks').update(input.values).eq('id', params.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const action = 'is_paused' in input.values ? (input.values.is_paused ? 'pause_perk' : 'resume_perk') : 'update_perk'
    await logAudit(staff, action, 'rsvp_perks', params.id, { fields: Object.keys(input.values) })
    return NextResponse.json({ perk: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update perk' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  const supabase = getRsvpAdmin()
  const { error } = await supabase.from('rsvp_perks').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(staff, 'delete_perk', 'rsvp_perks', params.id, {})
  return NextResponse.json({ success: true })
}
