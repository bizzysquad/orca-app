import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'
import { sendTemplatedEmail } from '@/lib/rsvp/email'
import { getRsvpAppUrl } from '@/lib/rsvp/url'

export const dynamic = 'force-dynamic'

// Guest-management actions used by /RSVP/admin/guests, addressed by
// qr_token (same segment as the public ticket-view route). Distinct from
// /api/rsvp/checkin, which is the door-scanning flow.
export async function PATCH(req: NextRequest, { params }: { params: { token: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const action = String(body?.action || '')
    const supabase = getRsvpAdmin()

    const { data: ticket } = await supabase.from('rsvp_tickets').select('*').eq('qr_token', params.token).single()
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    const id = ticket.id

    switch (action) {
      case 'cancel': {
        const { data } = await supabase.from('rsvp_tickets').update({ status: 'cancelled' }).eq('id', id).select().single()
        await logAudit(staff, 'cancel_ticket', 'rsvp_tickets', id, {})
        return NextResponse.json({ ticket: data })
      }
      case 'flag': {
        const reason = String(body?.flagged_reason || '').slice(0, 300)
        const { data } = await supabase.from('rsvp_tickets').update({ status: 'flagged', flagged_reason: reason }).eq('id', id).select().single()
        await logAudit(staff, 'flag_ticket', 'rsvp_tickets', id, { reason })
        return NextResponse.json({ ticket: data })
      }
      case 'unflag': {
        const { data } = await supabase.from('rsvp_tickets').update({ status: 'valid', flagged_reason: null }).eq('id', id).select().single()
        await logAudit(staff, 'unflag_ticket', 'rsvp_tickets', id, {})
        return NextResponse.json({ ticket: data })
      }
      case 'reissue': {
        const newTokenBytes = new Uint8Array(32)
        crypto.getRandomValues(newTokenBytes)
        let newToken = ''
        for (let i = 0; i < newTokenBytes.length; i++) newToken += newTokenBytes[i].toString(16).padStart(2, '0')
        const { data } = await supabase
          .from('rsvp_tickets')
          .update({ qr_token: newToken.slice(0, 43), status: 'valid' })
          .eq('id', id)
          .select()
          .single()
        await logAudit(staff, 'reissue_ticket', 'rsvp_tickets', id, {})
        return NextResponse.json({ ticket: data })
      }
      case 'resend': {
        const { data: event } = await supabase.from('rsvp_events').select('name').eq('id', ticket.event_id).single()
        await sendTemplatedEmail({
          templateKey: 'digital_invitation',
          eventId: ticket.event_id,
          to: ticket.holder_email,
          vars: { event_name: event?.name || 'the event', ticket_url: `${getRsvpAppUrl()}/RSVP/ticket/${ticket.qr_token}` },
        })
        await logAudit(staff, 'resend_invitation', 'rsvp_tickets', id, {})
        return NextResponse.json({ success: true })
      }
      case 'note': {
        await supabase.from('rsvp_checkins').insert({ ticket_id: id, staff_name: staff.displayName, staff_role: staff.role, action: 'door_note', note: String(body?.note || '').slice(0, 500) })
        await logAudit(staff, 'add_note', 'rsvp_tickets', id, {})
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Action failed' }, { status: 500 })
  }
}
