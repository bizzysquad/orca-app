import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const LS_KEY = 'orca-dj-testimonials'

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
    const testimonials = localData?.[LS_KEY] || []
    const approved = testimonials.filter((t: any) => t.status === 'approved')
    return NextResponse.json({ testimonials: approved, all: testimonials })
  } catch (err: any) {
    return NextResponse.json({ testimonials: [], all: [], error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, event_type, rating, review } = body

    if (!name || !review) {
      return NextResponse.json({ error: 'Name and review are required' }, { status: 400 })
    }

    const testimonial = {
      id: Math.random().toString(36).slice(2, 10),
      name,
      event_type: event_type || '',
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      review,
      status: 'approved',
      created_at: new Date().toISOString(),
    }

    const supabase = getAdmin()
    const { data: profiles } = await supabase.from('profiles').select('id, local_data').limit(1)
    const profile = profiles?.[0]
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const localData = (profile.local_data as Record<string, any>) || {}
    const existing = localData[LS_KEY] || []
    existing.push(testimonial)

    await supabase.from('profiles').update({ local_data: { ...localData, [LS_KEY]: existing } }).eq('id', profile.id)

    return NextResponse.json({ ok: true, testimonial })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status } = body

    const supabase = getAdmin()
    const { data: profiles } = await supabase.from('profiles').select('id, local_data').limit(1)
    const profile = profiles?.[0]
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const localData = (profile.local_data as Record<string, any>) || {}
    const testimonials = localData[LS_KEY] || []

    let updated
    if (status === 'deleted') {
      updated = testimonials.filter((t: any) => t.id !== id)
    } else {
      updated = testimonials.map((t: any) => t.id === id ? { ...t, status } : t)
    }

    await supabase.from('profiles').update({ local_data: { ...localData, [LS_KEY]: updated } }).eq('id', profile.id)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
