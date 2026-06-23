import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Actual DB columns: id, name, email, phone, event_date, event_start_time, event_end_time,
// venue, location, event_type, message, status, created_at
// Frontend expects: client_name, client_email, client_phone, date, city, start_time, end_time, special_requests

function dbToFrontend(row: any) {
  return {
    id: row.id,
    client_name: row.name,
    client_email: row.email,
    client_phone: row.phone,
    date: row.event_date,
    start_time: row.event_start_time,
    end_time: row.event_end_time,
    city: row.venue || '',
    location: row.location || '',
    event_type: row.event_type,
    special_requests: row.message || '',
    status: row.status,
    created_at: row.created_at,
  }
}

export async function GET() {
  try {
    const supabase = getAdmin()
    const { data, error } = await supabase
      .from('booking_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    const bookings = (data || []).map(dbToFrontend)
    return NextResponse.json({ bookings })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getAdmin()
    const body = await req.json()
    const { id, status, ...rest } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const updates: Record<string, any> = {}
    if (status) updates.status = status

    const { data, error } = await supabase
      .from('booking_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ booking: dbToFrontend(data) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
