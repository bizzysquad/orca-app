import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const LS_KEY = 'orca-bizzplug-reviews'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  try {
    const admin = getAdmin()
    const { data: profiles } = await admin.from('profiles').select('local_data').limit(1)
    const all = (profiles?.[0]?.local_data as any)?.[LS_KEY] || []
    const reviews = all.filter((r: any) => r.status === 'approved')
    return NextResponse.json({ reviews })
  } catch (err: any) {
    return NextResponse.json({ reviews: [], error: err.message })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, role, text, rating } = await req.json()
    if (!name || !text) return NextResponse.json({ error: 'Name and review text required' }, { status: 400 })

    const admin = getAdmin()
    const { data: profiles } = await admin.from('profiles').select('id, local_data').limit(1)
    const profile = profiles?.[0]
    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

    const localData = (profile.local_data as Record<string, any>) || {}
    const reviews = localData[LS_KEY] || []
    const review = {
      id: `rv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name, role: role || '', text, rating: Math.min(5, Math.max(1, rating || 5)),
      status: 'approved',
      createdAt: new Date().toISOString(),
    }
    reviews.push(review)
    await admin.from('profiles').update({ local_data: { ...localData, [LS_KEY]: reviews } }).eq('id', profile.id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
