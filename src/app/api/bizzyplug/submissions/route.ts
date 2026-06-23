import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  try {
    const supabase = getAdmin()
    const { data: rows, error } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('name', '__BIZZYPLUG__')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ submissions: [], error: error.message })
    }

    const submissions = (rows || []).map((r: any) => {
      let parsed: any = {}
      try { parsed = JSON.parse(r.message || '{}') } catch {}
      return {
        id: r.id,
        name: r.client_name || r.email,
        email: r.client_email || r.email,
        phone: r.client_phone || r.phone || '',
        artistName: parsed.artistName || r.venue || '',
        instagram: parsed.instagram || '',
        projectType: r.event_type || '',
        songName: parsed.songName || '',
        tracklist: parsed.tracklist || '',
        details: parsed.details || '',
        notes: parsed.notes || '',
        deadline: r.event_date || '',
        status: r.status || 'pending',
        createdAt: r.created_at || '',
      }
    })

    return NextResponse.json({ submissions })
  } catch (err: any) {
    return NextResponse.json({ submissions: [], error: err.message })
  }
}
