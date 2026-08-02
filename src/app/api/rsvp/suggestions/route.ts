import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { getStaff } from '@/lib/rsvp/staffAuth'
import { getClientIp, hashIp, isValidEmail } from '@/lib/rsvp/request'

export const dynamic = 'force-dynamic'

const RATE_LIMIT_WINDOW_MIN = 30
const RATE_LIMIT_MAX = 5

export async function GET(req: NextRequest) {
  const staff = await getStaff(req)
  const supabase = getRsvpAdmin()
  const eventId = req.nextUrl.searchParams.get('event_id')

  if (staff) {
    let query = supabase.from('rsvp_suggestions').select('*').order('created_at', { ascending: false })
    if (eventId) query = query.eq('event_id', eventId)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ suggestions: data || [] })
  }

  // Public: only approved suggestions, and only non-PII fields
  let query = supabase
    .from('rsvp_suggestions')
    .select('id, event_idea, preferred_location, preferred_weekend, preferred_music, artist_suggestion, theme_suggestion, comments, created_at')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(50)
  if (eventId) query = query.eq('event_id', eventId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ suggestions: data || [] })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = String(body?.name || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    if (!name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    if (!isValidEmail(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })

    const supabase = getRsvpAdmin()
    const ip = getClientIp(req)
    const ipHash = await hashIp(ip)
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString()

    // Reuse the votes table's ip_hash trail as a lightweight cross-endpoint
    // spam signal isn't available here, so rate-limit suggestions on email+recency instead.
    const { count: recentByEmail } = await supabase
      .from('rsvp_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', windowStart)
    if ((recentByEmail || 0) >= RATE_LIMIT_MAX) {
      return NextResponse.json({ error: 'Too many suggestions submitted recently. Please try again later.' }, { status: 429 })
    }

    const { data, error } = await supabase
      .from('rsvp_suggestions')
      .insert({
        event_id: body?.event_id || null,
        name,
        email,
        event_idea: body?.event_idea || '',
        preferred_location: body?.preferred_location || '',
        preferred_weekend: body?.preferred_weekend || '',
        preferred_music: body?.preferred_music || '',
        artist_suggestion: body?.artist_suggestion || '',
        theme_suggestion: body?.theme_suggestion || '',
        comments: body?.comments || '',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ suggestion: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit suggestion' }, { status: 500 })
  }
}
