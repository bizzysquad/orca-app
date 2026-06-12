import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

function formatTime12h(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

async function sendNotification(data: Record<string, unknown>) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return
  try {
    const t = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#070B14;color:#F1F5F9;padding:32px;border-radius:16px;">
        <div style="background:linear-gradient(135deg,#6366F1,#4F46E5);padding:20px;border-radius:12px;text-align:center;margin-bottom:24px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">🎧 New Quote Request</h1>
          <p style="margin:8px 0 0;color:#C7D2FE;font-size:14px;">Mask Off Da DJ — Website Submission</p>
        </div>

        <table style="width:100%;border-collapse:collapse;">
          ${[
            ['Name', data.client_name],
            ['Email', data.client_email],
            ['Phone', data.client_phone || 'N/A'],
            ['Event Type', data.event_type],
            ['Date', data.date],
            ['Time', `${formatTime12h(String(data.start_time || ''))} – ${formatTime12h(String(data.end_time || ''))}`],
            ['Location', `${data.location || ''} ${data.city || ''}`.trim() || 'N/A'],
            ['Guest Count', data.guest_count || 'N/A'],
            ['MC Services', data.mc_needed === 'Yes' ? 'Yes' : 'No'],
            ['Notes', data.special_requests || 'None'],
          ].map(([k, v]) => `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #1E2D4A;color:#94A3B8;font-size:13px;width:130px;">${k}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #1E2D4A;color:#F1F5F9;font-size:13px;">${v}</td>
            </tr>
          `).join('')}
        </table>

        <div style="margin-top:24px;padding:16px;background:#0D1525;border-radius:12px;border:1px solid #1E2D4A;">
          <p style="margin:0;color:#94A3B8;font-size:13px;">This lead has been automatically saved to your DJ Gig Manager. Log into ORCA to review and follow up.</p>
        </div>
      </div>
    `

    await t.sendMail({
      from: `"ORCA Booking" <${process.env.GMAIL_USER}>`,
      to: 'maskoffdadj@gmail.com',
      subject: `🎧 New Quote Request — ${data.client_name} · ${data.event_type} on ${data.date}`,
      html,
    })
  } catch (e) {
    console.error('Booking notification email failed:', e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      date, startTime, endTime, eventType, customEventType,
      guestCount, location, city, mcNeeded, specialRequests,
      name, email, phone,
    } = body

    if (!name || !email || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const resolvedEventType = customEventType || eventType || 'Other'
    const supabase = await createClient()

    // Store in booking_requests table
    const { error } = await supabase.from('booking_requests').insert({
      date,
      start_time: startTime,
      end_time: endTime,
      event_type: resolvedEventType,
      guest_count: guestCount ? parseInt(guestCount) : null,
      location,
      city,
      mc_needed: mcNeeded === 'Yes',
      special_requests: specialRequests,
      client_name: name,
      client_email: email,
      client_phone: phone,
      status: 'new',
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Supabase booking insert error:', error)
    }

    // Fire-and-forget notification email
    sendNotification({
      client_name: name, client_email: email, client_phone: phone,
      event_type: resolvedEventType, date, start_time: startTime, end_time: endTime,
      location, city, guest_count: guestCount, mc_needed: mcNeeded,
      special_requests: specialRequests,
    })

    return NextResponse.json({ success: true, message: 'Booking request received' })
  } catch (err) {
    console.error('Booking request error:', err)
    return NextResponse.json({ success: true, message: 'Booking request received' })
  }
}
