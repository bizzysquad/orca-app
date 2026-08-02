import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import {
  ROLE_LABELS,
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_MAX_AGE,
  roleForPassword,
  signStaffSession,
  verifyStaffSession,
} from '@/lib/rsvp/session'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const password = String(body?.password || '')
    const displayName = String(body?.displayName || '').trim().slice(0, 80)

    if (!password || !displayName) {
      return NextResponse.json({ error: 'Name and password are required' }, { status: 400 })
    }

    const secret = process.env.RSVP_STAFF_SESSION_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: 'Staff login is not configured yet (missing RSVP_STAFF_SESSION_SECRET)' },
        { status: 503 }
      )
    }

    const role = roleForPassword(password)
    if (!role) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const token = await signStaffSession({ role, displayName }, secret)

    try {
      const supabase = getRsvpAdmin()
      await supabase.from('rsvp_staff_sessions').insert({ role, display_name: displayName })
    } catch (err) {
      console.error('[rsvp staff login] failed to record session row', err)
    }

    const res = NextResponse.json({
      success: true,
      role,
      roleLabel: ROLE_LABELS[role],
      displayName,
    })
    res.cookies.set(STAFF_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: STAFF_SESSION_MAX_AGE,
    })
    return res
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete(STAFF_SESSION_COOKIE)
  return res
}

export async function GET(req: NextRequest) {
  const secret = process.env.RSVP_STAFF_SESSION_SECRET
  const token = req.cookies.get(STAFF_SESSION_COOKIE)?.value
  const payload = secret ? await verifyStaffSession(token, secret) : null
  if (!payload) return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({
    authenticated: true,
    role: payload.role,
    roleLabel: ROLE_LABELS[payload.role],
    displayName: payload.displayName,
  })
}
