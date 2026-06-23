'use client'

import { createBrowserClient } from '@supabase/ssr'

// All localStorage keys that should be synced to Supabase profiles.local_data
export const SYNC_KEYS = [
  // Financial
  'orca-bills',
  'orca-user-settings',
  'orca-savings-accounts',
  'orca-payment-entries',
  'orca-paycheck-history',
  'orca-credit-cards',
  // Income sources
  'orca-lyft-sessions',
  'orca-bizzplug-clients',
  'orca-bizzplug-client-db',
  'orca-bizzplug-site-settings',
  'orca-bizzplug-portfolio-photos',
  'orca-bizzplug-projects',
  // DJ
  'orca-dj-gigs',
  'orca-dj-profile',
  'orca-dj-activity',
  'orca-dj-email-templates',
  'orca-dj-website-photos',
  'orca-dj-testimonials',
  'orca-dj-client-db',
  'orca-dj-client-history',
  'orca-dj-deleted-clients',
  'orca-dj-site-bio',
  'orca-dj-site-services',
  'orca-dj-site-instagram',
  'orca-dj-site-tiktok',
  'orca-dj-site-phone',
  'orca-dj-site-poster-subtitle',
  'orca-dj-site-poster-title',
  'orca-dj-site-poster-tagline',
  'orca-dj-site-testimonials',
  // Fitness
  'orca-weight-logs',
  'orca-meal-logs',
  'orca-fitness-plan',
  'orca-fitness-streak',
  'orca-nutrition-plan',
  'orca-nutrition-checkin',
  // Productivity
  'orca-grocery',
  'orca-tasks',
  'orca-notes',
  'orca-songs',
  'orca-businesses',
  // Groups
  'orca-stack-circle-groups',
  'orca-roommates',
  // UI preferences
  'orca-dashboard-order',
  'orca-dashboard-pinned',
  'orca-theme-id',
  'orca-admin-nav',
  'orca-admin-settings',
  'orca-feature-flags',
  'orca-module-configs',
  'orca-layout-style',
  'orca-button-placements',
  'orca-default-theme',
  // Splitter
  'orca-splitter-savings',
  'orca-splitter-spending',
] as const

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline'

export interface SyncState {
  status: SyncStatus
  lastSyncTime: string | null
  lastError: string | null
  localGigCount: number
  cloudGigCount: number
  userId: string | null
  supabaseUrl: string
}

let _supabase: ReturnType<typeof createBrowserClient> | null = null

