import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Public endpoint — returns upcoming booked events without sensitive client info
export async function GET() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)

    const { data } = await supabase
      .from('booking_requests')
      .select('id, date, event_type, city, start_time, end_time, status')
      .in('status', ['booked', 'quoted'])
      .gte('date', today)
      .not('status', 'eq', 'dj_blocked')
      .order('date', { ascending: true })
      .limit(20)

    return NextResponse.json({ events: data || [] })
  } catch {
    return NextResponse.json({ events: [] })
  }
}
