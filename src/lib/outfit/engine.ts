/**
 * Rules-based styling engine. Runs entirely client-side and is the default
 * StylistProvider — an AI stylist can replace or re-rank its output (see providers.ts).
 */
import type {
  CatalogPiece, Gender, Occasion, OutfitDraft, OutfitPieces, Season, Slot, WardrobeItem,
} from './types'
import { CATEGORY_CONFIG, FORMALITY_LABELS, OCCASIONS, currentSeason, staplesFor } from './catalog'
import { getColor, outfitHarmony, pairScore, relation } from './colors'

export type PieceLike = Pick<WardrobeItem, 'name' | 'category' | 'primaryColor' | 'pattern' | 'styles' | 'seasons' | 'formality'>

export interface StyleContext {
  gender: Gender
  occasion?: Occasion
  season?: Season
}

/** One filled position in an outfit: either an owned item (id) or an unowned catalog suggestion. */
export interface Entry {
  slot: Slot
  piece: PieceLike
  id?: string
  catalog?: CatalogPiece
}

export const slotOf = (p: Pick<PieceLike, 'category'>): Slot => CATEGORY_CONFIG[p.category].slot

export const emptyPieces = (): OutfitPieces => ({ accessories: [] })

export function piecesToEntries(pieces: OutfitPieces, byId: Record<string, WardrobeItem>): Entry[] {
  const out: Entry[] = []
  for (const slot of ['onepiece', 'top', 'bottom', 'outerwear', 'shoes'] as const) {
    const id = pieces[slot]
    if (id && byId[id]) out.push({ slot, piece: byId[id], id })
  }
  for (const id of pieces.accessories) if (byId[id]) out.push({ slot: 'accessory', piece: byId[id], id })
  return out
}

export function entriesToDraft(entries: Entry[], score: number, reasons: string[]): OutfitDraft {
  const pieces = emptyPieces()
  const suggestions: OutfitDraft['suggestions'] = {}
  for (const e of entries) {
    if (e.catalog) { suggestions[e.slot] = e.catalog; continue }
    if (!e.id) continue
    if (e.slot === 'accessory') pieces.accessories.push(e.id)
    else pieces[e.slot] = e.id
  }
  return { pieces, suggestions, score, reasons }
}

/** Slots an outfit still needs, given what's filled (a dress covers top + bottom, a suit covers bottom + outerwear). */
export function coveredSlots(entries: Entry[]): Set<Slot> {
  const s = new Set<Slot>()
  for (const e of entries) {
    s.add(e.slot)
    CATEGORY_CONFIG[e.piece.category].covers?.forEach(c => s.add(c))
  }
  return s
}

// ── Scoring ───────────────────────────────────────────────────────────────

function ctxSeason(ctx: StyleContext): Season {
  return ctx.season ?? (ctx.occasion && OCCASIONS[ctx.occasion].season) ?? currentSeason()
}

/** 0–1: how well a single piece suits the occasion + season. 0 = excluded. */
export function pieceFit(p: PieceLike, ctx: StyleContext): number {
  const season = ctxSeason(ctx)
  const seasonFit = p.seasons.includes(season) ? 1 : 0.35
  if (!ctx.occasion) return seasonFit
  const occ = OCCASIONS[ctx.occasion]
  if (occ.avoidCategories?.includes(p.category)) return 0
  if (occ.outerwear === 'avoid' && slotOf(p) === 'outerwear') return 0
  const [lo, hi] = occ.formality
  const dist = p.formality < lo ? lo - p.formality : p.formality > hi ? p.formality - hi : 0
  const formalityFit = Math.max(0, 1 - dist * 0.35)
  const styleFit = p.styles.some(s => occ.styles.includes(s)) ? 1 : 0.6
  // Preferred categories get headroom the base score can't reach, so they win ties between equally formal pieces.
  const bonus = occ.prefer?.includes(p.category) ? 0.15 : 0
  return (formalityFit * 0.45 + styleFit * 0.25 + seasonFit * 0.3) * 0.85 + bonus
}

