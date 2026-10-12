import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { getRsvpAppUrl } from '@/lib/rsvp/url'

export const dynamic = 'force-dynamic'

// QR for a separate perk code. Encodes only the perk pass URL; the scanner
// pulls the token off the end of it.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = getRsvpAdmin()
  const { data: grant } = await supabase.from('rsvp_perk_grants').select('code_token').eq('code_token', params.token).maybeSingle()
  if (!grant) return NextResponse.json({ error: 'Perk not found' }, { status: 404 })

  const buffer = await QRCode.toBuffer(`${getRsvpAppUrl()}/RSVP/perk/${grant.code_token}`, {
    width: 480,
    margin: 2,
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  })
  return new NextResponse(new Uint8Array(buffer), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=3600' },
  })
}
