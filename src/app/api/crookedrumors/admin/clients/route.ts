import { NextRequest, NextResponse } from 'next/server'
import { requireCrAdmin } from '@/lib/crooked/auth'
import { getCrAdmin } from '@/lib/crooked/db'
import { DEFAULT_DELIVERY_TEMPLATES, TEMPLATES_ROW_ID, cleanTemplates } from '@/lib/crooked/clients'
import type { CrClient, Delivery } from '@/lib/crooked/clients'

export const dynamic = 'force-dynamic'

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
const isMissingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST205' || e.code === '42P01' || /schema cache|does not exist/i.test(e.message || ''))

// Client list = everyone who has booked (grouped by email) merged with
// hand-added clients / notes from cr_clients. Delivery history comes along.
export async function GET(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  const supabase = getCrAdmin()

  const [bookingsRes, clientsRes, deliveriesRes, tplRes] = await Promise.all([
    supabase
      .from('cr_bookings')
      .select('id, ref, client_name, client_email, client_phone, client_instagram, company, package_name, category_name, status, project_date, total_cents, amount_paid_cents, created_at')
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase.from('cr_clients').select('*'),
    supabase.from('cr_deliveries').select('*').order('created_at', { ascending: false }).limit(500),
    supabase.from('cr_site').select('data').eq('id', TEMPLATES_ROW_ID).maybeSingle(),
  ])

  if (bookingsRes.error) return NextResponse.json({ clients: [], deliveries: [], templates: DEFAULT_DELIVERY_TEMPLATES, dbReady: false, error: bookingsRes.error.message })
  const clientsReady = !isMissingTable(clientsRes.error) && !isMissingTable(deliveriesRes.error)

  const map = new Map<string, CrClient>()
  const get = (email: string): CrClient => {
    const key = email.trim().toLowerCase()
    let c = map.get(key)
    if (!c) {
      c = { key, email: email.trim(), name: '', phone: '', instagram: '', company: '', notes: '', manual: false, bookings: [], totalPaidCents: 0, lastActivity: '', deliveries: 0, lastDelivered: null }
      map.set(key, c)
    }
    return c
  }

  // Bookings come newest first, so the first non-empty value wins.
  for (const b of bookingsRes.data || []) {
    if (!b.client_email) continue
    const c = get(b.client_email)
    c.name ||= b.client_name || ''
    c.phone ||= b.client_phone || ''
    c.instagram ||= b.client_instagram || ''
    c.company ||= b.company || ''
    c.bookings.push({
      id: b.id, ref: b.ref, package_name: b.package_name, category_name: b.category_name, status: b.status,
      project_date: b.project_date, total_cents: b.total_cents, amount_paid_cents: b.amount_paid_cents, created_at: b.created_at,
    })
    c.totalPaidCents += b.amount_paid_cents || 0
    if (b.created_at > c.lastActivity) c.lastActivity = b.created_at
  }

  // Hand-entered details override booking details.
  for (const row of clientsReady ? clientsRes.data || [] : []) {
    const c = get(row.email)
    c.manual = true
    c.name = row.name || c.name
    c.phone = row.phone || c.phone
    c.instagram = row.instagram || c.instagram
    c.company = row.company || c.company
    c.notes = row.notes || ''
    if (!c.lastActivity) c.lastActivity = row.created_at
  }

  const deliveries = (clientsReady ? deliveriesRes.data || [] : []) as Delivery[]
  for (const d of deliveries) {
    const c = map.get(d.client_email.toLowerCase())
    if (!c || d.status !== 'sent') continue
    c.deliveries++
    if (!c.lastDelivered || d.created_at > c.lastDelivered) c.lastDelivered = d.created_at
    if (d.created_at > c.lastActivity) c.lastActivity = d.created_at
  }

  const clients = Array.from(map.values()).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))
  const templates = tplRes.data?.data?.templates ? cleanTemplates(tplRes.data.data.templates) : DEFAULT_DELIVERY_TEMPLATES
  return NextResponse.json({ clients, deliveries, templates, dbReady: true, clientsReady })
}

// Add a client, or save details / notes for an existing one (keyed by email).
export async function POST(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  const body = await req.json().catch(() => ({}))
  const email = str(body?.email, 200).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 })
  const row = {
    email,
    name: str(body?.name, 120),
    phone: str(body?.phone, 40),
    instagram: str(body?.instagram, 120),
    company: str(body?.company, 120),
    notes: String(body?.notes ?? '').slice(0, 5000),
    updated_at: new Date().toISOString(),
  }
  const { error } = await getCrAdmin().from('cr_clients').upsert(row, { onConflict: 'email' })
  if (error) return NextResponse.json({ error: isMissingTable(error) ? 'Run supabase-migration-crookedrumor-clients.sql first' : error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Removes the hand-entered record only. Clients with bookings stay listed.
export async function DELETE(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  const email = (req.nextUrl.searchParams.get('email') || '').toLowerCase()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })
  const { error } = await getCrAdmin().from('cr_clients').delete().eq('email', email)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Save delivery reply templates (server side, so every device sees the same set).
export async function PUT(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  const body = await req.json().catch(() => ({}))
  const templates = cleanTemplates(body?.templates)
  const { error } = await getCrAdmin()
    .from('cr_site')
    .upsert({ id: TEMPLATES_ROW_ID, data: { templates }, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates })
}
