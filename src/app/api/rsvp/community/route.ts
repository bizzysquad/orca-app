import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { VISITOR_COOKIE, isMissingColumnError, trendingScore } from '@/lib/rsvp/community'

export const dynamic = 'force-dynamic'

const PUBLIC_STATUSES = ['collecting_interest', 'voting_open', 'date_selected', 'rsvp_open', 'tickets_on_sale', 'sold_out', 'completed']
const POLL_STATUSES = new Set(['collecting_interest', 'voting_open'])
const LIVE_TICKET_STATUSES = ['valid', 'checked_in']

// GET /api/rsvp/community: everything the public /RSVP homepage needs in one
// round trip. Events with momentum, the idea board, open polls, and stats.
// Never returns PII (no names/emails of voters, submitters, or ticket holders).
export async function GET(req: NextRequest) {
  const supabase = getRsvpAdmin()
  const visitor = req.cookies.get(VISITOR_COOKIE)?.value || null

  const { data: events, error: eventsError } = await supabase
    .from('rsvp_events')
    .select('*')
    .in('status', PUBLIC_STATUSES)
    .order('start_time', { ascending: true, nullsFirst: false })
  if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 })

  const eventIds = (events || []).map(e => e.id)

  const [votesRes, ticketsRes, questionsRes] = eventIds.length
    ? await Promise.all([
        supabase.from('rsvp_votes').select('event_id, voter_email, guest_count, poll_option_id').in('event_id', eventIds),
        supabase.from('rsvp_tickets').select('event_id, holder_email, guest_names').in('event_id', eventIds).in('status', LIVE_TICKET_STATUSES),
        supabase.from('rsvp_poll_questions').select('id, event_id, kind, question, sort_order, rsvp_poll_options(id, label, sort_order)').in('event_id', eventIds).order('sort_order'),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  // Supporters = unique people who voted or hold a ticket, plus the guests they're bringing.
  const supportersByEvent: Record<string, { people: Map<string, number> }> = {}
  const optionCounts: Record<string, number> = {}
  for (const v of (votesRes.data || []) as any[]) {
    const bucket = (supportersByEvent[v.event_id] ||= { people: new Map() })
    const key = String(v.voter_email || '').toLowerCase()
    bucket.people.set(key, Math.max(bucket.people.get(key) || 0, v.guest_count || 0))
    if (v.poll_option_id) optionCounts[v.poll_option_id] = (optionCounts[v.poll_option_id] || 0) + 1
  }
  ;((ticketsRes.data || []) as any[]).forEach((t, idx) => {
    const bucket = (supportersByEvent[t.event_id] ||= { people: new Map() })
    const key = String(t.holder_email || `ticket:${idx}`).toLowerCase()
    bucket.people.set(key, Math.max(bucket.people.get(key) || 0, (t.guest_names || []).length))
  })
  const supporterCount = (eventId: string) => {
    const b = supportersByEvent[eventId]
    if (!b) return 0
    let total = 0
    b.people.forEach(guests => { total += 1 + guests })
    return total
  }

  const publicEvents = (events || []).map(e => {
    const hidden = e.vote_visibility === 'admin_only'
    return {
      id: e.id,
      slug: e.slug,
      name: e.name,
      flyer_url: e.flyer_url,
      description: (e.description || '').slice(0, 220),
      city: e.city,
      state: e.state,
      venue: e.venue,
      status: e.status,
      start_time: e.start_time,
      music_genres: e.music_genres || [],
      is_paid: e.is_paid,
      goal: e.rsvp_goal ?? e.rsvp_capacity ?? e.ticket_capacity ?? null,
      supporters: hidden ? null : supporterCount(e.id),
    }
  })

  const eventById = new Map((events || []).map(e => [e.id, e]))
  const polls = ((questionsRes.data || []) as any[])
    .filter(q => POLL_STATUSES.has(eventById.get(q.event_id)?.status))
    .map(q => {
      const ev = eventById.get(q.event_id)!
      const showTallies = ev.vote_visibility === 'public'
      const options = (q.rsvp_poll_options || [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((o: any) => ({ id: o.id, label: o.label, votes: showTallies ? optionCounts[o.id] || 0 : null }))
      return {
        id: q.id,
        kind: q.kind,
        question: q.question,
        event: { slug: ev.slug, name: ev.name },
        options,
        totalVotes: showTallies ? options.reduce((n: number, o: any) => n + (o.votes || 0), 0) : null,
      }
    })
    .filter(p => p.options.length > 0)

  // Idea board: approved suggestions only. Falls back to pre-migration columns.
  let ideaRows: any[] = []
  let upvotesEnabled = true
  const fullSelect = 'id, title, category, event_idea, preferred_location, preferred_music, artist_suggestion, theme_suggestion, upvote_count, created_at'
  const ideasRes = await supabase.from('rsvp_suggestions').select(fullSelect).eq('is_approved', true).order('created_at', { ascending: false }).limit(150)
  if (isMissingColumnError(ideasRes.error)) {
    upvotesEnabled = false
    const legacy = await supabase
      .from('rsvp_suggestions')
      .select('id, event_idea, preferred_location, preferred_music, artist_suggestion, theme_suggestion, created_at')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(150)
    ideaRows = legacy.data || []
  } else if (ideasRes.error) {
    return NextResponse.json({ error: ideasRes.error.message }, { status: 500 })
  } else {
    ideaRows = ideasRes.data || []
  }

  let votedIds = new Set<string>()
  if (upvotesEnabled && visitor && ideaRows.length) {
    const { data: mine } = await supabase
      .from('rsvp_idea_upvotes')
      .select('suggestion_id')
      .eq('voter_key', visitor)
      .in('suggestion_id', ideaRows.map(i => i.id))
    votedIds = new Set((mine || []).map((r: any) => r.suggestion_id))
  }

  const ideas = ideaRows.map(i => ({
    id: i.id,
    title: i.title || '',
    category: i.category || 'other',
    description: i.event_idea || '',
    location: i.preferred_location || '',
    music: i.preferred_music || '',
    artist: i.artist_suggestion || '',
    theme: i.theme_suggestion || '',
    upvotes: i.upvote_count || 0,
    voted: votedIds.has(i.id),
    created_at: i.created_at,
    trending: trendingScore(i.upvote_count || 0, i.created_at),
  }))

  const stats = {
    ideas: ideas.length,
    ideaVotes: ideas.reduce((n, i) => n + i.upvotes, 0),
    supporters: publicEvents.reduce((n, e) => n + (e.supporters || 0), 0),
    eventsInMotion: publicEvents.filter(e => e.status !== 'completed').length,
  }

  return NextResponse.json({ events: publicEvents, ideas, polls, stats, upvotesEnabled })
}
