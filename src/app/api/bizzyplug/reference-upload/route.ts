import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
      const buffer = new Uint8Array(await file.arrayBuffer())

      const { error } = await admin.storage
        .from(BUCKET)
        .upload(fileName, buffer, { contentType: file.type, upsert: true })

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
