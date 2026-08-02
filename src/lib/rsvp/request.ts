import { NextRequest } from 'next/server'

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || '0.0.0.0'
}

// Cheap, non-cryptographic hash — good enough for rate-limit bucketing,
// avoids storing raw IPs at rest.
export async function hashIp(ip: string): Promise<string> {
  const pepper = process.env.RSVP_STAFF_SESSION_SECRET || 'rsvp-ip-pepper'
  const data = new TextEncoder().encode(`${pepper}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
