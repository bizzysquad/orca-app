import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'bizzyplug-references'

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

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg', mp4: 'video/mp4', mov: 'video/quicktime',
  webm: 'video/webm', ogg: 'audio/ogg', wav: 'audio/wav',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf',
  zip: 'application/zip',
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdmin()
    await ensureBucket(admin)

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files' }, { status: 400 })
    }

    const urls: string[] = []

    for (const file of files) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const fileName = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
      const buffer = new Uint8Array(await file.arrayBuffer())
      const contentType = file.type || MIME_BY_EXT[ext] || 'application/octet-stream'

      const { error } = await admin.storage
        .from(BUCKET)
        .upload(fileName, buffer, { contentType, upsert: true })

      if (!error) {
        const { data } = admin.storage.from(BUCKET).getPublicUrl(fileName)
        if (data?.publicUrl) urls.push(data.publicUrl)
      }
    }

    return NextResponse.json({ ok: true, urls })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
