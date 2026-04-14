/**
 * ORCA Global Event Bus
 *
 * All modules subscribe to these events and update automatically.
 * Events: bill.created, bill.updated, bill.paid, income.logged,
 *         goal.updated, task.updated, settings.updated
 */

export type OrcaEventType =
  | 'bill.created'
  | 'bill.updated'
  | 'bill.paid'
  | 'income.logged'
  | 'goal.updated'
  | 'task.updated'
  | 'settings.updated'
  | 'engine.recompute'

export interface OrcaEvent<T = unknown> {
  type: OrcaEventType
  payload?: T
  timestamp: number
}

type Listener<T = unknown> = (event: OrcaEvent<T>) => void

class EventBus {
  private listeners = new Map<OrcaEventType, Set<Listener<any>>>()

  on<T = unknown>(type: OrcaEventType, listener: Listener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(listener)
    // Return unsubscribe function
    return () => this.off(type, listener)
  }

  off<T = unknown>(type: OrcaEventType, listener: Listener<T>): void {
    this.listeners.get(type)?.delete(listener)
  }

  emit<T = unknown>(type: OrcaEventType, payload?: T): void {
    const event: OrcaEvent<T> = { type, payload, timestamp: Date.now() }
    this.listeners.get(type)?.forEach(listener => {
      try {
        listener(event)
      } catch (err) {
        console.error(`[EventBus] Error in listener for ${type}:`, err)
      }
    })
    // Always trigger engine recompute after financial events
    if (type !== 'engine.recompute' && type !== 'task.updated') {
      this.emit('engine.recompute', { triggeredBy: type })
    }
  }

  // Broadcast to all browser tabs via BroadcastChannel (if available)
  broadcast<T = unknown>(type: OrcaEventType, payload?: T): void {
    this.emit(type, payload)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('orca-events')
        channel.postMessage({ type, payload, timestamp: Date.now() })
        channel.close()
      } catch {}
    }
  }
}

// Singleton instance
export const orcaEvents = new EventBus()

// ── React hook for subscribing to events ──
import { useEffect } from 'react'

export function useOrcaEvent<T = unknown>(
  type: OrcaEventType,
  listener: (event: OrcaEvent<T>) => void,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const unsub = orcaEvents.on<T>(type, listener)
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// ── Cross-tab event bridge ──
export function initEventBridge(): () => void {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return () => {}
  }
  const channel = new BroadcastChannel('orca-events')
  channel.onmessage = (e: MessageEvent<OrcaEvent>) => {
    if (e.data?.type) {
      // Re-emit without broadcasting (to avoid loop)
      orcaEvents.emit(e.data.type, e.data.payload)
    }
  }
  return () => channel.close()
}