function getSupabase() {
  if (!_supabase) {
    _supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _supabase
}

// Persistent state across the session
let _syncState: SyncState = {
  status: 'idle',
  lastSyncTime: null,
  lastError: null,
  localGigCount: 0,
  cloudGigCount: 0,
  userId: null,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
}

const _listeners = new Set<(state: SyncState) => void>()

function notifyListeners() {
  _listeners.forEach(fn => fn({ ..._syncState }))
}

export function subscribeSyncState(fn: (state: SyncState) => void) {
  _listeners.add(fn)
  fn({ ..._syncState })
  return () => { _listeners.delete(fn) }
}

export function getSyncState(): SyncState {
  return { ..._syncState }
}

function updateState(patch: Partial<SyncState>) {
  Object.assign(_syncState, patch)
  notifyListeners()
}

// ── Per-key timestamps for cross-device merge ──
const TIMESTAMPS_KEY = '_orca-sync-timestamps'

export function getSyncTimestamps(): Record<string, string> {
  try {
    const raw = localStorage.getItem(TIMESTAMPS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

export function setSyncTimestamp(key: string) {
  try {
    const ts = getSyncTimestamps()
    ts[key] = new Date().toISOString()
    localStorage.setItem(TIMESTAMPS_KEY, JSON.stringify(ts))
  } catch {}
}

function collectLocalData(): Record<string, any> {
  const result: Record<string, any> = {}
  for (const key of SYNC_KEYS) {
    try {
      const val = localStorage.getItem(key)
      if (val !== null) {
        try { result[key] = JSON.parse(val) } catch { result[key] = val }
      }
    } catch {}
  }
  // Include timestamps so the cloud knows when each key was last modified
  result[TIMESTAMPS_KEY] = getSyncTimestamps()
  return result
}

function countLocalGigs(): number {
  try {
    const raw = localStorage.getItem('orca-dj-gigs')
    if (raw) return JSON.parse(raw).length
  } catch {}
  return 0
}

// Timestamp-based merge: for each key, the version with the NEWER timestamp wins.
// This allows Device A's changes to reach Device B even when Device B has stale
// local data. If timestamps are missing or equal, local wins (backwards compatible).
function mergeData(
  cloud: Record<string, any>,
  local: Record<string, any>
): { merged: Record<string, any>; mergedTimestamps: Record<string, string> } {
  const merged: Record<string, any> = {}
  const cloudTs: Record<string, string> = cloud[TIMESTAMPS_KEY] || {}
  const localTs: Record<string, string> = local[TIMESTAMPS_KEY] || getSyncTimestamps()
  const mergedTimestamps: Record<string, string> = {}

  for (const key of SYNC_KEYS) {
    const cloudVal = cloud[key]
    const localVal = local[key]
    const ct = cloudTs[key] || ''
    const lt = localTs[key] || ''

    if (localVal === undefined && cloudVal === undefined) continue

    if (localVal === undefined) {
      // Only cloud has data → take cloud
      merged[key] = cloudVal
      if (ct) mergedTimestamps[key] = ct
    } else if (cloudVal === undefined) {
      // Only local has data → keep local
      merged[key] = localVal
      if (lt) mergedTimestamps[key] = lt
    } else if (ct > lt) {
      // Cloud is newer → take cloud version
      merged[key] = cloudVal
      mergedTimestamps[key] = ct
    } else {
      // Local is newer or equal → keep local
      merged[key] = localVal
      mergedTimestamps[key] = lt || ct
    }
  }

  return { merged, mergedTimestamps }
}

// Get authenticated user ID, refreshing session if needed
async function getAuthUserId(): Promise<string | null> {
  const supabase = getSupabase()
  try {
    const { data } = await supabase.auth.getUser()
    if (data?.user?.id) {
      updateState({ userId: data.user.id })
      return data.user.id
    }
    // Try refreshing the session
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed?.user?.id) {
      updateState({ userId: refreshed.user.id })
      return refreshed.user.id
    }
  } catch (err) {
    console.warn('[SyncEngine] Auth check failed:', err)
  }
  return null
}

// Push local data to cloud with retry
export async function pushToCloud(retries = 2): Promise<{ ok: boolean; error?: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { ok: false, error: 'Not authenticated — session may have expired' }

  const localData = collectLocalData()
  const supabase = getSupabase()

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ local_data: localData })
        .eq('id', userId)

      if (error) {
        if (error.message.includes('local_data') && error.message.includes('column')) {
          return { ok: false, error: 'Database schema missing local_data column — contact support' }
        }
        if (attempt < retries) continue
        return { ok: false, error: `Supabase update failed: ${error.message}` }
      }

      const now = new Date().toISOString()
      updateState({
        lastSyncTime: now,
        localGigCount: countLocalGigs(),
      })
      try { localStorage.setItem('orca-last-sync', now) } catch {}
      return { ok: true }
    } catch (err: any) {
      if (attempt < retries) continue
      return { ok: false, error: `Network error: ${err.message}` }
    }
  }
  return { ok: false, error: 'Max retries exceeded' }
}

// Pull cloud data and merge with local using timestamp-based resolution
export async function pullFromCloud(): Promise<{ ok: boolean; hydrated: number; error?: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { ok: false, hydrated: 0, error: 'Not authenticated' }

  const supabase = getSupabase()

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('local_data')
      .eq('id', userId)
      .single()

    if (error) {
      return { ok: false, hydrated: 0, error: `Cloud fetch failed: ${error.message}` }
    }

    if (!profile?.local_data || typeof profile.local_data !== 'object') {
      return { ok: true, hydrated: 0 }
    }

    const cloud = profile.local_data as Record<string, any>
    const local = collectLocalData()
    const { merged, mergedTimestamps } = mergeData(cloud, local)

    let hydrated = 0
    for (const key of SYNC_KEYS) {
      if (merged[key] !== undefined) {
        const val = typeof merged[key] === 'string' ? merged[key] : JSON.stringify(merged[key])
        localStorage.setItem(key, val)
        hydrated++
      }
    }

    // Persist the winning timestamps so future merges are accurate
    try { localStorage.setItem(TIMESTAMPS_KEY, JSON.stringify(mergedTimestamps)) } catch {}

    // Count cloud gigs
    const cloudGigs = Array.isArray(cloud['orca-dj-gigs']) ? cloud['orca-dj-gigs'].length : 0
    updateState({
      cloudGigCount: cloudGigs,
      localGigCount: countLocalGigs(),
    })

    return { ok: true, hydrated }
  } catch (err: any) {
    return { ok: false, hydrated: 0, error: `Network error: ${err.message}` }
  }
}

