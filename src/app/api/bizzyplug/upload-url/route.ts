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

export async function POST(req: NextRequest) {
  try {
    const { filename } = await req.json()
    if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 })

    const admin = getAdmin()

    // Ensure bucket exists
    const { data: buckets } = await admin.storage.listBuckets()
    if (!(buckets || []).some((b: any) => b.name === BUCKET)) {
      await admin.storage.createBucket(BUCKET, { public: true })
    }

    const ext = filename.split('.').pop()?.toLowerCase() || 'bin'
    const path = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`

    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
    if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to create upload URL' }, { status: 500 })

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`

    return NextResponse.json({ signedUrl: data.signedUrl, path, publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
