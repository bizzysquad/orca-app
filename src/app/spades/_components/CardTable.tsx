'use client'

// The card table shared by "Play the computer" (everything on this phone)
// and online tables (the server deals and runs the computer seats). The
// viewer's own seat is always drawn at the bottom; other hands may be empty
// arrays because the server never sends them, so seat card counts come from
// handCounts.

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { NumberPad } from './ui'
import {
  cardName, cardSuit, isJoker, isNilBid, legalCards, rankLabel, ruleSet, seatSide, sideSeats, sortHand, suitSymbol,
  teamBid, tiedAtTarget, trickWinner, whyIllegal, type PracticeGame, type Side, type TeamHandResult,
} from '@/lib/spades/cardgame'
import { botBid, botPlay, explainTrick } from '@/lib/spades/bots'

const AREAS = ['s', 'w', 'n', 'e'] as const
type Area = (typeof AREAS)[number]

export interface CardTableProps {
  g: PracticeGame
  me: number
  // Display name per seat, with "You" at `me`.
  names: string[]
  handCounts: number[]
  learn: boolean
  busy?: boolean
  error?: string | null
  onBid: (bid: number) => void
  onPlay: (card: string) => void
  onNext: () => void
  // Local games: tap the table to collect a finished trick early.
  onTapTrick?: () => void
  // Buttons shown once the match is over.
  endActions?: ReactNode
  // Extra line under a seat (online status, host controls).
  seatExtra?: (seat: number) => ReactNode
}

export function areaOf(seat: number, me: number): Area {
  return AREAS[(seat - me + 4) % 4]
}

// "You", "Partner", "Left", "Right" relative to the viewer.
export function relativeName(seat: number, me: number): string {
  return ['You', 'Left', 'Partner', 'Right'][(seat - me + 4) % 4]
}

export function CardTable(p: CardTableProps) {
  const { g, me, names, learn } = p
  const rs = ruleSet(g.rules)
  const [msg, setMsg] = useState<string | null>(null)
  const [hint, setHint] = useState<{ card: string; reason: string } | null>(null)
  const myTurn = g.phase === 'playing' && g.turn === me && g.trick.length < 4
  const legal = useMemo(() => (myTurn ? new Set(legalCards(g, me)) : new Set<string>()), [g, me, myTurn])
  const hand = sortHand(g.hands[me] || [], rs)
  const done = g.trick.length === 4
  const winner = done ? trickWinner(g.trick, rs)!.seat : -1
  const last = g.tricks[g.tricks.length - 1]

  useEffect(() => { if (!myTurn) { setHint(null); setMsg(null) } }, [myTurn])

  const tap = (card: string) => {
    if (!myTurn || p.busy) return
    const why = whyIllegal(g, me, card)
    if (why) { setMsg(why); return }
    setMsg(null)
    setHint(null)
    p.onPlay(card)
  }

  const verb = (seat: number, you: string, other: string) => (seat === me ? you : other)
  const status = g.phase === 'handover'
    ? 'Hand over'
    : g.phase === 'bidding'
    ? g.turn === me ? 'Your bid' : `${names[g.turn]} is bidding`
    : done ? `${names[winner]} ${verb(winner, 'win', 'wins')} the book`
    : g.turn === me ? 'Your turn' : `${names[g.turn]} is playing`

  return (
    <div className="grid gap-3">
      <Scoreboard g={g} me={me} />

      {g.bidItself && g.phase === 'playing' && g.tricks.length === 0 && g.trick.length === 0 && (
        <div className="sp-banner sp-banner-info text-sm">First hand of the game bids itself: no bidding. Every book your team takes is worth {rs.pointsPerBook}.</div>
      )}

      <div className="sp-felt" aria-label="Card table">
        {[0, 1, 2, 3].filter(s => s !== me).map(s => (
          <Seat key={s} g={g} seat={s} me={me} name={names[s]} count={p.handCounts[s]} extra={p.seatExtra?.(s)} />
        ))}
        <div className="sp-felt-center" onClick={() => { if (done) p.onTapTrick?.() }}>
          {g.trick.map(t => (
            <div key={t.seat} className={`sp-trick-slot sp-trick-${areaOf(t.seat, me)}`}>
              <Card id={t.card} size="sm" win={t.seat === winner} />
            </div>
          ))}
          {!g.trick.length && g.phase === 'playing' && <span className="sp-label text-center">{g.spadesBroken ? 'Spades broken' : 'Spades not broken'}</span>}
        </div>
        <Seat g={g} seat={me} me={me} name={names[me]} count={p.handCounts[me]} extra={p.seatExtra?.(me)} />
      </div>

      <p className="text-center font-black" role="status" aria-live="polite">{status}</p>

      {done ? (
        <div className={`sp-banner ${learn ? 'sp-banner-info' : 'sp-banner-ok'} text-sm text-center`}>
          {learn ? explainTrick(g.trick, rs, names) : `${names[winner]} took it.`}
          {learn && p.onTapTrick && <span className="block mt-1 opacity-70">Tap the table to keep going.</span>}
        </div>
      ) : learn && last && g.phase === 'playing' && !g.trick.length ? (
        <p className="text-xs text-center" style={{ color: 'var(--sp-muted)' }}>Last book: {explainTrick(last.cards, rs, names)}</p>
      ) : null}

      {(msg || p.error) && <div className="sp-banner sp-banner-bad text-sm" role="alert">{msg || p.error}</div>}
      {hint && <div className="sp-banner sp-banner-warn text-sm"><b>Hint: {cardName(hint.card)}.</b> {hint.reason}</div>}

      {g.phase === 'bidding' && g.turn === me && <BidPanel key={`${g.game}-${g.handInGame}`} g={g} me={me} learn={learn} busy={p.busy} onBid={p.onBid} />}

      {g.phase !== 'handover' && hand.length > 0 && (
        <div className="sp-hand" style={{ gridTemplateColumns: `repeat(${Math.max(0, hand.length - 1)}, minmax(0, var(--pc-w))) var(--pc-w)` }} aria-label="Your hand">
          {hand.map(c => {
            const can = legal.has(c)
            const cls = [myTurn && learn && can ? 'is-legal' : '', myTurn && learn && !can ? 'is-dim' : '', hint?.card === c ? 'is-hint' : ''].join(' ')
            return (
              <button key={c} type="button" className={`sp-hand-slot ${cls}`} onClick={() => tap(c)} aria-label={`${cardName(c)}${myTurn && learn ? (can ? ', playable' : ', not playable') : ''}`} disabled={!myTurn || p.busy}>
                <Card id={c} />
              </button>
            )
          })}
        </div>
      )}

      {myTurn && learn && !hint && (
        <button className="sp-btn sp-btn-sm justify-self-center" onClick={() => setHint(botPlay(g, me))}>Show me a hint</button>
      )}

      {g.phase === 'handover' && <HandOver g={g} me={me} learn={learn} busy={p.busy} onNext={p.onNext} endActions={p.endActions} />}
    </div>
  )
}

