import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json()

    if (!pin) {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 })
    }

    const adminPin = process.env.ADMIN_PIN
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPin || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'App not configured. Add ADMIN_PIN, ADMIN_EMAIL, ADMIN_PASSWORD to environment variables.' },
        { status: 503 }
      )
    }

    if (String(pin) !== String(adminPin)) {
      return NextResponse.json({ error: 'Incorrect passcode.' }, { status: 401 })
    }

    // PIN correct — sign into Supabase
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    })

    if (error || !data.session) {
      console.error('[PIN Login] Supabase error:', error?.message)
      return NextResponse.json(
        { error: 'Authentication failed. Check ADMIN_EMAIL and ADMIN_PASSWORD env vars.' },
        { status: 401 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[PIN Login]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
