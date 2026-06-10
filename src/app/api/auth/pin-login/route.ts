import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

type CookieItem = { name: string; value: string; options?: Record<string, unknown> }

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json()
    if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 })

    const adminEmail = process.env.ADMIN_EMAIL
    const envPin = process.env.ADMIN_PIN

    if (!adminEmail || !envPin) {
      return NextResponse.json(
        { error: 'ADMIN_EMAIL and ADMIN_PIN must be set in Vercel environment variables.' },
        { status: 503 }
      )
    }

    // Use service role to check for a custom PIN stored in user metadata
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: usersData } = await adminClient.auth.admin.listUsers()
    const adminUser = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === adminEmail.toLowerCase()
    )
    const activePin: string = adminUser?.user_metadata?.app_pin || envPin

    if (String(pin) !== String(activePin)) {
      return NextResponse.json({ error: 'Wrong passcode.' }, { status: 401 })
    }

    // PIN correct — generate a magic link (no Supabase password needed)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: adminEmail,
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('[PIN Login] generateLink:', linkError?.message)
      return NextResponse.json({ error: 'Failed to create session.' }, { status: 500 })
    }

    // Exchange the token for a real session, writing cookies
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll(): CookieItem[] {
            return (cookieStore as any).getAll()
          },
          setAll(list: CookieItem[]) {
            list.forEach(({ name, value, options }) => {
              try { (cookieStore as any).set(name, value, options) } catch {}
            })
          },
        },
      }
    )

    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email',
    })

    if (otpError) {
      console.error('[PIN Login] verifyOtp:', otpError.message)
      return NextResponse.json({ error: 'Session creation failed: ' + otpError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[PIN Login] unexpected:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
