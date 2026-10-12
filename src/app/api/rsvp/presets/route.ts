import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

// Only keep the fields each preset kind is allowed to carry
function sanitizeData(kind: string, data: any): Record<string, string> | null {
  if (kind === 'venue') {
    const out: Record<string, string> = {}
    for (const f of ['venue', 'address', 'city', 'state']) out[f] = String(data?.[f] || '').trim().slice(0, 200)
    return out.venue || out.address ? out : null
  }
  if (kind === 'schedule') {
    const start = String(data?.start_time || '')
    const end = String(data?.end_time || '')
    if (!TIME_RE.test(start)) return null
    if (end && !TIME_RE.test(end)) return null
    return { start_time: start, end_time: end }
  }
  return null
}

// GET /api/rsvp/presets: saved venues and date/time settings for the event editor
export async function GET(req: NextRequest) {
  const auth = await requireStaff(req, 'readonly_staff')
  if ('response' in auth) return auth.response

  const supabase = getRsvpAdmin()
  const { data, error } = await supabase.from('rsvp_presets').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presets: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const kind = String(body?.kind || '')
    const name = String(body?.name || '').trim().slice(0, 80)
    if (!name) return NextResponse.json({ error: 'Give it a name' }, { status: 400 })
    const data = sanitizeData(kind, body?.data)
    if (!data) {
      return NextResponse.json(
        { error: kind === 'schedule' ? 'Set a start time before saving' : 'Fill in the venue name or address before saving' },
        { status: 400 }
      )
    }

    const supabase = getRsvpAdmin()
    const { data: preset, error } = await supabase.from('rsvp_presets').insert({ kind, name, data }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit(staff, 'create_preset', 'rsvp_presets', preset.id, { kind, name })
    return NextResponse.json({ preset })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save' }, { status: 500 })
  }
}
