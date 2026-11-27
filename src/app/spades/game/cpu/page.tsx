'use client'

// Play the computer. Runs entirely on this phone: nothing is sent to the
// server. A game in progress is kept in localStorage so a refresh picks up
// where you left off.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Shell, SpadeIcon } from '../../_components/ui'
import { CardTable } from '../../_components/CardTable'
import { LearnToggle, LengthPicker, RulesPicker } from '../../_components/GameOptions'
import { gameTypeLabel } from '@/lib/spades/quickgame'
import { collectTrick, isPracticeGame, newPractice, nextHand, placeBid, playCard, PRACTICE_KEY, type PracticeGame, type RuleSetId } from '@/lib/spades/cardgame'
import { botBid, botPlay } from '@/lib/spades/bots'

const NAMES = ['You', 'Left', 'Partner', 'Right']
const BOT_DELAY = 750
const TRICK_PAUSE = 1300
const TRICK_PAUSE_LEARN = 2600

type Setup = { rules: RuleSetId; learn: boolean; gamesToWin: number }

function keep(x: PracticeGame, r: PracticeGame | string): PracticeGame {
  return typeof r === 'string' ? x : r
}

export default function CpuGame() {
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

  if (!g) {
    return (
      <Shell badge={false}>
        <div className="sp-wrap-narrow grid gap-5">
          <header className="text-center">
            <SpadeIcon size={40} className="mx-auto" />
            <h1 className="sp-display text-4xl mt-2">Play the computer</h1>
            <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>You and a computer partner against two computer players. Nothing is saved or sent anywhere.</p>
          </header>
          <RulesPicker value={setup.rules} onChange={rules => setSetup({ ...setup, rules })} />
          <LearnToggle value={setup.learn} onChange={learn => setSetup({ ...setup, learn })} />
          <LengthPicker value={setup.gamesToWin} onChange={gamesToWin => setSetup({ ...setup, gamesToWin })} />
          <button className="sp-btn sp-btn-wine sp-btn-block" style={{ minHeight: 64, fontSize: 19 }} onClick={() => setG(newPractice(setup))}>Deal the cards</button>
          <Link href="/spades/game" className="sp-btn sp-btn-ghost sp-btn-block">Back</Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell badge={false}>
      <div className="sp-wrap-narrow grid gap-3">
        <div className="flex justify-end">
          <LearnToggle compact value={g.learn} onChange={learn => setG(x => (x ? { ...x, learn } : x))} />
        </div>
        <CardTable
          g={g}
          me={0}
          names={NAMES}
          handCounts={g.hands.map(h => h.length)}
          learn={g.learn}
          onBid={bid => setG(x => (x ? keep(x, placeBid(x, 0, bid)) : x))}
          onPlay={card => setG(x => (x ? keep(x, playCard(x, 0, card)) : x))}
          onNext={() => setG(x => (x ? keep(x, nextHand(x)) : x))}
          onTapTrick={() => setG(x => (x && x.trick.length === 4 ? keep(x, collectTrick(x)) : x))}
          endActions={
            <>
              <button className="sp-btn sp-btn-wine sp-btn-block" onClick={() => setG(x => (x ? newPractice({ rules: x.rules, learn: x.learn, gamesToWin: x.gamesToWin }) : x))}>Play again ({gameTypeLabel(g.gamesToWin).toLowerCase()})</button>
              <button className="sp-btn sp-btn-block" onClick={() => setG(null)}>Change rules</button>
            </>
          }
        />
        <button className="sp-btn sp-btn-ghost sp-btn-sm justify-self-center mt-2" onClick={() => { if (confirm('Leave this game? It will not be saved.')) setG(null) }}>Leave game</button>
      </div>
    </Shell>
  )
}
