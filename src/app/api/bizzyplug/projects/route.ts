import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const TIMESTAMPS_KEY = '_orca-sync-timestamps'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function parseArr(v: any): any[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') { try { return JSON.parse(v) } catch {} }
  return []
}

export async function GET() {
  try {
    const admin = getAdmin()
    const { data: profiles } = await admin.from('profiles').select('local_data').limit(1)
    const localData = (profiles?.[0]?.local_data as Record<string, any>) || {}
    const projects = parseArr(localData['orca-bizzplug-clients'])
    const clientDb = parseArr(localData['orca-bizzplug-client-db'])
    return NextResponse.json({ projects, clientDb })
  } catch (err: any) {
    return NextResponse.json({ projects: [], clientDb: [], error: err.message })
  }
}

// Called by the admin page whenever projects or clientDb change (delete, status update, edit).
// Writes directly to Supabase with updated timestamps so the next GET returns the correct data.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { projects, clientDb } = body

    const admin = getAdmin()
    const { data: profiles } = await admin.from('profiles').select('id, local_data').limit(1)
    const profile = profiles?.[0]
    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

    const localData = (profile.local_data as Record<string, any>) || {}
    const nowFull = new Date().toISOString()
    const existingTs = (localData[TIMESTAMPS_KEY] as Record<string, string>) || {}
    const newTs: Record<string, string> = { ...existingTs }

    const updates: Record<string, any> = { ...localData }

    if (projects !== undefined) {
      updates['orca-bizzplug-clients'] = projects
      newTs['orca-bizzplug-clients'] = nowFull
    }
    if (clientDb !== undefined) {
      updates['orca-bizzplug-client-db'] = clientDb
      newTs['orca-bizzplug-client-db'] = nowFull
    }
    updates[TIMESTAMPS_KEY] = newTs

    await admin.from('profiles').update({ local_data: updates }).eq('id', profile.id)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
