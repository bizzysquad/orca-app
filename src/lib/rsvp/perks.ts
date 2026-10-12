import { getRsvpAdmin } from '@/lib/rsvp/db'
import { sendTemplatedEmail } from '@/lib/rsvp/email'
import { getRsvpAppUrl } from '@/lib/rsvp/url'

// Event Perks: drink discounts and other freebies attached to RSVP tickets.
// A perk is either shown on the guest's existing ticket (delivery 'ticket',
// redeemed by scanning the ticket QR) or sent as its own QR code (delivery
// 'separate', redeemed by scanning the perk code). See supabase-migration-rsvp-perks.sql.

export interface Perk {
  id: string
  event_id: string
  name: string
  description: string
  delivery: 'ticket' | 'separate'
  uses_per_guest: number | null
  total_cap: number | null
  valid_from: string | null
  valid_until: string | null
  eligibility: 'all' | 'first_n' | 'checked_in'
  first_n: number | null
  is_paused: boolean
  sort_order: number
}

export interface PerkTicket {
  id: string
  event_id: string
  status: string
  holder_name: string
  holder_email: string
  ticket_number: string
  guest_names: string[] | null
  created_at: string
}

export interface PerkStatus {
  perk: Pick<Perk, 'id' | 'name' | 'description' | 'delivery' | 'valid_from' | 'valid_until'>
  ok: boolean
  reason: string | null
  usesAllowed: number | null // null = unlimited
  usesLeft: number | null
  usedCount: number
}

const LIVE_TICKET = new Set(['valid', 'checked_in'])
export const PERK_TICKET_FIELDS = 'id, event_id, status, holder_name, holder_email, ticket_number, guest_names, created_at'

export function partySize(t: Pick<PerkTicket, 'guest_names'>): number {
  return 1 + (t.guest_names?.length || 0)
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
}

// Everything needed to decide whether `ticket` can redeem each perk right now.
export async function loadPerkContext(eventId: string, perkIds: string[], ticketId: string) {
  const supabase = getRsvpAdmin()
  const [{ data: liveTickets }, { data: perkRedemptions }, { data: grants }] = await Promise.all([
    supabase.from('rsvp_tickets').select('id, created_at').eq('event_id', eventId).in('status', Array.from(LIVE_TICKET)).order('created_at'),
    perkIds.length
      ? supabase.from('rsvp_perk_redemptions').select('perk_id, ticket_id').in('perk_id', perkIds)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from('rsvp_perk_grants').select('perk_id, voided').eq('ticket_id', ticketId),
  ])
  const rank = (liveTickets || []).findIndex((t: any) => t.id === ticketId) + 1 // 0 = not a live ticket
  const totals: Record<string, number> = {}
  const mine: Record<string, number> = {}
  for (const r of (perkRedemptions || []) as any[]) {
    totals[r.perk_id] = (totals[r.perk_id] || 0) + 1
    if (r.ticket_id === ticketId) mine[r.perk_id] = (mine[r.perk_id] || 0) + 1
  }
  const voided = new Set(((grants || []) as any[]).filter(g => g.voided).map(g => g.perk_id))
  return { rank, totals, mine, voided }
}

