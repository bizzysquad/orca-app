import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { SpadesError, resolveSession, type Actor } from './service.ts'
import { MemoryStore, StoreError, type Store } from './store.ts'
import { getSpadesStore } from './supabaseStore.ts'

// Node runtime helpers shared by the /api/spades/* routes.

export const SESSION_COOKIE = 'sp-session'

// SPADES_MEMORY_STORE=local (local testing only, never set on Vercel) keeps
// everything in memory so a local run cannot touch the real database.
export function store(): Store {
  if (process.env.SPADES_MEMORY_STORE === 'local') {
    const g = globalThis as any
    if (!g.__spadesMemoryStore) {
      // Real time, so computer seats at online tables take their turns.
      const m = new MemoryStore()
      m.now = () => new Date()
      g.__spadesMemoryStore = m
    }
    return g.__spadesMemoryStore
  }
  return getSpadesStore()
}

export async function actorFrom(req: NextRequest, s: Store): Promise<Actor> {
  return resolveSession(s, req.cookies.get(SESSION_COOKIE)?.value)
}

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } })
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof SpadesError) return json({ error: err.message }, err.status)
  if (err instanceof StoreError) {
    if (err.code === 'unique') return json({ error: 'That was already recorded. Refresh to see the latest.' }, 409)
    if (err.code === 'foreign_key') return json({ error: 'That record is linked to other records and cannot be changed this way.' }, 409)
    if (err.code === 'check') return json({ error: 'That value is not allowed.' }, 400)
    console.error('[spades] store error', err.message)
    if (/relation .* does not exist|Could not find the table/i.test(err.message)) {
      return json({ error: 'Spades HQ database is not set up yet. Run supabase-migration-spades.sql.' }, 503)
    }
    return json({ error: 'Database error. Try again.' }, 500)
  }
  console.error('[spades] unexpected error', err)
  return json({ error: 'Something went wrong. Try again.' }, 500)
}

// Writes must be same-origin JSON. A cross-site form cannot set this
// content type without a CORS preflight, and the Origin check catches the rest.
export function checkWrite(req: NextRequest): NextResponse | null {
  const ct = req.headers.get('content-type') || ''
  if (!ct.toLowerCase().startsWith('application/json')) return json({ error: 'JSON body required' }, 415)
  const origin = req.headers.get('origin')
  if (origin) {
    try {
      const o = new URL(origin)
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || ''
      if (o.host !== host) return json({ error: 'Cross-site request blocked' }, 403)
    } catch {
      return json({ error: 'Cross-site request blocked' }, 403)
    }
  }
  return null
}

export function clientKey(req: NextRequest): string {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
  return ip
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
}

export function directorPassword(): string | null {
  return (process.env.SPADES_DIRECTOR_PASSWORD || process.env.RSVP_OWNER_PASSWORD || '').trim() || null
}

export function passwordMatches(attempt: unknown): boolean {
  const expected = directorPassword()
  if (!expected || typeof attempt !== 'string' || !attempt) return false
  const a = createHash('sha256').update(attempt).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export async function readJson(req: NextRequest): Promise<Record<string, any>> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
  } catch {
    return {}
  }
}
