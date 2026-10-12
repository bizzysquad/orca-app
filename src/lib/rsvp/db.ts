import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client for the RSVP module. Bypasses RLS by design — see the
// note at the top of supabase-migration-rsvp.sql. Only ever used server-side
// inside src/app/api/rsvp/** route handlers, never sent to the browser.
//
// cache: 'no-store' opts every query out of the Next.js Data Cache. Without
// it, Next caches supabase-js GETs for a year, so the public pages kept
// serving the event list as it was the first time they ran (and that cache
// survives redeploys on Vercel).
export function getRsvpAdmin() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })
}
