'use client'
/**
 * ORCA Outfit — pluggable AI services.
 *
 * The UI only ever talks to `OUTFIT_PROVIDERS`. Each slot has a working
 * default today; swapping in a real model (vision API, try-on API, affiliate
 * network) means writing one object that satisfies the interface and
 * assigning it here — no page or component changes.
 */
import type { CatalogPiece, DetectedItem, Gender, Occasion, OutfitPieces, Season, WardrobeItem } from './types'
import { OCCASIONS, categoryFromText, parseRequest } from './catalog'
import { colorFromText } from './colors'
import { analyzeItemPhoto, blobToDataUrl, downscale, scanClosetPhoto } from './vision'

export interface ProviderInfo {
  id: string
  label: string
  /** false = placeholder; UI shows a "not connected yet" state. */
  live: boolean
}

// ── Interfaces ────────────────────────────────────────────────────────────

export interface RecognitionProvider extends ProviderInfo {
  analyze(file: Blob, hint?: string): Promise<DetectedItem>
}

export interface ClosetScanProvider extends ProviderInfo {
  scan(file: Blob): Promise<DetectedItem[]>
}

export interface BackgroundRemovalProvider extends ProviderInfo {
  remove(image: Blob): Promise<Blob>
}

export interface ProductImportProvider extends ProviderInfo {
  importUrl(url: string): Promise<DetectedItem>
}

export interface StylistInterpretation {
  occasion: Occasion
  season?: Season
  /** Specific owned looks the stylist proposed (ids). Engine still scores/fills them. */
  looks: OutfitPieces[]
  note?: string
  source: 'ai' | 'local'
}

export interface StylistProvider extends ProviderInfo {
  interpret(request: string, wardrobe: WardrobeItem[], gender: Gender): Promise<StylistInterpretation>
}

export interface TryOnRequest {
  /** Data URL or storage URL of the user's photo. */
  personImage: string
  garments: { imageUrl?: string; category: string; color: string; name: string }[]
  gender: Gender
}

export interface TryOnProvider extends ProviderInfo {
  render(req: TryOnRequest): Promise<{ imageUrl: string }>
}

export interface ProductLink { label: string; url: string; affiliate: boolean }

export interface ShoppingProvider extends ProviderInfo {
  linksFor(piece: CatalogPiece, gender: Gender): ProductLink[]
}

export interface ImageStore extends ProviderInfo {
  /** Persist an image; returns a URL safe to store on a WardrobeItem. */
  save(image: Blob): Promise<{ url: string; path?: string }>
  remove(path: string): Promise<void>
}

// ── Default implementations ───────────────────────────────────────────────

const onDeviceRecognition: RecognitionProvider = {
  id: 'on-device', label: 'On-device color analysis', live: true,
  analyze: (file, hint) => analyzeItemPhoto(file, hint),
}

const onDeviceClosetScan: ClosetScanProvider = {
  id: 'on-device-strips', label: 'On-device rack segmentation (beta)', live: true,
  scan: file => scanClosetPhoto(file),
}

const noBackgroundRemoval: BackgroundRemovalProvider = {
  id: 'none', label: 'Background removal', live: false,
  remove: async image => image,
}

const serverProductImport: ProductImportProvider = {
  id: 'og-scrape', label: 'Product page import', live: true,
  async importUrl(url) {
    const res = await fetch('/api/outfit/import-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Import failed')
    const title: string = data.title || ''
    let detected: DetectedItem | undefined
    if (data.image) {
      try {
        const blob = await (await fetch(data.image)).blob()
        detected = await onDeviceRecognition.analyze(blob, title)
      } catch { /* fall through to text-only */ }
    }
    const textColor = colorFromText(title)
    const textCategory = categoryFromText(title)
    const base: DetectedItem = detected ?? {
      name: '', category: textCategory ?? 'tshirt', primaryColor: textColor ?? 'gray', accentColors: [],
      pattern: 'solid', styles: ['casual'], seasons: ['spring', 'summer', 'fall', 'winter'], formality: 2, source: 'url',
      confidence: { category: textCategory ? 0.7 : 0.2, color: textColor ? 0.7 : 0.1 },
    }
    return {
      ...base,
      name: title.slice(0, 80),
      // Titles name the color explicitly ("Olive Slim Chino") — trust them over pixels.
      primaryColor: textColor ?? base.primaryColor,
      category: textCategory ?? base.category,
      brand: data.brand || undefined,
      price: typeof data.price === 'number' ? data.price : undefined,
      productUrl: url,
      source: 'url',
    }
  },
}

