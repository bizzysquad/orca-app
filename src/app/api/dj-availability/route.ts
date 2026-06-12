import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch confirmed/pending gigs from Supabase (public gigs table)
    const { data: gigs } = await supabase
      .from('dj_public_gigs')
      .select('date')
      .in('status', ['confirmed', 'pending'])

    const bookedDates: string[] = (gigs || []).map((g: { date: string }) => g.date)

    return NextResponse.json({ bookedDates })
  } catch {
    // Return empty if table doesn't exist yet
    return NextResponse.json({ bookedDates: [] })
  }
}
