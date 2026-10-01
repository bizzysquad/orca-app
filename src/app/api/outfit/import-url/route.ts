import { NextRequest, NextResponse } from 'next/server'
import { lookup } from 'dns/promises'
import { isIP } from 'net'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_HTML = 2 * 1024 * 1024
const MAX_IMAGE = 6 * 1024 * 1024
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

function isPrivateIp(ip: string): boolean {
  if (ip.includes(':')) {
    const v = ip.toLowerCase()
    return v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:127.') || v === '::'
  }
  const [a, b] = ip.split('.').map(Number)
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
}

/** Only public http(s) hosts — this route fetches user-supplied URLs server-side. */
async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http(s) links are supported')
  const host = url.hostname
  const ips = isIP(host) ? [host] : (await lookup(host, { all: true })).map(r => r.address)
  if (!ips.length || ips.some(isPrivateIp)) throw new Error('That address is not allowed')
  return url
}

/** fetch with manual redirects so every hop is re-checked. */
async function safeFetch(raw: string, accept: string): Promise<Response> {
  let current = raw
  for (let hop = 0; hop < 4; hop++) {
    const url = await assertPublicUrl(current)
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': UA, Accept: accept, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(8000),
    })
    const loc = res.headers.get('location')
    if (res.status >= 300 && res.status < 400 && loc) { current = new URL(loc, url).toString(); continue }
    return res
  }
  throw new Error('Too many redirects')
}

async function readCapped(res: Response, cap: number): Promise<Uint8Array> {
  const reader = res.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > cap) { reader.cancel(); throw new Error('Response too large') }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) { out.set(c, off); off += c.length }
  return out
}

const decode = (s: string) => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

function meta(html: string, prop: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i')
  const tag = html.match(re)?.[0]
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1]
  return content ? decode(content.trim()) : undefined
}

/** schema.org Product from JSON-LD, the most reliable source on retailer pages. */
function jsonLdProduct(html: string): { name?: string; image?: string; brand?: string; price?: number } {
  const blocks = Array.from(html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))
  for (const [, body] of blocks) {
    try {
      const parsed = JSON.parse(body)
      const nodes: any[] = [parsed, ...(Array.isArray(parsed) ? parsed : []), ...(parsed['@graph'] || [])]
      const product = nodes.find(n => n && (n['@type'] === 'Product' || (Array.isArray(n['@type']) && n['@type'].includes('Product'))))
      if (!product) continue
      const img = Array.isArray(product.image) ? product.image[0] : product.image
      const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers
      return {
        name: product.name,
        image: typeof img === 'string' ? img : img?.url,
        brand: typeof product.brand === 'string' ? product.brand : product.brand?.name,
        price: offer?.price != null ? Number(offer.price) : offer?.lowPrice != null ? Number(offer.lowPrice) : undefined,
      }
    } catch { /* malformed block — try the next */ }
  }
  return {}
}

/** Last resort when the page blocks bots: "/mens-olive-slim-chino-pants/123" → "Mens Olive Slim Chino Pants". */
function titleFromSlug(url: URL): string {
  const seg = url.pathname.split('/').filter(s => /[a-z]-[a-z]/i.test(s)).sort((a, b) => b.length - a.length)[0] || ''
  return seg.replace(/\.[a-z]+$/i, '').split(/[-_]+/).filter(w => !/^\d+$/.test(w)).map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')
}

/**
 * Import a retailer product page: name, brand, price, and the hero image
 * (returned inline as a data URL so the client can color-analyze it without CORS).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let url: URL
  try {
    const body = await req.json()
    url = await assertPublicUrl(String(body.url || '').trim())
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid link' }, { status: 400 })
  }

  let title = '', brand: string | undefined, price: number | undefined, imageUrl: string | undefined
  try {
    const res = await safeFetch(url.toString(), 'text/html,application/xhtml+xml')
    if (res.ok) {
      const html = new TextDecoder().decode(await readCapped(res, MAX_HTML))
      const ld = jsonLdProduct(html)
      title = ld.name || meta(html, 'og:title') || decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '')
      brand = ld.brand || meta(html, 'og:site_name') || meta(html, 'product:brand')
      const priceMeta = meta(html, 'product:price:amount') || meta(html, 'og:price:amount')
      price = ld.price ?? (priceMeta ? Number(priceMeta) : undefined)
      imageUrl = ld.image || meta(html, 'og:image') || meta(html, 'twitter:image')
    }
  } catch { /* blocked or timed out — fall back to the URL slug */ }

  if (!title) title = titleFromSlug(url)

  let image: string | undefined
  if (imageUrl) {
    try {
      const res = await safeFetch(new URL(imageUrl, url).toString(), 'image/*')
      const type = res.headers.get('content-type') || ''
      if (res.ok && type.startsWith('image/')) {
        const bytes = await readCapped(res, MAX_IMAGE)
        image = `data:${type.split(';')[0]};base64,${Buffer.from(bytes).toString('base64')}`
      }
    } catch { /* image optional */ }
  }

  return NextResponse.json({
    title: title.replace(/\s+\|\s+[^|]*$/, '').trim() || title, // drop " | Store Name" suffix
    brand,
    price: Number.isFinite(price) ? price : undefined,
    image,
    site: url.hostname.replace(/^www\./, ''),
  })
}
