import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const BUCKET = 'orca-outfit'
const MAX_BYTES = 4 * 1024 * 1024 // client downscales to ~1024px first; this is a safety cap

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function ensureBucket(admin: ReturnType<typeof getAdmin>) {
  const { data: buckets } = await admin.storage.listBuckets()
  if (!(buckets || []).some(b => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES })
  }
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Upload one wardrobe photo to `orca-outfit/<userId>/…`. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Images only' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Image too large' }, { status: 413 })

    const admin = getAdmin()
    await ensureBucket(admin)

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl, path })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/** Delete a photo — only within the caller's own folder. */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser()
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    const { path } = await req.json()
    if (typeof path !== 'string' || !path.startsWith(`${user.id}/`) || path.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    await getAdmin().storage.from(BUCKET).remove([path])
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
