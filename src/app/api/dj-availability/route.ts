import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — public endpoint the website calendar reads to show blocked dates
export async function GET() {
  try {
    const supabase = await createClient()

    // Read booked dates from booking_requests:
    // 1. Any public quote/booking submitted via the website (new/reviewed/quoted/booked)
    // 2. DJ-side manual blocks (status = 'dj_blocked') synced from the private app
    const { data } = await supabase
      .from('booking_requests')
      .select('date')
      .in('status', ['new', 'reviewed', 'quoted', 'booked', 'dj_blocked'])
      .not('date', 'is', null)

    const bookedDates: string[] = [...new Set((data || []).map((r: { date: string }) => r.date))]

    return NextResponse.json({ bookedDates })
  } catch {
    return NextResponse.json({ bookedDates: [] })
  }
}

// POST — private endpoint called by the DJ Gig Manager to sync confirmed gig dates
// Clears old DJ-side blocks then inserts current confirmed/pending gig dates
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { dates } = await req.json() as { dates: string[] }

    // Delete previous DJ-side blocks
    await supabase
      .from('booking_requests')
      .delete()
      .eq('status', 'dj_blocked')

    // Insert new blocks for each confirmed/pending gig date
    if (dates && dates.length > 0) {
      const rows = dates.map((date: string) => ({
        date,
        status: 'dj_blocked',
        client_name: '__DJ_BLOCK__',
        client_email: 'noreply@maskoffdadj.com',
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
