/**
 * Write to localStorage and dispatch event for cloud sync.
 * Use this instead of raw localStorage.setItem() for user data keys.
 *
 * Triggers both the custom event (for OrcaDataContext) and a debounced
 * cloud push (via syncEngine) so changes reach Supabase within seconds.
 */
import { debouncedSync } from '@/lib/syncEngine'

export function setLocalSynced(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orca-local-write', { detail: { key } }))
    }
    debouncedSync()
  } catch {}
}
