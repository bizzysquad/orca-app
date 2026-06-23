import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function formatTime12h(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

async function sendNotification(data: Record<string, unknown>) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping email notification')
    return
  }
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
            ['Name', data.name],
            ['Email', data.email],
            ['Phone', data.phone || 'N/A'],
            ['Event Type', data.event_type],
            ['Date', data.event_date],
            ['Time', `${formatTime12h(String(data.event_start_time || ''))} – ${formatTime12h(String(data.event_end_time || ''))}`],
            ['Location', `${data.venue || ''} ${data.location || ''}`.trim() || 'N/A'],
            ['Notes', data.message || 'None'],
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
      subject: `🎧 New Quote Request — ${data.name} · ${data.event_type} on ${data.event_date}`,
      html,
    })
  } catch (e) {
    console.error('Booking notification email failed:', e)
  }
}

// Actual DB columns: id, name, email, phone, event_date, event_start_time, event_end_time,
// venue, location, event_type, message, status, created_at
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      date, startTime, endTime, eventType, customEventType,
      guestCount, location, mcNeeded, specialRequests,
      name, email, phone,
      custom_budget, song_requests,
      client_name, client_email, client_phone, event_type,
      start_time, end_time, guest_count, mc_needed, special_requests,
    } = body

    const resolvedName = name || client_name || ''
    const resolvedEmail = email || client_email || ''
    const resolvedDate = date || ''

    if (!resolvedName || !resolvedEmail || !resolvedDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const resolvedEventType = customEventType || eventType || event_type || 'Other'

    // Pack extra fields into message since the table only has a message column
    const messageParts = [
      specialRequests || special_requests || '',
      custom_budget ? `Budget: ${custom_budget}` : '',
      song_requests ? `Song Requests: ${song_requests}` : '',
      (guestCount || guest_count) ? `Guest Count: ${guestCount || guest_count}` : '',
      (mcNeeded === 'Yes' || mc_needed === true) ? 'MC Services: Yes' : '',
    ].filter(Boolean).join('\n')

    const row = {
      name: resolvedName,
      email: resolvedEmail,
      phone: phone || client_phone || '',
      event_date: resolvedDate,
      event_start_time: startTime || start_time || null,
      event_end_time: endTime || end_time || null,
      event_type: resolvedEventType,
      venue: body.city || location || '',
      location: location || '',
      message: messageParts || '',
      status: 'pending',
      created_at: new Date().toISOString(),
    }

    const supabase = getAdmin()
    const { error } = await supabase.from('booking_requests').insert(row)

    if (error) {
      console.error('Supabase booking insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire-and-forget notification email
    sendNotification(row)

    // Send confirmation to customer
    sendCustomerConfirmation(resolvedName, resolvedEmail, resolvedEventType, resolvedDate)

    return NextResponse.json({ success: true, message: 'Booking request received' })
  } catch (err: any) {
    console.error('Booking request error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function sendCustomerConfirmation(name: string, email: string, eventType: string, date: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return
  try {
    const t = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#F8FAFC;color:#1E293B;padding:32px;border-radius:16px;border:1px solid #E2E8F0;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#0F172A;">DJ Maskoff</h1>
          <p style="margin:6px 0 0;color:#64748B;font-size:14px;">Booking Request Received</p>
        </div>
        <p style="font-size:15px;line-height:1.7;color:#334155;">
          Hi ${name},<br><br>
          Thank you for your booking request for <strong>${eventType}</strong> on <strong>${date}</strong>.
          We've received your details and will get back to you within 24-48 hours with pricing and availability.
        </p>
        <div style="margin-top:24px;padding:16px;background:#FEF3C7;border-radius:12px;border:1px solid #F59E0B33;">
          <p style="margin:0;font-size:13px;color:#92400E;">
            <strong>What's next?</strong> We'll review your request and follow up via email with a personalized quote.
          </p>
        </div>
        <p style="margin-top:24px;font-size:13px;color:#64748B;text-align:center;">
          Questions? Email us at <a href="mailto:maskoffdadj@gmail.com" style="color:#B45309;font-weight:700;">maskoffdadj@gmail.com</a>
        </p>
      </div>
    `
    await t.sendMail({
      from: `"DJ Maskoff" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Booking Request Received — ${eventType} on ${date}`,
      html,
    })
  } catch (e) {
    console.error('Customer confirmation email failed:', e)
  }
}
