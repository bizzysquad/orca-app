import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware entirely for static assets and API routes
  // (API routes handle their own auth)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/admin') ||
    pathname.includes('.') // static files (images, fonts, etc.)
  ) {
    return NextResponse.next()
  }

  // Public auth pages — always accessible
  const isAuthPage = pathname.startsWith('/auth/')
  if (isAuthPage) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({
              request: { headers: request.headers },
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // getUser() validates the JWT locally — no network round-trip to Supabase
    const { data: { user } } = await supabase.auth.getUser()

    // Redirect root based on auth state
    if (pathname === '/') {
      return NextResponse.redirect(
        new URL(user ? '/dashboard' : '/auth/login', request.url)
      )
    }

    // Protect app routes
    if (!user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return response
  } catch {
    // If Supabase is unreachable, don't block the user — let auth pages through
    // and redirect everything else to login gracefully
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)',
  ],
}
