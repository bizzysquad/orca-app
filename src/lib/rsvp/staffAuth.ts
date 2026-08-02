import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { STAFF_SESSION_COOKIE, StaffPayload, StaffRole, roleAtLeast, verifyStaffSession } from '@/lib/rsvp/session'

// Node-runtime helper for src/app/api/rsvp/** routes. Reads + verifies the
// shared-password staff session cookie set by /api/rsvp/staff/login.
export async function getStaff(req: NextRequest): Promise<StaffPayload | null> {
  const secret = process.env.RSVP_STAFF_SESSION_SECRET
  if (!secret) return null
  const token = req.cookies.get(STAFF_SESSION_COOKIE)?.value
  return verifyStaffSession(token, secret)
}

export function unauthorized(message = 'Staff login required') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Your role does not have permission to do this') {
  return NextResponse.json({ error: message }, { status: 403 })
}

// Verifies the caller is staff with at least `minRole`. Returns either the
// staff payload (caller may proceed) or a ready-to-return NextResponse (caller
// must return it immediately).
export async function requireStaff(
  req: NextRequest,
  minRole: StaffRole
): Promise<{ staff: StaffPayload } | { response: NextResponse }> {
  const staff = await getStaff(req)
  if (!staff) return { response: unauthorized() }
  if (!roleAtLeast(staff.role, minRole)) return { response: forbidden() }
  return { staff }
}

export async function logAudit(
  staff: { role: StaffRole; displayName: string },
  action: string,
  entityType: string,
  entityId: string | null,
  detail: Record<string, unknown> = {}
) {
  try {
    const supabase = getRsvpAdmin()
    await supabase.from('rsvp_audit_log').insert({
      actor_role: staff.role,
      actor_name: staff.displayName,
      action,
      entity_type: entityType,
      entity_id: entityId,
      detail,
    })
  } catch (err) {
    console.error('[rsvp audit log]', err)
  }
}
