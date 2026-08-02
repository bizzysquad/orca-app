import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { isValidEmail } from '@/lib/rsvp/request'
import { sendTemplatedEmail } from '@/lib/rsvp/email'
import { getRsvpAppUrl } from '@/lib/rsvp/url'

export const dynamic = 'force-dynamic'

// Public but token-gated — only someone with the ticket holder's private
// pass link (received by email) can invoke this. Not staff-authenticated.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = String(body?.token || '')
    const toName = String(body?.to_name || '').trim()
    const toEmail = String(body?.to_email || '').trim().toLowerCase()

    if (!token || !toName || !toEmail) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    if (!isValidEmail(toEmail)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })

    const supabase = getRsvpAdmin()
    const { data: ticket } = await supabase.from('rsvp_tickets').select('*').eq('qr_token', token).single()
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    if (ticket.status !== 'valid') {
      return NextResponse.json({ error: `This ticket can't be transferred (status: ${ticket.status}).` }, { status: 400 })
    }

    const newTokenBytes = new Uint8Array(32)
    crypto.getRandomValues(newTokenBytes)
    const newToken = Array.from(newTokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 43)

    const fromName = ticket.holder_name
    const fromEmail = ticket.holder_email

    const { error: updateError } = await supabase
      .from('rsvp_tickets')
      .update({
        qr_token: newToken,
        holder_name: toName,
        holder_email: toEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    await supabase.from('rsvp_ticket_transfers').insert({
      ticket_id: ticket.id,
      old_token: token,
      new_token: newToken,
      from_name: fromName,
      from_email: fromEmail,
      to_name: toName,
      to_email: toEmail,
    })

    const { data: event } = await supabase.from('rsvp_events').select('name').eq('id', ticket.event_id).single()
    await sendTemplatedEmail({
      templateKey: 'ticket_transfer',
      eventId: ticket.event_id,
      to: toEmail,
      vars: { event_name: event?.name || 'the event', from_name: fromName, ticket_url: `${getRsvpAppUrl()}/RSVP/ticket/${newToken}` },
    })

    return NextResponse.json({ success: true, newToken })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Transfer failed' }, { status: 500 })
  }
}
