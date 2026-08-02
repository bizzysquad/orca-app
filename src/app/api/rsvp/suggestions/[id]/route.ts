import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    if (typeof body.is_approved !== 'boolean') {
      return NextResponse.json({ error: 'is_approved (boolean) is required' }, { status: 400 })
    }
    const supabase = getRsvpAdmin()
    const { data, error } = await supabase
      .from('rsvp_suggestions')
      .update({ is_approved: body.is_approved })
      .eq('id', params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit(staff, body.is_approved ? 'approve_suggestion' : 'unapprove_suggestion', 'rsvp_suggestions', params.id, {})
    return NextResponse.json({ suggestion: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update suggestion' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  const supabase = getRsvpAdmin()
  const { error } = await supabase.from('rsvp_suggestions').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(staff, 'delete_suggestion', 'rsvp_suggestions', params.id, {})
  return NextResponse.json({ success: true })
}
