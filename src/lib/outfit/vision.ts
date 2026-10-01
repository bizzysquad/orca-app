'use client'
/**
 * On-device image analysis (canvas only, no network). This is the default
 * RecognitionProvider / ClosetScanProvider. It reliably detects *color*; garment
 * *type* comes from filename/title keywords and is flagged low-confidence so
 * the review step asks the user to confirm it. A vision model can replace
 * this wholesale via providers.ts.
 */
import type { Category, ColorId, DetectedItem, Pattern } from './types'
import { CATEGORY_CONFIG, categoryFromText } from './catalog'
import { labDistance, nearestColorId, rgbToLab } from './colors'

type Lab = [number, number, number]

export function loadImage(src: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = typeof src === 'string' ? src : URL.createObjectURL(src)
    img.crossOrigin = 'anonymous'
    const revoke = () => { if (typeof src !== 'string') URL.revokeObjectURL(url) }
    img.onload = () => { revoke(); resolve(img) }
    img.onerror = () => { revoke(); reject(new Error('Could not read image')) }
    img.src = url
  })
}

function canvasFor(img: HTMLImageElement | HTMLCanvasElement, maxDim: number, crop?: { x: number; y: number; w: number; h: number }) {
  const sw = crop?.w ?? img.width, sh = crop?.h ?? img.height
  const scale = Math.min(1, maxDim / Math.max(sw, sh))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(sw * scale))
  c.height = Math.max(1, Math.round(sh * scale))
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.fillStyle = '#fff' // flatten transparent PNGs onto white
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(img, crop?.x ?? 0, crop?.y ?? 0, sw, sh, 0, 0, c.width, c.height)
  return { canvas: c, ctx }
}

function toBlob(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Encode failed'))), 'image/jpeg', quality))
}

/** Phone photos are 3–12MB; everything is resized before upload or analysis. */
export async function downscale(src: Blob | HTMLImageElement, maxDim = 1024, quality = 0.82): Promise<Blob> {
  const img = src instanceof HTMLImageElement ? src : await loadImage(src)
  return toBlob(canvasFor(img, maxDim).canvas, quality)
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

// ── Color extraction ──────────────────────────────────────────────────────

interface ColorResult { primary: ColorId; accents: ColorId[]; pattern: Pattern; confidence: number }

function kmeans(points: Lab[], weights: number[], k: number, iters = 8): { center: Lab; weight: number }[] {
  if (!points.length) return []
  // Deterministic spread-out seeding: take evenly spaced samples after sorting by lightness.
  const order = points.map((p, i) => i).sort((a, b) => points[a][0] - points[b][0])
  let centers: Lab[] = Array.from({ length: k }, (_, i) => [...points[order[Math.floor((i + 0.5) * order.length / k)]]] as Lab)
  let assign = new Array(points.length).fill(0)
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < points.length; i++) {
      let best = 0, bd = Infinity
      for (let c = 0; c < k; c++) { const d = labDistance(points[i], centers[c]); if (d < bd) { bd = d; best = c } }
      assign[i] = best
    }
    const sums = centers.map(() => [0, 0, 0, 0])
    for (let i = 0; i < points.length; i++) {
      const s = sums[assign[i]], w = weights[i]
      s[0] += points[i][0] * w; s[1] += points[i][1] * w; s[2] += points[i][2] * w; s[3] += w
    }
    centers = centers.map((c, i) => (sums[i][3] ? [sums[i][0] / sums[i][3], sums[i][1] / sums[i][3], sums[i][2] / sums[i][3]] : c) as Lab)
  }
  const totals = centers.map(() => 0)
  assign.forEach((a, i) => { totals[a] += weights[i] })
  const sum = totals.reduce((a, b) => a + b, 0) || 1
  return centers.map((center, i) => ({ center, weight: totals[i] / sum })).sort((a, b) => b.weight - a.weight)
}

