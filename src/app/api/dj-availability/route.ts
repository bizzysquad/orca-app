import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// DB columns: id, name, email, phone, event_date, event_start_time, event_end_time,
// venue, location, event_type, message, status, created_at
// Allowed status values: pending, confirmed, declined

export async function GET() {
  try {
    const supabase = getAdmin()
    const { data } = await supabase
      .from('booking_requests')
      .select('event_date')
      .in('status', ['pending', 'confirmed'])
      .not('event_date', 'is', null)

    const bookedDates: string[] = [...new Set((data || []).map((r: any) => r.event_date))]
    return NextResponse.json({ bookedDates })
  } catch {
    return NextResponse.json({ bookedDates: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdmin()
    const body = await req.json()

    if (body.add) {
      const { error } = await supabase.from('booking_requests').insert({
        event_date: body.add,
        status: 'confirmed',
        name: '__DJ_BLOCK__',
        email: 'noreply@maskoffdadj.com',
        event_type: 'Blocked',
        created_at: new Date().toISOString(),
      })
      if (error) throw error
      return NextResponse.json({ success: true, synced: 1 })
    }

    const { dates } = body as { dates: string[] }
    await supabase.from('booking_requests').delete().eq('name', '__DJ_BLOCK__')

    if (dates && dates.length > 0) {
      const rows = dates.map((date: string) => ({
        event_date: date,
        status: 'confirmed',
        name: '__DJ_BLOCK__',
        email: 'noreply@maskoffdadj.com',
        event_type: 'Private',
        created_at: new Date().toISOString(),
      }))
      await supabase.from('booking_requests').insert(rows)
    }

    return NextResponse.json({ success: true, synced: dates?.length || 0 })
  } catch (err: any) {
    console.error('Availability sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
