import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
    }

    const { to, clientName, projectType, message, fileUrls } = await req.json()
    if (!to) return NextResponse.json({ error: 'Recipient email required' }, { status: 400 })

    const t = createTransport()
    const name = clientName || 'there'
    const service = projectType || 'your project'

    const fileLinksHtml = (fileUrls || []).map((url: string, i: number) =>
      `<a href="${url}" style="display:inline-block;padding:12px 24px;background:#9333EA;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin:4px;">Download File ${i + 1}</a>`
    ).join(' ')

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#F8FAFC;color:#1E293B;padding:32px;border-radius:16px;border:1px solid #E2E8F0;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#7C3AED;">BizzyPlug</h1>
          <p style="margin:6px 0 0;color:#64748B;font-size:14px;">Your Design Is Ready!</p>
        </div>
        <p style="font-size:15px;line-height:1.7;color:#334155;">
          Hey ${name},<br><br>
          Your <strong>${service}</strong> is complete! ${message ? `<br><br>${message}` : ''}
        </p>
        ${fileLinksHtml ? `<div style="margin:24px 0;text-align:center;">${fileLinksHtml}</div>` : ''}
        <div style="margin:32px 0 24px;padding:20px;background:#F3E8FF;border-radius:12px;border:1px solid #C084FC33;text-align:center;">
          <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#6B21A8;">Thank you for shopping with BizzyPlug!</p>
          <p style="margin:0 0 16px;font-size:13px;color:#7C3AED;">We'd love to hear about your experience. Your feedback helps us grow!</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://orcafin.app'}/bizzyplug#testimonials" style="display:inline-block;padding:10px 28px;background:#9333EA;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">Leave a Review</a>
        </div>
        <p style="margin:0;font-size:13px;color:#64748B;text-align:center;">
          Questions? Email <a href="mailto:buzyplug@gmail.com" style="color:#7C3AED;font-weight:700;">buzyplug@gmail.com</a> or DM @bizzyplug on Instagram
        </p>
      </div>
    `

    await t.sendMail({
      from: `"BizzyPlug" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Your ${service} is ready! — BizzyPlug`,
      html,
      replyTo: 'buzyplug@gmail.com',
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[BizzyPlug deliver]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
