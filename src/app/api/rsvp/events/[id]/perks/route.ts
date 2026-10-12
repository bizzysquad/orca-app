import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'
import { grantSeparatePerks } from '@/lib/rsvp/perks'
import { sanitizePerkInput } from '@/lib/rsvp/perkInput'

export const dynamic = 'force-dynamic'

// GET: the event's perks plus analytics (issued, redeemed, timeline, by staff, voided guests)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'readonly_staff')
  if ('response' in auth) return auth.response

  const supabase = getRsvpAdmin()
  const { data: perks, error } = await supabase.from('rsvp_perks').select('*').eq('event_id', params.id).order('sort_order').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const perkIds = (perks || []).map(p => p.id)

  const [{ data: tickets }, { data: redemptions }, { data: grants }] = await Promise.all([
    supabase.from('rsvp_tickets').select('id, status, holder_name, ticket_number').eq('event_id', params.id).in('status', ['valid', 'checked_in']),
    perkIds.length
      ? supabase.from('rsvp_perk_redemptions').select('perk_id, ticket_id, staff_name, created_at').in('perk_id', perkIds).order('created_at').limit(10000)
      : Promise.resolve({ data: [] as any[] }),
    perkIds.length
      ? supabase.from('rsvp_perk_grants').select('perk_id, ticket_id, voided').in('perk_id', perkIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const live = tickets || []
  const checkedIn = live.filter(t => t.status === 'checked_in').length
  const ticketById = new Map(live.map(t => [t.id, t]))

  const result = (perks || []).map(p => {
    const myGrants = (grants || []).filter((g: any) => g.perk_id === p.id)
    const voidedIds = myGrants.filter((g: any) => g.voided).map((g: any) => g.ticket_id)
    let issued: number
    if (p.delivery === 'separate') issued = myGrants.filter((g: any) => !g.voided).length
    else if (p.eligibility === 'checked_in') issued = checkedIn
    else if (p.eligibility === 'first_n' && p.first_n != null) issued = Math.min(live.length, p.first_n)
    else issued = live.length
    if (p.delivery === 'ticket') issued = Math.max(0, issued - voidedIds.length)

    const mine = (redemptions || []).filter((r: any) => r.perk_id === p.id)
    const byStaff: Record<string, number> = {}
    for (const r of mine) byStaff[r.staff_name || 'Unknown'] = (byStaff[r.staff_name || 'Unknown'] || 0) + 1

    return {
      ...p,
      stats: {
        issued,
        redemptions: mine.length,
        guestsRedeemed: new Set(mine.map((r: any) => r.ticket_id)).size,
        timeline: mine.map((r: any) => r.created_at),
        byStaff: Object.entries(byStaff).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        voided: voidedIds.map((id: string) => {
          const t = ticketById.get(id)
          return { ticket_id: id, holder_name: t?.holder_name || 'Guest', ticket_number: t?.ticket_number || '' }
        }),
      },
    }
  })

  return NextResponse.json({ perks: result })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const input = sanitizePerkInput(await req.json())
    if ('error' in input) return NextResponse.json({ error: input.error }, { status: 400 })

    const supabase = getRsvpAdmin()
    const { count } = await supabase.from('rsvp_perks').select('id', { count: 'exact', head: true }).eq('event_id', params.id)
    const { data, error } = await supabase
      .from('rsvp_perks')
      .insert({ ...input.values, event_id: params.id, sort_order: count || 0 })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await logAudit(staff, 'create_perk', 'rsvp_perks', data.id, { name: data.name })

    // Separate-code perks go out to everyone who already RSVP'd
    const sent = data.delivery === 'separate' ? (await grantSeparatePerks(params.id, { perkId: data.id })).sent : 0
    return NextResponse.json({ perk: data, sent })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create perk' }, { status: 500 })
  }
}
