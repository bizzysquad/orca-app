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
  const [{ data: tickets, error }, { data: orders }, { data: ticketTypes }, { data: emailLogs }] = await Promise.all([
    supabase.from('rsvp_tickets').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
    supabase.from('rsvp_orders').select('*').eq('event_id', eventId),
    supabase.from('rsvp_ticket_types').select('id, name').eq('event_id', eventId),
    supabase.from('rsvp_email_logs').select('recipient, status, template_key').eq('event_id', eventId),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ordersById: Record<string, any> = {}
  for (const o of orders || []) ordersById[o.id] = o
  const typeNameById: Record<string, string> = {}
  for (const t of ticketTypes || []) typeNameById[t.id] = t.name
  const latestEmailByRecipient: Record<string, string> = {}
  for (const log of emailLogs || []) latestEmailByRecipient[log.recipient] = log.status

  const guests = (tickets || []).map(t => {
    const order = ordersById[t.order_id]
    return {
      id: t.id,
      qr_token: t.qr_token,
      name: t.holder_name,
      email: t.holder_email,
      phone: order?.buyer_phone || '',
      rsvp_status: t.status,
      payment_status: order?.status || '',
      ticket_type: t.ticket_type_id ? typeNameById[t.ticket_type_id] || '' : 'General',
      ticket_quantity: 1,
      guest_names: t.guest_names,
      amount_paid_cents: order ? Math.round((order.amount_cents || 0) / Math.max(1, (tickets || []).filter(x => x.order_id === order.id).length)) : 0,
      stripe_status: order?.stripe_payment_intent_id ? 'charged' : order?.status === 'free' ? 'n/a' : '',
      ticket_status: t.status,
      checked_in_at: t.checked_in_at,
      checked_in_by: t.checked_in_by,
      email_status: latestEmailByRecipient[t.holder_email] || '',
      flagged_reason: t.flagged_reason,
      ticket_number: t.ticket_number,
      created_at: t.created_at,
    }
  })

  return NextResponse.json({ guests })
}