function labToNearest(lab: Lab): ColorId {
  // Invert Lab → sRGB just enough to reuse nearestColorId's palette match.
  const fy = (lab[0] + 16) / 116, fx = fy + lab[1] / 500, fz = fy - lab[2] / 200
  const inv = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787)
  const X = inv(fx) * 0.95047, Y = inv(fy), Z = inv(fz) * 1.08883
  const lin = [X * 3.2406 + Y * -1.5372 + Z * -0.4986, X * -0.9689 + Y * 1.8758 + Z * 0.0415, X * 0.0557 + Y * -0.204 + Z * 1.057]
  const [r, g, b] = lin.map(v => 255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)))
  return nearestColorId(r, g, b)
}

/** Dominant garment colors in a canvas, ignoring a uniform background if one is detected. */
function analyzeCanvas(ctx: CanvasRenderingContext2D, w: number, h: number): ColorResult {
  const { data } = ctx.getImageData(0, 0, w, h)
  const lab = (x: number, y: number): Lab => { const i = (y * w + x) * 4; return rgbToLab(data[i], data[i + 1], data[i + 2]) }

  // Background = the border ring, if it's uniform (studio shot, bed, wall).
  const ring = Math.max(1, Math.round(Math.min(w, h) * 0.06))
  const border: Lab[] = []
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (x < ring || y < ring || x >= w - ring || y >= h - ring) border.push(lab(x, y))
  }
  const bgMean = border.reduce((m, p) => [m[0] + p[0] / border.length, m[1] + p[1] / border.length, m[2] + p[2] / border.length] as Lab, [0, 0, 0] as Lab)
  const bgSpread = border.reduce((s, p) => s + labDistance(p, bgMean), 0) / (border.length || 1)
  const hasBg = bgSpread < 12

  const points: Lab[] = [], weights: number[] = []
  let edges = 0, edgeSamples = 0
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const p = lab(x, y)
      if (hasBg && labDistance(p, bgMean) < 14) continue
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2)
      points.push(p)
      weights.push(1 - Math.min(1, dx * dx + dy * dy) * 0.6) // favor the center of frame
      if (x + 2 < w) { edgeSamples++; if (Math.abs(lab(x + 2, y)[0] - p[0]) > 18) edges++ }
    }
  }
  const usable = points.length >= 20 ? { points, weights } : { points: border, weights: border.map(() => 1) }
  const clusters = kmeans(usable.points, usable.weights, 4)

  const byId = new Map<ColorId, number>()
  for (const c of clusters) {
    const id = labToNearest(c.center)
    byId.set(id, (byId.get(id) ?? 0) + c.weight)
  }
  const ranked = Array.from(byId.entries()).sort((a, b) => b[1] - a[1])
  const [primary, primaryWeight] = ranked[0] ?? ['gray', 0]
  const accents = ranked.slice(1).filter(([, wt]) => wt >= 0.14).map(([id]) => id).slice(0, 2)
  const edgeDensity = edgeSamples ? edges / edgeSamples : 0
  const pattern: Pattern = accents.length >= 2 && edgeDensity > 0.12 ? 'print'
    : accents.length >= 1 && edgeDensity > 0.18 ? 'striped'
    : edgeDensity > 0.22 ? 'textured' : 'solid'
  return { primary, accents, pattern, confidence: Math.min(0.95, 0.45 + primaryWeight * 0.6 + (hasBg ? 0.1 : 0)) }
}

function detectedFrom(category: Category, categoryConfidence: number, colors: ColorResult, extra: Partial<DetectedItem>): DetectedItem {
  const cfg = CATEGORY_CONFIG[category]
  return {
    name: extra.name || '',
    category,
    primaryColor: colors.primary,
    accentColors: colors.accents,
    pattern: colors.pattern,
    styles: cfg.styles,
    seasons: cfg.seasons,
    formality: cfg.formality,
    source: 'photo',
    confidence: { category: categoryConfidence, color: colors.confidence, pattern: 0.4 },
    ...extra,
  }
}

/** Analyze one product/garment photo. `hint` is filename or product title text. */
export async function analyzeItemPhoto(file: Blob, hint = '', fallback: Category = 'tshirt'): Promise<DetectedItem> {
  const img = await loadImage(file)
  const { canvas, ctx } = canvasFor(img, 120)
  const colors = analyzeCanvas(ctx, canvas.width, canvas.height)
  const fromText = categoryFromText(hint)
  const blob = await downscale(img)
  return detectedFrom(fromText ?? fallback, fromText ? 0.75 : 0.2, colors, {
    blob,
    previewUrl: URL.createObjectURL(blob),
  })
}

