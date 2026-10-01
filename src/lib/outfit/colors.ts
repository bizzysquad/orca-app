import type { ColorId } from './types'

export type ColorKind = 'neutral' | 'chromatic' | 'metal'

export interface NamedColor {
  id: ColorId
  name: string
  hex: string
  kind: ColorKind
  /** Curated pairings that always read as intentional. */
  best: ColorId[]
  /** Curated pairings that clash or read as a mistake. */
  avoid: ColorId[]
  /** One-line styling note shown in the Color Match assistant. */
  note: string
}

const C = (
  id: string, name: string, hex: string, kind: ColorKind,
  best: string[], avoid: string[], note: string,
): NamedColor => ({ id, name, hex, kind, best, avoid, note })

/** The fashion palette everything is detected into and matched against. */
export const COLOR_PALETTE: NamedColor[] = [
  // ── Neutrals ──
  C('black', 'Black', '#141414', 'neutral', ['white', 'light-gray', 'camel', 'burgundy', 'red', 'cobalt', 'emerald', 'gold', 'blush'], ['navy', 'brown'], 'The sharpest base there is — strongest against light or saturated tones.'),
  C('charcoal', 'Charcoal', '#36393F', 'neutral', ['white', 'light-blue', 'burgundy', 'pink', 'camel', 'lavender', 'silver'], ['brown'], 'Softer than black and more forgiving; great with cool pastels.'),
  C('gray', 'Gray', '#8A8D91', 'neutral', ['navy', 'white', 'burgundy', 'pink', 'cobalt', 'mustard', 'black'], ['beige', 'khaki'], 'Cool neutral — pairs best with cool tones and one warm accent.'),
  C('light-gray', 'Light Gray', '#C8C9CB', 'neutral', ['navy', 'black', 'white', 'blush', 'lavender', 'sage'], ['cream'], 'Airy and clean; give it contrast so it doesn\'t wash out.'),
  C('white', 'White', '#F7F7F5', 'neutral', ['navy', 'black', 'denim', 'olive', 'camel', 'red', 'cobalt', 'light-blue'], ['cream'], 'Goes with everything — just not next to off-whites, which look dingy beside it.'),
  C('cream', 'Cream', '#EFE6D2', 'neutral', ['brown', 'camel', 'olive', 'navy', 'rust', 'sage', 'burgundy', 'denim'], ['white', 'yellow'], 'Warm off-white — richer than white with earth tones and navy.'),
  C('beige', 'Beige', '#D8C3A5', 'neutral', ['white', 'brown', 'navy', 'olive', 'sage', 'rust', 'denim'], ['gray', 'khaki'], 'Warm and quiet; layer with deeper earth tones for depth.'),
  C('khaki', 'Khaki', '#C3B091', 'neutral', ['navy', 'white', 'light-blue', 'olive', 'brown', 'burgundy'], ['beige', 'yellow', 'gray'], 'The chino color — built for navy, white, and light blue.'),
  C('camel', 'Camel', '#C19A6B', 'neutral', ['navy', 'black', 'white', 'cream', 'burgundy', 'charcoal', 'denim', 'forest'], ['orange', 'tan'], 'Instantly elevates — the classic coat color over navy, black, or gray.'),
  C('tan', 'Tan', '#B5895B', 'neutral', ['navy', 'white', 'olive', 'denim', 'forest', 'cream'], ['camel', 'orange'], 'Earthy and relaxed; reads best with navy, olive, and denim.'),
  C('brown', 'Brown', '#6B4423', 'neutral', ['cream', 'light-blue', 'olive', 'sage', 'denim', 'white', 'mustard', 'teal'], ['black', 'purple'], 'Rich and grounding — the go-to for boots, belts, and leather.'),
  C('navy', 'Navy', '#1F2A44', 'neutral', ['white', 'cream', 'gray', 'camel', 'burgundy', 'olive', 'light-blue', 'brown', 'khaki'], ['black', 'purple'], 'The most versatile dark — reads polished with nearly any warm or light tone.'),
  C('denim', 'Denim Blue', '#4A6C8F', 'neutral', ['white', 'cream', 'camel', 'rust', 'brown', 'mustard', 'light-gray'], ['blue', 'cobalt'], 'Acts as a neutral; warm tones make it pop. Avoid near-matching blues.'),
  C('olive', 'Olive', '#6B6B3A', 'neutral', ['white', 'cream', 'black', 'navy', 'tan', 'brown', 'rust', 'light-blue'], ['green', 'emerald', 'purple'], 'A neutral with personality — loves earth tones and crisp whites.'),
  // ── Chromatics ──
  C('burgundy', 'Burgundy', '#6D1A2B', 'chromatic', ['navy', 'gray', 'camel', 'cream', 'olive', 'charcoal', 'blush', 'denim'], ['red', 'orange', 'pink'], 'Deep and refined — the easiest "color" for fall and evening.'),
  C('red', 'Red', '#C0282D', 'chromatic', ['navy', 'white', 'black', 'denim', 'camel', 'gray'], ['orange', 'pink', 'burgundy', 'purple'], 'A statement — keep everything else neutral and let it lead.'),
  C('coral', 'Coral', '#F2786A', 'chromatic', ['navy', 'white', 'cream', 'denim', 'teal', 'khaki'], ['red', 'orange'], 'Warm summer color — great with navy and crisp whites.'),
  C('pink', 'Pink', '#F1A7B8', 'chromatic', ['navy', 'gray', 'charcoal', 'white', 'burgundy', 'olive', 'denim'], ['red', 'orange'], 'Fresher with grays and navy than with other brights.'),
  C('blush', 'Blush', '#E8C4C0', 'chromatic', ['cream', 'camel', 'gray', 'navy', 'white', 'burgundy', 'sage'], ['yellow'], 'Soft and muted — tonal neutrals keep it elegant.'),
  C('orange', 'Orange', '#E07B26', 'chromatic', ['navy', 'denim', 'white', 'brown', 'teal', 'cream'], ['red', 'pink', 'purple'], 'Loud on its own — anchor it with navy or denim.'),
  C('rust', 'Rust', '#A8492B', 'chromatic', ['cream', 'denim', 'olive', 'navy', 'forest', 'teal', 'camel'], ['red', 'pink', 'purple'], 'An earthy statement — perfect with denim and fall layers.'),
  C('mustard', 'Mustard', '#D4A017', 'chromatic', ['navy', 'gray', 'brown', 'denim', 'burgundy', 'olive', 'white'], ['yellow', 'orange'], 'Vintage warmth; pairs especially well with navy and gray.'),
  C('yellow', 'Yellow', '#F2D03B', 'chromatic', ['navy', 'gray', 'white', 'denim', 'light-blue', 'cobalt'], ['mustard', 'orange', 'cream'], 'Bright and sunny — best as one piece against cool neutrals.'),
  C('sage', 'Sage', '#A3B18A', 'chromatic', ['cream', 'white', 'beige', 'brown', 'blush', 'navy', 'light-gray'], ['emerald', 'red'], 'A muted green that behaves almost like a neutral.'),
  C('green', 'Kelly Green', '#2E7D32', 'chromatic', ['white', 'navy', 'khaki', 'denim', 'cream', 'brown'], ['red', 'olive', 'orange'], 'Bold and preppy — crisp neutrals keep it sharp.'),
  C('forest', 'Forest Green', '#1F4D2B', 'chromatic', ['camel', 'cream', 'tan', 'navy', 'burgundy', 'rust', 'white'], ['olive', 'emerald'], 'Deep and outdoorsy — natural partner for camel and rust.'),
  C('emerald', 'Emerald', '#0F7B5F', 'chromatic', ['black', 'white', 'gold', 'navy', 'blush', 'camel'], ['olive', 'green', 'red'], 'Jewel tone — gorgeous with black and gold for evening.'),
  C('teal', 'Teal', '#13777A', 'chromatic', ['cream', 'rust', 'coral', 'navy', 'gray', 'camel', 'white'], ['green'], 'Pairs beautifully with its warm opposite, rust or coral.'),
  C('light-blue', 'Light Blue', '#A9C8E8', 'chromatic', ['navy', 'khaki', 'white', 'brown', 'gray', 'olive', 'camel', 'charcoal'], ['purple'], 'The dress-shirt color — works under nearly every suit and chino.'),
  C('blue', 'Royal Blue', '#2F5EA8', 'chromatic', ['white', 'gray', 'khaki', 'camel', 'brown', 'navy'], ['denim', 'purple'], 'Clean and confident; keep other blues clearly lighter or darker.'),
  C('cobalt', 'Cobalt', '#1F4FD1', 'chromatic', ['white', 'black', 'gray', 'camel', 'yellow'], ['denim', 'purple'], 'Electric — a single cobalt piece carries the outfit.'),
  C('lavender', 'Lavender', '#B8A6D9', 'chromatic', ['gray', 'white', 'cream', 'navy', 'sage', 'charcoal', 'light-gray'], ['red', 'orange'], 'Soft pastel — gray and navy keep it grown-up.'),
  C('purple', 'Purple', '#5B2A86', 'chromatic', ['gray', 'black', 'white', 'mustard', 'camel', 'charcoal'], ['navy', 'red', 'brown'], 'Regal and moody — give it plenty of neutral breathing room.'),
  C('plum', 'Plum', '#6A2C4F', 'chromatic', ['gray', 'camel', 'cream', 'charcoal', 'sage', 'blush'], ['red', 'orange'], 'A softer, warmer purple — lovely with camel and gray.'),
  // ── Metals (jewelry, watches, hardware) ──
  C('gold', 'Gold', '#C9A23F', 'metal', ['black', 'navy', 'white', 'emerald', 'burgundy', 'cream', 'brown', 'olive'], ['silver'], 'Warm metal — best with warm palettes, black, and jewel tones.'),
  C('silver', 'Silver', '#B8BCC2', 'metal', ['black', 'gray', 'charcoal', 'navy', 'white', 'lavender', 'cobalt'], ['gold', 'brown'], 'Cool metal — matches cool palettes, grays, and blues.'),
]

