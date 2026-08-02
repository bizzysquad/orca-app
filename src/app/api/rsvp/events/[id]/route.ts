import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

const EDITABLE_FIELDS = [
  'name',
  'flyer_url',
  'description',
  'venue',
  'address',
  'city',
  'state',
  'age_requirement',
  'dress_code',
  'start_time',
  'end_time',
  'music_genres',
  'performer_info',
  'rsvp_capacity',
  'ticket_capacity',
  'ticket_price_cents',
  'is_paid',
  'refund_policy',
  'contact_email',
  'status',
  'vote_visibility',
  'custom_rsvp_questions',
  'faqs',
  'policies',
  'slug',
] as const

const VALID_STATUSES = [
  'draft',
  'collecting_interest',
  'voting_open',
  'date_selected',
  'rsvp_open',
  'tickets_on_sale',
  'sold_out',
  'completed',
  'cancelled',
]

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'readonly_staff')
  if ('response' in auth) return auth.response

  const supabase = getRsvpAdmin()
  const [{ data: event, error }, { data: dates }, { data: pollQuestions }, { data: ticketTypes }, { data: promoCodes }] =
    await Promise.all([
      supabase.from('rsvp_events').select('*').eq('id', params.id).single(),
      supabase.from('rsvp_proposed_dates').select('*').eq('event_id', params.id).order('sort_order'),
      supabase.from('rsvp_poll_questions').select('*, rsvp_poll_options(*)').eq('event_id', params.id).order('sort_order'),
      supabase.from('rsvp_ticket_types').select('*').eq('event_id', params.id).order('sort_order'),
      supabase.from('rsvp_promo_codes').select('*').eq('event_id', params.id),
    ])

  if (error || !event) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })

  return NextResponse.json({
    event,
    proposedDates: dates || [],
    pollQuestions: pollQuestions || [],
    ticketTypes: ticketTypes || [],
    promoCodes: promoCodes || [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()

    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field]
    }
    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const supabase = getRsvpAdmin()
    const { data, error } = await supabase.from('rsvp_events').update(updates).eq('id', params.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const action = body.status !== undefined ? `status_change:${body.status}` : 'update_event'
    await logAudit(staff, action, 'rsvp_events', params.id, { fields: Object.keys(updates) })

    return NextResponse.json({ event: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'owner')
  if ('response' in auth) return auth.response
  const { staff } = auth

  const supabase = getRsvpAdmin()
  const { error } = await supabase.from('rsvp_events').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAudit(staff, 'delete_event', 'rsvp_events', params.id, {})
  return NextResponse.json({ success: true })
}
