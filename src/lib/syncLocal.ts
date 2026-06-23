/**
 * Write to localStorage and dispatch event for cloud sync.
 * Use this instead of raw localStorage.setItem() for user data keys.
 *
 * Records a per-key modification timestamp so the cross-device merge
 * can determine which version is newer (cloud vs local).
 */
import { debouncedSync, setSyncTimestamp } from '@/lib/syncEngine'

export function setLocalSynced(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
    setSyncTimestamp(key)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orca-local-write', { detail: { key } }))
    }
    debouncedSync()
  } catch {}
}
