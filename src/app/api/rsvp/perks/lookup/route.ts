import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { requireStaff } from '@/lib/rsvp/staffAuth'
import { PERK_TICKET_FIELDS, Perk, PerkTicket, evaluatePerk, loadPerkContext, partySize } from '@/lib/rsvp/perks'

export const dynamic = 'force-dynamic'

// POST { code, event_id }: what the bartender sees after scanning.
// code = a ticket QR token, a separate perk code token, or a typed ticket number.
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req, 'door_staff')
  if ('response' in auth) return auth.response

  try {
    const body = await req.json()
    const code = String(body?.code || '').trim()
    const eventId = String(body?.event_id || '')
    if (!code || !eventId) return NextResponse.json({ error: 'Scan a code and pick the event' }, { status: 400 })

    const supabase = getRsvpAdmin()
    let ticket: PerkTicket | null = null
    let onlyPerkId: string | null = null

    // 1) separate perk code
    const { data: grant } = await supabase.from('rsvp_perk_grants').select('perk_id, ticket_id').eq('code_token', code).maybeSingle()
    if (grant) {
      onlyPerkId = grant.perk_id
      const { data } = await supabase.from('rsvp_tickets').select(PERK_TICKET_FIELDS).eq('id', grant.ticket_id).single()
      ticket = data as PerkTicket | null
    } else {
      // 2) ticket QR token, 3) typed ticket number
      const byToken = await supabase.from('rsvp_tickets').select(PERK_TICKET_FIELDS).eq('qr_token', code).maybeSingle()
      ticket = (byToken.data as PerkTicket | null) || null
      if (!ticket) {
        const byNumber = await supabase.from('rsvp_tickets').select(PERK_TICKET_FIELDS).eq('event_id', eventId).eq('ticket_number', code.toUpperCase()).maybeSingle()
        ticket = (byNumber.data as PerkTicket | null) || null
      }
    }
    if (!ticket) return NextResponse.json({ error: 'Code not recognized. Check it or type the ticket number.' }, { status: 404 })

    if (ticket.event_id !== eventId) {
      const { data: other } = await supabase.from('rsvp_events').select('name').eq('id', ticket.event_id).single()
      return NextResponse.json({ error: `This code is for a different event${other?.name ? `: ${other.name}` : ''}` }, { status: 409 })
    }

    let perkQuery = supabase.from('rsvp_perks').select('*').eq('event_id', eventId).order('sort_order')
    perkQuery = onlyPerkId ? perkQuery.eq('id', onlyPerkId) : perkQuery.eq('delivery', 'ticket')
    const { data: perks } = await perkQuery
    const ctx = await loadPerkContext(eventId, (perks || []).map(p => p.id), ticket.id)

    return NextResponse.json({
      guest: {
        ticket_id: ticket.id,
        name: ticket.holder_name,
        ticket_number: ticket.ticket_number,
        status: ticket.status,
        party_size: partySize(ticket),
      },
      perks: ((perks || []) as Perk[]).map(p => evaluatePerk(p, ticket!, ctx)),
      scannedPerkCode: !!onlyPerkId,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lookup failed' }, { status: 500 })
  }
}
