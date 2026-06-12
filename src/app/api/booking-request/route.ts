import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

async function sendNotification(data: Record<string, unknown>) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return
  try {
    const t = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
    await t.sendMail({
      from: `"ORCA Booking" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `🎧 New Booking Request — ${data.client_name} (${data.event_type})`,
      html: `
        <h2>New DJ Booking Request</h2>
        <p><strong>Name:</strong> ${data.client_name}</p>
        <p><strong>Email:</strong> ${data.client_email}</p>
        <p><strong>Phone:</strong> ${data.client_phone || 'N/A'}</p>
        <p><strong>Event Type:</strong> ${data.event_type}</p>
        <p><strong>Date:</strong> ${data.date}</p>
        <p><strong>Time:</strong> ${data.start_time || '?'} – ${data.end_time || '?'}</p>
        <p><strong>Location:</strong> ${data.location || 'N/A'}, ${data.city || ''}</p>
        <p><strong>Guest Count:</strong> ${data.guest_count || 'N/A'}</p>
        <p><strong>MC Needed:</strong> ${data.mc_needed ? 'Yes' : 'No'}</p>
        <p><strong>Budget:</strong> ${data.budget_range || 'N/A'}</p>
        <p><strong>Special Requests:</strong> ${data.special_requests || 'None'}</p>
        <br/><p>View and manage this booking in your <a href="https://orcafin.app/dj-hub">ORCA DJ Hub</a>.</p>
      `,
    })
  } catch (e) {
    console.error('Booking notification email failed:', e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      date, startTime, endTime, eventType, guestCount, location,
      city, mcNeeded, specialRequests, name, email, phone, budget,
    } = body

    if (!name || !email || !date || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from('booking_requests').insert({
      date,
      start_time: startTime,
      end_time: endTime,
      event_type: eventType,
      guest_count: guestCount ? parseInt(guestCount) : null,
      location,
      city,
      mc_needed: mcNeeded === 'Yes',
      special_requests: specialRequests,
      client_name: name,
      client_email: email,
      client_phone: phone,
      budget_range: budget,
      status: 'new',
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Supabase booking insert error:', error)
    } else {
      // Fire-and-forget notification email
      const notifData = {
        client_name: name, client_email: email, client_phone: phone,
        event_type: eventType, date, start_time: startTime, end_time: endTime,
        location, city, guest_count: guestCount, mc_needed: mcNeeded,
        budget_range: budget, special_requests: specialRequests,
      }
      sendNotification(notifData)
    }

    return NextResponse.json({ success: true, message: 'Booking request received' })
  } catch (err) {
    console.error('Booking request error:', err)
    return NextResponse.json({ success: true, message: 'Booking request received' })
  }
}
