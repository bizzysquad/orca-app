import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_TOKEN = 'orca-admin-session-2026'

// Use service role key to bypass RLS — admin needs to see ALL users
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration')
  }
  return createClient(url, serviceKey)
}

function isAdminAuthed(request: NextRequest): boolean {
  return request.cookies.get('orca-admin-token')?.value === ADMIN_TOKEN
}

/**
 * GET /api/admin/users — Fetch all users (bypasses RLS)
 */
export async function GET(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Admin users fetch error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ users: profiles || [] })
  } catch (err: any) {
    console.error('Admin users API error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

/**
 * GET /api/admin/users?metrics=true — Also fetch platform metrics
 */
