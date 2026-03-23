import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('[AUTH/SIGNUP] Signup attempt for:', email)

    if (!email || !password) {
      console.log('[AUTH/SIGNUP] Missing email or password')
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      console.log('[AUTH/SIGNUP] Password too short')
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/callback`
    console.log('[AUTH/SIGNUP] Email redirect URL:', redirectTo)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (error) {
      console.error('[AUTH/SIGNUP] Supabase error:', error.message, '| Status:', error.status)
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    const needsEmailConfirmation = data.user && !data.user.email_confirmed_at

    console.log('[AUTH/SIGNUP] Signup successful for:', email, '| User ID:', data.user?.id, '| Needs confirmation:', needsEmailConfirmation)

    return NextResponse.json({
      success: true,
      needsEmailConfirmation,
      message: needsEmailConfirmation
        ? 'Account created! Please check your email to verify your account.'
        : 'Account created successfully!',
      userId: data.user?.id,
    })
  } catch (err) {
    console.error('[AUTH/SIGNUP] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
