import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req, 'readonly_staff')
  if ('response' in auth) return auth.response

  const supabase = getRsvpAdmin()
  const { data, error } = await supabase.from('rsvp_email_templates').select('*').order('label')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data || [] })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const key = String(body?.key || '')
    if (!key) return NextResponse.json({ error: 'Template key required' }, { status: 400 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of ['subject', 'preview_text', 'heading', 'body_html', 'button_text', 'button_url_pattern', 'footer']) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    const supabase = getRsvpAdmin()
    const { data, error } = await supabase.from('rsvp_email_templates').update(updates).eq('key', key).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit(staff, 'update_email_template', 'rsvp_email_templates', key, {})
    return NextResponse.json({ template: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update template' }, { status: 500 })
  }
}
