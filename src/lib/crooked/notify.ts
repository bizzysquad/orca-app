import { formatMoney } from './pricing'
import type { Booking, SiteSettings } from './types'

// Booking emails through the same Resend account RSVP uses. rsvp.orcafin.app
// is the verified sending domain; replies go to the Crooked Rumors contact.
// Silently skipped when RESEND_API_KEY isn't set — bookings still work.
const FROM = 'Crooked Rumors <bookings@rsvp.orcafin.app>'

function esc(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function wrap(heading: string, body: string, button?: { text: string; url: string }) {
  return `
  <div style="background:#F3E7CF;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#FFF9EE;border:3px solid #141210;border-radius:14px;overflow:hidden;">
      <div style="background:#C4161C;padding:14px 24px;color:#FFF9EE;font-weight:900;letter-spacing:0.14em;font-size:12px;text-transform:uppercase;">Crooked Rumors</div>
      <div style="padding:24px;">
        <h1 style="font-size:22px;font-weight:900;color:#141210;margin:0 0 14px;text-transform:uppercase;">${heading}</h1>
        <div style="font-size:14px;line-height:1.7;color:#3A332B;">${body}</div>
        ${button ? `<a href="${button.url}" style="display:inline-block;margin-top:18px;padding:13px 26px;border-radius:8px;background:#141210;color:#FFF9EE;font-weight:800;font-size:14px;text-decoration:none;">${button.text}</a>` : ''}
      </div>
    </div>
  </div>`
}

function summary(b: Booking): string {
  const rows: [string, string][] = [
    ['Booking', b.ref],
    ['Package', b.package_name || 'Custom quote'],
    ...(b.project_date ? [['Date', b.project_date + (b.project_time ? ` · ${b.project_time}` : '')] as [string, string]] : []),
    ...(b.location ? [['Location', b.location] as [string, string]] : []),
    ...(b.total_cents ? [['Total', formatMoney(b.total_cents)] as [string, string]] : []),
    ['Paid', formatMoney(b.amount_paid_cents)],
    ...(b.turnaround ? [['Turnaround', b.turnaround] as [string, string]] : []),
  ]
  return `<table style="width:100%;border-collapse:collapse;margin-top:12px;">${rows
    .map(([k, v]) => `<tr><td style="padding:7px 0;border-top:1px solid #E5D6B8;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#8A7B66;width:110px;">${k}</td><td style="padding:7px 0;border-top:1px solid #E5D6B8;font-size:14px;color:#141210;">${esc(v)}</td></tr>`)
    .join('')}</table>`
}

async function send(to: string, subject: string, html: string, replyTo?: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !to) return
  try {
    const { Resend } = await import('resend')
    const result = await new Resend(apiKey).emails.send({ from: FROM, to, subject, html, ...(replyTo ? { replyTo } : {}) })
    if (result.error) console.error('[crookedrumors email]', result.error.message)
  } catch (err) {
    console.error('[crookedrumors email] send failed', err)
  }
}

export async function notifyNewBooking(b: Booking, settings: SiteSettings, bookingUrl: string) {
  const isQuote = b.kind === 'custom'
  await Promise.all([
    send(
      b.client_email,
      isQuote ? `We got your quote request (${b.ref})` : `Your Crooked Rumors booking ${b.ref}`,
      wrap(
        isQuote ? 'Quote request received' : 'Booking received',
        `Hey ${esc(b.client_name.split(' ')[0])}, thanks for reaching out. ${
          isQuote
            ? 'We will look over your project and send a custom quote. You can check the status any time.'
            : b.amount_paid_cents > 0
              ? 'Your payment went through and your spot is locked in.'
              : 'Your booking is saved. Complete payment to lock in your date.'
        } ${esc(settings.bookingSuccessNote)}${summary(b)}`,
        { text: 'View your booking', url: bookingUrl }
      ),
      settings.contactEmail || undefined
    ),
    send(
      settings.notifyEmail,
      `${isQuote ? 'New quote request' : 'New booking'}: ${b.client_name} (${b.ref})`,
      wrap(
        isQuote ? 'New quote request' : 'New booking',
        `${esc(b.client_name)} · ${esc(b.client_email)}${b.client_phone ? ' · ' + esc(b.client_phone) : ''}${summary(b)}${
          b.details ? `<p style="margin-top:14px;white-space:pre-wrap;">${esc(b.details)}</p>` : ''
        }`
      ),
      b.client_email
    ),
  ])
}

export async function notifyPayment(b: Booking, settings: SiteSettings, amountCents: number, bookingUrl: string) {
  await Promise.all([
    send(
      b.client_email,
      `Payment received for ${b.ref}`,
      wrap(
        'Payment received',
        `We received ${formatMoney(amountCents, { always2: true })}. ${
          b.amount_paid_cents >= b.total_cents ? 'You are paid in full.' : `Remaining balance: ${formatMoney(b.total_cents - b.amount_paid_cents)}.`
        }${summary(b)}`,
        { text: 'View your booking', url: bookingUrl }
      ),
      settings.contactEmail || undefined
    ),
    send(
      settings.notifyEmail,
      `Paid ${formatMoney(amountCents)}: ${b.client_name} (${b.ref})`,
      wrap('Payment received', `${esc(b.client_name)} paid ${formatMoney(amountCents, { always2: true })}.${summary(b)}`),
      b.client_email
    ),
  ])
}
