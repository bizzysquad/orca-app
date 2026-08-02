import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'
import { ROLE_LABELS } from '@/lib/rsvp/session'

export const dynamic = 'force-dynamic'

async function attachOrderInfo(supabase: ReturnType<typeof getRsvpAdmin>, tickets: any[]) {
  if (!tickets.length) return tickets
  const orderIds = Array.from(new Set(tickets.map(t => t.order_id)))
  const { data: orders } = await supabase.from('rsvp_orders').select('id, buyer_name, buyer_email, buyer_phone, status').in('id', orderIds)
  const byId: Record<string, any> = {}
  for (const o of orders || []) byId[o.id] = o
  return tickets.map(t => ({ ...t, order: byId[t.order_id] || null }))
}

export async function GET(req: NextRequest) {
  const auth = await requireStaff(req, 'readonly_staff')
  if ('response' in auth) return auth.response

  const supabase = getRsvpAdmin()
  const token = req.nextUrl.searchParams.get('token')
  const eventId = req.nextUrl.searchParams.get('event_id')
  const q = req.nextUrl.searchParams.get('q')?.trim()

  if (token) {
    const { data: ticket, error } = await supabase.from('rsvp_tickets').select('*').eq('qr_token', token).single()
    if (error || !ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    const [{ data: event }, { data: ticketType }, { data: checkins }, [enriched]] = await Promise.all([
      supabase.from('rsvp_events').select('id, name, slug').eq('id', ticket.event_id).single(),
      ticket.ticket_type_id ? supabase.from('rsvp_ticket_types').select('name').eq('id', ticket.ticket_type_id).single() : Promise.resolve({ data: null }),
      supabase.from('rsvp_checkins').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: false }),
      attachOrderInfo(supabase, [ticket]),
    ])
    return NextResponse.json({ ticket: enriched, event, ticketTypeName: ticketType?.name || 'General Admission', history: checkins || [] })
  }

  if (eventId && q) {
    const like = `%${q}%`
    const { data: byTicket } = await supabase.from('rsvp_tickets').select('*').eq('event_id', eventId).or(`holder_name.ilike.${like},ticket_number.ilike.${like},holder_email.ilike.${like}`).limit(20)
    const results = await attachOrderInfo(supabase, byTicket || [])
    return NextResponse.json({ tickets: results })
  }

  return NextResponse.json({ error: 'Provide a token or event_id + q' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = String(body?.token || '')
    const action = String(body?.action || '')
    const note = String(body?.note || '').slice(0, 500)

    if (!token || !['check_in', 'reverse', 'reject', 'door_note'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const minRole = action === 'reverse' ? 'event_admin' : 'door_staff'
    const auth = await requireStaff(req, minRole as any)
    if ('response' in auth) return auth.response
    const { staff } = auth

    const supabase = getRsvpAdmin()
    const { data: ticket } = await supabase.from('rsvp_tickets').select('*').eq('qr_token', token).single()
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    if (action === 'check_in') {
      if (ticket.status === 'checked_in') {
        return NextResponse.json(
          { error: 'Already checked in', alreadyUsed: true, checkedInAt: ticket.checked_in_at },
          { status: 409 }
        )
      }
      if (ticket.status !== 'valid') {
        return NextResponse.json({ error: `Ticket is ${ticket.status} — cannot check in.`, status: ticket.status }, { status: 409 })
      }
      const now = new Date().toISOString()
      const staffLabel = `${staff.displayName} (${ROLE_LABELS[staff.role]})`
      const { data: updated } = await supabase
        .from('rsvp_tickets')
        .update({ status: 'checked_in', checked_in_at: now, checked_in_by: staffLabel, updated_at: now })
        .eq('id', ticket.id)
        .select()
        .single()
      await supabase.from('rsvp_checkins').insert({ ticket_id: ticket.id, staff_name: staff.displayName, staff_role: staff.role, action: 'check_in', note })
      await logAudit(staff, 'check_in_ticket', 'rsvp_tickets', ticket.id, { ticket_number: ticket.ticket_number })
      return NextResponse.json({ ticket: updated })
    }

    if (action === 'reverse') {
      if (ticket.status !== 'checked_in') {
        return NextResponse.json({ error: 'Ticket is not currently checked in.' }, { status: 400 })
      }
      const { data: updated } = await supabase
        .from('rsvp_tickets')
        .update({ status: 'valid', checked_in_at: null, checked_in_by: null, updated_at: new Date().toISOString() })
        .eq('id', ticket.id)
        .select()
        .single()
      await supabase.from('rsvp_checkins').insert({ ticket_id: ticket.id, staff_name: staff.displayName, staff_role: staff.role, action: 'reverse', note })
      await logAudit(staff, 'reverse_checkin', 'rsvp_tickets', ticket.id, { ticket_number: ticket.ticket_number })
      return NextResponse.json({ ticket: updated })
    }

    // reject / door_note — logged only, no status change
    await supabase.from('rsvp_checkins').insert({ ticket_id: ticket.id, staff_name: staff.displayName, staff_role: staff.role, action, note })
    await logAudit(staff, action, 'rsvp_tickets', ticket.id, { ticket_number: ticket.ticket_number, note })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Check-in action failed' }, { status: 500 })
  }
}
