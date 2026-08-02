import QRCode from 'qrcode'
import { getRsvpAppUrl } from '@/lib/rsvp/url'

// The QR encodes only the secure verification URL — no PII, no payment
// data, no predictable database id. See supabase-migration-rsvp.sql notes
// on rsvp_tickets.qr_token.
export function ticketCheckinUrl(qrToken: string): string {
  return `${getRsvpAppUrl()}/RSVP/check-in/${qrToken}`
}

export async function generateTicketQrDataUrl(qrToken: string): Promise<string> {
  return QRCode.toDataURL(ticketCheckinUrl(qrToken), {
    width: 480,
    margin: 2,
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  })
}
