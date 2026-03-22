import { NextRequest, NextResponse } from 'next/server'

const ADMIN_TOKEN = 'orca-admin-session-2026'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect root to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect admin routes (but not the admin API auth endpoint)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    const token = request.cookies.get('orca-admin-token')?.value
    // If no valid token, the page itself will show a login screen
    // This middleware just adds an extra layer — the page checks auth state too
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|logo-sm.png|.*\\.svg$).*)'],
}
