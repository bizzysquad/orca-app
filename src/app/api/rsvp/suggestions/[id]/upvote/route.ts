import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { getClientIp, hashIp } from '@/lib/rsvp/request'
import { VISITOR_COOKIE, VISITOR_COOKIE_MAX_AGE, randomVisitorToken } from '@/lib/rsvp/community'

export const dynamic = 'force-dynamic'

const RATE_LIMIT_WINDOW_MIN = 10
const RATE_LIMIT_MAX = 40

// POST toggles the visitor's upvote on an approved idea. One upvote per
// visitor cookie per idea, plus an IP rate limit to slow down cookie-clearing.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getRsvpAdmin()

    const { data: idea } = await supabase.from('rsvp_suggestions').select('id, is_approved').eq('id', params.id).single()
    if (!idea || !idea.is_approved) return NextResponse.json({ error: 'Idea not found' }, { status: 404 })

    let visitor = req.cookies.get(VISITOR_COOKIE)?.value
    const isNewVisitor = !visitor
    if (!visitor) visitor = randomVisitorToken()

    const { data: existing } = await supabase
      .from('rsvp_idea_upvotes')
      .select('id')
      .eq('suggestion_id', params.id)
      .eq('voter_key', visitor)
      .maybeSingle()

    let voted: boolean
    if (existing) {
      const { error } = await supabase.from('rsvp_idea_upvotes').delete().eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      voted = false
    } else {
      const ipHash = await hashIp(getClientIp(req))
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('rsvp_idea_upvotes')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', windowStart)
      if ((count || 0) >= RATE_LIMIT_MAX) {
        return NextResponse.json({ error: 'Too many votes from this connection. Try again in a few minutes.' }, { status: 429 })
      }
      const { error } = await supabase.from('rsvp_idea_upvotes').insert({ suggestion_id: params.id, voter_key: visitor, ip_hash: ipHash })
      // 23505 = double-click race; the vote already exists, which is what they wanted
      if (error && error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 })
      voted = true
    }

    const { data: fresh } = await supabase.from('rsvp_suggestions').select('upvote_count').eq('id', params.id).single()
    const res = NextResponse.json({ voted, upvotes: fresh?.upvote_count ?? 0 })
    if (isNewVisitor) {
      res.cookies.set(VISITOR_COOKIE, visitor, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: VISITOR_COOKIE_MAX_AGE })
    }
    return res
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to vote' }, { status: 500 })
  }
}