// Full bidirectional sync: pull from cloud, merge, push back
export async function fullSync(): Promise<{ ok: boolean; error?: string }> {
  if (!navigator.onLine) {
    updateState({ status: 'offline', lastError: 'Device is offline' })
    return { ok: false, error: 'Device is offline' }
  }

  updateState({ status: 'syncing', lastError: null })

  // Step 1: Pull cloud data and merge with local
  const pull = await pullFromCloud()
  if (!pull.ok) {
    updateState({ status: 'error', lastError: pull.error || 'Pull failed' })
    return { ok: false, error: pull.error }
  }

  // Step 2: Push merged data back to cloud
  const push = await pushToCloud()
  if (!push.ok) {
    updateState({ status: 'error', lastError: push.error || 'Push failed' })
    return { ok: false, error: push.error }
  }

  updateState({ status: 'synced', lastError: null })

  // Signal that sync is complete — components can re-read localStorage
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('orca-sync-ready'))
  }

  return { ok: true }
}

// Sync DJ gigs to booking_requests for calendar blocking
export async function syncDjCalendar(gigs: any[]): Promise<{ ok: boolean; conflicts: any[]; error?: string }> {
  try {
    const res = await fetch('/api/dj/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gigs }),
    })
    const data = await res.json()
    if (data.error) {
      return { ok: false, conflicts: [], error: data.error }
    }
    return { ok: true, conflicts: data.conflicts || [] }
  } catch (err: any) {
    return { ok: false, conflicts: [], error: `Network error: ${err.message}` }
  }
}

// Debounced sync — call after localStorage writes
let _syncTimeout: NodeJS.Timeout | null = null

export function debouncedSync(delayMs = 2000) {
  if (_syncTimeout) clearTimeout(_syncTimeout)
  _syncTimeout = setTimeout(() => { pushToCloud() }, delayMs)
}

// Write to localStorage, record timestamp, and trigger sync
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

// Diagnostic info for the debug page
export async function getDiagnostics(): Promise<Record<string, any>> {
  const supabase = getSupabase()
  let authStatus = 'unknown'
  let userId = 'none'
  let sessionExpiry = 'none'

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      authStatus = 'active'
      userId = session.user?.id || 'none'
      sessionExpiry = session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : 'unknown'
    } else {
      authStatus = 'no session'
    }
  } catch (err: any) {
    authStatus = `error: ${err.message}`
  }

  // Count cloud gigs
  let cloudGigCount = 0
  let cloudKeys: string[] = []
  try {
    if (userId !== 'none') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('local_data')
        .eq('id', userId)
        .single()
      if (profile?.local_data && typeof profile.local_data === 'object') {
        cloudKeys = Object.keys(profile.local_data)
        const gigs = (profile.local_data as any)['orca-dj-gigs']
        if (Array.isArray(gigs)) cloudGigCount = gigs.length
      }
    }
  } catch {}

  // Count local gigs
  const localGigCount = countLocalGigs()

  // localStorage keys
  const localKeys: string[] = []
  for (const key of SYNC_KEYS) {
    if (localStorage.getItem(key) !== null) localKeys.push(key)
  }

  // Service worker info
  let swVersion = 'none'
  let swState = 'none'
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        swVersion = reg.active?.scriptURL || 'registered but no active'
        swState = reg.active?.state || 'unknown'
      }
    }
  } catch {}

  // IndexedDB databases
  let idbDatabases: string[] = []
  try {
    if ('indexedDB' in window && indexedDB.databases) {
      const dbs = await indexedDB.databases()
      idbDatabases = dbs.map(db => db.name || 'unnamed')
    }
  } catch {}

  return {
    userId,
    authStatus,
    sessionExpiry,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'not set',
    isPwa: window.matchMedia('(display-mode: standalone)').matches,
    isOnline: navigator.onLine,
    userAgent: navigator.userAgent,
    localKeys,
    localKeyCount: localKeys.length,
    cloudKeys,
    cloudKeyCount: cloudKeys.length,
    localGigCount,
    cloudGigCount,
    gigMismatch: localGigCount !== cloudGigCount,
    lastSyncTime: localStorage.getItem('orca-last-sync') || 'never',
    lastError: _syncState.lastError,
    syncStatus: _syncState.status,
    serviceWorkerVersion: swVersion,
    serviceWorkerState: swState,
    indexedDBDatabases: idbDatabases,
    themeId: localStorage.getItem('orca-theme-id') || 'default',
    timestamp: new Date().toISOString(),
  }
}
