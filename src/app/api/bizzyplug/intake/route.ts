import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, artistName, email, phone, instagram,
      projectType, songName, tracklist, details,
      deadline, notes, referenceUrls,
    } = body

    if (!artistName || !email) {
      return NextResponse.json({ error: 'Artist name and email are required' }, { status: 400 })
    }

    const message = JSON.stringify({
      source: 'bizzyplug',
      artistName: artistName || '',
      instagram: instagram || '',
      songName: songName || '',
      tracklist: tracklist || '',
      details: details || '',
      notes: notes || '',
      referenceUrls: referenceUrls || [],
    })

    const row = {
      name: `__BIZZYPLUG__`,
      email,
      phone: phone || '',
      event_date: deadline || new Date().toISOString().slice(0, 10),
      event_type: projectType || 'other',
      venue: artistName || '',
      message,
      status: 'pending',
      created_at: new Date().toISOString(),
      client_name: name,
      client_email: email,
      client_phone: phone || '',
    }

    const supabase = getAdmin()
    const { error } = await supabase.from('booking_requests').insert(row)

    if (error) {
      console.error('Bizzyplug intake insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    sendNotification({ name, artistName, email, phone, instagram, projectType, songName, details, deadline, notes })
    sendCustomerConfirmation(name, email, projectType)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Bizzyplug intake error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function sendNotification(data: Record<string, string>) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return
  try {
    const t = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#F1F5F9;padding:32px;border-radius:16px;">
        <div style="background:linear-gradient(135deg,#7C3AED,#9333EA);padding:20px;border-radius:12px;text-align:center;margin-bottom:24px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">🎨 New BizzyPlug Request</h1>
          <p style="margin:8px 0 0;color:#DDD6FE;font-size:14px;">Client Intake Submission</p>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${[
            ['Client', data.name],
            ['Artist', data.artistName || 'N/A'],
            ['Email', data.email],
            ['Phone', data.phone || 'N/A'],
            ['Instagram', data.instagram || 'N/A'],
            ['Service', data.projectType || 'N/A'],
            ['Song/Project', data.songName || 'N/A'],
            ['Deadline', data.deadline || 'N/A'],
            ['Details', data.details || 'None'],
            ['Notes', data.notes || 'None'],
          ].map(([k, v]) => `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #27272a;color:#94A3B8;font-size:13px;width:120px;">${k}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #27272a;color:#F1F5F9;font-size:13px;">${v}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `
    await t.sendMail({
      from: `"BizzyPlug" <${process.env.GMAIL_USER}>`,
      to: 'buzyplug@gmail.com',
      subject: `🎨 New Project Request — ${data.name} · ${data.projectType}`,
      html,
    })
  } catch (e) {
    console.error('BizzyPlug notification email failed:', e)
  }
}

async function sendCustomerConfirmation(name: string, email: string, projectType: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return
  try {
    const t = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#F8FAFC;color:#1E293B;padding:32px;border-radius:16px;border:1px solid #E2E8F0;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#7C3AED;">BizzyPlug</h1>
          <p style="margin:6px 0 0;color:#64748B;font-size:14px;">Project Request Received</p>
        </div>
        <p style="font-size:15px;line-height:1.7;color:#334155;">
          Hey ${name},<br><br>
          Thanks for submitting your <strong>${projectType}</strong> request! I've received your details and will follow up within 24 hours with next steps and payment info.
        </p>
        <div style="margin-top:24px;padding:16px;background:#F3E8FF;border-radius:12px;border:1px solid #C084FC33;">
          <p style="margin:0;font-size:13px;color:#6B21A8;">
            <strong>What's next?</strong> I'll review your project details and send you a quote. Once payment is confirmed, I'll get started right away.
          </p>
        </div>
        <p style="margin-top:24px;font-size:13px;color:#64748B;text-align:center;">
          Questions? Email <a href="mailto:buzyplug@gmail.com" style="color:#7C3AED;font-weight:700;">buzyplug@gmail.com</a> or DM @bizzyplug on Instagram
        </p>
      </div>
    `
    await t.sendMail({
      from: `"BizzyPlug" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Project Request Received — ${projectType}`,
      html,
    })
  } catch (e) {
    console.error('BizzyPlug customer confirmation failed:', e)
  }
}
