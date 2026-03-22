import { NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = 'ORCA2026'
const ADMIN_TOKEN = 'orca-admin-session-2026'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ success: true })
      response.cookies.set('orca-admin-token', ADMIN_TOKEN, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 8, // 8 hours
      })
      return response
    }

    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 })
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('orca-admin-token')
  return response
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('orca-admin-token')?.value
  if (token === ADMIN_TOKEN) {
    return NextResponse.json({ authenticated: true })
  }
  return NextResponse.json({ authenticated: false }, { status: 401 })
}
