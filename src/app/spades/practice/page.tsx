'use client'

// Practice spades against the computer. Runs entirely on this phone: nothing
// is sent to the server. A game in progress is kept in localStorage so a
// refresh picks up where you left off.

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { NumberPad, Shell, SpadeIcon } from '../_components/ui'
import { GAME_TYPES, gameTypeLabel } from '@/lib/spades/quickgame'
import {
  cardName, cardSuit, collectTrick, isJoker, isNilBid, isPracticeGame, legalCards, newPractice, nextHand, placeBid,
  playCard, PRACTICE_KEY, rankLabel, ruleSet, RULE_SETS, sortHand, suitSymbol, teamBid, tiedAtTarget, trickWinner,
  whyIllegal, type PracticeGame, type RuleSetId, type Side, type TeamHandResult,
} from '@/lib/spades/cardgame'
import { botBid, botPlay, explainTrick } from '@/lib/spades/bots'

const NAMES = ['You', 'Left', 'Partner', 'Right']
const TEAM = { a: 'Us', b: 'Them' } as const
const BOT_DELAY = 750
const TRICK_PAUSE = 1300
const TRICK_PAUSE_LEARN = 2600

type Setup = { rules: RuleSetId; learn: boolean; gamesToWin: number }

export default function PracticePage() {
  const [g, setG] = useState<PracticeGame | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [setup, setSetup] = useState<Setup>({ rules: 'house', learn: true, gamesToWin: 1 })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRACTICE_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        if (isPracticeGame(p)) setG(p)
      }
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      if (g) localStorage.setItem(PRACTICE_KEY, JSON.stringify(g))
      else localStorage.removeItem(PRACTICE_KEY)
    } catch {}
  }, [g, loaded])

  // Computer seats take their turns, and finished tricks are collected after
  // a pause long enough to see who won.
  useEffect(() => {
    if (!g) return
    if (g.phase === 'playing' && g.trick.length === 4) {
      const t = setTimeout(() => setG(x => (x && x.trick.length === 4 ? keep(x, collectTrick(x)) : x)), g.learn ? TRICK_PAUSE_LEARN : TRICK_PAUSE)
      return () => clearTimeout(t)
    }
    if (g.turn > 0 && (g.phase === 'bidding' || g.phase === 'playing')) {
      const seat = g.turn
      const t = setTimeout(() => setG(x => {
        if (!x || x.turn !== seat) return x
        return x.phase === 'bidding' ? keep(x, placeBid(x, seat, botBid(x, seat).bid)) : keep(x, playCard(x, seat, botPlay(x, seat).card))
      }), BOT_DELAY)
      return () => clearTimeout(t)
    }
  }, [g])

  if (!loaded) return <Shell badge={false}><div /></Shell>

  return (
    <Shell badge={false}>
      {g ? (
        <Table g={g} setG={setG} onQuit={() => { if (confirm('Leave this game? It will not be saved.')) setG(null) }} />
      ) : (
        <SetupScreen setup={setup} setSetup={setSetup} onStart={() => setG(newPractice(setup))} />
      )}
    </Shell>
  )
}

function keep(x: PracticeGame, r: PracticeGame | string): PracticeGame {
  return typeof r === 'string' ? x : r
}

// ---------- setup ----------

