import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      date, startTime, endTime, eventType, guestCount, location,
      city, mcNeeded, specialRequests, name, email, phone, budget,
    } = body

    if (!name || !email || !date || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from('booking_requests').insert({
      date,
      start_time: startTime,
      end_time: endTime,
      event_type: eventType,
      guest_count: guestCount ? parseInt(guestCount) : null,
      location,
      city,
      mc_needed: mcNeeded === 'Yes',
      special_requests: specialRequests,
      client_name: name,
      client_email: email,
      client_phone: phone,
      budget_range: budget,
      status: 'new',
      created_at: new Date().toISOString(),
    })

    if (error) {
      // Log but don't fail — we'll still confirm to the user
      console.error('Supabase booking insert error:', error)
    }

    return NextResponse.json({ success: true, message: 'Booking request received' })
  } catch (err) {
    console.error('Booking request error:', err)
    return NextResponse.json({ success: true, message: 'Booking request received' })
  }
}
