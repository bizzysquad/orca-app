// Crooked Rumors admin session. Reuses the RSVP module's HMAC token helpers
// (Web Crypto only, so this stays Edge-safe for middleware.ts), but signs
// with a derived secret and its own cookie, so an RSVP staff token can never
// unlock the Crooked Rumors admin or vice versa.
import { signStaffSession, verifyStaffSession } from '@/lib/rsvp/session'

export const CR_ADMIN_COOKIE = 'cr-admin-token'
export const CR_ADMIN_MAX_AGE = 60 * 60 * 24 * 14 // two weeks

export function crSessionSecret(): string | null {
  const base = process.env.CROOKED_RUMORS_SESSION_SECRET || process.env.RSVP_STAFF_SESSION_SECRET
  return base ? `${base}:crookedrumors-admin` : null
}

export async function signCrAdmin(): Promise<string | null> {
  const secret = crSessionSecret()
  if (!secret) return null
  return signStaffSession({ role: 'owner', displayName: 'crookedrumors' }, secret, CR_ADMIN_MAX_AGE)
}

export async function verifyCrAdmin(token: string | undefined | null): Promise<boolean> {
  const secret = crSessionSecret()
  if (!secret || !token) return false
  const payload = await verifyStaffSession(token, secret)
  return !!payload && payload.displayName === 'crookedrumors'
}
