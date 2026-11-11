import { NextRequest, NextResponse } from 'next/server'
import { requireCrAdmin } from '@/lib/crooked/auth'
import { loadSite, normalizeSite, saveSite } from '@/lib/crooked/db'
import { DEFAULT_SITE } from '@/lib/crooked/defaults'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  const result = await loadSite()
  return NextResponse.json(result)
}

// Saves the whole site doc. `expectedUpdatedAt` guards against two open
// admin tabs silently overwriting each other.
export async function PUT(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  try {
    const body = await req.json()
    if (body?.reset === true) {
      const updatedAt = await saveSite(DEFAULT_SITE)
      return NextResponse.json({ ok: true, updatedAt, site: normalizeSite(DEFAULT_SITE) })
    }
    const site = normalizeSite(body?.site)
    const current = await loadSite()
    if (!current.dbReady) return NextResponse.json({ error: 'Database tables are missing. Run supabase-migration-crookedrumors.sql first.' }, { status: 503 })
    if (current.updatedAt && body?.expectedUpdatedAt && body.expectedUpdatedAt !== current.updatedAt && !body?.force) {
      return NextResponse.json({ error: 'The site was changed in another tab. Reload to get the latest, or save again to overwrite.', conflict: true }, { status: 409 })
    }

    const codes = site.promos.map(p => p.code.trim().toLowerCase()).filter(Boolean)
    if (new Set(codes).size !== codes.length) return NextResponse.json({ error: 'Two promos use the same code' }, { status: 400 })
    const ids = [...site.packages, ...site.addons, ...site.categories, ...site.portfolio, ...site.promos].map(x => x.id)
    if (new Set(ids).size !== ids.length) return NextResponse.json({ error: 'Duplicate item ids. Reload and try again.' }, { status: 400 })

    const updatedAt = await saveSite(site)
    return NextResponse.json({ ok: true, updatedAt })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Save failed' }, { status: 500 })
  }
}
