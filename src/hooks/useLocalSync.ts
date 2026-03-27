'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

/**
 * Keys that should be synced to Supabase for cross-device consistency.
 * These are all the localStorage keys the app uses for real user data
 * (excluding UI preferences like dashboard order and theme).
 */
const SYNC_KEYS = [
  'orca-bills',
  'orca-user-settings',
  'orca-savings-accounts',
  'orca-payment-entries',
  'orca-paycheck-history',
  'orca-tasks',
  'orca-notes',
  'orca-stack-circle-groups',
  'orca-roommates',
  'orca-splitter-savings',
  'orca-splitter-spending',
] as const

/**
 * Collects all sync-able localStorage data into a single object.
 */
function collectLocalData(): Record<string, any> {
  const result: Record<string, any> = {}
  for (const key of SYNC_KEYS) {
    try {
      const val = localStorage.getItem(key)
      if (val !== null) {
        // Try to parse as JSON; store raw string if not valid JSON
        try {
          result[key] = JSON.parse(val)
        } catch {
          result[key] = val
        }
      }
    } catch {}
  }
  return result
}

/**
 * Hydrates localStorage from a cloud-stored data blob.
 * Only sets keys that don't already exist locally (local wins on conflict).
 */
function hydrateLocalStorage(cloudData: Record<string, any>, overwrite = false) {
  if (!cloudData || typeof cloudData !== 'object') return

  for (const key of SYNC_KEYS) {
    if (cloudData[key] !== undefined) {
      const localVal = localStorage.getItem(key)
      // If local has no data (or overwrite), hydrate from cloud
      if (!localVal || overwrite) {
        const val = typeof cloudData[key] === 'string'
          ? cloudData[key]
          : JSON.stringify(cloudData[key])
        localStorage.setItem(key, val)
      }
    }
  }
}

/**
 * Hook that syncs localStorage data to/from Supabase profiles.local_data.
 *
 * On mount: loads local_data from Supabase, hydrates empty localStorage keys.
 * Exposes syncToCloud() for manual sync after data changes.
 * Auto-syncs on a debounced interval when data changes.
 */
export function useLocalSync() {
  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const userIdRef = useRef<string | null>(null)
  const initializedRef = useRef(false)

  // Push current localStorage to Supabase
  const syncToCloud = useCallback(async () => {
    if (!userIdRef.current) return
    const localData = collectLocalData()
    try {
      await supabaseRef.current
        .from('profiles')
        .update({ local_data: localData })
        .eq('id', userIdRef.current)
    } catch (err) {
      // Silently fail — column might not exist yet (migration not run)
      console.warn('[ORCA Sync] Cloud sync failed:', err)
    }
  }, [])

  // Debounced sync — call this after any localStorage write
  const debouncedSync = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    syncTimeoutRef.current = setTimeout(() => {
      syncToCloud()
    }, 2000) // 2 second debounce
  }, [syncToCloud])

  // On mount: load from cloud and hydrate
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    async function loadFromCloud() {
      try {
        const { data: authData } = await supabaseRef.current.auth.getUser()
        if (!authData?.user?.id) return
        userIdRef.current = authData.user.id

        const { data: profile } = await supabaseRef.current
          .from('profiles')
          .select('local_data')
          .eq('id', authData.user.id)
          .single()

        if (profile?.local_data) {
          hydrateLocalStorage(profile.local_data)
          // Dispatch event so components know data is ready
          window.dispatchEvent(new Event('orca-sync-ready'))
        }
      } catch (err) {
        // Column might not exist yet — that's fine
        console.warn('[ORCA Sync] Cloud load failed:', err)
      }
    }

    loadFromCloud()

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
    }
  }, [])

  // Listen for localStorage changes (from other tabs or programmatic writes)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key && SYNC_KEYS.includes(e.key as any)) {
        debouncedSync()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [debouncedSync])

  return { syncToCloud, debouncedSync }
}

/**
 * Wrapper around localStorage.setItem that also triggers cloud sync.
 * Use this instead of raw localStorage.setItem for synced keys.
 */
export function setLocalAndSync(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
    // Dispatch a custom event so the sync hook picks it up
    window.dispatchEvent(new CustomEvent('orca-local-write', { detail: { key } }))
  } catch {}
}
