import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const BUCKET = 'dj-photos'
const LS_KEY = 'orca-dj-website-photos'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function ensureBucket(admin: any) {
  const { data: buckets } = await admin.storage.listBuckets()
  const exists = (buckets || []).some((b: any) => b.name === BUCKET)
  if (!exists) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5242880 })
  }
}

export async function GET() {
  try {
    const supabase = getAdminClient()
    const { data: profiles } = await supabase
      .from('profiles')
      .select('local_data')
      .limit(1)

    const localData = profiles?.[0]?.local_data as Record<string, any> | null
    const photos = localData?.[LS_KEY] || []
    return NextResponse.json({ photos })
  } catch (err: any) {
    return NextResponse.json({ photos: [], error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminClient()
    await ensureBucket(admin)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const slot = formData.get('slot') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${slot || 'photo'}-${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(fileName)
    const publicUrl = urlData?.publicUrl

    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 })
    }

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, local_data')
      .limit(1)

    const profile = profiles?.[0]
    if (profile) {
      const localData = (profile.local_data as Record<string, any>) || {}
      const photos = localData[LS_KEY] || []

      if (slot === 'hero' || slot === 'about') {
        const idx = photos.findIndex((p: any) => p.slot === slot)
        const entry = { slot, url: publicUrl, uploadedAt: new Date().toISOString() }
        if (idx >= 0) photos[idx] = entry
        else photos.push(entry)
      } else {
        photos.push({ slot: 'extra', url: publicUrl, uploadedAt: new Date().toISOString() })
      }

      await admin
        .from('profiles')
        .update({ local_data: { ...localData, [LS_KEY]: photos } })
        .eq('id', profile.id)
    }

    return NextResponse.json({ ok: true, url: publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { slot } = await req.json()
    const supabase = await createClient()

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, local_data')
      .limit(1)

    const profile = profiles?.[0]
    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

    const localData = (profile.local_data as Record<string, any>) || {}
    const photos = (localData[LS_KEY] || []).filter((p: any) => p.slot !== slot)

    await supabase
      .from('profiles')
      .update({ local_data: { ...localData, [LS_KEY]: photos } })
      .eq('id', profile.id)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
