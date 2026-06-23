import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const LS_KEY = 'orca-bizzplug-site-settings'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET() {
  try {
    const supabase = getAdmin()
    const { data: profiles } = await supabase.from('profiles').select('local_data').limit(1)
    const localData = profiles?.[0]?.local_data as Record<string, any> | null
    const settings = localData?.[LS_KEY] || {}
    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ settings: {} })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdmin()
    const settings = await req.json()
    const { data: profiles } = await supabase.from('profiles').select('id, local_data').limit(1)
    const profile = profiles?.[0]
    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })
    const localData = (profile.local_data as Record<string, any>) || {}
    await supabase.from('profiles').update({ local_data: { ...localData, [LS_KEY]: settings } }).eq('id', profile.id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
