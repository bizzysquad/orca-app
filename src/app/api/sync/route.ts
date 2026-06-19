import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — return the current cloud-stored local_data for this user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('local_data')
      .eq('id', authData.user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const localData = profile?.local_data || {}
    const gigCount = Array.isArray(localData['orca-dj-gigs']) ? localData['orca-dj-gigs'].length : 0

    return NextResponse.json({
      userId: authData.user.id,
      keyCount: Object.keys(localData).length,
      keys: Object.keys(localData),
      gigCount,
      lastSync: localData['_lastSync'] || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — migrate/rescue: merge incoming local data with existing cloud data
// Body: { localData: Record<string, any>, strategy: 'merge' | 'overwrite' | 'local_wins' }
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = authData.user.id
    const body = await req.json()
    const { localData, strategy = 'merge' } = body

    if (!localData || typeof localData !== 'object') {
      return NextResponse.json({ error: 'localData must be an object' }, { status: 400 })
    }

    // Fetch existing cloud data
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('local_data')
      .eq('id', userId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const existing = (profile?.local_data as Record<string, any>) || {}
    let merged: Record<string, any>

    if (strategy === 'overwrite') {
      merged = { ...localData, _lastSync: new Date().toISOString() }
    } else if (strategy === 'local_wins') {
      merged = { ...existing, ...localData, _lastSync: new Date().toISOString() }
    } else {
      // Default: merge — for arrays, merge by ID to avoid duplicates
      merged = { ...existing }
      for (const [key, val] of Object.entries(localData)) {
        const cloudVal = existing[key]
        if (cloudVal === undefined) {
          merged[key] = val
          continue
        }
        if (Array.isArray(cloudVal) && Array.isArray(val)) {
          const byId = new Map<string, any>()
          for (const item of cloudVal) {
            const id = item?.id || JSON.stringify(item)
            byId.set(id, item)
          }
          for (const item of val) {
            const id = item?.id || JSON.stringify(item)
            byId.set(id, item)
          }
          merged[key] = Array.from(byId.values())
        } else if (typeof cloudVal === 'object' && typeof val === 'object' && !Array.isArray(cloudVal)) {
          merged[key] = { ...cloudVal, ...val }
        } else {
          merged[key] = val
        }
      }
      merged['_lastSync'] = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ local_data: merged })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const gigCount = Array.isArray(merged['orca-dj-gigs']) ? merged['orca-dj-gigs'].length : 0

    return NextResponse.json({
      success: true,
      strategy,
      keyCount: Object.keys(merged).length,
      gigCount,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
