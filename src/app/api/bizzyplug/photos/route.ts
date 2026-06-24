import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const BUCKET = 'bizzyplug-portfolio'
const LS_KEY = 'orca-bizzplug-portfolio-photos'

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function ensureBucket(admin: any) {
  const { data: buckets } = await admin.storage.listBuckets()
  if (!(buckets || []).some((b: any) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 10485760 })
  }
}

export async function GET() {
  try {
    const admin = getAdmin()
    const { data: profiles } = await admin.from('profiles').select('local_data').limit(1)
    const photos = (profiles?.[0]?.local_data as any)?.[LS_KEY] || []
    return NextResponse.json({ photos })
  } catch (err: any) {
    return NextResponse.json({ photos: [], error: err.message })
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin()
    const contentType = req.headers.get('content-type') || ''

    // Batch mode: JSON body with photos array → single atomic DB write
    if (contentType.includes('application/json')) {
      const { photos: newPhotos } = await req.json()
      if (!Array.isArray(newPhotos) || newPhotos.length === 0) return NextResponse.json({ error: 'No photos' }, { status: 400 })
      const { data: profiles } = await admin.from('profiles').select('id, local_data').limit(1)
      const profile = profiles?.[0]
      if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })
      const localData = (profile.local_data as Record<string, any>) || {}
      const existing = localData[LS_KEY] || []
      await admin.from('profiles').update({ local_data: { ...localData, [LS_KEY]: [...existing, ...newPhotos] } }).eq('id', profile.id)
      return NextResponse.json({ ok: true, count: newPhotos.length })
    }

    // Single file mode: upload to storage, optionally skip DB write
    await ensureBucket(admin)
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const title = (formData.get('title') as string) || ''
    const category = (formData.get('category') as string) || 'other'
    const skipDb = formData.get('skipDb') === 'true'

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const rand = Math.random().toString(36).slice(2, 6)
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `portfolio-${Date.now()}-${rand}.${ext}`
    const buffer = new Uint8Array(await file.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: file.type, upsert: true })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(fileName)
    const url = urlData?.publicUrl
    if (!url) return NextResponse.json({ error: 'Failed to get URL' }, { status: 500 })

    const photo = { id: `bp-${Date.now()}-${rand}`, url, title, category, fileName, uploadedAt: new Date().toISOString() }

    if (!skipDb) {
      const { data: profiles } = await admin.from('profiles').select('id, local_data').limit(1)
      const profile = profiles?.[0]
      if (profile) {
        const localData = (profile.local_data as Record<string, any>) || {}
        const photos = localData[LS_KEY] || []
        photos.push(photo)
        await admin.from('profiles').update({ local_data: { ...localData, [LS_KEY]: photos } }).eq('id', profile.id)
      }
    }

    return NextResponse.json({ ok: true, url, photo })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = getAdmin()
    const formData = await req.formData()
    const id = formData.get('id') as string
    if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 })

    const { data: profiles } = await admin.from('profiles').select('id, local_data').limit(1)
    const profile = profiles?.[0]
    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

    const localData = (profile.local_data as Record<string, any>) || {}
    const photos: any[] = localData[LS_KEY] || []
    const idx = photos.findIndex((p: any) => p.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const photo = { ...photos[idx] }
    const file = formData.get('file') as File | null

    if (file) {
      await ensureBucket(admin)
      if (photo.fileName) await admin.storage.from(BUCKET).remove([photo.fileName])
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `portfolio-${Date.now()}.${ext}`
      const buffer = new Uint8Array(await file.arrayBuffer())
      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(fileName, buffer, { contentType: file.type, upsert: true })
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
      const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(fileName)
      photo.url = urlData?.publicUrl
      photo.fileName = fileName
    }

    const title = formData.get('title') as string | null
    const category = formData.get('category') as string | null
    if (title !== null) photo.title = title
    if (category !== null) photo.category = category

    photos[idx] = photo
    await admin.from('profiles').update({ local_data: { ...localData, [LS_KEY]: photos } }).eq('id', profile.id)
    return NextResponse.json({ ok: true, photo })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const admin = getAdmin()

    const { data: profiles } = await admin.from('profiles').select('id, local_data').limit(1)
    const profile = profiles?.[0]
    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

    const localData = (profile.local_data as Record<string, any>) || {}
    const photos: any[] = localData[LS_KEY] || []
    const photo = photos.find((p: any) => p.id === id)

    if (photo?.fileName) {
      await admin.storage.from(BUCKET).remove([photo.fileName])
    }

    const updated = photos.filter((p: any) => p.id !== id)
    await admin.from('profiles').update({ local_data: { ...localData, [LS_KEY]: updated } }).eq('id', profile.id)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
