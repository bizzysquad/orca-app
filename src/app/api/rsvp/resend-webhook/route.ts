import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'

export const dynamic = 'force-dynamic'

// Resend signs webhooks using the Svix format: HMAC-SHA256 over
// "{svix-id}.{svix-timestamp}.{raw body}" using the base64 portion of the
// whsec_... signing secret, compared against any "v1,<sig>" in svix-signature.
async function verifySvixSignature(rawBody: string, headers: Headers, secret: string): Promise<boolean> {
  const id = headers.get('svix-id')
  const timestamp = headers.get('svix-timestamp')
  const signatureHeader = headers.get('svix-signature')
  if (!id || !timestamp || !signatureHeader) return false

  const secretBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('raw', secretBytes as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signedContent = `${id}.${timestamp}.${rawBody}`
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
  const sigBytes = new Uint8Array(sigBuffer)
  let sigStr = ''
  for (let i = 0; i < sigBytes.length; i++) sigStr += String.fromCharCode(sigBytes[i])
  const expected = btoa(sigStr)

  return signatureHeader.split(' ').some(part => {
    const [, sig] = part.split(',')
    return sig === expected
  })
}

const EVENT_STATUS: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'bounced',
  'email.delivery_delayed': 'sent',
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  const rawBody = await req.text()

  if (secret) {
    const valid = await verifySvixSignature(rawBody, req.headers, secret)
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const status = EVENT_STATUS[payload?.type]
  const messageId = payload?.data?.email_id
  if (status && messageId) {
    const supabase = getRsvpAdmin()
    await supabase.from('rsvp_email_logs').update({ status, updated_at: new Date().toISOString() }).eq('resend_message_id', messageId)
  }

  return NextResponse.json({ received: true })
}
