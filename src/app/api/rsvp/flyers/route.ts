import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { requireStaff } from '@/lib/rsvp/staffAuth'

export const dynamic = 'force-dynamic'

const BUCKET = 'rsvp-flyers'
const MAX_BYTES = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

async function ensureBucket(admin: ReturnType<typeof getRsvpAdmin>) {
  const { data: buckets } = await admin.storage.listBuckets()
  const exists = (buckets || []).some((b: any) => b.name === BUCKET)
  if (!exists) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response

  try {
    const admin = getRsvpAdmin()
    await ensureBucket(admin)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported image type. Use JPG, PNG, WEBP, or GIF.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large (8MB max).' }, { status: 400 })
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const fileName = `flyer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const buffer = new Uint8Array(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: file.type, upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(fileName)
    if (!urlData?.publicUrl) {
      return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 })
    }

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
