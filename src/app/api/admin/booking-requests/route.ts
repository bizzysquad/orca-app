import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('booking_requests')
      .select('*')
      .not('status', 'eq', 'dj_blocked')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ requests: data || [] })
  } catch (err: any) {
    console.error('[admin/booking-requests GET]', err)
    return NextResponse.json({ requests: [], error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { id, status, notes } = await req.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    const update: Record<string, unknown> = { status }
    if (notes !== undefined) update.notes = notes

    const { error } = await supabase
      .from('booking_requests')
      .update(update)
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[admin/booking-requests PATCH]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { id } = await req.json()

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabase
      .from('booking_requests')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[admin/booking-requests DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
