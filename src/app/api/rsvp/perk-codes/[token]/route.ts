import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { PERK_TICKET_FIELDS, Perk, PerkTicket, evaluatePerk, loadPerkContext } from '@/lib/rsvp/perks'

export const dynamic = 'force-dynamic'

// Public: the code_token is the secret. Returns what the guest needs to show
// their separate perk pass, nothing about other guests.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = getRsvpAdmin()
  const { data: grant } = await supabase.from('rsvp_perk_grants').select('perk_id, ticket_id').eq('code_token', params.token).maybeSingle()
  if (!grant) return NextResponse.json({ error: 'Perk not found' }, { status: 404 })

  const [{ data: perk }, { data: ticket }] = await Promise.all([
    supabase.from('rsvp_perks').select('*').eq('id', grant.perk_id).single(),
    supabase.from('rsvp_tickets').select(PERK_TICKET_FIELDS).eq('id', grant.ticket_id).single(),
  ])
  if (!perk || !ticket) return NextResponse.json({ error: 'Perk not found' }, { status: 404 })

  const [{ data: event }, ctx] = await Promise.all([
    supabase.from('rsvp_events').select('name, venue, city, state, start_time').eq('id', perk.event_id).single(),
    loadPerkContext(perk.event_id, [perk.id], ticket.id),
  ])

  return NextResponse.json({
    holder_name: ticket.holder_name,
    event,
    status: evaluatePerk(perk as Perk, ticket as PerkTicket, ctx),
  })
}
