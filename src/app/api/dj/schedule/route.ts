import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Public endpoint — returns upcoming events for the maskoffdadj posterboard.
// Includes both confirmed client bookings AND gigs entered via the DJ Gig Manager.
export async function GET() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)

    // Client-submitted bookings (quoted or confirmed)
    const { data: clientEvents } = await supabase
      .from('booking_requests')
      .select('id, date, event_type, city, start_time, end_time, status')
      .in('status', ['booked', 'quoted'])
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(20)

    // DJ Gig Manager entries (active, non-cancelled gigs)
    const { data: gigEvents } = await supabase
      .from('booking_requests')
      .select('id, date, event_type, city, start_time, end_time, status, notes')
      .eq('status', 'dj_blocked')
      .eq('client_name', '__DJ_GIG__')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(20)

    // Normalize DJ gig entries — expose them as 'booked' on the public schedule
    // Parse gigStatus from notes to filter out completed gigs (they already happened)
    const normalizedGigs = (gigEvents || [])
      .filter((e: any) => {
        try {
          const parsed = JSON.parse(e.notes || '{}')
          return parsed.gigStatus !== 'completed'
        } catch {
          return true
        }
      })
      .map((e: any) => ({
        id: e.id,
        date: e.date,
        event_type: e.event_type,
        city: e.city,
        start_time: e.start_time,
        end_time: e.end_time,
        status: 'booked',
      }))

    // Merge and sort by date, deduplicate by date (prefer client events)
    const clientDates = new Set((clientEvents || []).map((e: any) => e.date))
    const dedupedGigs = normalizedGigs.filter((e: any) => !clientDates.has(e.date))

    const allEvents = [...(clientEvents || []), ...dedupedGigs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 30)

    return NextResponse.json({ events: allEvents })
  } catch {
    return NextResponse.json({ events: [] })
  }
}
