import { getRsvpAdmin } from '@/lib/rsvp/db'
import { getRsvpAppUrl } from '@/lib/rsvp/url'
import { ticketPerkStatuses, PerkTicket, PERK_TICKET_FIELDS } from '@/lib/rsvp/perks'

// Verified in Resend (DNS records under rsvp.orcafin.app in Vercel DNS).
// RSVP_EMAIL_FROM can override it, but the old placeholder value is ignored.
const DEFAULT_FROM = 'DJ Maskoff Events <hello@rsvp.orcafin.app>'
const DEFAULT_CONTACT = 'maskoffdadj@gmail.com'
const EVENT_TZ = 'America/New_York'

function senderAddress(): string {
  const configured = (process.env.RSVP_EMAIL_FROM || '').trim()
  return configured && !configured.includes('your-verified-domain') ? configured : DEFAULT_FROM
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

// Event + ticket details card appended to ticket emails (confirmation, invitation, transfer)
async function ticketDetailsHtml(qrToken: string): Promise<{ html: string; replyTo: string | null }> {
  const supabase = getRsvpAdmin()
  const { data: ticket } = await supabase.from('rsvp_tickets').select(PERK_TICKET_FIELDS + ', qr_token').eq('qr_token', qrToken).single()
  if (!ticket) return { html: '', replyTo: null }
  const t = ticket as unknown as PerkTicket & { qr_token: string }
  const { data: event } = await supabase
    .from('rsvp_events')
    .select('name, venue, address, city, state, start_time, end_time, age_requirement, dress_code, contact_email')
    .eq('id', t.event_id)
    .single()
  if (!event) return { html: '', replyTo: null }

  const day = event.start_time
    ? new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: EVENT_TZ })
    : 'Date to be announced'
  const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: EVENT_TZ })
  const time = event.start_time ? clock(event.start_time) + (event.end_time ? ` to ${clock(event.end_time)}` : '') : ''
  const place = [event.venue, event.address, [event.city, event.state].filter(Boolean).join(', ')].filter(Boolean).join('<br>')
  const mapQuery = [event.venue, event.address, event.city, event.state].filter(Boolean).join(' ')
  const party = [t.holder_name, ...(t.guest_names || [])].map(esc).join(', ')

  const rows: [string, string][] = [
    ['When', `${esc(day)}${time ? `<br>${esc(time)}` : ''}`],
    ...(place
      ? [['Where', `${place}${mapQuery ? `<br><a href="https://maps.google.com/?q=${encodeURIComponent(mapQuery)}" style="color:#D4AF37;text-decoration:none;font-weight:600;">Get directions</a>` : ''}`] as [string, string]]
      : []),
    ['Guests', party],
    ['Ticket #', esc(t.ticket_number)],
    ...(event.age_requirement ? [['Age', esc(event.age_requirement)] as [string, string]] : []),
    ...(event.dress_code ? [['Dress code', esc(event.dress_code)] as [string, string]] : []),
  ]

  const perks = (await ticketPerkStatuses(t).catch(() => [])).filter(p => p.ok)
  const perksHtml = perks.length
    ? `<div style="margin-top:18px;padding:14px 16px;border-radius:12px;background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.25);text-align:left;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;color:#D4AF37;text-transform:uppercase;margin-bottom:6px;">Your perks</div>
        ${perks.map(p => `<div style="font-size:14px;color:#fff;font-weight:700;margin:4px 0;">${esc(p.perk.name)}${p.perk.description ? `<span style="font-weight:400;color:#A1A1A1;"> &middot; ${esc(p.perk.description)}</span>` : ''}</div>`).join('')}
        <div style="font-size:11px;color:#A1A1A1;margin-top:6px;">Show your QR code at the bar to redeem.</div>
      </div>`
    : ''

  const qrUrl = `${getRsvpAppUrl()}/api/rsvp/tickets/${t.qr_token}/qr`
  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;border-collapse:collapse;text-align:left;">
      ${rows
        .map(
          ([label, value]) => `<tr>
        <td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6B7280;width:96px;vertical-align:top;">${label}</td>
        <td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:14px;line-height:1.5;color:#F5F5F5;">${value}</td>
      </tr>`
        )
        .join('')}
    </table>
    <div style="text-align:center;margin:8px 0 6px;">
      <img src="${qrUrl}" width="180" height="180" alt="Your entry QR code" style="display:inline-block;background:#fff;padding:10px;border-radius:14px;">
      <div style="font-size:11px;color:#6B7280;margin-top:8px;">Show this at the door${perks.length ? ' and the bar' : ''}.</div>
    </div>
    ${perksHtml}`
  return { html, replyTo: event.contact_email || null }
}

function wrapHtml({
  heading, body, buttonText, buttonUrl, footer, detailsHtml = '',
}: { heading: string; body: string; buttonText?: string; buttonUrl?: string; footer?: string; detailsHtml?: string }) {
  return `
  <div style="background:#0A0A0A;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid rgba(212,175,55,0.25);border-radius:20px;overflow:hidden;">
      <div style="padding:28px 28px 8px;text-align:center;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.25em;color:#D4AF37;text-transform:uppercase;margin-bottom:10px;">DJ Maskoff Events</div>
        <h1 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 16px;">${heading}</h1>
        <p style="font-size:14px;line-height:1.7;color:#A1A1A1;margin:0 0 20px;">${body}</p>
        ${detailsHtml}
        ${buttonText && buttonUrl ? `
        <a href="${buttonUrl}" style="display:inline-block;padding:14px 32px;border-radius:10px;background:linear-gradient(135deg,#D4AF37,#F5D76E,#8C6A1A);color:#0A0A0A;font-weight:800;font-size:14px;text-decoration:none;margin-bottom:20px;">${buttonText}</a>
        ` : ''}
      </div>
      <div style="padding:16px 28px 24px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
        <p style="font-size:11px;color:#6B7280;margin:0;">${footer || 'DJ Maskoff Events · maskoffdadj@gmail.com'}</p>
      </div>
    </div>
  </div>`
}

export interface SendTemplatedEmailArgs {
  templateKey: string
  eventId: string | null
  to: string
  vars: Record<string, string>
  isMarketing?: boolean
  // Ticket emails: pass the ticket's qr_token to include the event details card + QR
  ticketToken?: string
}

// Sends via Resend if configured; otherwise logs the attempt as 'scheduled'
// so the rest of the pipeline (order flow, transfer flow, etc.) works
// end-to-end before Resend credentials are added. See RESEND_API_KEY in
// .env.local.example.
export async function sendTemplatedEmail({ templateKey, eventId, to, vars, isMarketing = false, ticketToken }: SendTemplatedEmailArgs) {
  const supabase = getRsvpAdmin()

  if (isMarketing) {
    const { data: unsub } = await supabase.from('rsvp_unsubscribes').select('email').eq('email', to.toLowerCase()).single()
    if (unsub) return { skipped: true, reason: 'unsubscribed' }
  }

  const { data: template } = await supabase.from('rsvp_email_templates').select('*').eq('key', templateKey).single()
  if (!template) {
    console.error(`[rsvp email] unknown template "${templateKey}"`)
    return { skipped: true, reason: 'unknown_template' }
  }

  const subject = interpolate(template.subject, vars)
  const heading = interpolate(template.heading, vars)
  const body = interpolate(template.body_html, vars)
  const buttonUrl = template.button_url_pattern ? interpolate(template.button_url_pattern, vars) : undefined
  // The event's organizer contact email receives guest replies and is shown in the footer.
  // Mail is still sent from the verified rsvp.orcafin.app address: Resend can only send
  // from domains we've verified, so an organizer's own Gmail etc. goes in Reply-To instead.
  let contact = DEFAULT_CONTACT
  if (eventId) {
    const { data: ev } = await supabase.from('rsvp_events').select('contact_email').eq('id', eventId).single()
    if (ev?.contact_email) contact = ev.contact_email
  }
  const footer = template.footer || `Questions? Just reply to this email or write to ${esc(contact)}`

  const details = ticketToken ? await ticketDetailsHtml(ticketToken).catch(() => ({ html: '', replyTo: null })) : { html: '', replyTo: null }
  const html = wrapHtml({ heading, body, buttonText: template.button_text, buttonUrl, footer, detailsHtml: details.html })

  const apiKey = process.env.RESEND_API_KEY
  const from = senderAddress()
  const replyTo = contact

  const { data: log } = await supabase
    .from('rsvp_email_logs')
    .insert({ template_key: templateKey, event_id: eventId, recipient: to, status: apiKey ? 'sent' : 'scheduled' })
    .select()
    .single()

  if (!apiKey) {
    console.log(`[rsvp email] RESEND_API_KEY not set — would send "${subject}" to ${to}`)
    return { skipped: true, reason: 'resend_not_configured' }
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({ from, to, subject, html, replyTo })
    // Resend reports most failures (bad sender, unverified domain) in result.error instead of throwing
    if (result.error) throw new Error(result.error.message || 'Resend rejected the email')
    if (log && result.data?.id) {
      await supabase.from('rsvp_email_logs').update({ resend_message_id: result.data.id, sent_at: new Date().toISOString() }).eq('id', log.id)
    }
    return { sent: true, id: result.data?.id }
  } catch (err: any) {
    console.error('[rsvp email] send failed', err)
    if (log) await supabase.from('rsvp_email_logs').update({ status: 'failed' }).eq('id', log.id)
    return { error: err.message }
  }
}
