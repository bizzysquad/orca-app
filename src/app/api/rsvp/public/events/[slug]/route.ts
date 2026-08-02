import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { getStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

const PUBLIC_STATUSES = new Set([
  'collecting_interest', 'voting_open', 'date_selected', 'rsvp_open', 'tickets_on_sale', 'sold_out', 'completed',
])

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = getRsvpAdmin()
  const staff = await getStaff(req) // staff can preview drafts/cancelled events

  const { data: event, error } = await supabase.from('rsvp_events').select('*').eq('slug', params.slug).single()
  if (error || !event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (!staff && !PUBLIC_STATUSES.has(event.status)) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const [{ data: dates }, { data: questions }, { data: options }, { data: ticketTypes }] = await Promise.all([
    supabase.from('rsvp_proposed_dates').select('*').eq('event_id', event.id).order('sort_order'),
    supabase.from('rsvp_poll_questions').select('*').eq('event_id', event.id).order('sort_order'),
    supabase
      .from('rsvp_poll_options')
      .select('*, rsvp_poll_questions!inner(event_id)')
      .eq('rsvp_poll_questions.event_id', event.id),
    supabase.from('rsvp_ticket_types').select('*').eq('event_id', event.id).order('sort_order'),
  ])

  const showTallies =
    !!staff ||
    event.vote_visibility === 'public' ||
    (event.vote_visibility === 'hidden_until_voted' && req.nextUrl.searchParams.get('revealed') === '1')

  let dateResults: any[] = dates || []
  let questionResults: any[] = []

  if (showTallies) {
    const { data: dateVotes } = await supabase.from('rsvp_votes').select('date_id, guest_count').eq('event_id', event.id).not('date_id', 'is', null)
    const { data: optionVotes } = await supabase
      .from('rsvp_votes')
      .select('poll_option_id')
      .eq('event_id', event.id)
      .not('poll_option_id', 'is', null)

    const dateCounts: Record<string, { votes: number; guests: number }> = {}
    for (const v of dateVotes || []) {
      const d = (dateCounts[v.date_id] ||= { votes: 0, guests: 0 })
      d.votes++
      d.guests += v.guest_count || 0
    }
    dateResults = (dates || []).map(d => ({ ...d, voteCount: dateCounts[d.id]?.votes || 0, guestCount: dateCounts[d.id]?.guests || 0 }))

    const optionCounts: Record<string, number> = {}
    for (const v of optionVotes || []) optionCounts[v.poll_option_id] = (optionCounts[v.poll_option_id] || 0) + 1

    questionResults = (questions || []).map(q => {
      const opts = (options || [])
        .filter((o: any) => o.poll_question_id === q.id)
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((o: any) => ({ id: o.id, label: o.label, voteCount: optionCounts[o.id] || 0 }))
      return { ...q, options: opts }
    })
  } else {
    dateResults = (dates || []).map(d => ({ id: d.id, label: d.label, date: d.date, sort_order: d.sort_order }))
    questionResults = (questions || []).map(q => ({
      ...q,
      options: (options || [])
        .filter((o: any) => o.poll_question_id === q.id)
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((o: any) => ({ id: o.id, label: o.label })),
    }))
  }

  const totalInterested = showTallies
    ? (await supabase.from('rsvp_votes').select('voter_email', { count: 'exact', head: true }).eq('event_id', event.id)).count || 0
    : null

  const publicTicketTypes = (ticketTypes || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    price_cents: t.price_cents,
    sales_start: t.sales_start,
    sales_end: t.sales_end,
    remaining: t.quantity_limit != null ? Math.max(0, t.quantity_limit - t.sold_count) : null,
    sold_out: t.quantity_limit != null ? t.sold_count >= t.quantity_limit : false,
  }))

  return NextResponse.json({
    event: {
      id: event.id,
      slug: event.slug,
      name: event.name,
      flyer_url: event.flyer_url,
      description: event.description,
      venue: event.venue,
      address: event.address,
      city: event.city,
      state: event.state,
      age_requirement: event.age_requirement,
      dress_code: event.dress_code,
      start_time: event.start_time,
      end_time: event.end_time,
      music_genres: event.music_genres,
      performer_info: event.performer_info,
      rsvp_capacity: event.rsvp_capacity,
      ticket_capacity: event.ticket_capacity,
      ticket_price_cents: event.ticket_price_cents,
      is_paid: event.is_paid,
      refund_policy: event.refund_policy,
      contact_email: event.contact_email,
      status: event.status,
      vote_visibility: event.vote_visibility,
      custom_rsvp_questions: event.custom_rsvp_questions,
      faqs: event.faqs,
      policies: event.policies,
    },
    proposedDates: dateResults,
    pollQuestions: questionResults,
    ticketTypes: publicTicketTypes,
    showTallies,
    totalInterested,
    isPreview: !!staff,
  })
}
