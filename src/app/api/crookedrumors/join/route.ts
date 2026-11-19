import { NextRequest, NextResponse } from 'next/server'
import { getCrAdmin, loadSite } from '@/lib/crooked/db'
import { notifyNewApplication } from '@/lib/crooked/notify'
import { TEAM_SKILLS, UNPAID_OPTIONS, validateApplication } from '@/lib/crooked/team'
import { getClientIp, hashIp } from '@/lib/rsvp/request'

export const dynamic = 'force-dynamic'

// Spam controls, layered:
//  1. honeypot field ("website") that people never see but bots fill
//  2. minimum time between page load and submit (bots post instantly)
//  3. per IP limit and per email limit, counted from the table itself so it
//     holds across serverless instances
//  4. strict server side validation and length caps on every field
const MIN_FILL_MS = 4000
const IP_WINDOW_MIN = 60
const IP_MAX = 3
const EMAIL_WINDOW_HOURS = 24
const EMAIL_MAX = 2

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    // Pretend success so bots don't learn which check caught them.
    if (body.website) return NextResponse.json({ ok: true })
    const startedAt = Number(body.startedAt)
    if (!startedAt || Date.now() - startedAt < MIN_FILL_MS) return NextResponse.json({ ok: true })

    const { value, errors } = validateApplication(body)
    if (Object.keys(errors).length) {
      return NextResponse.json({ error: 'Please fix the highlighted fields', fieldErrors: errors }, { status: 400 })
    }

    const supabase = getCrAdmin()
    const ipHash = await hashIp(getClientIp(req))

    const [{ count: byIp, error: dbErr }, { count: byEmail }] = await Promise.all([
      supabase
        .from('cr_applications')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', new Date(Date.now() - IP_WINDOW_MIN * 60_000).toISOString()),
      supabase
        .from('cr_applications')
        .select('id', { count: 'exact', head: true })
        .eq('email', value.email) // stored lowercased; eq avoids ilike treating "_" as a wildcard
        .gte('created_at', new Date(Date.now() - EMAIL_WINDOW_HOURS * 3_600_000).toISOString()),
    ])
    if (dbErr) {
      console.error('[crookedrumors join] db', dbErr.message)
      return NextResponse.json({ error: 'Applications are temporarily unavailable. Please try again soon.' }, { status: 503 })
    }
    if ((byIp || 0) >= IP_MAX || (byEmail || 0) >= EMAIL_MAX) {
      return NextResponse.json(
        { error: 'We already got your application. Thanks! If you need to add something, reach out to us directly.' },
        { status: 429 }
      )
    }

    const { data: row, error } = await supabase
      .from('cr_applications')
      .insert({
        ...value,
        status: 'new',
        ip_hash: ipHash,
        user_agent: (req.headers.get('user-agent') || '').slice(0, 300),
      })
      .select('id')
      .single()
    // Count-only (HEAD) queries above can't report a missing table, so the
    // insert is where an unrun migration shows up.
    if (error && (error.code === 'PGRST205' || error.code === '42P01' || /schema cache|does not exist/i.test(error.message))) {
      console.error('[crookedrumors join] cr_applications missing: run supabase-migration-crookedrumor-team.sql')
      return NextResponse.json({ error: 'Applications are temporarily unavailable. Please try again soon.' }, { status: 503 })
    }
    if (error || !row) throw new Error(error?.message || 'Could not save application')

    // Email failure never fails the submission (send() swallows errors).
    const { site } = await loadSite()
    const skills = value.skills
      .map(id => (id === 'other' ? `Other: ${value.skills_other}` : TEAM_SKILLS.find(s => s.id === id)?.label || id))
      .join(', ')
    const openness = UNPAID_OPTIONS.find(o => o.id === value.unpaid_openness)?.label || value.unpaid_openness
    await notifyNewApplication(value, skills, openness, site.settings, `${req.nextUrl.origin}/crookedrumor/admin?tab=team`)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[crookedrumors join]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
