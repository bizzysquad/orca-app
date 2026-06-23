import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// The gigs list from localStorage is the SINGLE SOURCE OF TRUTH.
// This endpoint rebuilds the entire booking_requests table to match.
// Approved quotes that became gigs are already in the gigs list.
// Pending quotes (customer submissions not yet approved) are preserved.

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdmin()
    const { gigs } = await req.json()

    if (!Array.isArray(gigs)) {
      return NextResponse.json({ error: 'gigs must be an array' }, { status: 400 })
    }

    // Delete ALL non-pending rows — only pending customer quotes survive
    // This removes old __DJ_GIG__ rows, approved quotes, manual blocks, etc.
    await supabase
      .from('booking_requests')
      .delete()
      .neq('status', 'pending')

    // Also delete old __DJ_GIG__ entries that might be pending
    await supabase
      .from('booking_requests')
      .delete()
      .eq('name', '__DJ_GIG__')

    // Insert active gigs (non-cancelled, non-completed with future dates)
    const gigsToSync = gigs.filter((g: any) => g.date && g.status !== 'cancelled')

    if (gigsToSync.length > 0) {
      const rows = gigsToSync.map((g: any) => ({
        event_date: g.date,
        status: 'confirmed',
        name: '__DJ_GIG__',
        email: g.clientEmail || 'dj@maskoffdadj.com',
        event_type: g.customEventType || g.eventType || 'private',
        event_start_time: g.startTime || null,
        event_end_time: g.endTime || null,
        venue: g.venue || null,
        message: JSON.stringify({ id: g.id, clientName: g.clientName, gigStatus: g.status, customEventType: g.customEventType || '', ticketLink: g.ticketLink || '' }),
        created_at: new Date().toISOString(),
      }))

      const { error: insertError } = await supabase
        .from('booking_requests')
        .insert(rows)

      if (insertError) throw insertError
    }

    return NextResponse.json({
      success: true,
      synced: gigsToSync.length,
      conflicts: [],
    })
  } catch (err: any) {
    console.error('DJ sync error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
