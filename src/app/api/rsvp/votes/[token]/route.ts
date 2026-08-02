import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = getRsvpAdmin()
  const { data: vote, error } = await supabase.from('rsvp_votes').select('*').eq('edit_token', params.token).single()
  if (error || !vote) return NextResponse.json({ error: 'Vote not found' }, { status: 404 })

  const { data: event } = await supabase.from('rsvp_events').select('*').eq('id', vote.event_id).single()
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  let options: any[] = []
  if (vote.date_id) {
    const { data } = await supabase.from('rsvp_proposed_dates').select('*').eq('event_id', event.id).order('sort_order')
    options = data || []
  } else if (vote.poll_question_id) {
    const { data } = await supabase.from('rsvp_poll_options').select('*').eq('poll_question_id', vote.poll_question_id).order('sort_order')
    options = data || []
  }

  return NextResponse.json({ vote, event: { id: event.id, name: event.name, slug: event.slug, status: event.status }, options })
}

export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const supabase = getRsvpAdmin()
    const { data: vote } = await supabase.from('rsvp_votes').select('*').eq('edit_token', params.token).single()
    if (!vote) return NextResponse.json({ error: 'Vote not found' }, { status: 404 })

    const { data: event } = await supabase.from('rsvp_events').select('status').eq('id', vote.event_id).single()
    if (!event || !['collecting_interest', 'voting_open'].includes(event.status)) {
      return NextResponse.json({ error: 'Voting has closed for this event' }, { status: 400 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (vote.date_id && body.date_id) updates.date_id = body.date_id
    if (vote.poll_option_id && body.poll_option_id) updates.poll_option_id = body.poll_option_id
    if (body.guest_count !== undefined) updates.guest_count = Math.max(0, Math.min(50, Number(body.guest_count) || 0))
    if (body.wants_updates !== undefined) updates.wants_updates = !!body.wants_updates
    if (body.voter_name) updates.voter_name = String(body.voter_name).trim()

    const { data, error } = await supabase.from('rsvp_votes').update(updates).eq('edit_token', params.token).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ vote: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update vote' }, { status: 500 })
  }
}
