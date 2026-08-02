import { getRsvpAdmin } from '@/lib/rsvp/db'

function randomTicketNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars
  let out = ''
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < bytes.length; i++) out += chars[bytes[i] % chars.length]
  return `MOD-${out}`
}

export interface IssueTicketsArgs {
  orderId: string
  eventId: string
  ticketTypeId: string | null
  quantity: number
  holderName: string
  holderEmail: string
  guestNames?: string[]
}

// Creates `quantity` ticket rows for a paid/free order. qr_token and
// verification_code use DB-side crypto defaults (see supabase-migration-rsvp.sql).
export async function issueTickets({ orderId, eventId, ticketTypeId, quantity, holderName, holderEmail, guestNames = [] }: IssueTicketsArgs) {
  const supabase = getRsvpAdmin()
  const rows = Array.from({ length: Math.max(1, quantity) }, () => ({
    order_id: orderId,
    event_id: eventId,
    ticket_type_id: ticketTypeId,
    ticket_number: randomTicketNumber(),
    holder_name: holderName,
    holder_email: holderEmail,
    guest_names: guestNames,
    status: 'valid' as const,
  }))

  const { data, error } = await supabase.from('rsvp_tickets').insert(rows).select()
  if (error) throw new Error(error.message)

  if (ticketTypeId) {
    const { data: tt } = await supabase.from('rsvp_ticket_types').select('sold_count').eq('id', ticketTypeId).single()
    if (tt) {
      await supabase
        .from('rsvp_ticket_types')
        .update({ sold_count: (tt.sold_count || 0) + quantity })
        .eq('id', ticketTypeId)
    }
  }

  return data || []
}
