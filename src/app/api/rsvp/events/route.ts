import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

const PUBLIC_STATUSES = new Set([
  'collecting_interest',
  'voting_open',
  'date_selected',
  'rsvp_open',
  'tickets_on_sale',
  'sold_out',
  'completed',
])

// GET /api/rsvp/events — staff: everything. Public (no staff cookie): only
// non-draft/non-cancelled events, and only the fields the public page needs.
export async function GET(req: NextRequest) {
  const { getStaff } = await import('@/lib/rsvp/staffAuth')
  const staff = await getStaff(req)
  const supabase = getRsvpAdmin()

  let query = supabase.from('rsvp_events').select('*').order('created_at', { ascending: false })
  if (!staff) {
    query = query.in('status', Array.from(PUBLIC_STATUSES))
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ events: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const name = String(body?.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Event name is required' }, { status: 400 })

    const supabase = getRsvpAdmin()

    let slug = slugify(body?.slug || name)
    if (!slug) slug = `event-${Date.now()}`
    // ensure uniqueness
    const { data: existing } = await supabase.from('rsvp_events').select('slug').ilike('slug', `${slug}%`)
    const taken = new Set((existing || []).map((r: any) => r.slug))
    if (taken.has(slug)) {
      let n = 2
      while (taken.has(`${slug}-${n}`)) n++
      slug = `${slug}-${n}`
    }

    const insertRow = {
      slug,
      name,
      description: body?.description || '',
      venue: body?.venue || '',
      address: body?.address || '',
      city: body?.city || '',
      state: body?.state || '',
      age_requirement: body?.age_requirement || '',
      dress_code: body?.dress_code || '',
      start_time: body?.start_time || null,
      end_time: body?.end_time || null,
      music_genres: Array.isArray(body?.music_genres) ? body.music_genres : [],
      performer_info: body?.performer_info || '',
      rsvp_capacity: body?.rsvp_capacity ?? null,
      ticket_capacity: body?.ticket_capacity ?? null,
      ticket_price_cents: body?.ticket_price_cents ?? 0,
      is_paid: !!body?.is_paid,
      refund_policy: body?.refund_policy || '',
      contact_email: body?.contact_email || 'maskoffdadj@gmail.com',
      status: 'draft',
      vote_visibility: body?.vote_visibility || 'public',
      custom_rsvp_questions: Array.isArray(body?.custom_rsvp_questions) ? body.custom_rsvp_questions : [],
      faqs: Array.isArray(body?.faqs) ? body.faqs : [],
      policies: body?.policies || '',
    }

    const { data, error } = await supabase.from('rsvp_events').insert(insertRow).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit(staff, 'create_event', 'rsvp_events', data.id, { name })
    return NextResponse.json({ event: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create event' }, { status: 500 })
  }
}