// ── Closet scanning ───────────────────────────────────────────────────────

/**
 * Splits a rack/closet photo into vertical garment strips by walking columns
 * and cutting where the color changes sharply — hanging clothes sit side by
 * side, so each strip is usually one item. Strips that match the back wall are
 * dropped. Returns cropped candidates for the user to confirm.
 */
export async function scanClosetPhoto(file: Blob, maxItems = 16): Promise<DetectedItem[]> {
  const img = await loadImage(file)
  const W = 240
  const { canvas, ctx } = canvasFor(img, W)
  const w = canvas.width, h = canvas.height
  const { data } = ctx.getImageData(0, 0, w, h)
  const y0 = Math.round(h * 0.15), y1 = Math.round(h * 0.85)

  const colMean: Lab[] = []
  for (let x = 0; x < w; x++) {
    let L = 0, A = 0, B = 0, n = 0
    for (let y = y0; y < y1; y += 2) {
      const i = (y * w + x) * 4
      const p = rgbToLab(data[i], data[i + 1], data[i + 2])
      L += p[0]; A += p[1]; B += p[2]; n++
    }
    colMean.push([L / n, A / n, B / n])
  }

  // Walk columns, cutting a new segment when color diverges from the running segment mean.
  const minW = Math.max(4, Math.round(w * 0.04))
  const segs: { x0: number; x1: number; mean: Lab }[] = []
  let start = 0, mean: Lab = colMean[0]
  for (let x = 1; x <= w; x++) {
    const breakHere = x === w || (labDistance(colMean[x], mean) > 16 && x - start >= minW)
    if (breakHere) { segs.push({ x0: start, x1: x, mean }); start = x; if (x < w) mean = colMean[x]; continue }
    const n = x - start + 1
    mean = [mean[0] + (colMean[x][0] - mean[0]) / n, mean[1] + (colMean[x][1] - mean[1]) / n, mean[2] + (colMean[x][2] - mean[2]) / n]
  }

  // Merge slivers into the closer neighbor, and drop segments that look like the back wall (frame edges).
  const merged: typeof segs = []
  for (const s of segs) {
    const prev = merged[merged.length - 1]
    if (prev && (s.x1 - s.x0 < minW || labDistance(prev.mean, s.mean) < 9)) prev.x1 = s.x1
    else merged.push({ ...s })
  }
  // The strip above the hanging line is usually wall/shelf — segments matching it aren't garments.
  let wL = 0, wA = 0, wB = 0, wn = 0
  for (let y = 0; y < Math.max(1, Math.round(h * 0.08)); y++) for (let x = 0; x < w; x += 2) {
    const i = (y * w + x) * 4
    const p = rgbToLab(data[i], data[i + 1], data[i + 2])
    wL += p[0]; wA += p[1]; wB += p[2]; wn++
  }
  const wall: Lab = [wL / wn, wA / wn, wB / wn]
  const wide = merged.filter(s => s.x1 - s.x0 >= minW)
  const notWall = wide.filter(s => labDistance(s.mean, wall) >= 10)
  const garments = (notWall.length ? notWall : wide).slice(0, maxItems)

  const scale = img.width / w
  const out: DetectedItem[] = []
  for (const s of garments) {
    const crop = { x: Math.round(s.x0 * scale), y: Math.round(img.height * 0.05), w: Math.round((s.x1 - s.x0) * scale), h: Math.round(img.height * 0.9) }
    const small = canvasFor(img, 120, crop)
    const colors = analyzeCanvas(small.ctx, small.canvas.width, small.canvas.height)
    const blob = await toBlob(canvasFor(img, 640, crop).canvas)
    out.push({
      ...detectedFrom('shirt', 0.15, colors, { blob, previewUrl: URL.createObjectURL(blob) }),
      source: 'closet-scan',
    })
  }
  return out
}
