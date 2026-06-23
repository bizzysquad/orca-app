import { NextRequest, NextResponse } from 'next/server'
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
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'Email not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to environment variables.' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { to, subject, html, text, body: bodyText, replyTo } = body

    const content = html || text || bodyText
    if (!to || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, html or text' }, { status: 400 })
    }

    const isHtml = content.includes('<') && content.includes('>')
    const transporter = createTransport()

    const info = await transporter.sendMail({
      from: `"Mask Off Da DJ" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: isHtml ? content : `<div style="font-family:sans-serif;white-space:pre-wrap;line-height:1.7;font-size:15px;color:#1E293B;">${content}</div>`,
      text: isHtml ? content.replace(/<[^>]+>/g, '') : content,
      replyTo: replyTo || process.env.GMAIL_USER,
    })

    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (err: any) {
    console.error('[Email send]', err)
    return NextResponse.json({ error: err.message || 'Failed to send email' }, { status: 500 })
  }
}
