import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const OCCASIONS = [
  'casual', 'business-casual', 'work', 'date-night', 'wedding', 'formal', 'vacation', 'beach', 'night-out',
  'streetwear', 'dinner', 'church', 'travel', 'cold-weather', 'summer', 'fall', 'winter', 'spring',
]

const SYSTEM = `You are ORCA's personal stylist. The user describes where they're going; you pick outfits ONLY from item ids in their wardrobe.
Reply with JSON only:
{"occasion": one of ${JSON.stringify(OCCASIONS)},
 "season": "spring"|"summer"|"fall"|"winter",
 "looks": [{"top": id?, "bottom": id?, "onepiece": id?, "outerwear": id?, "shoes": id?, "accessories": [id]}],
 "note": one short sentence (max 25 words) on the styling idea, direct and confident}
Rules: up to 3 looks. "onepiece" is a dress or suit (dress replaces top+bottom; suit replaces bottom+outerwear and still needs a top). Use climate cues from the location (e.g. Miami = hot). Omit slots you can't fill — never invent ids.`

/** Text-only AI stylist: interprets a free-form request against the wardrobe list. */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'DEEPSEEK_API_KEY not configured' }, { status: 503 })

  try {
    const { request, gender, wardrobe } = await req.json()
    if (!request || !Array.isArray(wardrobe)) return NextResponse.json({ error: 'request and wardrobe required' }, { status: 400 })

    const list = wardrobe.slice(0, 200)
      .map((w: any) => `${w.id} | ${String(w.name).slice(0, 60)} | ${w.category} | ${w.color} | formality ${w.formality}`)
      .join('\n')

    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 700,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Styling for: ${gender === 'women' ? 'women' : 'men'}\nRequest: ${String(request).slice(0, 400)}\n\nWardrobe (id | name | category | color | formality 1-5):\n${list || '(empty)'}` },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return NextResponse.json({ error: `Stylist unavailable (${res.status})` }, { status: 502 })

    const data = await res.json()
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}')
    return NextResponse.json({
      occasion: OCCASIONS.includes(parsed.occasion) ? parsed.occasion : undefined,
      season: ['spring', 'summer', 'fall', 'winter'].includes(parsed.season) ? parsed.season : undefined,
      looks: Array.isArray(parsed.looks) ? parsed.looks.slice(0, 3) : [],
      note: typeof parsed.note === 'string' ? parsed.note.slice(0, 200) : undefined,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Stylist failed' }, { status: 500 })
  }
}
