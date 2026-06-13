import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST — full DJ Gig Manager sync
// Rebuilds all __DJ_GIG__ entries in booking_requests from the current gig list.
// Also detects double-booking conflicts with existing client submissions.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { gigs } = await req.json()

    if (!Array.isArray(gigs)) {
      return NextResponse.json({ error: 'gigs must be an array' }, { status: 400 })
    }

    // Delete all previous DJ Gig Manager sync entries (leaves manual __DJ_BLOCK__ entries intact)
    await supabase
      .from('booking_requests')
      .delete()
      .eq('status', 'dj_blocked')
      .eq('client_name', '__DJ_GIG__')

    // Sync all non-cancelled gigs (cancelled gigs don't block dates or show on schedule)
    const gigsToSync = gigs.filter((g: any) => g.date && g.status !== 'cancelled')

    if (gigsToSync.length > 0) {
      const rows = gigsToSync.map((g: any) => ({
        date: g.date,
        status: 'dj_blocked',
        client_name: '__DJ_GIG__',
        client_email: g.clientEmail || 'dj@maskoffdadj.com',
        event_type: g.eventType || 'private',
        start_time: g.startTime || null,
        end_time: g.endTime || null,
        city: g.venue || null,
        notes: JSON.stringify({ id: g.id, clientName: g.clientName, gigStatus: g.status }),
        created_at: new Date().toISOString(),
      }))

      const { error: insertError } = await supabase
        .from('booking_requests')
        .insert(rows)

      if (insertError) throw insertError
    }

    // Double-booking detection: look for client submissions on the same dates as active gigs
    const activeDates = gigsToSync
      .filter((g: any) => g.status !== 'completed')
      .map((g: any) => g.date)
      .filter(Boolean)

    let conflicts: { date: string; clientName: string }[] = []

    if (activeDates.length > 0) {
      const { data: clientBookings } = await supabase
        .from('booking_requests')
        .select('date, client_name')
        .in('date', activeDates)
        .in('status', ['new', 'reviewed', 'quoted', 'booked'])

      conflicts = (clientBookings || []).map((b: any) => ({
        date: b.date,
        clientName: b.client_name,
      }))
    }

    return NextResponse.json({
      success: true,
      synced: gigsToSync.length,
      conflicts,
    })
  } catch (err: any) {
    console.error('DJ sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