export function scoreEntries(entries: Entry[], ctx: StyleContext): { score: number; reasons: string[] } {
  const pieces = entries.map(e => e.piece)
  const { score: harmony, clashes } = outfitHarmony(pieces.map(p => p.primaryColor))
  const clothing = pieces.filter(p => slotOf(p) !== 'accessory')
  // Occasion fit is judged on clothing only — a watch fits everything and would dilute the signal.
  const fitPieces = clothing.length ? clothing : pieces
  const fit = fitPieces.length ? fitPieces.reduce((s, p) => s + pieceFit(p, ctx), 0) / fitPieces.length : 0
  const forms = clothing.map(p => p.formality)
  const spread = forms.length ? Math.max(...forms) - Math.min(...forms) : 0
  const patterned = clothing.filter(p => p.pattern !== 'solid').length
  const penalty = Math.max(0, spread - 2) * 0.15 + Math.max(0, patterned - 1) * 0.1
  const score = Math.max(0, Math.min(1, harmony * 0.5 + fit * 0.5 - penalty))
  return { score, reasons: explain(entries, ctx, clashes, spread, patterned) }
}

function explain(entries: Entry[], ctx: StyleContext, clashes: [string, string][], spread: number, patterned: number): string[] {
  const reasons: string[] = []
  const pieces = entries.map(e => e.piece)
  // Strongest curated pairing in the look.
  outer: for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const a = pieces[i], b = pieces[j]
      if (a.primaryColor !== b.primaryColor && relation(a.primaryColor, b.primaryColor) === 'best') {
        reasons.push(`${getColor(a.primaryColor).name} + ${getColor(b.primaryColor).name} is a proven pairing.`)
        break outer
      }
    }
  }
  const chromatic = pieces.filter(p => getColor(p.primaryColor).kind === 'chromatic')
  if (chromatic.length === 1) reasons.push(`The ${chromatic[0].name.toLowerCase()} pops against a neutral base.`)
  else if (chromatic.length === 0 && pieces.length > 2) reasons.push('All-neutral palette — clean and easy to wear.')
  if (spread <= 1 && pieces.length > 1) {
    const f = Math.round(pieces.reduce((s, p) => s + p.formality, 0) / pieces.length) as 1 | 2 | 3 | 4 | 5
    reasons.push(`Consistent formality — ${FORMALITY_LABELS[f].toLowerCase()}.`)
  }
  if (ctx.occasion) reasons.push(`Built for ${OCCASIONS[ctx.occasion].label.toLowerCase()}, ${ctxSeason(ctx)} weather.`)
  for (const [a, b] of clashes.slice(0, 1)) reasons.push(`Heads up: ${getColor(a).name} and ${getColor(b).name} compete — try swapping one.`)
  if (patterned > 1) reasons.push('Two patterns in play — keep the rest solid.')
  if (spread > 2) reasons.push('Mixes very casual and very dressy pieces.')
  return reasons
}

// ── Generation ────────────────────────────────────────────────────────────

const ownsSimilar = (wardrobe: WardrobeItem[], piece: CatalogPiece) =>
  wardrobe.some(w => w.category === piece.category && w.primaryColor === piece.primaryColor)

function topBy<T>(arr: T[], key: (t: T) => number, n: number): T[] {
  return [...arr].sort((a, b) => key(b) - key(a)).slice(0, n)
}

/** Best entry for `slot` to add to `base`, from owned candidates first, else an unowned staple. */
function bestFor(slot: Slot, base: Entry[], owned: Entry[], fillers: Entry[], ctx: StyleContext, allowFiller: boolean): Entry | undefined {
  const pool = owned.length ? owned : allowFiller ? fillers : []
  let best: Entry | undefined, bestScore = -1
  for (const cand of pool) {
    const s = scoreEntries([...base, cand], ctx).score
    if (s > bestScore) { bestScore = s; best = cand }
  }
  return best
}

