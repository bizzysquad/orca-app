import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// middleware.ts skips /api/*, so any API route that should be owner-only
// must call this itself. Returns a 401 response when not logged in to ORCA.
export async function requireUser(): Promise<NextResponse | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
