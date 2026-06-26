import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const today = new Date().toISOString().slice(0, 10)

    const params = new URLSearchParams({
      select: 'id,event_date,event_type,venue,event_start_time,event_end_time,message',
      name: 'eq.__DJ_GIG__',
      event_date: `gte.${today}`,
      order: 'event_date.asc',
      limit: '30',
    })

    const res = await fetch(`${url}/rest/v1/booking_requests?${params}`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ gigs: [] })
    }

    const rows: any[] = await res.json()

    const seen = new Set<string>()
    const gigs = rows
      .filter((e: any) => {
        try {
          const parsed = JSON.parse(e.message || '{}')
          return parsed.gigStatus !== 'completed'
        } catch { return true }
      })
      .map((e: any) => {
        let gigId = ''
        let clientName = ''
        let customEventType = ''
        let ticketLink = ''
        try {
          const parsed = JSON.parse(e.message || '{}')
          gigId = parsed.id || ''
          clientName = parsed.clientName || ''
          customEventType = parsed.customEventType || ''
          ticketLink = parsed.ticketLink || ''
        } catch {}
        return {
          id: e.id,
          gigId,
          date: e.event_date,
          eventType: customEventType || e.event_type,
          venue: e.venue || '',
          city: '',
          clientName,
          startTime: e.event_start_time,
          endTime: e.event_end_time,
          ticketLink,
          status: 'confirmed',
        }
      })
      .filter((g: any) => {
        const key = g.gigId || `${g.date}-${g.eventType}-${g.venue}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

    return NextResponse.json({ gigs })
  } catch (err: any) {
    console.error('Schedule API error:', err)
    return NextResponse.json({ gigs: [] })
  }
}
