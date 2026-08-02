import { getRsvpAdmin } from '@/lib/rsvp/db'

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

function wrapHtml({
  heading, body, buttonText, buttonUrl, footer,
}: { heading: string; body: string; buttonText?: string; buttonUrl?: string; footer?: string }) {
  return `
  <div style="background:#0A0A0A;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid rgba(212,175,55,0.25);border-radius:20px;overflow:hidden;">
      <div style="padding:28px 28px 8px;text-align:center;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.25em;color:#D4AF37;text-transform:uppercase;margin-bottom:10px;">DJ Maskoff Events</div>
        <h1 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 16px;">${heading}</h1>
        <p style="font-size:14px;line-height:1.7;color:#A1A1A1;margin:0 0 20px;">${body}</p>
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
}

// Sends via Resend if configured; otherwise logs the attempt as 'scheduled'
// so the rest of the pipeline (order flow, transfer flow, etc.) works
// end-to-end before Resend credentials are added. See RESEND_API_KEY in
// .env.local.example.
export async function sendTemplatedEmail({ templateKey, eventId, to, vars, isMarketing = false }: SendTemplatedEmailArgs) {
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
  const html = wrapHtml({ heading, body, buttonText: template.button_text, buttonUrl, footer: template.footer })

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RSVP_EMAIL_FROM || 'DJ Maskoff Events <events@orcafin.app>'

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
    const result = await resend.emails.send({ from, to, subject, html })
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
