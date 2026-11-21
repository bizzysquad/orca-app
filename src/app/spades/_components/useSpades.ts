'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Live data for every Spades HQ screen.
// Polls a tiny pulse endpoint every 2s (only while the tab is visible) and
// refetches the full state when the pulse changes, or every 20s as a safety
// net. Backs off while offline and reconnects on its own. Writes are never
// retried automatically: if a tap fails, the user sees why and decides.

export interface ActResult { ok: boolean; error?: string; data?: any }

export function useSpades<T = any>(view: string, params: Record<string, string | null | undefined> = {}) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState(0)
  const [online, setOnline] = useState(true)
  const [loading, setLoading] = useState(true)
  const offset = useRef(0)
  const pulse = useRef<string | null>(null)
  const slug = useRef<string | null>(params.t || null)
  const inflight = useRef(false)
  const again = useRef(false)

  const q = new URLSearchParams({ view })
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
  const qs = q.toString()
  const asPlayer = params.as || null

  const load = useCallback(async (): Promise<void> => {
    if (inflight.current) { again.current = true; return }
    inflight.current = true
    try {
      const res = await fetch(`/api/spades/state?${qs}`, { cache: 'no-store', credentials: 'same-origin' })
      const j = await res.json().catch(() => ({}))
      setStatus(res.status)
      if (j.serverNow) offset.current = new Date(j.serverNow).getTime() - Date.now()
      if (j.pulse) pulse.current = j.pulse
      if (j.tournament?.slug) slug.current = j.tournament.slug
      setError(res.ok ? null : j.error || `Error ${res.status}`)
      setData(j)
      setOnline(true)
    } catch {
      setOnline(false)
    } finally {
      inflight.current = false
      setLoading(false)
      if (again.current) { again.current = false; void load() }
    }
  }, [qs])

  useEffect(() => {
    void load()
    let stopped = false
    let failures = 0
    let lastFull = Date.now()
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      if (stopped) return
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        if (!slug.current) await load()
        else {
          try {
            const r = await fetch(`/api/spades/pulse?t=${encodeURIComponent(slug.current)}`, { cache: 'no-store' })
            if (!r.ok) throw new Error('pulse')
            const j = await r.json()
            if (j.serverNow) offset.current = new Date(j.serverNow).getTime() - Date.now()
            if (failures) { failures = 0 }
            setOnline(true)
            if (j.pulse !== pulse.current || Date.now() - lastFull > 20000) {
              lastFull = Date.now()
              await load()
            }
          } catch {
            failures++
            setOnline(false)
          }
        }
      }
      if (!stopped) timer = setTimeout(tick, failures ? Math.min(10000, 2000 * 2 ** Math.min(failures, 3)) : 2000)
    }
    timer = setTimeout(tick, 2000)
    const onVisible = () => { if (document.visibilityState === 'visible') void load() }
    const onOnline = () => { failures = 0; void load() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', () => setOnline(false))
    return () => {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [load])

  const act = useCallback(async (action: string, payload: Record<string, unknown> = {}): Promise<ActResult> => {
    try {
      const res = await fetch('/api/spades/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        // Test Mode panels act as a simulated player (director only, test events only).
        body: JSON.stringify({ ...payload, action, ...(asPlayer ? { asPlayerId: asPlayer } : {}) }),
      })
      const j = await res.json().catch(() => ({}))
      void load()
      if (!res.ok) return { ok: false, error: j.error || `Error ${res.status}` }
      return { ok: true, data: j }
    } catch {
      setOnline(false)
      void load()
      return { ok: false, error: 'Not sent. You look offline. Check your connection, then tap again.' }
    }
  }, [load, asPlayer])

  const serverNow = useCallback(() => Date.now() + offset.current, [])

  return { data, error, status, loading, online, reload: load, act, serverNow }
}

export async function postAuth(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch('/api/spades/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: { error: 'Could not reach the server. Check your connection.' } }
  }
}
