import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { requireStaff } from '@/lib/rsvp/staffAuth'
import { csvResponse, toCsv } from '@/lib/rsvp/csv'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  const auth = await requireStaff(req, 'readonly_staff')
  if ('response' in auth) return auth.response

  const eventId = req.nextUrl.searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id is required' }, { status: 400 })

  const supabase = getRsvpAdmin()
  const { data: event } = await supabase.from('rsvp_events').select('name, slug').eq('id', eventId).single()
  const slug = event?.slug || eventId

  switch (params.type) {
    case 'guest-list':
    case 'door-list': {
      const { data: tickets } = await supabase.from('rsvp_tickets').select('*').eq('event_id', eventId).order('holder_name')
      const { data: orders } = await supabase.from('rsvp_orders').select('id, buyer_phone, status').eq('event_id', eventId)
      const ordersById: Record<string, any> = {}
      for (const o of orders || []) ordersById[o.id] = o
      const rows = (tickets || []).map(t => ({
        name: t.holder_name,
        email: t.holder_email,
        phone: ordersById[t.order_id]?.buyer_phone || '',
        ticket_number: t.ticket_number,
        status: t.status,
        guests: (t.guest_names || []).join('; '),
        checked_in_at: t.checked_in_at || '',
      }))
      const cols = params.type === 'door-list' ? ['name', 'ticket_number', 'guests', 'status'] : ['name', 'email', 'phone', 'ticket_number', 'status', 'guests', 'checked_in_at']
      return csvResponse(`${slug}-${params.type}.csv`, toCsv(rows, cols))
    }
    case 'voters': {
      const { data: votes } = await supabase.from('rsvp_votes').select('voter_name, voter_email, guest_count, wants_updates, created_at').eq('event_id', eventId)
      return csvResponse(`${slug}-voters.csv`, toCsv(votes || [], ['voter_name', 'voter_email', 'guest_count', 'wants_updates', 'created_at']))
    }
    case 'tickets': {
      const { data: tickets } = await supabase.from('rsvp_tickets').select('*').eq('event_id', eventId)
      return csvResponse(`${slug}-tickets.csv`, toCsv(tickets || [], ['ticket_number', 'holder_name', 'holder_email', 'status', 'checked_in_at', 'created_at']))
    }
    case 'checkins': {
      const { data: checkins } = await supabase.from('rsvp_checkins').select('*, rsvp_tickets(holder_name, ticket_number)').eq('rsvp_tickets.event_id', eventId)
      const rows = (checkins || []).map((c: any) => ({
        holder_name: c.rsvp_tickets?.holder_name || '',
        ticket_number: c.rsvp_tickets?.ticket_number || '',
        action: c.action,
        staff_name: c.staff_name,
        staff_role: c.staff_role,
        note: c.note,
        created_at: c.created_at,
      }))
      return csvResponse(`${slug}-checkins.csv`, toCsv(rows, ['holder_name', 'ticket_number', 'action', 'staff_name', 'staff_role', 'note', 'created_at']))
    }
    case 'suggestions': {
      const { data } = await supabase.from('rsvp_suggestions').select('*').eq('event_id', eventId)
      return csvResponse(`${slug}-suggestions.csv`, toCsv(data || [], ['name', 'email', 'event_idea', 'preferred_location', 'preferred_weekend', 'preferred_music', 'artist_suggestion', 'theme_suggestion', 'comments', 'is_approved']))
    }
    case 'emails': {
      const { data } = await supabase.from('rsvp_email_logs').select('*').eq('event_id', eventId)
      return csvResponse(`${slug}-emails.csv`, toCsv(data || [], ['template_key', 'recipient', 'status', 'sent_at', 'created_at']))
    }
    case 'revenue-summary': {
      const { data: orders } = await supabase.from('rsvp_orders').select('*').eq('event_id', eventId)
      const rows = (orders || []).map(o => ({
        buyer_name: o.buyer_name,
        buyer_email: o.buyer_email,
        amount_usd: (o.amount_cents / 100).toFixed(2),
        status: o.status,
        stripe_session_id: o.stripe_session_id || '',
        created_at: o.created_at,
      }))
      return csvResponse(`${slug}-revenue.csv`, toCsv(rows, ['buyer_name', 'buyer_email', 'amount_usd', 'status', 'stripe_session_id', 'created_at']))
    }
    default:
      return NextResponse.json({ error: 'Unknown export type' }, { status: 400 })
  }
}
