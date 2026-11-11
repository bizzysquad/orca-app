import { NextResponse } from 'next/server'
import { loadSite, toPublicSite } from '@/lib/crooked/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { site } = await loadSite()
  return NextResponse.json({ site: toPublicSite(site) })
}
