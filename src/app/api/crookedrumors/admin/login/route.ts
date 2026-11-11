import { NextRequest, NextResponse } from 'next/server'
import { crAdminPassword, passwordMatches } from '@/lib/crooked/auth'
import { CR_ADMIN_COOKIE, CR_ADMIN_MAX_AGE, signCrAdmin, verifyCrAdmin } from '@/lib/crooked/session'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!crAdminPassword()) return NextResponse.json({ error: 'Admin password is not configured' }, { status: 503 })
  if (!passwordMatches(String(body?.password || ''))) {
    await new Promise(r => setTimeout(r, 600)) // slow down guessing
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }
  const token = await signCrAdmin()
  if (!token) return NextResponse.json({ error: 'Admin sessions are not configured' }, { status: 503 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(CR_ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CR_ADMIN_MAX_AGE,
  })
  return res
}

export async function GET(req: NextRequest) {
  const ok = await verifyCrAdmin(req.cookies.get(CR_ADMIN_COOKIE)?.value)
  return NextResponse.json({ authenticated: ok }, { status: ok ? 200 : 401 })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(CR_ADMIN_COOKIE)
  return res
}
