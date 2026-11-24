import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCrAdmin } from '@/lib/crooked/db'
import { CR_ADMIN_COOKIE, verifyCrAdmin } from '@/lib/crooked/session'

export const dynamic = 'force-dynamic'

// Read only income summary for Smart Stack. Answers only for the ORCA owner
// (signed in with ADMIN_EMAIL) or a valid Crooked Rumor admin session.
async function allowed(req: NextRequest): Promise<boolean> {
  if (await verifyCrAdmin(req.cookies.get(CR_ADMIN_COOKIE)?.value)) return true
  const owner = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  if (!owner) return false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return !!user?.email && user.email.toLowerCase() === owner
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  if (!(await allowed(req))) return NextResponse.json({ error: 'Not allowed' }, { status: 401 })
  const supabase = getCrAdmin()
  const { data: bookings, error } = await supabase
    .from('cr_bookings')
    .select('id, ref, status, package_name, client_name, project_date, total_cents, amount_paid_cents, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: payments } = await supabase
    .from('cr_payments')
    .select('booking_id, amount_cents, kind, created_at')
    .order('created_at')
    .limit(5000)
  return NextResponse.json({ bookings: bookings || [], payments: payments || [] })
}