export function generateOutfits(opts: {
  wardrobe: WardrobeItem[]
  ctx: StyleContext
  locked?: OutfitPieces
  limit?: number
}): OutfitDraft[] {
  const { wardrobe, ctx, limit = 12 } = opts
  const locked = opts.locked ?? emptyPieces()
  const byId = Object.fromEntries(wardrobe.map(w => [w.id, w]))

  const ownedBySlot = (slot: Slot, lockedId?: string): Entry[] => {
    if (lockedId && byId[lockedId]) return [{ slot, piece: byId[lockedId], id: lockedId }]
    const items = wardrobe.filter(w => slotOf(w) === slot && pieceFit(w, ctx) > 0)
    return topBy(items, w => pieceFit(w, ctx) + (w.favorite ? 0.05 : 0), 8).map(w => ({ slot, piece: w, id: w.id }))
  }
  const fillersFor = (slot: Slot): Entry[] =>
    staplesFor(ctx.gender)
      .filter(s => slotOf(s) === slot && pieceFit(s, ctx) > 0 && !ownsSimilar(wardrobe, s))
      .map(s => ({ slot, piece: s, catalog: s }))

  const tops = ownedBySlot('top', locked.top)
  const bottoms = ownedBySlot('bottom', locked.bottom)
  const onepieces = ownedBySlot('onepiece', locked.onepiece)
  const outers = ownedBySlot('outerwear', locked.outerwear)
  const shoes = ownedBySlot('shoes', locked.shoes)
  const accessories = locked.accessories.length
    ? locked.accessories.filter(id => byId[id]).map(id => ({ slot: 'accessory' as Slot, piece: byId[id], id }))
    : ownedBySlot('accessory')

  // Base silhouettes: top + bottom, a dress, or a suit + top.
  const bases: Entry[][] = []
  const lockedTwoPiece = Boolean(locked.top || locked.bottom)
  if (!locked.onepiece) {
    const ts = tops.length ? tops : [undefined]
    const bs = bottoms.length ? bottoms : [undefined]
    for (const t of ts) for (const b of bs) bases.push([t, b].filter(Boolean) as Entry[])
  }
  if (!locked.bottom) {
    for (const op of onepieces) {
      const covers = CATEGORY_CONFIG[op.piece.category].covers ?? []
      if (covers.includes('top')) { if (!locked.top) bases.push([op]) }
      else for (const t of (tops.length ? tops : [undefined])) bases.push([op, t].filter(Boolean) as Entry[])
    }
  }
  if (!bases.length && !lockedTwoPiece) bases.push([])

  const occ = ctx.occasion ? OCCASIONS[ctx.occasion] : undefined
  const season = ctxSeason(ctx)
  const results: { entries: Entry[]; score: number; reasons: string[] }[] = []

  for (const base of bases) {
    let entries = [...base]
    const covered = () => coveredSlots(entries)
    // Fill any core slot the wardrobe couldn't — with an unowned staple, flagged as a suggestion.
    for (const slot of ['top', 'bottom'] as const) {
      if (!covered().has(slot)) {
        const e = bestFor(slot, entries, [], fillersFor(slot), ctx, true)
        if (e) entries.push(e)
      }
    }
    const shoe = bestFor('shoes', entries, topBy(shoes, s => pieceFit(s.piece, ctx), 5), fillersFor('shoes'), ctx, true)
    if (shoe) entries.push(shoe)

    if (!covered().has('outerwear')) {
      const want = locked.outerwear ? 'required' : occ?.outerwear ?? (season === 'winter' ? 'required' : 'optional')
      if (want !== 'avoid') {
        const outer = bestFor('outerwear', entries, outers, fillersFor('outerwear'), ctx, want === 'required')
        if (outer) {
          const before = scoreEntries(entries, ctx).score
          const after = scoreEntries([...entries, outer], ctx).score
          const coolWeather = season === 'fall' || season === 'winter'
          if (want === 'required' || (coolWeather && after >= before - 0.02) || after > before + 0.01) entries.push(outer)
        }
      }
    }

    // Up to two accessories of different types that don't hurt the look.
    const usedCats = new Set<string>()
    for (const acc of topBy(accessories, a => scoreEntries([...entries, a], ctx).score, accessories.length)) {
      if (entries.filter(e => e.slot === 'accessory').length >= (locked.accessories.length || 2)) break
      if (usedCats.has(acc.piece.category)) continue
      const before = scoreEntries(entries, ctx).score
      if (scoreEntries([...entries, acc], ctx).score >= before - 0.05 || locked.accessories.length) {
        entries.push(acc); usedCats.add(acc.piece.category)
      }
    }

    const { score, reasons } = scoreEntries(entries, ctx)
    // Owned looks beat looks that lean on suggestions.
    const unowned = entries.filter(e => e.catalog).length
    results.push({ entries, score: score - unowned * 0.06, reasons })
  }

  // Diverse ranking: don't let one top or bottom dominate the carousel.
  results.sort((a, b) => b.score - a.score)
  const seen = new Set<string>(), usage = new Map<string, number>()
  const picked: OutfitDraft[] = []
  for (const r of results) {
    const core = r.entries.filter(e => e.slot !== 'accessory').map(e => e.id ?? e.catalog?.key).join('|')
    if (seen.has(core)) continue
    const keys = r.entries.filter(e => e.slot === 'top' || e.slot === 'bottom' || e.slot === 'onepiece').map(e => e.id ?? e.catalog!.key)
    if (keys.some(k => (usage.get(k) ?? 0) >= 2) && results.length > limit) continue
    seen.add(core)
    keys.forEach(k => usage.set(k, (usage.get(k) ?? 0) + 1))
    picked.push(entriesToDraft(r.entries, Math.max(0, r.score), r.reasons))
    if (picked.length >= limit) break
  }
  return picked
}