export function evaluatePerk(perk: Perk, ticket: PerkTicket, ctx: Awaited<ReturnType<typeof loadPerkContext>>, now = new Date()): PerkStatus {
  const usedCount = ctx.mine[perk.id] || 0
  const usesAllowed = perk.uses_per_guest == null ? null : perk.uses_per_guest * partySize(ticket)
  const usesLeft = usesAllowed == null ? null : Math.max(0, usesAllowed - usedCount)
  const base = {
    perk: { id: perk.id, name: perk.name, description: perk.description, delivery: perk.delivery, valid_from: perk.valid_from, valid_until: perk.valid_until },
    usesAllowed,
    usesLeft,
    usedCount,
  }
  const no = (reason: string): PerkStatus => ({ ...base, ok: false, reason })

  if (!LIVE_TICKET.has(ticket.status)) return no(`Ticket is ${ticket.status.replace('_', ' ')}`)
  if (ctx.voided.has(perk.id)) return no('Voided by the organizer for this guest')
  if (perk.is_paused) return no('Paused by the organizer')
  if (perk.valid_from && now < new Date(perk.valid_from)) return no(`Starts ${fmtWhen(perk.valid_from)}`)
  if (perk.valid_until && now > new Date(perk.valid_until)) return no(`Ended ${fmtWhen(perk.valid_until)}`)
  if (perk.eligibility === 'checked_in' && ticket.status !== 'checked_in') return no('Guest must check in at the door first')
  if (perk.eligibility === 'first_n' && perk.first_n != null && (ctx.rank === 0 || ctx.rank > perk.first_n)) {
    return no(`Only for the first ${perk.first_n} RSVPs`)
  }
  if (usesLeft === 0) return no(usesAllowed === 1 ? 'Already redeemed' : `All ${usesAllowed} uses redeemed`)
  if (perk.total_cap != null && (ctx.totals[perk.id] || 0) >= perk.total_cap) return no(`All ${perk.total_cap} have been claimed`)
  return { ...base, ok: true, reason: null }
}

// Perks shown on the guest's own ticket page (delivery 'ticket' only)
export async function ticketPerkStatuses(ticket: PerkTicket): Promise<PerkStatus[]> {
  const supabase = getRsvpAdmin()
  const { data: perks } = await supabase.from('rsvp_perks').select('*').eq('event_id', ticket.event_id).eq('delivery', 'ticket').order('sort_order')
  if (!perks?.length) return []
  const ctx = await loadPerkContext(ticket.event_id, perks.map(p => p.id), ticket.id)
  return (perks as Perk[]).map(p => evaluatePerk(p, ticket, ctx))
}

// Creates + emails separate perk codes. Skips tickets that already have one,
// and tickets that can never qualify (outside first N). Never throws: a failed
// perk email must not break an RSVP.
export async function grantSeparatePerks(eventId: string, opts: { perkId?: string; ticketIds?: string[] } = {}) {
  try {
    const supabase = getRsvpAdmin()
    let perkQuery = supabase.from('rsvp_perks').select('*').eq('event_id', eventId).eq('delivery', 'separate')
    if (opts.perkId) perkQuery = perkQuery.eq('id', opts.perkId)
    const { data: perks } = await perkQuery
    if (!perks?.length) return { sent: 0 }

    const [{ data: event }, { data: liveTickets }] = await Promise.all([
      supabase.from('rsvp_events').select('name').eq('id', eventId).single(),
      supabase.from('rsvp_tickets').select(PERK_TICKET_FIELDS).eq('event_id', eventId).in('status', Array.from(LIVE_TICKET)).order('created_at'),
    ])
    const tickets = (liveTickets || []) as PerkTicket[]
    let sent = 0

    for (const perk of perks as Perk[]) {
      const { data: existing } = await supabase.from('rsvp_perk_grants').select('ticket_id').eq('perk_id', perk.id)
      const has = new Set((existing || []).map((g: any) => g.ticket_id))
      const candidates = tickets
        .map((t, i) => ({ t, rank: i + 1 }))
        .filter(({ t, rank }) => !has.has(t.id) && (!opts.ticketIds || opts.ticketIds.includes(t.id)))
        .filter(({ rank }) => perk.eligibility !== 'first_n' || perk.first_n == null || rank <= perk.first_n)

      for (const { t } of candidates) {
        const { data: grant, error } = await supabase
          .from('rsvp_perk_grants')
          .insert({ perk_id: perk.id, ticket_id: t.id, sent_at: t.holder_email ? new Date().toISOString() : null })
          .select('code_token')
          .single()
        if (error || !grant) continue
        if (t.holder_email) {
          await sendTemplatedEmail({
            templateKey: 'perk_delivery',
            eventId,
            to: t.holder_email,
            vars: {
              event_name: event?.name || '',
              perk_name: perk.name,
              perk_description: perk.description,
              perk_url: `${getRsvpAppUrl()}/RSVP/perk/${grant.code_token}`,
            },
          })
          sent++
        }
      }
    }
    return { sent }
  } catch (err) {
    console.error('[rsvp perks] grantSeparatePerks failed', err)
    return { sent: 0 }
  }
}
