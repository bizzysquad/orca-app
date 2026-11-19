import { NextRequest, NextResponse } from 'next/server'
import { requireCrAdmin } from '@/lib/crooked/auth'
import { getCrAdmin } from '@/lib/crooked/db'
import { APPLICATION_STATUSES } from '@/lib/crooked/team'

export const dynamic = 'force-dynamic'

// Everything except ip_hash / user_agent, which are only for rate limiting.
const COLUMNS =
  'id, status, full_name, email, social_handle, location, skills, skills_other, about, contribution, portfolio_url, unpaid_openness, acknowledged, admin_notes, created_at, updated_at'

export async function GET(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  const { data, error } = await getCrAdmin().from('cr_applications').select(COLUMNS).order('created_at', { ascending: false }).limit(1000)
  if (error) return NextResponse.json({ applications: [], error: error.message, dbReady: false })
  return NextResponse.json({ applications: data, dbReady: true })
}

export async function PATCH(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  try {
    const body = await req.json()
    const id = String(body?.id || '')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.admin_notes === 'string') patch.admin_notes = body.admin_notes.slice(0, 5000)
    if (body.status !== undefined) {
      if (!(APPLICATION_STATUSES as readonly string[]).includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      patch.status = body.status
    }
    const { data, error } = await getCrAdmin().from('cr_applications').update(patch).eq('id', id).select(COLUMNS).single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ application: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await getCrAdmin().from('cr_applications').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
