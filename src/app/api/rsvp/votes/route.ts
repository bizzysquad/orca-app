import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { getClientIp, hashIp, isValidEmail } from '@/lib/rsvp/request'
import { sendTemplatedEmail } from '@/lib/rsvp/email'
import { getRsvpAppUrl } from '@/lib/rsvp/url'

export const dynamic = 'force-dynamic'

const VISITOR_COOKIE = 'rsvp-visitor'
const RATE_LIMIT_WINDOW_MIN = 10
const RATE_LIMIT_MAX_VOTES = 8

function randomSessionToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eventId = String(body?.event_id || '')
    const type = body?.type === 'poll' ? 'poll' : 'date'
    const voterName = String(body?.voter_name || '').trim()
    const voterEmail = String(body?.voter_email || '').trim().toLowerCase()
    const guestCount = Math.max(0, Math.min(50, Number(body?.guest_count) || 0))
    const wantsUpdates = !!body?.wants_updates

    if (!eventId || !voterName || !voterEmail) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }
    if (!isValidEmail(voterEmail)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }

    const supabase = getRsvpAdmin()

    const { data: event } = await supabase.from('rsvp_events').select('id, name, slug, status').eq('id', eventId).single()
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (!['collecting_interest', 'voting_open'].includes(event.status)) {
      return NextResponse.json({ error: 'Voting is not currently open for this event' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const ipHash = await hashIp(ip)

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('rsvp_votes')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('ip_hash', ipHash)
      .gte('created_at', windowStart)

    if ((recentCount || 0) >= RATE_LIMIT_MAX_VOTES) {
      return NextResponse.json({ error: 'Too many votes from this connection. Please try again later.' }, { status: 429 })
    }

    let sessionToken = req.cookies.get(VISITOR_COOKIE)?.value
    if (!sessionToken) sessionToken = randomSessionToken()

    const insertRow: Record<string, unknown> = {
      event_id: eventId,
      voter_name: voterName,
      voter_email: voterEmail,
      guest_count: guestCount,
      wants_updates: wantsUpdates,
      ip_hash: ipHash,
      session_token: sessionToken,
    }

    if (type === 'date') {
      const dateId = String(body?.date_id || '')
      if (!dateId) return NextResponse.json({ error: 'Select a date to vote for' }, { status: 400 })
      insertRow.date_id = dateId
    } else {
      const pollQuestionId = String(body?.poll_question_id || '')
      const pollOptionId = String(body?.poll_option_id || '')
      if (!pollQuestionId || !pollOptionId) {
        return NextResponse.json({ error: 'Select an option to vote for' }, { status: 400 })
      }
      insertRow.poll_question_id = pollQuestionId
      insertRow.poll_option_id = pollOptionId
    }

    const { data, error } = await supabase.from('rsvp_votes').insert(insertRow).select().single()

    if (error) {
      // Unique-constraint violation = they already voted on this date/question
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error:
              'This email has already voted' +
              (type === 'date' ? ' for a date' : ' on this question') +
              ' in this event. Use the secure link from your confirmation email to change your vote, or request a new link.',
            alreadyVoted: true,
          },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await sendTemplatedEmail({
      templateKey: 'vote_confirmation',
      eventId,
      to: voterEmail,
      vars: { event_name: event.name, manage_url: `${getRsvpAppUrl()}/RSVP/manage/${data.edit_token}` },
    })

    const res = NextResponse.json({ vote: data, editToken: data.edit_token })
    res.cookies.set(VISITOR_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    })
    return res
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit vote' }, { status: 500 })
  }
}
