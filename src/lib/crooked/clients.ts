// Crooked Rumor Client Center: shared types, default delivery templates,
// and validation. The client list is built from cr_bookings (grouped by
// email) plus cr_clients (hand-added clients and private notes).

export interface ClientBooking {
  id: string
  ref: string
  package_name: string | null
  category_name: string | null
  status: string
  project_date: string | null
  total_cents: number
  amount_paid_cents: number
  created_at: string
}

export interface Delivery {
  id: string
  client_email: string
  client_name: string
  booking_id: string | null
  booking_ref: string
  subject: string
  message: string
  links: DeliveryLink[]
  status: 'sent' | 'failed'
  error: string
  created_at: string
}

export interface CrClient {
  key: string // lowercase email
  email: string
  name: string
  phone: string
  instagram: string
  company: string
  notes: string
  manual: boolean // has a cr_clients row
  bookings: ClientBooking[]
  totalPaidCents: number
  lastActivity: string
  deliveries: number
  lastDelivered: string | null
}

export interface DeliveryLink {
  label: string
  url: string
}

export interface DeliveryTemplate {
  id: string
  label: string
  subject: string
  text: string
}

// Client facing copy: no dashes (brand rule).
export const DEFAULT_DELIVERY_TEMPLATES: DeliveryTemplate[] = [
  { id: 'final', label: 'Final edit ready', subject: 'Your final edit is ready', text: 'Your final edit is done and ready to download. Thank you for trusting Crooked Rumor with your project. Let us know if anything needs a tweak.' },
  { id: 'reels', label: 'Reels delivered', subject: 'Your reels are ready', text: 'Your reels are cut, captioned, and ready to post. Download them below. Tag us when they go live so we can share the love.' },
  { id: 'interview', label: 'Interview delivered', subject: 'Your interview is ready', text: 'Your interview is edited and ready to go. The full piece and any clips are in the download below.' },
  { id: 'photos', label: 'Photos delivered', subject: 'Your photos are ready', text: 'Your photos are edited and ready to download. It was a pleasure working with you.' },
  { id: 'preview', label: 'Preview for review', subject: 'Your preview is ready for review', text: 'Here is a preview of your project. Take a look and send us any changes you want before we finalize it.' },
  { id: 'revision', label: 'Revision delivered', subject: 'Your revised edit is ready', text: 'Here is your revised edit with the changes you asked for. Let us know if it is a wrap.' },
  { id: 'balance', label: 'Balance reminder', subject: 'Your project is ready', text: 'Your project is finished. Once the remaining balance is paid we will send over the final files. You can pay from your booking page anytime.' },
]

export const TEMPLATES_ROW_ID = 'delivery_templates'

export function safeUrl(raw: string): string | null {
  const v = String(raw || '').trim()
  if (!v) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || !u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

export function cleanTemplates(raw: unknown): DeliveryTemplate[] {
  if (!Array.isArray(raw)) return DEFAULT_DELIVERY_TEMPLATES
  return raw
    .slice(0, 50)
    .map((t: any, i) => ({
      id: String(t?.id || `t${i}`).slice(0, 40),
      label: String(t?.label || '').trim().slice(0, 80),
      subject: String(t?.subject || '').trim().slice(0, 150),
      text: String(t?.text || '').trim().slice(0, 4000),
    }))
    .filter(t => t.label && t.text)
}
