import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { CR_ADMIN_COOKIE, verifyCrAdmin } from './session'

// Node-runtime only (uses node:crypto). API routes call requireCrAdmin and
// return the response it hands back when the caller isn't logged in.

export function crAdminPassword(): string | null {
  return (process.env.CROOKED_RUMORS_ADMIN_PASSWORD || process.env.RSVP_OWNER_PASSWORD || '').trim() || null
}

export function passwordMatches(attempt: string): boolean {
  const expected = crAdminPassword()
  if (!expected || !attempt) return false
  const a = createHash('sha256').update(attempt).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export async function requireCrAdmin(req: NextRequest): Promise<NextResponse | null> {
  const ok = await verifyCrAdmin(req.cookies.get(CR_ADMIN_COOKIE)?.value)
  return ok ? null : NextResponse.json({ error: 'Admin login required' }, { status: 401 })
}
