import { NextRequest, NextResponse } from 'next/server'
import { requireCrAdmin } from '@/lib/crooked/auth'
import { getCrAdmin, MEDIA_BUCKET } from '@/lib/crooked/db'

export const dynamic = 'force-dynamic'

const ALLOWED = /^(mp4|mov|webm|m4v|jpg|jpeg|png|webp|gif|avif)$/

// Hands the admin page a signed upload URL so videos go straight from the
// browser to Supabase Storage (Vercel functions cap request bodies at 4.5 MB).
export async function POST(req: NextRequest) {
  const denied = await requireCrAdmin(req)
  if (denied) return denied
  try {
    const { filename, folder } = await req.json()
    const ext = String(filename || '').split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED.test(ext)) return NextResponse.json({ error: 'Use a video (mp4, mov, webm) or image (jpg, png, webp)' }, { status: 400 })

    const admin = getCrAdmin()
    const { data: buckets } = await admin.storage.listBuckets()
    if (!(buckets || []).some((b: any) => b.name === MEDIA_BUCKET)) {
      const { error } = await admin.storage.createBucket(MEDIA_BUCKET, { public: true })
      if (error && !/already exists/i.test(error.message)) throw new Error(error.message)
    }

    const dir = ['portfolio', 'thumbs', 'brand'].includes(folder) ? folder : 'misc'
    const path = `${dir}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { data, error } = await admin.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path)
    if (error || !data) throw new Error(error?.message || 'Could not create upload URL')

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`
    return NextResponse.json({ signedUrl: data.signedUrl, path, publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
