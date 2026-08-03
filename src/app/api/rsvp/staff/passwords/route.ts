import { NextRequest, NextResponse } from 'next/server'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'
import { STAFF_ROLES } from '@/lib/rsvp/session'
import { getPasswordStatus, setRolePassword } from '@/lib/rsvp/staffPasswords'

export const dynamic = 'force-dynamic'

// Owner-only: view which roles are on their env-var default vs. a
// custom password, and change any role's password. Never returns a
// plaintext or hashed password — only status.
export async function GET(req: NextRequest) {
  const auth = await requireStaff(req, 'owner')
  if ('response' in auth) return auth.response

  const status = await getPasswordStatus()
  return NextResponse.json({ status })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireStaff(req, 'owner')
  if ('response' in auth) return auth.response
  const { staff } = auth

  try {
    const body = await req.json()
    const role = String(body?.role || '')
    const newPassword = String(body?.new_password || '')

    if (!STAFF_ROLES.includes(role as any)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    await setRolePassword(role as any, newPassword)
    await logAudit(staff, 'change_staff_password', 'rsvp_staff_passwords', role, {})

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to change password' }, { status: 500 })
  }
}
