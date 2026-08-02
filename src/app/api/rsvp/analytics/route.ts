import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { requireStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req, 'readonly_staff')
  if ('response' in auth) return auth.response

  const eventId = req.nextUrl.searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id is required' }, { status: 400 })

  const supabase = getRsvpAdmin()

  const [
    { data: event },
    { count: pageVisits },
    { data: votes },
    { data: dates },
    { count: suggestionCount },
    { data: orders },
    { data: tickets },
    { data: ticketTypes },
    { count: waitlistCount },
    { data: emailLogs },
    { data: pollQuestions },
    { data: pollOptions },
  ] = await Promise.all([
    supabase.from('rsvp_events').select('*').eq('id', eventId).single(),
    supabase.from('rsvp_page_visits').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('rsvp_votes').select('voter_email, date_id, poll_option_id, poll_question_id, guest_count').eq('event_id', eventId),
    supabase.from('rsvp_proposed_dates').select('id, label').eq('event_id', eventId),
    supabase.from('rsvp_suggestions').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('rsvp_orders').select('status, amount_cents').eq('event_id', eventId),
    supabase.from('rsvp_tickets').select('status, ticket_type_id, checked_in_at').eq('event_id', eventId),
    supabase.from('rsvp_ticket_types').select('id, name, price_cents, quantity_limit, sold_count').eq('event_id', eventId),
    supabase.from('rsvp_waitlist').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'waiting'),
    supabase.from('rsvp_email_logs').select('status').eq('event_id', eventId),
    supabase.from('rsvp_poll_questions').select('id, kind, question').eq('event_id', eventId),
    supabase.from('rsvp_poll_options').select('id, poll_question_id, label'),
  ])

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const uniqueVoters = new Set((votes || []).map(v => v.voter_email)).size
  const votesByDate: Record<string, { label: string; votes: number; guests: number }> = {}
  for (const d of dates || []) votesByDate[d.id] = { label: d.label, votes: 0, guests: 0 }
  for (const v of votes || []) {
    if (v.date_id && votesByDate[v.date_id]) {
      votesByDate[v.date_id].votes++
      votesByDate[v.date_id].guests += v.guest_count || 0
    }
  }
  const totalEstimatedAttendance = (votes || []).filter(v => v.date_id).reduce((sum, v) => sum + 1 + (v.guest_count || 0), 0)

  const questionIds = new Set((pollQuestions || []).map(q => q.id))
  const optionsByQuestion: Record<string, { id: string; label: string }[]> = {}
  for (const o of pollOptions || []) {
    if (!questionIds.has(o.poll_question_id)) continue
    ;(optionsByQuestion[o.poll_question_id] ||= []).push({ id: o.id, label: o.label })
  }
  const optionVoteCounts: Record<string, number> = {}
  for (const v of votes || []) {
    if (v.poll_option_id) optionVoteCounts[v.poll_option_id] = (optionVoteCounts[v.poll_option_id] || 0) + 1
  }
  const votesByPoll = (pollQuestions || []).map(q => ({
    kind: q.kind,
    question: q.question,
    options: (optionsByQuestion[q.id] || []).map(o => ({ label: o.label, votes: optionVoteCounts[o.id] || 0 })),
  }))

  const paidOrders = (orders || []).filter(o => o.status === 'paid')
  const refundedOrders = (orders || []).filter(o => o.status === 'refunded')
  const grossRevenueCents = paidOrders.reduce((sum, o) => sum + (o.amount_cents || 0), 0)
  const refundTotalCents = refundedOrders.reduce((sum, o) => sum + (o.amount_cents || 0), 0)
  const estimatedStripeFeesCents = Math.round(grossRevenueCents * 0.029 + paidOrders.length * 30)
  const netRevenueCents = grossRevenueCents - refundTotalCents - estimatedStripeFeesCents

  const ticketsByType = (ticketTypes || []).map(t => ({
    name: t.name,
    sold: t.sold_count,
    remaining: t.quantity_limit != null ? Math.max(0, t.quantity_limit - t.sold_count) : null,
  }))

  const totalRsvps = (tickets || []).filter(t => ['valid', 'checked_in'].includes(t.status)).length
  const totalCheckedIn = (tickets || []).filter(t => t.status === 'checked_in').length
  const noShowCount = (tickets || []).filter(t => t.status === 'valid').length
  const attendancePct = totalRsvps > 0 ? Math.round((100 * totalCheckedIn) / totalRsvps) : 0

  const emailStats: Record<string, number> = {}
  for (const log of emailLogs || []) emailStats[log.status] = (emailStats[log.status] || 0) + 1

  const remainingCapacity = event.ticket_capacity != null ? Math.max(0, event.ticket_capacity - totalRsvps) : null

  return NextResponse.json({
    pageVisits: pageVisits || 0,
    totalVoters: uniqueVoters,
    votesByDate: Object.values(votesByDate),
    votesByPoll,
    totalEstimatedAttendance,
    totalSuggestions: suggestionCount || 0,
    totalRsvps,
    totalTicketsSold: (tickets || []).filter(t => ['valid', 'checked_in', 'refunded'].includes(t.status)).length,
    grossRevenueCents,
    estimatedStripeFeesCents,
    refundTotalCents,
    netRevenueCents,
    ticketsByType,
    remainingCapacity,
    waitlistSize: waitlistCount || 0,
    totalCheckedIn,
    noShowCount,
    attendancePct,
    emailStats,
  })
}
