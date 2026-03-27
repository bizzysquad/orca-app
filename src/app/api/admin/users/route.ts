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
 * DELETE /api/admin/users?userId=xxx — Remove a user (profile + auth)
 */
export async function DELETE(request: NextRequest) {
  if (!isAdminAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // 1. Delete profile row (cascading FKs will handle related data)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Admin delete profile error:', profileError)
      return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 })
    }

    // 2. Delete from Supabase Auth (requires service role)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Admin delete auth user error:', authError)
      // Profile already deleted — log but don't fail
      return NextResponse.json({ warning: 'Profile deleted but auth record removal failed', error: authError.message }, { status: 207 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Admin delete user API error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}

/**
 * GET /api/admin/users?metrics=true — Also fetch platform metrics
 */
