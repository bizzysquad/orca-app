'use client'

// Rules and game length pickers shared by "Play the computer" and
// "Play with friends".

import { GAME_TYPES } from '@/lib/spades/quickgame'
import { ruleSet, RULE_SETS, type RuleSetId } from '@/lib/spades/cardgame'

export const LEARN_KEY = 'spades-hq-learn'
export const NAME_KEY = 'spades-hq-name'
export const LIVE_LAST_KEY = 'spades-hq-live-last'
export const liveTokenKey = (code: string) => `spades-hq-live:${code.replace(/[^A-Z0-9]/gi, '').toUpperCase()}`

// POST to the online tables API. Throws with the server's message on failure.
export async function postLive(body: Record<string, unknown>): Promise<any> {
  const res = await fetch('/api/spades/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.')
  return data
}

function opt(on: boolean) {
  return on ? 'sp-btn sp-btn-gold' : 'sp-btn sp-btn-ghost'
}

export function RulesPicker({ value, onChange }: { value: RuleSetId; onChange: (r: RuleSetId) => void }) {
  return (
    <section className="sp-card p-4 grid gap-3" aria-label="Rules">
      <p className="sp-label">Rules</p>
      <div className="grid grid-cols-2 gap-2">
        {(['house', 'standard'] as const).map(id => (
          <button key={id} type="button" className={opt(value === id)} aria-pressed={value === id} onClick={() => onChange(id)}>
            {RULE_SETS[id].name}
          </button>
        ))}
      </div>
      <RuleNotes id={value} />
    </section>
  )
}

export function LengthPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <section className="sp-card p-4 grid gap-3" aria-label="Game length">
      <p className="sp-label">Game length</p>
      <div className="grid grid-cols-2 gap-2">
        {GAME_TYPES.map(t => (
          <button key={t.gamesToWin} type="button" className={`${opt(value === t.gamesToWin)} sp-btn-sm`} aria-pressed={value === t.gamesToWin} onClick={() => onChange(t.gamesToWin)}>
            {t.label}
          </button>
        ))}
      </div>
    </section>
  )
}

export function LearnToggle({ value, onChange, compact = false }: { value: boolean; onChange: (v: boolean) => void; compact?: boolean }) {
  const button = (
    <button type="button" className={`${opt(value)} sp-btn-sm`} aria-pressed={value} onClick={() => onChange(!value)}>
      {compact ? `Learn mode ${value ? 'on' : 'off'}` : value ? 'On' : 'Off'}
    </button>
  )
  if (compact) return button
  return (
    <section className="sp-card p-4" aria-label="Learn mode">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="sp-label">Learn mode</p>
          <p className="text-sm mt-1" style={{ color: 'var(--sp-muted)' }}>Lights up the cards you can play, explains every trick, suggests bids and gives hints.</p>
        </div>
        {button}
      </div>
    </section>
  )
}

export function RuleNotes({ id }: { id: RuleSetId }) {
  const rs = ruleSet(id)
  const items = id === 'house'
    ? [
        'Joker deck: Big Joker, Little Joker, then the 2 of spades are the top 3 cards.',
        'The 2 of hearts and 2 of diamonds are taken out.',
        'First hand of every game bids itself: every book counts.',
        `${rs.pointsPerBook} points per book bid. Extra books earn nothing. A set scores 0.`,
        `No nil, no bags. Play to ${rs.target}.`,
      ]
    : [
        'Regular 52 card deck. The Ace of spades is the top card.',
        `${rs.pointsPerBook} points per book bid, 1 point per extra book. A set loses ${rs.pointsPerBook} per book bid.`,
        `Bid 0 for nil: +${rs.nilPoints} if you take no books, -${rs.nilPoints} if you take any.`,
        `Extra books are bags. Every ${rs.bagLimit} bags costs ${rs.bagPenalty}.`,
        `Play to ${rs.target}.`,
      ]
  return (
    <ul className="grid gap-1 list-disc pl-5 text-sm" style={{ color: 'var(--sp-muted)' }}>
      {items.map(i => <li key={i}>{i}</li>)}
    </ul>
  )
}
