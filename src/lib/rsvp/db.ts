import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client for the RSVP module. Bypasses RLS by design — see the
// note at the top of supabase-migration-rsvp.sql. Only ever used server-side
// inside src/app/api/rsvp/** route handlers, never sent to the browser.
export function getRsvpAdmin() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