function SetupScreen({ setup, setSetup, onStart }: { setup: Setup; setSetup: (s: Setup) => void; onStart: () => void }) {
  const opt = (on: boolean) => (on ? 'sp-btn sp-btn-gold' : 'sp-btn sp-btn-ghost')
  return (
    <div className="sp-wrap-narrow grid gap-5">
      <header className="text-center">
        <SpadeIcon size={40} className="mx-auto" />
        <h1 className="sp-display text-4xl mt-2">Practice</h1>
        <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>Play a full game of spades on your phone. You and a computer partner against two computer players. Nothing is saved or sent anywhere.</p>
      </header>

      <section className="sp-card p-4 grid gap-3" aria-label="Rules">
        <p className="sp-label">Rules</p>
        <div className="grid grid-cols-2 gap-2">
          {(['house', 'standard'] as const).map(id => (
            <button key={id} type="button" className={opt(setup.rules === id)} aria-pressed={setup.rules === id} onClick={() => setSetup({ ...setup, rules: id })}>
              {RULE_SETS[id].name}
            </button>
          ))}
        </div>
        <RuleNotes id={setup.rules} />
      </section>

      <section className="sp-card p-4 grid gap-3" aria-label="Learn mode">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="sp-label">Learn mode</p>
            <p className="text-sm mt-1" style={{ color: 'var(--sp-muted)' }}>Lights up the cards you can play, explains every trick, suggests bids and gives hints.</p>
          </div>
          <button type="button" className={`${opt(setup.learn)} sp-btn-sm`} aria-pressed={setup.learn} onClick={() => setSetup({ ...setup, learn: !setup.learn })}>
            {setup.learn ? 'On' : 'Off'}
          </button>
        </div>
      </section>

      <section className="sp-card p-4 grid gap-3" aria-label="Game length">
        <p className="sp-label">Game length</p>
        <div className="grid grid-cols-2 gap-2">
          {GAME_TYPES.map(t => (
            <button key={t.gamesToWin} type="button" className={`${opt(setup.gamesToWin === t.gamesToWin)} sp-btn-sm`} aria-pressed={setup.gamesToWin === t.gamesToWin} onClick={() => setSetup({ ...setup, gamesToWin: t.gamesToWin })}>
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <button className="sp-btn sp-btn-wine sp-btn-block" style={{ minHeight: 64, fontSize: 19 }} onClick={onStart}>Deal the cards</button>
      <Link href="/spades" className="sp-btn sp-btn-ghost sp-btn-block">Back to Spades HQ</Link>
    </div>
  )
}

function RuleNotes({ id }: { id: RuleSetId }) {
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

// ---------- the table ----------

function Table({ g, setG, onQuit }: { g: PracticeGame; setG: (fn: (x: PracticeGame | null) => PracticeGame | null) => void; onQuit: () => void }) {
  const rs = ruleSet(g.rules)
  const [msg, setMsg] = useState<string | null>(null)
  const [hint, setHint] = useState<{ card: string; reason: string } | null>(null)
  const myTurn = g.phase === 'playing' && g.turn === 0 && g.trick.length < 4
  const legal = useMemo(() => (myTurn ? new Set(legalCards(g, 0)) : new Set<string>()), [g, myTurn])
  const hand = sortHand(g.hands[0], rs)
  const done = g.trick.length === 4

  // Clear old messages once the move they were about has passed.
  useEffect(() => { if (!myTurn) { setHint(null); setMsg(null) } }, [myTurn])

  const tap = (card: string) => {
    if (!myTurn) return
    const why = whyIllegal(g, 0, card)
    if (why) { setMsg(why); return }
    setMsg(null)
    setHint(null)
    setG(x => (x ? keep(x, playCard(x, 0, card)) : x))
  }

  const status = g.phase === 'handover'
    ? 'Hand over'
    : g.phase === 'bidding'
    ? g.turn === 0 ? 'Your bid' : `${NAMES[g.turn]} is bidding`
    : done ? `${NAMES[trickWinner(g.trick, rs)!.seat]} ${trickWinner(g.trick, rs)!.seat === 0 ? 'win' : 'wins'} the book`
    : g.turn === 0 ? 'Your turn' : `${NAMES[g.turn]} is playing`

  return (
    <div className="sp-wrap-narrow grid gap-3">
      <Scoreboard g={g} />

      {g.bidItself && g.phase === 'playing' && g.tricks.length === 0 && g.trick.length === 0 && (
        <div className="sp-banner sp-banner-info text-sm">First hand of the game bids itself: no bidding. Every book your team takes is worth {rs.pointsPerBook}.</div>
      )}

      <div className="sp-felt" aria-label="Card table">
        <Seat g={g} seat={2} area="n" />
        <Seat g={g} seat={1} area="w" />
        <Seat g={g} seat={3} area="e" />
        <div className="sp-felt-center" onClick={() => { if (done) setG(x => (x && x.trick.length === 4 ? keep(x, collectTrick(x)) : x)) }}>
          {g.trick.map(p => (
            <div key={p.seat} className={`sp-trick-slot sp-trick-${['s', 'w', 'n', 'e'][p.seat]}`}>
              <Card id={p.card} size="sm" win={done && trickWinner(g.trick, rs)!.seat === p.seat} />
            </div>
          ))}
          {!g.trick.length && g.phase === 'playing' && <span className="sp-label">{g.spadesBroken ? 'Spades broken' : 'Spades not broken'}</span>}
        </div>
        <Seat g={g} seat={0} area="s" />
      </div>

      <p className="text-center font-black" role="status" aria-live="polite">{status}</p>

      {done && (
        <div className={`sp-banner ${g.learn ? 'sp-banner-info' : 'sp-banner-ok'} text-sm text-center`}>
          {g.learn ? explainTrick(g.trick, rs, NAMES) : `${NAMES[trickWinner(g.trick, rs)!.seat]} took it.`}
          {g.learn && <span className="block mt-1 opacity-70">Tap the table to keep going.</span>}
        </div>
      )}

      {msg && <div className="sp-banner sp-banner-bad text-sm" role="alert">{msg}</div>}
      {hint && <div className="sp-banner sp-banner-warn text-sm"><b>Hint: {cardName(hint.card)}.</b> {hint.reason}</div>}

      {g.phase === 'bidding' && g.turn === 0 && <BidPanel g={g} setG={setG} />}

      {g.phase !== 'handover' && (
        <div className="sp-hand" style={{ gridTemplateColumns: `repeat(${Math.max(0, hand.length - 1)}, minmax(0, var(--pc-w))) var(--pc-w)` }} aria-label="Your hand">
          {hand.map(c => {
            const can = legal.has(c)
            const cls = [
              myTurn && g.learn && can ? 'is-legal' : '',
              myTurn && g.learn && !can ? 'is-dim' : '',
              hint?.card === c ? 'is-hint' : '',
            ].join(' ')
            return (
              <button key={c} type="button" className={`sp-hand-slot ${cls}`} onClick={() => tap(c)} aria-label={`${cardName(c)}${myTurn && g.learn ? (can ? ', playable' : ', not playable') : ''}`} disabled={!myTurn}>
                <Card id={c} />
              </button>
            )
          })}
        </div>
      )}

      {myTurn && g.learn && !hint && (
        <button className="sp-btn sp-btn-sm justify-self-center" onClick={() => setHint(botPlay(g, 0))}>Show me a hint</button>
      )}

      {g.phase === 'handover' && <HandOver g={g} setG={setG} />}

      <button className="sp-btn sp-btn-ghost sp-btn-sm justify-self-center mt-2" onClick={onQuit}>Leave game</button>
    </div>
  )
}

function Scoreboard({ g }: { g: PracticeGame }) {
  const rs = ruleSet(g.rules)
  const side = (s: Side) => {
    const score = s === 'a' ? g.scoreA : g.scoreB
    const bags = s === 'a' ? g.bagsA : g.bagsB
    const wins = s === 'a' ? g.winsA : g.winsB
    const bid = teamBid(g, s)
    const books = (s === 'a' ? [0, 2] : [1, 3]).reduce((t, x) => t + g.won[x], 0)
    return (
      <div className="text-center">
        <p className="sp-label">{TEAM[s]}{g.gamesToWin > 1 ? ` · ${wins} won` : ''}</p>
        <p className="sp-display sp-num" style={{ fontSize: 34 }}>{score}</p>
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>
          {g.phase === 'bidding' ? 'Bidding' : bid === null ? `${books} book${books === 1 ? '' : 's'}` : `${books} of ${bid} books`}
        </p>
        {rs.bags && <p className="text-xs" style={{ color: 'var(--sp-dim)' }}>{bags} bag{bags === 1 ? '' : 's'}</p>}
      </div>
    )
  }
  return (
    <div className="sp-card px-3 py-2 grid gap-1">
      <div className="grid grid-cols-3 items-center">
        {side('a')}
        <div className="text-center">
          <p className="sp-label">{g.gamesToWin > 1 ? `Game ${g.game}` : `To ${rs.target}`}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--sp-muted)' }}>Hand {g.handInGame}</p>
          <p className="text-xs" style={{ color: 'var(--sp-dim)' }}>{rs.name}</p>
        </div>
        {side('b')}
      </div>
    </div>
  )
}

function Seat({ g, seat, area }: { g: PracticeGame; seat: number; area: 'n' | 'w' | 'e' | 's' }) {
  const bid = g.bids[seat]
  const active = g.turn === seat && g.phase !== 'handover'
  const bidText = g.bidItself ? '' : bid === null ? (g.phase === 'bidding' ? 'Bid: ...' : '') : isNilBid(g, seat) ? 'Bid: Nil' : `Bid: ${bid}`
  return (
    <div className={`sp-seat sp-seat-${area} ${active ? 'is-active' : ''}`}>
      <span className="font-black text-sm">{NAMES[seat]}{g.dealer === seat && <span className="sp-dealer" title="Dealer">D</span>}</span>
      <span className="text-xs" style={{ color: 'var(--sp-muted)' }}>{bidText}{g.phase !== 'bidding' ? `${bidText ? ' · ' : ''}${g.won[seat]} won` : ''}</span>
      {seat !== 0 && <span className="text-xs" style={{ color: 'var(--sp-dim)' }}>{g.hands[seat].length} cards</span>}
    </div>
  )
}

function BidPanel({ g, setG }: { g: PracticeGame; setG: (fn: (x: PracticeGame | null) => PracticeGame | null) => void }) {
  const rs = ruleSet(g.rules)
  const advice = useMemo(() => botBid(g, 0), [g])
  const [bid, setBid] = useState<number | null>(g.learn ? advice.bid : null)
  const partner = g.bids[2]
  return (
    <div className="sp-card p-4 grid gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="sp-label">Your bid</p>
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>
          {partner === null ? 'Partner bids after you' : `Partner bid ${partner === 0 && rs.nil ? 'Nil' : partner}`}
        </p>
      </div>
      {g.learn && (
        <div className="sp-banner sp-banner-warn text-sm"><b>Suggested: {advice.nil ? 'Nil' : advice.bid}.</b> {advice.reason}</div>
      )}
      <NumberPad value={bid} onChange={setBid} label="Bid" />
      {rs.nil && <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>0 = Nil: +{rs.nilPoints} if you take no books, -{rs.nilPoints} if you take any.</p>}
      <button className="sp-btn sp-btn-gold sp-btn-block" disabled={bid === null} onClick={() => bid !== null && setG(x => (x ? keep(x, placeBid(x, 0, bid)) : x))}>
        {bid === null ? 'Pick a number' : `Bid ${bid === 0 && rs.nil ? 'Nil' : bid}`}
      </button>
    </div>
  )
}

function HandOver({ g, setG }: { g: PracticeGame; setG: (fn: (x: PracticeGame | null) => PracticeGame | null) => void }) {
  const r = g.lastResult
  if (!r) return null
  const rs = ruleSet(g.rules)
  const team = (t: TeamHandResult) => (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-black">{TEAM[t.side]}</span>
        <span className="sp-num font-black" style={{ color: t.points < 0 ? '#b3122a' : '#1d7a43' }}>{t.points > 0 ? '+' : ''}{t.points}</span>
      </div>
      {(g.learn ? t.lines : t.lines.slice(0, 1)).map((l, i) => <p key={i} className="text-sm" style={{ color: '#5c4f42' }}>{l}</p>)}
    </div>
  )
  const winnerText = (s: Side) => (s === 'a' ? 'You and your partner' : 'The other team')
  return (
    <div className="sp-card-paper p-4 grid gap-3">
      <p className="sp-label">Hand {r.handInGame}{g.gamesToWin > 1 ? `, game ${r.game}` : ''} is over</p>
      {team(r.a)}
      {team(r.b)}
      <div className="flex justify-between font-black sp-num" style={{ borderTop: '2px solid var(--sp-ink)', paddingTop: 8 }}>
        <span>Us {r.scoreA}</span><span>Them {r.scoreB}</span>
      </div>
      {g.matchWinner ? (
        <>
          <p className="sp-display text-2xl text-center">{g.matchWinner === 'a' ? 'You win!' : 'They win'}</p>
          <p className="text-center text-sm">{winnerText(g.matchWinner)} {g.gamesToWin > 1 ? `took the series ${Math.max(g.winsA, g.winsB)} to ${Math.min(g.winsA, g.winsB)}` : `reached ${rs.target} first`}.</p>
          <button className="sp-btn sp-btn-wine sp-btn-block" onClick={() => setG(x => (x ? newPractice({ rules: x.rules, learn: x.learn, gamesToWin: x.gamesToWin }) : x))}>Play again ({gameTypeLabel(g.gamesToWin).toLowerCase()})</button>
          <button className="sp-btn sp-btn-block" onClick={() => setG(() => null)}>Change rules</button>
        </>
      ) : (
        <>
          {r.gameWinner && <p className="sp-display text-xl text-center">{r.gameWinner === 'a' ? 'You won game' : 'They won game'} {r.game}. Series {g.winsA} to {g.winsB}.</p>}
          {!r.gameWinner && tiedAtTarget(g) && <p className="text-sm text-center font-bold">Tied past {rs.target}. Keep playing until one team leads.</p>}
          <button className="sp-btn sp-btn-gold sp-btn-block" onClick={() => setG(x => (x ? keep(x, nextHand(x)) : x))}>{r.gameWinner ? `Start game ${r.game + 1}` : 'Deal the next hand'}</button>
        </>
      )}
    </div>
  )
}

// ---------- a playing card ----------

function Card({ id, size = 'md', win = false }: { id: string; size?: 'md' | 'sm'; win?: boolean }) {
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
