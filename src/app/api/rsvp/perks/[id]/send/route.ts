import { NextRequest, NextResponse } from 'next/server'
import { getRsvpAdmin } from '@/lib/rsvp/db'
import { logAudit, requireStaff } from '@/lib/rsvp/staffAuth'
import { grantSeparatePerks } from '@/lib/rsvp/perks'

export const dynamic = 'force-dynamic'

// POST: email the separate perk code to every eligible guest who doesn't have one yet
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireStaff(req, 'event_admin')
  if ('response' in auth) return auth.response
  const { staff } = auth

  const supabase = getRsvpAdmin()
  const { data: perk } = await supabase.from('rsvp_perks').select('id, event_id, delivery').eq('id', params.id).single()
  if (!perk) return NextResponse.json({ error: 'Perk not found' }, { status: 404 })
  if (perk.delivery !== 'separate') return NextResponse.json({ error: 'This perk lives on guest tickets, so there is nothing to send' }, { status: 400 })

  const { sent } = await grantSeparatePerks(perk.event_id, { perkId: perk.id })
  await logAudit(staff, 'send_perk_codes', 'rsvp_perks', perk.id, { sent })
  return NextResponse.json({ sent })
}
