'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { setLocalSynced } from '@/lib/syncLocal'
import type { Gender, OutfitPieces, OutfitPrefs, SavedOutfit, WardrobeItem } from './types'
import { OUTFIT_KEYS } from './types'
import { buildSampleWardrobe } from './catalog'
import { OUTFIT_PROVIDERS } from './providers'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

export const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
/** Local YYYY-MM-DD (toISOString is UTC, which logs evening wears as tomorrow). */
export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = () => localDay()

/** Single source of truth for the Outfit feature's persisted state. */
export function useOutfitStore() {
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([])
  const [outfits, setOutfits] = useState<SavedOutfit[]>([])
  const [prefs, setPrefs] = useState<OutfitPrefs>({ gender: 'men' })
  const [ready, setReady] = useState(false)

  const load = useCallback(() => {
    setWardrobe(read(OUTFIT_KEYS.wardrobe, []))
    setOutfits(read(OUTFIT_KEYS.outfits, []))
    setPrefs(read(OUTFIT_KEYS.prefs, { gender: 'men' as Gender }))
    setReady(true)
  }, [])

  useEffect(() => {
    load()
    window.addEventListener('orca-sync-ready', load)
    return () => window.removeEventListener('orca-sync-ready', load)
  }, [load])

  const commitWardrobe = useCallback((fn: (prev: WardrobeItem[]) => WardrobeItem[]) => {
    setWardrobe(prev => { const next = fn(prev); setLocalSynced(OUTFIT_KEYS.wardrobe, JSON.stringify(next)); return next })
  }, [])
  const commitOutfits = useCallback((fn: (prev: SavedOutfit[]) => SavedOutfit[]) => {
    setOutfits(prev => { const next = fn(prev); setLocalSynced(OUTFIT_KEYS.outfits, JSON.stringify(next)); return next })
  }, [])

  const byId = useMemo(() => Object.fromEntries(wardrobe.map(w => [w.id, w])), [wardrobe])

  // ── Prefs ──
  const updatePrefs = useCallback((patch: Partial<OutfitPrefs>) => {
    setPrefs(prev => { const next = { ...prev, ...patch }; setLocalSynced(OUTFIT_KEYS.prefs, JSON.stringify(next)); return next })
  }, [])

  // ── Wardrobe ──
  const addItems = useCallback((items: WardrobeItem[]) => commitWardrobe(prev => [...items, ...prev]), [commitWardrobe])

  const updateItem = useCallback((id: string, patch: Partial<WardrobeItem>) =>
    commitWardrobe(prev => prev.map(w => (w.id === id ? { ...w, ...patch } : w))), [commitWardrobe])

  const removeItem = useCallback((id: string) => {
    const path = wardrobe.find(w => w.id === id)?.imagePath
    if (path) OUTFIT_PROVIDERS.images.remove(path)
    commitWardrobe(prev => prev.filter(w => w.id !== id))
  }, [wardrobe, commitWardrobe])

  const loadSample = useCallback((gender: Gender) =>
    commitWardrobe(prev => [...prev.filter(w => w.source !== 'sample'), ...buildSampleWardrobe(gender)]), [commitWardrobe])

  const clearSample = useCallback(() => commitWardrobe(prev => prev.filter(w => w.source !== 'sample')), [commitWardrobe])

  // ── Outfits ──
  const saveOutfit = useCallback((pieces: OutfitPieces, meta: Partial<SavedOutfit> = {}): SavedOutfit => {
    const now = new Date().toISOString()
    const outfit: SavedOutfit = {
      id: newId('look'), name: 'New Look', gender: prefs.gender, favorite: false, wornOn: [],
      createdAt: now, updatedAt: now, ...meta, pieces,
    }
    commitOutfits(prev => [outfit, ...prev])
    return outfit
  }, [commitOutfits, prefs.gender])

  const updateOutfit = useCallback((id: string, patch: Partial<SavedOutfit>) =>
    commitOutfits(prev => prev.map(o => (o.id === id ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o))), [commitOutfits])

  const duplicateOutfit = useCallback((id: string) => commitOutfits(prev => {
    const src = prev.find(o => o.id === id)
    if (!src) return prev
    const now = new Date().toISOString()
    const copy: SavedOutfit = {
      ...src, id: newId('look'), name: `${src.name} (copy)`, favorite: false, wornOn: [], createdAt: now, updatedAt: now,
      pieces: { ...src.pieces, accessories: [...src.pieces.accessories] },
    }
    return [copy, ...prev]
  }), [commitOutfits])

  const deleteOutfit = useCallback((id: string) => commitOutfits(prev => prev.filter(o => o.id !== id)), [commitOutfits])

  /** Log a wear: dates the look (calendar-ready) and bumps every piece's wear count. */
  const wearOutfit = useCallback((id: string) => {
    const outfit = outfits.find(o => o.id === id)
    if (!outfit) return
    const d = today()
    commitOutfits(prev => prev.map(o => (o.id === id && !o.wornOn.includes(d) ? { ...o, wornOn: [...o.wornOn, d] } : o)))
    const ids = new Set([outfit.pieces.top, outfit.pieces.bottom, outfit.pieces.onepiece, outfit.pieces.outerwear, outfit.pieces.shoes, ...outfit.pieces.accessories].filter(Boolean))
    commitWardrobe(prev => prev.map(w => (ids.has(w.id) && w.lastWornAt !== d ? { ...w, wearCount: w.wearCount + 1, lastWornAt: d } : w)))
  }, [outfits, commitOutfits, commitWardrobe])

  return {
    ready, wardrobe, outfits, prefs, byId,
    updatePrefs, addItems, updateItem, removeItem, loadSample, clearSample,
    saveOutfit, updateOutfit, duplicateOutfit, deleteOutfit, wearOutfit,
  }
}

export type OutfitStore = ReturnType<typeof useOutfitStore>