const localStylist: StylistProvider = {
  id: 'orca-rules', label: 'ORCA styling rules', live: true,
  async interpret(request) {
    const { occasion, season, matched } = parseRequest(request)
    return {
      occasion, season, looks: [], source: 'local',
      note: matched.length ? `Read as: ${matched.join(', ')} → ${OCCASIONS[occasion].label}.` : undefined,
    }
  },
}

/** DeepSeek-backed stylist (text only — it reasons over the wardrobe list, not photos). Falls back to local rules. */
const aiStylist: StylistProvider = {
  id: 'deepseek', label: 'Bentley AI stylist', live: true,
  async interpret(request, wardrobe, gender) {
    try {
      const res = await fetch('/api/outfit/stylist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request, gender,
          wardrobe: wardrobe.map(w => ({ id: w.id, name: w.name, category: w.category, color: w.primaryColor, formality: w.formality })),
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      const ids = new Set(wardrobe.map(w => w.id))
      const looks: OutfitPieces[] = (data.looks || []).map((l: Record<string, unknown>) => ({
        top: ids.has(l.top as string) ? l.top : undefined,
        bottom: ids.has(l.bottom as string) ? l.bottom : undefined,
        onepiece: ids.has(l.onepiece as string) ? l.onepiece : undefined,
        outerwear: ids.has(l.outerwear as string) ? l.outerwear : undefined,
        shoes: ids.has(l.shoes as string) ? l.shoes : undefined,
        accessories: Array.isArray(l.accessories) ? (l.accessories as string[]).filter(a => ids.has(a)) : [],
      }))
      const occasion = (data.occasion in OCCASIONS ? data.occasion : parseRequest(request).occasion) as Occasion
      return { occasion, season: data.season, looks, note: data.note, source: 'ai' }
    } catch {
      return localStylist.interpret(request, wardrobe, gender)
    }
  },
}

const notConnectedTryOn: TryOnProvider = {
  id: 'none', label: 'AI virtual try-on', live: false,
  async render() { throw new Error('Virtual try-on is not connected yet') },
}

const searchLinks: ShoppingProvider = {
  id: 'search', label: 'Shopping search', live: true,
  linksFor(piece, gender) {
    const q = encodeURIComponent(`${gender === 'men' ? "men's" : "women's"} ${piece.name}`)
    return [
      { label: 'Google Shopping', url: `https://www.google.com/search?tbm=shop&q=${q}`, affiliate: false },
      { label: 'Nordstrom', url: `https://www.nordstrom.com/sr?keyword=${q}`, affiliate: false },
    ]
  },
}

const supabaseImageStore: ImageStore = {
  id: 'supabase', label: 'ORCA cloud photos', live: true,
  async save(image) {
    const small = await downscale(image, 1024)
    try {
      const form = new FormData()
      form.append('file', small, 'item.jpg')
      const res = await fetch('/api/outfit/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed')
      return { url: data.url, path: data.path }
    } catch {
      // Offline / storage not configured: keep a small inline thumbnail so the item still has a picture.
      return { url: await blobToDataUrl(await downscale(small, 280, 0.7)) }
    }
  },
  async remove(path) {
    await fetch('/api/outfit/upload', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }),
    }).catch(() => {})
  },
}

export const OUTFIT_PROVIDERS = {
  recognition: onDeviceRecognition as RecognitionProvider,
  closetScan: onDeviceClosetScan as ClosetScanProvider,
  backgroundRemoval: noBackgroundRemoval as BackgroundRemovalProvider,
  productImport: serverProductImport as ProductImportProvider,
  stylist: aiStylist as StylistProvider,
  tryOn: notConnectedTryOn as TryOnProvider,
  shopping: searchLinks as ShoppingProvider,
  images: supabaseImageStore as ImageStore,
}
