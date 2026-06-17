import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { booking, type = 'inquiry' } = await req.json()
    if (!booking) return NextResponse.json({ error: 'No booking provided' }, { status: 400 })

    const dateFormatted = booking.date
      ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        })
      : 'TBD'

    const systemPrompt = `You are "Mask Off Da DJ", a professional DJ responding to booking inquiries.
Write in first person. Be professional, warm, and enthusiastic. Keep it concise — 2 to 3 paragraphs.
Do not include subject lines or greetings like "Dear" — just the email body starting with "Hi [Name]," or similar.`

    const userPrompt = type === 'decline'
      ? `Write a polite professional decline for this booking request:
Client: ${booking.client_name}
Event: ${booking.event_type} on ${dateFormatted} in ${booking.city}
Apologize that you're unavailable for that date, wish them well, and encourage them to reach out for future dates. Sign off as "Mask Off Da DJ".`
      : `Write a professional reply to this DJ booking inquiry:
Client: ${booking.client_name}
Event Type: ${booking.event_type}
Date: ${dateFormatted}
City: ${booking.city}
Start/End: ${booking.start_time || 'TBD'} – ${booking.end_time || 'TBD'}
Guests: ${booking.guest_count || 'TBD'}
Venue: ${booking.location || 'TBD'}
MC Services: ${booking.mc_needed ? 'Yes' : 'No'}
Special Requests: ${booking.special_requests || 'None'}

The reply should:
1. Thank ${booking.client_name} by name for reaching out
2. Express genuine excitement about their ${booking.event_type}
3. Confirm you received their request for ${dateFormatted} in ${booking.city}
4. Let them know you're available and would love to discuss packages and pricing
5. Invite them to reply, call, or text to move forward
6. Sign off warmly as "Mask Off Da DJ" with email: maskoffdadj@gmail.com`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const replyText = message.content[0].type === 'text' ? message.content[0].text : ''
    const subject = type === 'decline'
      ? `Re: DJ Services – ${booking.event_type} on ${dateFormatted}`
      : `Re: DJ Booking Inquiry – ${booking.event_type} · ${dateFormatted}`

    return NextResponse.json({ reply: replyText, subject })
  } catch (err: any) {
    console.error('[generate-reply]', err)
    return NextResponse.json({ error: err.message || 'Generation failed' }, { status: 500 })
  }
}