export const COLOR_BY_ID: Record<ColorId, NamedColor> = Object.fromEntries(COLOR_PALETTE.map(c => [c.id, c]))

export function getColor(id: ColorId | undefined): NamedColor {
  return (id && COLOR_BY_ID[id]) || COLOR_BY_ID.gray
}

// ── Color math ────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
}

/** HSL saturation × mid-lightness — high for vivid colors, low for muted/pastel/dark ones. */
export function vividness(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return 0
  const s = (max - min) / (1 - Math.abs(2 * l - 1))
  return s * (1 - Math.abs(2 * l - 1) * 0.6)
}

export function hueOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return h * 60
}

/** sRGB → CIE Lab (D65), for perceptual nearest-color matching. */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const R = lin(r), G = lin(g), B = lin(b)
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  const y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const fx = f(x), fy = f(y), fz = f(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function labDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

const PALETTE_LAB = COLOR_PALETTE
  .filter(c => c.kind !== 'metal')
  .map(c => ({ id: c.id, lab: rgbToLab(...hexToRgb(c.hex)) }))

/** Snap an arbitrary pixel color to the nearest named garment color (metals excluded). */
export function nearestColorId(r: number, g: number, b: number): ColorId {
  const lab = rgbToLab(r, g, b)
  let best = PALETTE_LAB[0], bestD = Infinity
  for (const p of PALETTE_LAB) {
    const d = labDistance(lab, p.lab)
    if (d < bestD) { bestD = d; best = p }
  }
  return best.id
}

/** Best-effort color name from free text (product titles, filenames). */
export function colorFromText(text: string): ColorId | undefined {
  const t = text.toLowerCase()
  const aliases: [RegExp, ColorId][] = [
    [/\b(navy|midnight)\b/, 'navy'], [/\bcharcoal\b/, 'charcoal'], [/\b(light|heather|ash)[ -]?gr[ae]y\b/, 'light-gray'],
    [/\bgr[ae]y\b/, 'gray'], [/\b(off[ -]?white|ivory|ecru|cream|bone|oat)\b/, 'cream'], [/\bwhite\b/, 'white'],
    [/\bblack\b/, 'black'], [/\b(beige|sand|stone|taupe)\b/, 'beige'], [/\bkhaki\b/, 'khaki'], [/\bcamel\b/, 'camel'],
    [/\b(tan|cognac|whiskey)\b/, 'tan'], [/\b(brown|chocolate|mocha|espresso)\b/, 'brown'],
    [/\b(denim|indigo|chambray)\b/, 'denim'], [/\b(olive|army|military)\b/, 'olive'],
    [/\b(burgundy|maroon|wine|oxblood)\b/, 'burgundy'], [/\bcoral\b/, 'coral'], [/\bblush\b/, 'blush'],
    [/\b(pink|rose)\b/, 'pink'], [/\bred\b/, 'red'], [/\brust\b/, 'rust'], [/\borange\b/, 'orange'],
    [/\bmustard\b/, 'mustard'], [/\byellow\b/, 'yellow'], [/\bsage\b/, 'sage'], [/\bforest\b/, 'forest'],
    [/\bemerald\b/, 'emerald'], [/\bteal\b/, 'teal'], [/\bgreen\b/, 'green'], [/\b(light|sky|baby|powder)[ -]?blue\b/, 'light-blue'],
    [/\bcobalt\b/, 'cobalt'], [/\b(royal )?blue\b/, 'blue'], [/\blavender|lilac\b/, 'lavender'], [/\bplum\b/, 'plum'],
    [/\bpurple|violet\b/, 'purple'], [/\bgold\b/, 'gold'], [/\bsilver|steel\b/, 'silver'],
  ]
  for (const [re, id] of aliases) if (re.test(t)) return id
  return undefined
}

// ── Pairing engine ────────────────────────────────────────────────────────

export type MatchGroup = 'best' | 'neutral' | 'accent' | 'bold' | 'avoid'

export const MATCH_GROUPS: { id: MatchGroup; label: string; blurb: string; color: string }[] = [
  { id: 'best',    label: 'Best Matches',              blurb: 'Proven pairings that always look intentional.',                      color: '#10B981' },
  { id: 'neutral', label: 'Neutral Matches',           blurb: 'Grounding tones that let your color lead.',                          color: '#94A3B8' },
  { id: 'accent',  label: 'Accent Colors',             blurb: 'Use in smaller doses — a tee, scarf, sneaker, or bag.',              color: '#6366F1' },
  { id: 'bold',    label: 'Bold Combinations',         blurb: 'High contrast. Confident — keep it to one statement piece.',         color: '#F59E0B' },
  { id: 'avoid',   label: 'Avoid / Difficult Pairings', blurb: 'Competing hues, or too close to read as intentional.',               color: '#EF4444' },
]

const GROUP_SCORE: Record<MatchGroup, number> = { best: 1, neutral: 0.85, accent: 0.7, bold: 0.55, avoid: 0.1 }

/** How color `b` relates to color `a`. Symmetric for curated avoids; curated bests checked both ways. */
export function relation(aId: ColorId, bId: ColorId): MatchGroup {
  const a = getColor(aId), b = getColor(bId)
  if (a.avoid.includes(b.id) || b.avoid.includes(a.id)) return 'avoid'
  if (a.best.includes(b.id) || b.best.includes(a.id)) return 'best'
  if (b.kind !== 'chromatic') return 'neutral'
  // Neutrals ground any color; only vivid ones read as a bold statement against them.
  if (a.kind !== 'chromatic') return vividness(b.hex) > 0.6 ? 'bold' : 'accent'
  const d = Math.abs(hueOf(a.hex) - hueOf(b.hex))
  const diff = Math.min(d, 360 - d)
  if (diff >= 150) return 'bold'
  if (diff <= 35 || diff >= 90) return 'accent'
  // Near-but-not-matching hues only clash when both are vivid; muted ones sit together fine.
  return vividness(a.hex) > 0.45 && vividness(b.hex) > 0.45 ? 'avoid' : 'accent'
}

/** 0–1 compatibility of two colors. Same color reads as tonal: fine for neutrals, weaker for brights. */
export function pairScore(aId: ColorId, bId: ColorId): number {
  if (aId === bId) return getColor(aId).kind === 'chromatic' ? 0.5 : 0.75
  return GROUP_SCORE[relation(aId, bId)]
}

/**
 * Display grouping for the Color Match assistant. Unlike `relation` (symmetric, for scoring),
 * "Best" here is only the base color's own curated list — otherwise every color that
 * likes navy would crowd navy's best matches.
 */
function displayGroup(a: NamedColor, b: NamedColor): MatchGroup {
  if (a.avoid.includes(b.id) || b.avoid.includes(a.id)) return 'avoid'
  if (a.best.includes(b.id)) return 'best'
  if (b.kind !== 'chromatic') return 'neutral'
  if (a.kind !== 'chromatic' && vividness(b.hex) > 0.55) return 'bold'
  if (b.best.includes(a.id)) return 'accent'
  return relation(a.id, b.id)
}

export function paletteFor(id: ColorId): Record<MatchGroup, NamedColor[]> {
  const out: Record<MatchGroup, NamedColor[]> = { best: [], neutral: [], accent: [], bold: [], avoid: [] }
  const base = getColor(id)
  for (const c of COLOR_PALETTE) {
    if (c.id === id) continue
    out[displayGroup(base, c)].push(c)
  }
  // Keep curated bests in their authored order.
  const order = getColor(id).best
  const rank = (c: NamedColor) => { const i = order.indexOf(c.id); return i < 0 ? 99 : i }
  out.best.sort((x, y) => rank(x) - rank(y))
  return out
}

/**
 * Harmony of a whole outfit's color set, 0–1. Averages pairwise scores and
 * penalizes more than two competing chromatic colors.
 */
export function outfitHarmony(colorIds: ColorId[]): { score: number; clashes: [ColorId, ColorId][] } {
  const ids = colorIds.filter(Boolean)
  if (ids.length < 2) return { score: 0.8, clashes: [] }
  let total = 0, n = 0
  const clashes: [ColorId, ColorId][] = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const s = pairScore(ids[i], ids[j])
      if (s <= 0.1) clashes.push([ids[i], ids[j]])
      total += s; n++
    }
  }
  const chromatic = new Set(ids.filter(id => getColor(id).kind === 'chromatic')).size
  const penalty = chromatic > 2 ? (chromatic - 2) * 0.12 : 0
  return { score: Math.max(0, total / n - penalty), clashes }
}

/** True for light colors, so text/icons drawn on them can switch to dark. */
export function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 > 160
}
