/**
 * Write to localStorage and dispatch event for cloud sync.
 * Use this instead of raw localStorage.setItem() for user data keys.
 */
export function setLocalSynced(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
    // Dispatch custom event so OrcaDataContext picks it up and syncs to Supabase
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orca-local-write', { detail: { key } }))
    }
  } catch {}
}
