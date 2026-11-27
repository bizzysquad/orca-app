import { NextRequest } from 'next/server'
import { checkWrite, clientKey, errorResponse, json, readJson, store } from '@/lib/spades/http'
import { act, createTable, getView, joinTable } from '@/lib/spades/live'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Online "Play a game" tables. The seat token travels in the x-seat-token
// header on reads (never in the URL) and in the JSON body on writes.

// Light per-instance limit on making tables and taking seats.
const hits = new Map<string, number[]>()
function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const list = (hits.get(key) || []).filter(t => now - t < windowMs)
  list.push(now)
  hits.set(key, list)
  if (hits.size > 5000) hits.clear()
  return list.length > max
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code') || ''
    const token = req.headers.get('x-seat-token') || null
    return json(await getView(store(), code, token))
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(req: NextRequest) {
  const blocked = checkWrite(req)
  if (blocked) return blocked
  try {
    const body = await readJson(req)
    const s = store()
    const action = String(body.action || '')
    if (action === 'create') {
      if (limited(`create:${clientKey(req)}`, 20, 10 * 60 * 1000)) return json({ error: 'Too many tables made from here. Wait a few minutes.' }, 429)
      return json(await createTable(s, body))
    }
    if (action === 'join') {
      if (limited(`join:${clientKey(req)}`, 60, 10 * 60 * 1000)) return json({ error: 'Too many tries. Wait a few minutes.' }, 429)
      return json(await joinTable(s, body.code, body))
    }
    const view = await act(s, body.code, body.token, body)
    return json(view ? { view } : { closed: true })
  } catch (err) {
    return errorResponse(err)
  }
}
