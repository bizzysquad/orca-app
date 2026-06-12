import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `MODDJ-${year}-${rand}`
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('dj_invoices')
      .select('*, dj_clients(name, email)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ invoices: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
      client_id, booking_request_id, event_date, event_type,
      line_items, subtotal, deposit_amount, balance_due,
      due_date, notes, client_name, client_email, client_phone,
    } = body

    const invoice_number = generateInvoiceNumber()

    const { data, error } = await supabase
      .from('dj_invoices')
      .insert({
        invoice_number,
        client_id: client_id || null,
        booking_request_id: booking_request_id || null,
        event_date: event_date || null,
        event_type: event_type || null,
        status: 'draft',
        line_items: line_items || [],
        subtotal: subtotal || 0,
        deposit_amount: deposit_amount || 0,
        deposit_paid: false,
        balance_due: balance_due || subtotal || 0,
        due_date: due_date || null,
        notes: notes || null,
        client_name: client_name || null,
        client_email: client_email || null,
        client_phone: client_phone || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ invoice: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    if (updates.status === 'paid' && !updates.paid_at) {
      updates.paid_at = new Date().toISOString()
    }
    if (updates.status === 'sent' && !updates.sent_at) {
      updates.sent_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('dj_invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ invoice: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
