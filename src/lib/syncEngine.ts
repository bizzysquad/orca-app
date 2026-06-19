'use client'

import { createBrowserClient } from '@supabase/ssr'

// All localStorage keys that should be synced to Supabase profiles.local_data
export const SYNC_KEYS = [
  'orca-bills',
  'orca-user-settings',
  'orca-savings-accounts',
  'orca-payment-entries',
  'orca-paycheck-history',
  'orca-lyft-sessions',
  'orca-bizzplug-clients',
  'orca-dj-gigs',
  'orca-dj-profile',
  'orca-dj-activity',
  'orca-dj-email-templates',
  'orca-dj-website-photos',
  'orca-dj-testimonials',
  'orca-weight-logs',
  'orca-meal-logs',
  'orca-grocery',
  'orca-tasks',
  'orca-notes',
  'orca-stack-circle-groups',
  'orca-roommates',
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
  return result
}

function countLocalGigs(): number {
  try {
    const raw = localStorage.getItem('orca-dj-gigs')
    if (raw) return JSON.parse(raw).length
  } catch {}
  return 0
}

// Smart merge: for array keys, merge by ID to avoid duplicates.
// For non-array keys, cloud wins (more recent device wins).
function mergeData(
  cloud: Record<string, any>,
  local: Record<string, any>
): Record<string, any> {
  const merged: Record<string, any> = { ...cloud }

  for (const key of SYNC_KEYS) {
    const cloudVal = cloud[key]
    const localVal = local[key]

    if (localVal === undefined) continue
    if (cloudVal === undefined) {
      merged[key] = localVal
      continue
    }

    // Array merge by ID (for gigs, bills, sessions, etc.)
    if (Array.isArray(cloudVal) && Array.isArray(localVal)) {
      const byId = new Map<string, any>()
      // Cloud first, then local overwrites (local has newer edits)
      for (const item of cloudVal) {
        const id = item?.id || JSON.stringify(item)
        byId.set(id, item)
      }
      for (const item of localVal) {
        const id = item?.id || JSON.stringify(item)
        byId.set(id, item)
      }
      merged[key] = Array.from(byId.values())
      continue
    }

    // For objects, shallow merge (local overrides cloud fields)
    if (typeof cloudVal === 'object' && cloudVal !== null &&
        typeof localVal === 'object' && localVal !== null &&
        !Array.isArray(cloudVal)) {
      merged[key] = { ...cloudVal, ...localVal }
      continue
    }

    // Scalar: local wins (user just edited it)
    merged[key] = localVal
  }

  return merged
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

// Pull cloud data and merge with local
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
    const merged = mergeData(cloud, local)

    let hydrated = 0
    for (const key of SYNC_KEYS) {
      if (merged[key] !== undefined) {
        const val = typeof merged[key] === 'string' ? merged[key] : JSON.stringify(merged[key])
        localStorage.setItem(key, val)
        hydrated++
      }
    }

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

// Write to localStorage and trigger sync
export function setLocalSynced(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
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
