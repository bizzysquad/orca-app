import { formatMoney } from './pricing'
import type { Booking, SiteSettings } from './types'

// Booking emails through the same Resend account RSVP uses. rsvp.orcafin.app
// is the verified sending domain; replies go to the Crooked Rumor contact.
// Silently skipped when RESEND_API_KEY isn't set — bookings still work.
const FROM = 'Crooked Rumor <bookings@rsvp.orcafin.app>'

function esc(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function wrap(heading: string, body: string, button?: { text: string; url: string }) {
  return `
  <div style="background:#F3E7CF;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#FFF9EE;border:3px solid #141210;border-radius:14px;overflow:hidden;">
      <div style="background:#C4161C;padding:14px 24px;color:#FFF9EE;font-weight:900;letter-spacing:0.14em;font-size:12px;text-transform:uppercase;">Crooked Rumor</div>
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
      isQuote ? `We got your quote request (${b.ref})` : `Your Crooked Rumor booking ${b.ref}`,
      wrap(
        isQuote ? 'Quote request received' : 'Booking received',
        `Hey ${esc(b.client_name.split(' ')[0])}, thanks for reaching out. ${
          isQuote
            ? 'We will look over your project and send a custom quote. You can check the status any time.'
            : 'Your booking is confirmed.'
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

// First payment on a booking = the booking confirmation (nothing is emailed
// at checkout start). Later payments (balance, quoted price) = receipts.
export async function notifyPayment(b: Booking, settings: SiteSettings, amountCents: number, bookingUrl: string) {
  const firstPayment = b.amount_paid_cents <= amountCents
  if (firstPayment && b.kind === 'package') {
    const paidInFull = b.amount_paid_cents >= b.total_cents
    await Promise.all([
      send(
        b.client_email,
        `Booking confirmed: ${b.ref}`,
        wrap(
          'Booking confirmed',
          `Hey ${esc(b.client_name.split(' ')[0])}, your payment of ${formatMoney(amountCents, { always2: true })} went through and your shoot is locked in. ${
            paidInFull ? 'You are paid in full.' : `Remaining balance of ${formatMoney(b.total_cents - b.amount_paid_cents)} is due before delivery.`
          } ${esc(settings.bookingSuccessNote)}${summary(b)}`,
          { text: 'View your booking', url: bookingUrl }
        ),
        settings.contactEmail || undefined
      ),
      send(
        settings.notifyEmail,
        `New booking (paid ${formatMoney(amountCents)}): ${b.client_name} (${b.ref})`,
        wrap(
          'New paid booking',
          `${esc(b.client_name)} · ${esc(b.client_email)}${b.client_phone ? ' · ' + esc(b.client_phone) : ''}${summary(b)}${
            b.details ? `<p style="margin-top:14px;white-space:pre-wrap;">${esc(b.details)}</p>` : ''
          }`
        ),
        b.client_email
      ),
    ])
    return
  }
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

// New "Join the Team" application → admin alert only. Applicants get the
// on-screen thank you; no auto email to them, so a typo'd or spoofed address
// can't be used to bounce mail off our domain. Reply-to is the applicant.
export async function notifyNewApplication(
  a: { full_name: string; email: string; social_handle: string; location: string; contribution: string; portfolio_url: string },
  skills: string,
  openness: string,
  settings: SiteSettings,
  adminUrl: string
) {
  const rows: [string, string][] = [
    ['Email', a.email],
    ['Location', a.location],
    ['Does', skills],
    ['Unpaid work', openness],
    ...(a.social_handle ? [['Social', a.social_handle] as [string, string]] : []),
    ...(a.portfolio_url ? [['Portfolio', a.portfolio_url] as [string, string]] : []),
  ]
  const table = `<table style="width:100%;border-collapse:collapse;margin-top:12px;">${rows
    .map(([k, v]) => `<tr><td style="padding:7px 0;border-top:1px solid #E5D6B8;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#8A7B66;width:110px;">${k}</td><td style="padding:7px 0;border-top:1px solid #E5D6B8;font-size:14px;color:#141210;">${esc(v)}</td></tr>`)
    .join('')}</table>`
  await send(
    settings.notifyEmail,
    `New team application: ${a.full_name}`,
    wrap(
      'New team application',
      `${esc(a.full_name)} wants to join the team.${table}<p style="margin-top:14px;white-space:pre-wrap;">${esc(a.contribution.slice(0, 800))}</p>`,
      { text: 'Review in admin', url: adminUrl }
    ),
    a.email
  )
}

// "Deliver finished work" email from the Client Center. Unlike the booking
// emails this reports failure, because the admin is waiting on the result.
export async function sendDeliveryEmail(opts: {
  to: string
  clientName: string
  subject: string
  message: string
  links: { label: string; url: string }[]
  bookingUrl?: string | null
  bookAgainUrl: string
  settings: SiteSettings
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'Email is not configured (RESEND_API_KEY is missing).' }
  const first = esc(opts.clientName.split(' ')[0] || 'there')
  const buttons = opts.links
    .map(
      (l, i) =>
        `<a href="${esc(l.url)}" style="display:block;margin-top:10px;padding:13px 22px;border-radius:8px;background:${i === 0 ? '#C4161C' : '#141210'};color:#FFF9EE;font-weight:800;font-size:14px;text-decoration:none;text-align:center;">${esc(l.label || 'Download your files')}</a>`
    )
    .join('')
  const body = `
    <p style="margin:0 0 12px;">Hey ${first},</p>
    <p style="margin:0;white-space:pre-wrap;">${esc(opts.message)}</p>
    ${buttons ? `<div style="margin-top:18px;">${buttons}</div>` : ''}
    ${opts.links.length ? '<p style="margin-top:12px;font-size:12px;color:#8A7B66;">Download links can expire, so save your files somewhere safe.</p>' : ''}
    ${opts.bookingUrl ? `<p style="margin-top:14px;font-size:13px;"><a href="${esc(opts.bookingUrl)}" style="color:#C4161C;font-weight:700;">View your booking</a></p>` : ''}
    <div style="margin-top:22px;padding:16px;border:2px dashed #E5D6B8;border-radius:10px;text-align:center;">
      <p style="margin:0 0 10px;font-weight:800;color:#141210;">Thank you for working with Crooked Rumor!</p>
      <a href="${esc(opts.bookAgainUrl)}" style="display:inline-block;padding:10px 20px;border-radius:8px;background:#141210;color:#FFF9EE;font-weight:800;font-size:13px;text-decoration:none;">Book your next shoot</a>
    </div>`
  try {
    const { Resend } = await import('resend')
    const result = await new Resend(apiKey).emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: wrap(esc(opts.subject), body),
      ...(opts.settings.contactEmail ? { replyTo: opts.settings.contactEmail } : {}),
    })
    if (result.error) return { ok: false, error: result.error.message }
    return { ok: true, id: result.data?.id || '' }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Send failed' }
  }
}
