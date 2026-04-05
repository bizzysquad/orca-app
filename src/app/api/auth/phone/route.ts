import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Send OTP to phone number
export async function POST(request: NextRequest) {
  try {
    const { phone, action } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Clean phone number - ensure it has country code
    let cleanPhone = phone.replace(/[^\d+]/g, '')
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+1' + cleanPhone // Default to US
    }

    const supabase = await createClient()

    if (action === 'verify') {
      // Verify OTP code
      const { otp } = await request.json().catch(() => ({ otp: '' }))
      // This is handled in the PUT method below
      return NextResponse.json({ error: 'Use PUT to verify OTP' }, { status: 400 })
    }

    // Send OTP via Supabase phone auth
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: cleanPhone,
    })

    if (error) {
      if (error.message.includes('Phone auth is not enabled')) {
        return NextResponse.json(
          { error: 'Phone authentication is not yet configured. Please use email login instead, or contact support to enable phone auth.' },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your phone',
    })
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Verify OTP code
export async function PUT(request: NextRequest) {
  try {
    const { phone, code } = await request.json()

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
        { status: 400 }
      )
    }

    let cleanPhone = phone.replace(/[^\d+]/g, '')
    if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+1' + cleanPhone
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      phone: cleanPhone,
      token: code,
      type: 'sms',
    })

    if (error) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user?.id,
        phone: data.user?.phone,
      },
      session: data.session ? {
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at,
      } : null,
    })
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