// ── Builder helpers ───────────────────────────────────────────────────────

export interface SlotOption { item?: WardrobeItem; catalog?: CatalogPiece; score: number }

/** Ranked replacements for one slot, given the rest of the outfit. Owned items first. */
export function optionsForSlot(slot: Slot, current: Entry[], wardrobe: WardrobeItem[], ctx: StyleContext): SlotOption[] {
  const rest = current.filter(e => e.slot !== slot || slot === 'accessory')
  const owned = wardrobe
    .filter(w => slotOf(w) === slot && !current.some(e => e.id === w.id))
    .map(w => ({ item: w, score: scoreEntries([...rest, { slot, piece: w, id: w.id }], ctx).score }))
    .sort((a, b) => b.score - a.score)
  const ideas = staplesFor(ctx.gender)
    .filter(s => slotOf(s) === slot && !ownsSimilar(wardrobe, s))
    .map(s => ({ catalog: s, score: scoreEntries([...rest, { slot, piece: s, catalog: s }], ctx).score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  return [...owned, ...ideas]
}

export interface Coordinate { slot: Slot; owned: WardrobeItem[]; ideas: CatalogPiece[] }

/** "If you're wearing X, reach for…" — per-slot owned matches plus unowned color ideas. */
export function coordinatesWith(anchor: PieceLike, wardrobe: WardrobeItem[], gender: Gender): Coordinate[] {
  const anchorSlot = slotOf(anchor)
  const covers = new Set<Slot>([anchorSlot, ...(CATEGORY_CONFIG[anchor.category].covers ?? [])])
  const rank = (p: PieceLike) => pairScore(anchor.primaryColor, p.primaryColor) - Math.abs(p.formality - anchor.formality) * 0.08
  const slots: Slot[] = ['top', 'bottom', 'outerwear', 'shoes', 'accessory']
  return slots.filter(s => !covers.has(s)).map(slot => ({
    slot,
    owned: topBy(wardrobe.filter(w => slotOf(w) === slot && rank(w) >= 0.6), rank, 4),
    ideas: topBy(staplesFor(gender).filter(s => slotOf(s) === slot && !ownsSimilar(wardrobe, s) && rank(s) >= 0.7), rank, 3),
  })).filter(c => c.owned.length || c.ideas.length)
}

// ── Complete Your Wardrobe ────────────────────────────────────────────────

export interface WardrobeGap { piece: CatalogPiece; matches: number; examples: WardrobeItem[] }

/** Unowned staples ranked by how many owned pieces they'd unlock. */
export function wardrobeGaps(wardrobe: WardrobeItem[], gender: Gender, max = 4): WardrobeGap[] {
  if (wardrobe.length < 3) return []
  // One watch/belt/bag is the gap; a second in another color isn't.
  const ownedAccessoryCats = new Set(wardrobe.filter(w => slotOf(w) === 'accessory').map(w => w.category))
  const seenAccessoryCats = new Set<string>()
  const ranked = staplesFor(gender)
    .filter(s => !ownsSimilar(wardrobe, s) && !(slotOf(s) === 'accessory' && ownedAccessoryCats.has(s.category)))
    .map(piece => {
      const slot = slotOf(piece)
      const matches = wardrobe.filter(w =>
        slotOf(w) !== slot &&
        pairScore(piece.primaryColor, w.primaryColor) >= 0.85 &&
        Math.abs(w.formality - piece.formality) <= 2,
      )
      return { piece, matches: matches.length, examples: matches.slice(0, 4) }
    })
    .filter(g => g.matches >= 3)
    .sort((a, b) => b.matches - a.matches)
  return ranked.filter(g => {
    if (slotOf(g.piece) !== 'accessory') return true
    if (seenAccessoryCats.has(g.piece.category)) return false
    seenAccessoryCats.add(g.piece.category)
    return true
  }).slice(0, max)
}
