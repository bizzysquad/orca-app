import crypto from 'crypto'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { STAFF_ROLES, StaffRole } from '@/lib/rsvp/session'

// Node-only (uses node:crypto scrypt) — import this from API routes, never
// from middleware.ts or session.ts, which must stay Edge-compatible.

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuffer = Buffer.from(hash, 'hex')
  const candidate = crypto.scryptSync(password, salt, 64)
  if (candidate.length !== hashBuffer.length) return false
  return crypto.timingSafeEqual(candidate, hashBuffer)
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

function envDefaultFor(role: StaffRole): string | undefined {
  switch (role) {
    case 'owner': return process.env.RSVP_OWNER_PASSWORD
    case 'event_admin': return process.env.RSVP_EVENT_ADMIN_PASSWORD
    case 'door_staff': return process.env.RSVP_DOOR_STAFF_PASSWORD
    case 'readonly_staff': return process.env.RSVP_READONLY_STAFF_PASSWORD
  }
}

// Checks the DB-stored (hashed) password first for each role; falls back to
// that role's env var default if it has never been changed via
// /RSVP/admin/settings. This lets the Owner change any role's password
// without touching env vars or redeploying.
export async function roleForPassword(password: string): Promise<StaffRole | null> {
  if (!password) return null
  const supabase = getRsvpAdmin()
  const { data } = await supabase.from('rsvp_staff_passwords').select('role, password_hash')
  const overrides = new Map((data || []).map((r: any) => [r.role, r.password_hash]))

  for (const role of STAFF_ROLES) {
    const hash = overrides.get(role)
    if (hash) {
      if (verifyPassword(password, hash)) return role
    } else {
      const envDefault = envDefaultFor(role)
      if (envDefault && safeEqual(envDefault, password)) return role
    }
  }
  return null
}

export async function setRolePassword(role: StaffRole, newPassword: string): Promise<void> {
  const supabase = getRsvpAdmin()
  const password_hash = hashPassword(newPassword)
  await supabase.from('rsvp_staff_passwords').upsert({ role, password_hash, updated_at: new Date().toISOString() })
}

export async function getPasswordStatus(): Promise<Record<StaffRole, 'custom' | 'default'>> {
  const supabase = getRsvpAdmin()
  const { data } = await supabase.from('rsvp_staff_passwords').select('role')
  const customRoles = new Set((data || []).map((r: any) => r.role))
  const result = {} as Record<StaffRole, 'custom' | 'default'>
  for (const role of STAFF_ROLES) result[role] = customRoles.has(role) ? 'custom' : 'default'
  return result
}
