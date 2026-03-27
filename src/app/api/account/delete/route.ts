import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

/**
 * DELETE /api/account/delete — Permanently delete the authenticated user's account
 * Uses service role key to bypass RLS and delete all user data
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get the currently authenticated user via the server client (uses cookies)
    const supabase = await createServerClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = authData.user.id

    // Use service role client to bypass RLS and delete everything
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const adminClient = createClient(serviceUrl, serviceKey)

    // Delete all user data from every table (order matters for foreign keys)
    const tables = [
      { table: 'notifications', column: 'user_id' },
      { table: 'expenses', column: 'user_id' },
      { table: 'bills', column: 'user_id' },
      { table: 'income_sources', column: 'user_id' },
      { table: 'savings_goals', column: 'user_id' },
      { table: 'rent_entries', column: 'user_id' },
      { table: 'plaid_connections', column: 'user_id' },
      { table: 'sync_log', column: 'user_id' },
    ]

    for (const { table, column } of tables) {
      const { error } = await adminClient.from(table).delete().eq(column, userId)
      if (error) console.warn(`Failed to delete from ${table}:`, error.message)
    }

    // Delete profile last (other tables may reference it)
    const { error: profileError } = await adminClient.from('profiles').delete().eq('id', userId)
    if (profileError) console.warn('Failed to delete profile:', profileError.message)

    // Delete the auth user
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      console.error('Failed to delete auth user:', deleteAuthError.message)
      return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 })
    }

    // Sign out the user
    await supabase.auth.signOut()

    return NextResponse.json({ success: true, message: 'Account permanently deleted' })
  } catch (err: any) {
    console.error('Account deletion error:', err)
    return NextResponse.json({ error: 'Unexpected error during account deletion' }, { status: 500 })
  }
}
