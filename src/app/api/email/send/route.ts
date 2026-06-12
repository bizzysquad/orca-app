import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'Email not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to environment variables.' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { to, subject, html, text, replyTo } = body

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, html or text' }, { status: 400 })
    }

    const transporter = createTransport()

    const info = await transporter.sendMail({
      from: `"Mask Off Da DJ" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: html || `<p>${text}</p>`,
      text: text || html?.replace(/<[^>]+>/g, ''),
      replyTo: replyTo || process.env.GMAIL_USER,
    })

    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (err: any) {
    console.error('[Email send]', err)
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 })
  }
}
