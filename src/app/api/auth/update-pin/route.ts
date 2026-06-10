import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

type CookieItem = { name: string; value: string; options?: Record<string, unknown> }

export async function POST(req: NextRequest) {
  try {
    const { newPin } = await req.json()
    if (!newPin || String(newPin).length < 4) {
      return NextResponse.json({ error: 'PIN must be at least 4 digits.' }, { status: 400 })
    }

    // Verify the caller is authenticated
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll(): CookieItem[] { return (cookieStore as any).getAll() },
          setAll(list: CookieItem[]) {
            list.forEach(({ name, value, options }) => {
              try { (cookieStore as any).set(name, value, options) } catch {}
            })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    // Update PIN in user metadata via service role
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, app_pin: String(newPin) },
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
