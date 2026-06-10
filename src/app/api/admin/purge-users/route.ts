import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ONE-TIME USE: Deletes every Supabase user except ADMIN_EMAIL.
// Hit GET /api/admin/purge-users?secret=YOUR_SERVICE_ROLE_KEY once, then forget it.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret || secret !== serviceKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ error: 'ADMIN_EMAIL not set' }, { status: 503 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // List all users (max 1000)
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const toDelete = data.users.filter(u => u.email?.toLowerCase() !== adminEmail.toLowerCase())
  const deleted: string[] = []
  const failed: string[] = []

  for (const user of toDelete) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id)
    if (delErr) {
      failed.push(user.email || user.id)
    } else {
      deleted.push(user.email || user.id)
    }
  }

  return NextResponse.json({
    kept: adminEmail,
    deleted,
    failed,
    message: `Done. Kept ${adminEmail}. Deleted ${deleted.length} user(s).`,
  })
}
