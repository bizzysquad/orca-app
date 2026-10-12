import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

// POST { query, voided }: void (or restore) one guest's perk.
// query = ticket number, guest email, or ticket_id.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const query = String(body?.query || '').trim()
    const voided = body?.voided !== false
    if (!query) return NextResponse.json({ error: 'Enter a ticket number or email' }, { status: 400 })

    const supabase = getRsvpAdmin()
    const { data: perk } = await supabase.from('rsvp_perks').select('id, event_id, name').eq('id', params.id).single()
    if (!perk) return NextResponse.json({ error: 'Perk not found' }, { status: 404 })

    const isUuid = /^[0-9a-f-]{36}$/i.test(query)
    let ticketQuery = supabase.from('rsvp_tickets').select('id, holder_name, ticket_number').eq('event_id', perk.event_id)
    ticketQuery = isUuid
      ? ticketQuery.eq('id', query)
      : query.includes('@')
      ? ticketQuery.eq('holder_email', query.toLowerCase())
      : ticketQuery.eq('ticket_number', query.toUpperCase())
    const { data: tickets } = await ticketQuery
    if (!tickets?.length) return NextResponse.json({ error: 'No guest with that ticket number or email for this event' }, { status: 404 })

    for (const t of tickets) {
      await supabase.from('rsvp_perk_grants').upsert({ perk_id: perk.id, ticket_id: t.id, voided }, { onConflict: 'perk_id,ticket_id' })
    }

    await logAudit(staff, voided ? 'void_perk' : 'restore_perk', 'rsvp_perks', perk.id, { tickets: tickets.map(t => t.ticket_number) })
    return NextResponse.json({ success: true, tickets })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update guest' }, { status: 500 })
  }
}
