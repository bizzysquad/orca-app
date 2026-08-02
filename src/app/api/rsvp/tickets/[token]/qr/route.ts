import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { ticketCheckinUrl } from '@/lib/rsvp/qr'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = getRsvpAdmin()
  const { data: ticket } = await supabase.from('rsvp_tickets').select('qr_token').eq('qr_token', params.token).single()
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  const buffer = await QRCode.toBuffer(ticketCheckinUrl(ticket.qr_token), {
    width: 480,
    margin: 2,
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' },
  })
}
