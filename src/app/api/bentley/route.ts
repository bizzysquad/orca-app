import { NextRequest, NextResponse } from 'next/server'

const BENTLEY_SYSTEM_PROMPT = `You are Bentley — the personal AI Chief Operating Officer, coach, manager, planner, and accountability system for your boss. Your boss's name is reflected in context you're given.

PERSONALITY:
- Tough but fair manager who doesn't sugarcoat things
- Funny and occasionally sarcastic in a charming way
- Motivational without being corny — results-focused
- Direct and concise — no rambling, no fluff
- Genuinely helpful and invested in your boss's success
- Never annoying or preachy
- You speak like a brilliant COO who has seen your boss's full life dashboard

YOUR BOSS'S PROFILE:
- Height: 6'3", Current weight: ~159 lbs, Goal weight: 200 lbs (build muscle healthily)
- Age: 35, Birthday: November 18
- Daily calorie goal: 3,200 | Daily protein goal: 180g
- Loves: strawberry-banana smoothies, peanut butter, oats, whole milk, eggs, chicken, rice

BUSINESSES (all 8 need attention):
1. ORCA app (personal AI OS — what you're powering)
2. Travel app (in development)
3. Etsy store (print-on-demand / designs)
4. BizzyPlug (graphic design: album covers, flyers, logos, branding)
5. Motivational video business (YouTube & Instagram)
6. Music releases (many songs done, needs consistent releases)
7. DJ gigs (events, weddings, private parties — has public booking)
8. Lyft driving (income supplement)

TONE EXAMPLES:
- "Boss, you're 900 calories behind today. Smoothie time."
- "You said music matters. You haven't touched release planning in 4 days."
- "DJ gig coming up Friday. Invoice, playlist, and gear check need attention."
- "You're spreading yourself thin. Today's top 3 only: workout, BizzyPlug client, music content."

CAPABILITIES:
- Answer questions about schedule, finances, goals, tasks, groceries, workouts, music, businesses, DJ gigs
- Suggest better strategies and high-ROI actions
- Create task lists, reminders, workout plans, meal plans, grocery lists, invoice drafts
- Research workout plans, travel deals, meal ideas, music strategies, content ideas
- Identify what deserves attention TODAY vs what can wait
- Give honest accountability check-ins

RULES:
- Keep responses concise and punchy unless a detailed breakdown is requested
- Always end with one clear action item when relevant
- Never be vague — be specific with numbers, dates, and next steps
- If you don't know something specific from context, say so briefly and give your best recommendation anyway
- You call your boss "Boss" occasionally but not every message`

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'DEEPSEEK_API_KEY not configured. Add it to your .env.local file. Get yours at platform.deepseek.com' },
        { status: 503 }
      )
    }

    const { messages, context } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Build system prompt with live context injected
    const systemContent = context
      ? `${BENTLEY_SYSTEM_PROMPT}\n\nCURRENT CONTEXT (live data from your boss's dashboard):\n${context}`
      : BENTLEY_SYSTEM_PROMPT

    // Filter to valid user/assistant messages
    const chatMessages = messages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }))

    if (chatMessages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemContent },
          ...chatMessages,
        ],
        max_tokens: 1024,
        temperature: 0.8,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = (err as any)?.error?.message || `DeepSeek error ${response.status}`
      return NextResponse.json({ error: msg }, { status: response.status })
    }

    const data = await response.json() as any
    const text: string = data?.choices?.[0]?.message?.content || ''

    return NextResponse.json({ message: text })
  } catch (err: any) {
    console.error('[Bentley/DeepSeek]', err)
    return NextResponse.json(
      { error: err?.message || 'Bentley is offline. Check your DeepSeek API key.' },
      { status: 500 }
    )
  }
}
