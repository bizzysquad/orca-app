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
      deadline, notes, referenceUrls, serviceDescriptions,
      paidAmount,
    } = body

    if (!artistName || !email) {
      return NextResponse.json({ error: 'Artist name and email are required' }, { status: 400 })
    }

    const supabase = getAdmin()

    // Auto-create project + client + notification FIRST (critical path)
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, local_data').limit(1)
      const profile = profiles?.[0]
      if (profile) {
        const localData = (profile.local_data as Record<string, any>) || {}
        const pid = Math.random().toString(36).slice(2, 10)
        const cid = Math.random().toString(36).slice(2, 10)
        const nowFull = new Date().toISOString()
        const now = nowFull.slice(0, 10)

        const parse = (v: any): any[] => { if (!v) return []; if (typeof v === 'string') { try { return JSON.parse(v) } catch { return [] } } return Array.isArray(v) ? v : [] }
        const projects: any[] = parse(localData['orca-bizzplug-clients'])
        const notifications: any[] = Array.isArray(localData['orca-bizzplug-notifications']) ? localData['orca-bizzplug-notifications'] : []

        const isPaid = (notes || '').includes('[Paid via')
        const paymentMethod = isPaid
          ? (notes || '').includes('Stripe') ? 'stripe' : (notes || '').includes('Cash App') ? 'cashapp' : (notes || '').includes('Venmo') ? 'venmo' : 'other'
          : ''
        const amount = Number(paidAmount) || 0

        projects.unshift({
          id: pid, artistName: artistName || name || '', email: email || '', phone: phone || '',
          instagram: instagram || '', projectType: projectType || 'other', status: 'new-lead',
          quote: amount, paid: isPaid ? amount : 0, paymentMethod,
          paidDate: isPaid ? nowFull : '',
          notes: notes || '', songName: songName || '', tracklist: tracklist || '', details: details || '',
          deadline: deadline || '', createdAt: nowFull,  // full ISO timestamp for notification comparison
          serviceDescriptions: serviceDescriptions || {},
          referenceUrls: referenceUrls || [],
          paymentStatus: isPaid ? 'paid' : 'pending',
        })

        // Add calendar work session for this project
        const workDate = deadline || now
        const priorityKey = `orca-priorities-${workDate}`
        const priorities: any[] = parse(localData[priorityKey])
        priorities.push({ id: `bp-${pid}`, text: `BizzyPlug: ${projectType || 'Project'} for ${artistName || name || 'Client'}`, area: 'business', completed: false, addedByBentley: false })
        localData[priorityKey] = priorities

        notifications.unshift({
          id: `notif-${Date.now()}`,
          type: 'new-lead',
          title: `New Project: ${artistName || name || 'Client'}`,
          message: `${projectType || 'Service request'}${isPaid ? ` — ${paymentMethod} payment received` : ''}`,
          email: email || '',
          createdAt: nowFull,
          read: false,
        })

        // Re-read clients fresh to avoid race condition overwriting concurrent submissions
        const { data: freshProfiles } = await supabase.from('profiles').select('id, local_data').limit(1)
        const freshData = (freshProfiles?.[0]?.local_data as Record<string, any>) || {}
        const clients: any[] = parse(freshData['orca-bizzplug-client-db'])
        const clientKey = (email || artistName || '').toLowerCase()
        const existingClient = clients.find((c: any) => (c.email || c.artistName || '').toLowerCase() === clientKey)
        if (existingClient) {
          if (phone && !existingClient.phone) existingClient.phone = phone
          if (instagram && !existingClient.instagram) existingClient.instagram = instagram
        } else if (clientKey) {
          clients.push({ id: cid, artistName: artistName || name || '', email: email || '', phone: phone || '', instagram: instagram || '', createdAt: now })
        }

        // Update sync timestamps so pullFromCloud() treats this server-written data as newest
        const TIMESTAMPS_KEY = '_orca-sync-timestamps'
        const existingTs = (localData[TIMESTAMPS_KEY] as Record<string, string>) || {}
        const freshTs = (freshData[TIMESTAMPS_KEY] as Record<string, string>) || {}
        const newTimestamps = {
          ...existingTs,
          ...freshTs,
          'orca-bizzplug-clients': nowFull,
          'orca-bizzplug-client-db': nowFull,
          'orca-bizzplug-notifications': nowFull,
        }

        await supabase.from('profiles').update({
          local_data: {
            ...localData,
            ...freshData,
            'orca-bizzplug-clients': projects,
            'orca-bizzplug-client-db': clients,
            'orca-bizzplug-notifications': notifications.slice(0, 50),
            [TIMESTAMPS_KEY]: newTimestamps,
          },
        }).eq('id', profile.id)
      }
    } catch (e) { console.error('Auto-create project/client failed:', e) }

    await Promise.all([
      sendNotification({ name, artistName, email, phone, instagram, projectType, songName, details, deadline, notes }, serviceDescriptions || {}),
      sendCustomerConfirmation(name, email, projectType),
    ])

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Bizzyplug intake error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function sendNotification(data: Record<string, string>, svcDescs: Record<string, string> = {}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return
  try {
    const t = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
    const svcDescRows = Object.entries(svcDescs).filter(([, v]) => v).map(([svc, desc]) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #27272a;color:#94A3B8;font-size:13px;width:120px;">${svc}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #27272a;color:#F1F5F9;font-size:13px;">${desc}</td>
      </tr>
    `).join('')
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
        ${svcDescRows ? `
          <div style="margin-top:20px;padding:16px;background:#18181b;border-radius:12px;border:1px solid #27272a;">
            <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#C084FC;">Service Descriptions</p>
            <table style="width:100%;border-collapse:collapse;">${svcDescRows}</table>
          </div>
        ` : ''}
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
