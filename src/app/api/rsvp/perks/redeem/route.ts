import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { requireStaff } from '@/lib/rsvp/staffAuth'
import { PERK_TICKET_FIELDS, Perk, PerkTicket, evaluatePerk, loadPerkContext } from '@/lib/rsvp/perks'

export const dynamic = 'force-dynamic'

// POST { perk_id, ticket_id }: redeem one use. Re-checks every rule server
// side so a stale scanner screen can't over-redeem.
export async function POST(req: NextRequest) {
  const auth = await requireStaff(req, 'door_staff')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const perkId = String(body?.perk_id || '')
    const ticketId = String(body?.ticket_id || '')
    const supabase = getRsvpAdmin()

    const [{ data: perk }, { data: ticket }] = await Promise.all([
      supabase.from('rsvp_perks').select('*').eq('id', perkId).single(),
      supabase.from('rsvp_tickets').select(PERK_TICKET_FIELDS).eq('id', ticketId).single(),
    ])
    if (!perk || !ticket || perk.event_id !== ticket.event_id) {
      return NextResponse.json({ error: 'Perk or guest not found' }, { status: 404 })
    }

    const ctx = await loadPerkContext(perk.event_id, [perk.id], ticket.id)
    const status = evaluatePerk(perk as Perk, ticket as PerkTicket, ctx)
    if (!status.ok) return NextResponse.json({ error: status.reason, status }, { status: 409 })

    const { error } = await supabase.from('rsvp_perk_redemptions').insert({
      perk_id: perk.id,
      ticket_id: ticket.id,
      event_id: perk.event_id,
      staff_name: staff.displayName,
      staff_role: staff.role,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    ctx.mine[perk.id] = (ctx.mine[perk.id] || 0) + 1
    ctx.totals[perk.id] = (ctx.totals[perk.id] || 0) + 1
    return NextResponse.json({ success: true, status: evaluatePerk(perk as Perk, ticket as PerkTicket, ctx) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Redeem failed' }, { status: 500 })
  }
}