function Scoreboard({ g, me }: { g: PracticeGame; me: number }) {
  const rs = ruleSet(g.rules)
  const mine = seatSide(me)
  const side = (s: Side) => {
    const score = s === 'a' ? g.scoreA : g.scoreB
    const bags = s === 'a' ? g.bagsA : g.bagsB
    const wins = s === 'a' ? g.winsA : g.winsB
    const bid = teamBid(g, s)
    const books = sideSeats(s).reduce((t, x) => t + g.won[x], 0)
    return (
      <div className="text-center">
        <p className="sp-label">{s === mine ? 'Us' : 'Them'}{g.gamesToWin > 1 ? ` · ${wins} won` : ''}</p>
        <p className="sp-display sp-num" style={{ fontSize: 34 }}>{score}</p>
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>
          {g.phase === 'bidding' ? 'Bidding' : bid === null ? `${books} book${books === 1 ? '' : 's'}` : `${books} of ${bid} books`}
        </p>
        {rs.bags && <p className="text-xs" style={{ color: 'var(--sp-dim)' }}>{bags} bag{bags === 1 ? '' : 's'}</p>}
      </div>
    )
  }
  return (
    <div className="sp-card px-3 py-2">
      <div className="grid grid-cols-3 items-center">
        {side(mine)}
        <div className="text-center">
          <p className="sp-label">{g.gamesToWin > 1 ? `Game ${g.game}` : `To ${rs.target}`}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--sp-muted)' }}>Hand {g.handInGame}</p>
          <p className="text-xs" style={{ color: 'var(--sp-dim)' }}>{rs.name}</p>
        </div>
        {side(mine === 'a' ? 'b' : 'a')}
      </div>
    </div>
  )
}

function Seat({ g, seat, me, name, count, extra }: { g: PracticeGame; seat: number; me: number; name: string; count: number; extra?: ReactNode }) {
  const bid = g.bids[seat]
  const active = g.turn === seat && g.phase !== 'handover'
  const bidText = g.bidItself ? '' : bid === null ? (g.phase === 'bidding' ? 'Bid: ...' : '') : isNilBid(g, seat) ? 'Bid: Nil' : `Bid: ${bid}`
  return (
    <div className={`sp-seat sp-seat-${areaOf(seat, me)} ${active ? 'is-active' : ''}`}>
      <span className="font-black text-sm leading-tight" style={{ overflowWrap: 'anywhere' }}>{name}{g.dealer === seat && <span className="sp-dealer" title="Dealer">D</span>}</span>
      <span className="text-xs" style={{ color: 'var(--sp-muted)' }}>{bidText}{g.phase !== 'bidding' ? `${bidText ? ' · ' : ''}${g.won[seat]} won` : ''}</span>
      {seat !== me && <span className="text-xs" style={{ color: 'var(--sp-dim)' }}>{count} cards</span>}
      {extra}
    </div>
  )
}

