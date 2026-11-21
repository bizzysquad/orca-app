import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { actorFrom, checkWrite, errorResponse, json, readJson, store } from '@/lib/spades/http'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Weekly winners wall. The only Spades HQ record meant to be kept long term:
// a small JSON list plus trophy photos, both in a public Storage bucket.
// Reading is public; only the site owner can add or remove entries.

const BUCKET = 'spades-winners'
const LIST = 'winners.json'
const IMG = /^(jpg|jpeg|png|webp|heic|heif)$/

export interface WinnerEntry {
  id: string
  week: string // YYYY-MM-DD
  event: string
  team: string
  players: string
  photoUrl: string | null
  createdAt: string
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (i, init) => fetch(i, { ...init, cache: 'no-store' }) },
  })
}

async function ensureBucket(db: ReturnType<typeof admin>) {
  const { data } = await db.storage.listBuckets()
  if (!(data || []).some(b => b.name === BUCKET)) {
    const { error } = await db.storage.createBucket(BUCKET, { public: true })
    if (error && !/already exists/i.test(error.message)) throw new Error(error.message)
  }
}

async function readList(db: ReturnType<typeof admin>): Promise<WinnerEntry[]> {
  const { data, error } = await db.storage.from(BUCKET).download(`${LIST}?t=${Date.now()}`.split('?')[0])
  if (error || !data) return []
  try {
    const list = JSON.parse(await data.text())
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

async function writeList(db: ReturnType<typeof admin>, list: WinnerEntry[]) {
  const body = new Blob([JSON.stringify(list)], { type: 'application/json' })
  const { error } = await db.storage.from(BUCKET).upload(LIST, body, { upsert: true, contentType: 'application/json', cacheControl: '0' })
  if (error) throw new Error(error.message)
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '')

export async function GET() {
  try {
    const db = admin()
    await ensureBucket(db)
    const list = await readList(db)
    return json({ winners: list.sort((a, b) => b.week.localeCompare(a.week) || b.createdAt.localeCompare(a.createdAt)) })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  const blocked = checkWrite(req)
  if (blocked) return blocked
  try {
    const actor = await actorFrom(req, store())
    if (actor.kind !== 'owner') return json({ error: 'Director sign in required' }, 401)
    const body = await readJson(req)
    const db = admin()
    await ensureBucket(db)

    if (body.action === 'uploadUrl') {
      const ext = String(body.filename || '').split('.').pop()?.toLowerCase() || ''
      if (!IMG.test(ext)) return json({ error: 'Use a photo (jpg, png, webp or heic)' }, 400)
      const path = `photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path)
      if (error || !data) throw new Error(error?.message || 'Could not create upload link')
      return json({ signedUrl: data.signedUrl, publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}` })
    }

    if (body.action === 'add') {
      const team = clean(body.team, 60)
      if (!team) return json({ error: 'Team name is required' }, 400)
      const week = /^\d{4}-\d{2}-\d{2}$/.test(String(body.week || '')) ? String(body.week) : new Date().toISOString().slice(0, 10)
      const photoUrl = typeof body.photoUrl === 'string' && body.photoUrl.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`) ? body.photoUrl : null
      const list = await readList(db)
      const entry: WinnerEntry = { id: globalThis.crypto.randomUUID(), week, event: clean(body.event, 120), team, players: clean(body.players, 120), photoUrl, createdAt: new Date().toISOString() }
      list.push(entry)
      await writeList(db, list)
      return json({ ok: true, entry })
    }

    if (body.action === 'delete') {
      const list = await readList(db)
      const gone = list.find(w => w.id === body.id)
      if (!gone) return json({ error: 'Not found' }, 404)
      await writeList(db, list.filter(w => w.id !== body.id))
      if (gone.photoUrl) {
        const path = gone.photoUrl.split(`/public/${BUCKET}/`)[1]
        if (path) await db.storage.from(BUCKET).remove([path])
      }
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return errorResponse(err)
  }
}
