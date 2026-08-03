// Shared-password-per-role staff auth for the RSVP module.
// Uses Web Crypto (crypto.subtle / btoa / atob) only, so this file works
// in both the Node API routes AND the Edge middleware without changes.

export const STAFF_ROLES = ['owner', 'event_admin', 'door_staff', 'readonly_staff'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Owner',
  event_admin: 'Event Administrator',
  door_staff: 'Door Staff',
  readonly_staff: 'Read-Only Staff',
}

// Linear approximation of capability for simple "at least this role" checks.
// door_staff and readonly_staff aren't truly ordered (different capabilities),
// but door_staff can do everything readonly can plus check guests in, so this holds.
const ROLE_RANK: Record<StaffRole, number> = {
  readonly_staff: 0,
  door_staff: 1,
  event_admin: 2,
  owner: 3,
}

export function roleAtLeast(role: StaffRole, min: StaffRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

export interface StaffPayload {
  role: StaffRole
  displayName: string
  iat: number
  exp: number
}

export const STAFF_SESSION_COOKIE = 'rsvp-staff-token'
export const STAFF_SESSION_MAX_AGE = 60 * 60 * 12 // 12 hours — an event-night shift

// Password checking (env-var defaults + DB-stored overrides) lives in
// staffPasswords.ts, which uses node:crypto and must only be imported from
// Node-runtime API routes — never from here or middleware.ts, both of which
// need to stay Edge-compatible (Web Crypto only).

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let str = ''
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlToBytes(str: string): Uint8Array {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

export async function signStaffSession(
  payload: Pick<StaffPayload, 'role' | 'displayName'>,
  secret: string,
  maxAgeSeconds: number = STAFF_SESSION_MAX_AGE
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + maxAgeSeconds
  const full: StaffPayload = { ...payload, iat, exp }
  const payloadB64 = bytesToBase64url(encoder.encode(JSON.stringify(full)))
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64))
  return `${payloadB64}.${bytesToBase64url(sig)}`
}

export async function verifyStaffSession(
  token: string | undefined | null,
  secret: string
): Promise<StaffPayload | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sigB64] = parts
  try {
    const key = await hmacKey(secret)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlToBytes(sigB64) as BufferSource,
      encoder.encode(payloadB64) as BufferSource
    )
    if (!valid) return null
    const payload: StaffPayload = JSON.parse(decoder.decode(base64urlToBytes(payloadB64)))
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    if (!STAFF_ROLES.includes(payload.role)) return null
    return payload
  } catch {
    return null
  }
}