function BidPanel({ g, me, learn, busy, onBid }: { g: PracticeGame; me: number; learn: boolean; busy?: boolean; onBid: (n: number) => void }) {
  const rs = ruleSet(g.rules)
  const advice = useMemo(() => botBid(g, me), [g, me])
  const [bid, setBid] = useState<number | null>(learn ? advice.bid : null)
  const partner = g.bids[(me + 2) % 4]
  return (
    <div className="sp-card p-4 grid gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="sp-label">Your bid</p>
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>
          {partner === null ? 'Partner bids after you' : `Partner bid ${partner === 0 && rs.nil ? 'Nil' : partner}`}
        </p>
      </div>
      {learn && <div className="sp-banner sp-banner-warn text-sm"><b>Suggested: {advice.nil ? 'Nil' : advice.bid}.</b> {advice.reason}</div>}
      <NumberPad value={bid} onChange={setBid} label="Bid" />
      {rs.nil && <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>0 = Nil: +{rs.nilPoints} if you take no books, -{rs.nilPoints} if you take any.</p>}
      <button className="sp-btn sp-btn-gold sp-btn-block" disabled={bid === null || busy} onClick={() => bid !== null && onBid(bid)}>
        {bid === null ? 'Pick a number' : `Bid ${bid === 0 && rs.nil ? 'Nil' : bid}`}
      </button>
    </div>
  )
}

function HandOver({ g, me, learn, busy, onNext, endActions }: { g: PracticeGame; me: number; learn: boolean; busy?: boolean; onNext: () => void; endActions?: ReactNode }) {
  const r = g.lastResult
  if (!r) return null
  const rs = ruleSet(g.rules)
  const mine = seatSide(me)
  const label = (s: Side) => (s === mine ? 'Us' : 'Them')
  const team = (t: TeamHandResult) => (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-black">{label(t.side)}</span>
        <span className="sp-num font-black" style={{ color: t.points < 0 ? '#b3122a' : '#1d7a43' }}>{t.points > 0 ? '+' : ''}{t.points}</span>
      </div>
      {(learn ? t.lines : t.lines.slice(0, 1)).map((l, i) => <p key={i} className="text-sm" style={{ color: '#5c4f42' }}>{l}</p>)}
    </div>
  )
  const ours = mine === 'a' ? r.a : r.b
  const theirs = mine === 'a' ? r.b : r.a
  const usScore = mine === 'a' ? r.scoreA : r.scoreB
  const themScore = mine === 'a' ? r.scoreB : r.scoreA
  const usWins = mine === 'a' ? g.winsA : g.winsB
  const themWins = mine === 'a' ? g.winsB : g.winsA
  return (
    <div className="sp-card-paper p-4 grid gap-3">
      <p className="sp-label">Hand {r.handInGame}{g.gamesToWin > 1 ? `, game ${r.game}` : ''} is over</p>
      {team(ours)}
      {team(theirs)}
      <div className="flex justify-between font-black sp-num" style={{ borderTop: '2px solid var(--sp-ink)', paddingTop: 8 }}>
        <span>Us {usScore}</span><span>Them {themScore}</span>
      </div>
      {g.matchWinner ? (
        <>
          <p className="sp-display text-2xl text-center">{g.matchWinner === mine ? 'You win!' : 'They win'}</p>
          <p className="text-center text-sm">{g.matchWinner === mine ? 'You and your partner' : 'The other team'} {g.gamesToWin > 1 ? `took the series ${Math.max(usWins, themWins)} to ${Math.min(usWins, themWins)}` : `reached ${rs.target} first`}.</p>
          {endActions}
        </>
      ) : (
        <>
          {r.gameWinner && <p className="sp-display text-xl text-center">{r.gameWinner === mine ? 'You won game' : 'They won game'} {r.game}. Series {usWins} to {themWins}.</p>}
          {!r.gameWinner && tiedAtTarget(g) && <p className="text-sm text-center font-bold">Tied past {rs.target}. Keep playing until one team leads.</p>}
          <button className="sp-btn sp-btn-gold sp-btn-block" disabled={busy} onClick={onNext}>{r.gameWinner ? `Start game ${r.game + 1}` : 'Deal the next hand'}</button>
        </>
      )}
    </div>
  )
}

export function Card({ id, size = 'md', win = false }: { id: string; size?: 'md' | 'sm'; win?: boolean }) {
  const joker = isJoker(id)
  const s = cardSuit(id)
  const red = joker ? id === 'BJ' : s === 'H' || s === 'D'
  return (
    <span className={`sp-pc sp-pc-${size} ${red ? 'sp-pc-red' : ''} ${joker ? 'sp-pc-joker' : ''} ${win ? 'sp-pc-win' : ''}`} aria-hidden="true">
      <span className="sp-pc-corner">
        <span className="sp-pc-rank">{joker ? (id === 'BJ' ? 'BIG' : 'LIL') : rankLabel(id)}</span>
        <span className="sp-pc-suit">{joker ? '★' : suitSymbol(s)}</span>
      </span>
      <span className="sp-pc-face">{joker ? 'JOKER' : suitSymbol(s)}</span>
    </span>
  )
}
