'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Feedback, NumberPad, Shell } from '../_components/ui'
import {
  GAME_TYPES, QUICK_KEY, addHand, computeQuick, defaultSetup, gameTypeLabel, resultText, scoringSummary, seatName, seatTeam, undoHand,
  type QuickGame, type QuickSetup, type QuickState, type Side,
} from '@/lib/spades/quickgame'

// One-phone scorekeeper. Everything stays on this device: nothing is sent to
// the server. The game in progress is kept in this phone's localStorage so a
// refresh, a locked screen or a closed tab never loses the score. It is
// wiped when the players leave the finished game (Main menu or Rematch).
const KEY = QUICK_KEY
type Phase = 'setup' | 'dealer' | 'play'
interface Saved { phase: Phase; setup: QuickSetup; game: QuickGame | null }

export default function Scorekeeper() {
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [phase, setPhase] = useState<Phase>('setup')
  const [setup, setSetup] = useState<QuickSetup>(defaultSetup)
  const [game, setGame] = useState<QuickGame | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const s = JSON.parse(raw) as Saved
        if (s.setup) setSetup(s.setup)
        if (s.game) setGame(s.game)
        if (s.phase) setPhase(s.phase)
      }
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      if (game) localStorage.setItem(KEY, JSON.stringify({ phase, setup, game } satisfies Saved))
      else localStorage.removeItem(KEY)
    } catch {}
  }, [loaded, phase, setup, game])

  const mainMenu = () => {
    try { localStorage.removeItem(KEY) } catch {}
    router.push('/spades')
  }

  if (!loaded) return <Shell active="home" badge={false}><div /></Shell>

  return (
    <Shell active="home" badge={false}>
      <div className="sp-wrap-narrow grid gap-4">
        {phase === 'setup' && <SetupStep setup={setup} setSetup={setSetup} onNext={() => setPhase('dealer')} />}
        {phase === 'dealer' && (
          <DealerStep
            setup={setup}
            onBack={() => setPhase('setup')}
            onPick={seat => { setGame({ setup, firstDealer: seat, hands: [], startedAt: new Date().toISOString() }); setPhase('play') }}
          />
        )}
        {phase === 'play' && game && (
          <PlayStep
            game={game}
            setGame={setGame}
            onRematch={() => { setGame(null); setPhase('dealer') }}
            onEditSetup={() => { setGame(null); setPhase('setup') }}
            onMenu={mainMenu}
          />
        )}
      </div>
    </Shell>
  )
}

// ---------- setup ----------

function SetupStep({ setup, setSetup, onNext }: { setup: QuickSetup; setSetup: (s: QuickSetup) => void; onNext: () => void }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [customTarget, setCustomTarget] = useState(![250, 300, 500].includes(setup.target))
  const set = (patch: Partial<QuickSetup>) => setSetup({ ...setup, ...patch })
  const setPlayer = (i: number, v: string) => {
    const p = [...setup.players] as QuickSetup['players']
    p[i] = v
    set({ players: p })
  }

  const next = (e: React.FormEvent) => {
    e.preventDefault()
    const a = setup.teamA.trim()
    const b = setup.teamB.trim()
    if (!a || !b) return setMsg({ ok: false, text: 'Both teams need a name.' })
    if (a.toLowerCase() === b.toLowerCase()) return setMsg({ ok: false, text: 'Give the teams different names.' })
    if (!setup.target || setup.target < 10) return setMsg({ ok: false, text: 'Pick a score to play to.' })
    setSetup({ ...setup, teamA: a, teamB: b, players: setup.players.map(p => p.trim()) as QuickSetup['players'] })
    onNext()
  }

  const team = (side: Side) => {
    const seats = side === 'a' ? [0, 2] : [1, 3]
    return (
      <section className="sp-card p-4 grid gap-3">
        <h2 className="sp-display text-xl">{side === 'a' ? 'Team 1' : 'Team 2'}</h2>
        <label className="sp-field"><span>Team name (required)</span>
          <input className="sp-input" maxLength={30} autoComplete="off" required value={side === 'a' ? setup.teamA : setup.teamB} onChange={e => set(side === 'a' ? { teamA: e.target.value } : { teamB: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {seats.map((s, i) => (
            <label key={s} className="sp-field"><span>Player {i + 1} (optional)</span>
              <input className="sp-input" maxLength={24} autoComplete="off" value={setup.players[s]} onChange={e => setPlayer(s, e.target.value)} />
            </label>
          ))}
        </div>
      </section>
    )
  }

  const choice = (selected: boolean) => ({
    background: selected ? 'rgba(224,173,79,0.18)' : 'rgba(0,0,0,0.22)',
    border: `2px solid ${selected ? 'var(--sp-gold)' : 'transparent'}`,
  })

  return (
    <form onSubmit={next} className="grid gap-4" noValidate>
      <div>
        <h1 className="sp-display text-4xl">Keep score</h1>
        <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>One phone keeps score for the whole table. Nothing is saved after the game.</p>
      </div>
      {team('a')}
      {team('b')}

      <section className="sp-card p-4 grid gap-3">
        <h2 className="sp-display text-xl">Game type</h2>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Game type">
          {GAME_TYPES.map(t => (
            <button key={t.gamesToWin} type="button" role="radio" aria-checked={setup.gamesToWin === t.gamesToWin} onClick={() => set({ gamesToWin: t.gamesToWin })} className="p-3 rounded-xl font-black text-left" style={choice(setup.gamesToWin === t.gamesToWin)}>
              {t.label}
            </button>
          ))}
        </div>

        <span className="sp-label mt-1">Each game plays to</span>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Play to">
          {[250, 300, 500].map(n => (
            <button key={n} type="button" role="radio" aria-checked={!customTarget && setup.target === n} onClick={() => { setCustomTarget(false); set({ target: n }) }} className="p-3 rounded-xl font-black sp-num" style={choice(!customTarget && setup.target === n)}>{n}</button>
          ))}
          <button type="button" role="radio" aria-checked={customTarget} onClick={() => setCustomTarget(true)} className="p-3 rounded-xl font-black" style={choice(customTarget)}>Other</button>
        </div>
        {customTarget && (
          <label className="sp-field"><span>Points to win</span>
            <input className="sp-input" inputMode="numeric" value={setup.target || ''} onChange={e => set({ target: Number(e.target.value.replace(/\D/g, '').slice(0, 4)) || 0 })} />
          </label>
        )}
      </section>

      <section className="sp-card p-4 grid gap-3">
        <h2 className="sp-display text-xl">Scoring</h2>
        <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>10 points per book. The first hand of every game has no bidding: each team scores the books it takes.</p>
        <span className="sp-label">If a team gets set</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="If a team gets set">
          {[{ v: false, t: 'Score 0 for the hand' }, { v: true, t: 'Lose the bid (minus 10 per book)' }].map(o => (
            <button key={String(o.v)} type="button" role="radio" aria-checked={setup.setLoses === o.v} onClick={() => set({ setLoses: o.v })} className="p-3 rounded-xl font-bold text-left text-sm" style={choice(setup.setLoses === o.v)}>{o.t}</button>
          ))}
        </div>
        <span className="sp-label">Books over the bid</span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Books over the bid">
          {[{ v: 0, t: 'Earn nothing' }, { v: 1, t: '1 point each' }].map(o => (
            <button key={o.v} type="button" role="radio" aria-checked={setup.extraBookPoints === o.v} onClick={() => set({ extraBookPoints: o.v })} className="p-3 rounded-xl font-bold text-left text-sm" style={choice(setup.extraBookPoints === o.v)}>{o.t}</button>
          ))}
        </div>
      </section>

      <Feedback msg={msg} />
      <button className="sp-btn sp-btn-gold sp-btn-block" style={{ minHeight: 60, fontSize: 18 }}>Next: who deals first</button>
      <Link href="/spades" className="sp-btn sp-btn-ghost sp-btn-block">Main menu</Link>
    </form>
  )
}

// ---------- dealer ----------

// Seats around the table, clockwise from the top: partners sit across.
function TableSeats({ setup, highlight, onPick, label }: { setup: QuickSetup; highlight?: number | null; onPick?: (seat: number) => void; label?: (seat: number) => string | null }) {
  const pos = [
    { seat: 0, style: { gridColumn: '2', gridRow: '1' } },
    { seat: 1, style: { gridColumn: '3', gridRow: '2' } },
    { seat: 2, style: { gridColumn: '2', gridRow: '3' } },
    { seat: 3, style: { gridColumn: '1', gridRow: '2' } },
  ]
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1.2fr 1fr', gridTemplateRows: 'auto auto auto', alignItems: 'center' }}>
      <div className="rounded-2xl grid place-items-center text-xs font-bold sp-label" style={{ gridColumn: '2', gridRow: '2', minHeight: 90, background: 'rgba(76,194,122,0.12)', border: '2px solid rgba(76,194,122,0.35)' }}>Table</div>
      {pos.map(({ seat, style }) => {
        const team = seatTeam(seat) === 'a' ? setup.teamA : setup.teamB
        const on = highlight === seat
        const tag = label?.(seat)
        const body = (
          <>
            <span className="font-black leading-tight break-words">{seatName(setup, seat)}</span>
            <span className="text-xs" style={{ color: on ? 'var(--sp-ink)' : 'var(--sp-muted)' }}>{team}</span>
            {tag && <span className="text-[10px] font-black tracking-widest uppercase mt-1" style={{ color: on ? 'var(--sp-wine)' : 'var(--sp-gold)' }}>{tag}</span>}
          </>
        )
        const s: React.CSSProperties = {
          ...style, minHeight: 76, padding: 8, borderRadius: 14, display: 'grid', alignContent: 'center', textAlign: 'center',
          background: on ? 'var(--sp-gold)' : seatTeam(seat) === 'a' ? 'rgba(154,31,55,0.45)' : 'rgba(127,180,255,0.14)',
          color: on ? 'var(--sp-ink)' : 'var(--sp-cream)',
          border: `2px solid ${on ? 'var(--sp-gold)' : 'var(--sp-line)'}`,
        }
        return onPick ? (
          <button key={seat} type="button" onClick={() => onPick(seat)} style={s} aria-label={`${seatName(setup, seat)} deals first`}>{body}</button>
        ) : (
          <div key={seat} style={s}>{body}</div>
        )
      })}
    </div>
  )
}

function DealerStep({ setup, onPick, onBack }: { setup: QuickSetup; onPick: (seat: number) => void; onBack: () => void }) {
  const [seat, setSeat] = useState<number | null>(null)
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="sp-display text-4xl">Who deals first?</h1>
        <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>Seat everyone like this, partners across from each other, and tap the dealer. The deal moves to the left after every hand.</p>
      </div>
      <div className="sp-card p-4">
        <TableSeats setup={setup} highlight={seat} onPick={setSeat} label={s => (s === seat ? 'Deals first' : null)} />
      </div>
      <p className="text-sm text-center" style={{ color: 'var(--sp-muted)' }}>
        {gameTypeLabel(setup.gamesToWin)} · to {setup.target}
      </p>
      <button className="sp-btn sp-btn-gold sp-btn-block" style={{ minHeight: 60, fontSize: 18 }} disabled={seat === null} onClick={() => seat !== null && onPick(seat)}>
        {seat === null ? 'Tap the dealer' : `Start: ${seatName(setup, seat)} deals`}
      </button>
      <button className="sp-btn sp-btn-ghost sp-btn-block" onClick={onBack}>Back</button>
    </div>
  )
}

// ---------- play ----------

function Scoreboard({ game, st }: { game: QuickGame; st: QuickState }) {
  const s = game.setup
  const series = s.gamesToWin > 1
  const side = (k: Side) => {
    const total = k === 'a' ? st.current.totalA : st.current.totalB
    const wins = k === 'a' ? st.winsA : st.winsB
    return (
      <div className="p-3 rounded-xl text-center grid gap-1" style={{ background: k === 'a' ? 'rgba(154,31,55,0.4)' : 'rgba(127,180,255,0.12)' }}>
        <div className="font-black leading-tight break-words">{k === 'a' ? s.teamA : s.teamB}</div>
        <div className="sp-display sp-num" style={{ fontSize: 48 }} aria-label={`${total} points`}>{total}</div>
        {series && (
          <div className="flex justify-center gap-1" aria-label={`${wins} games won`}>
            {Array.from({ length: s.gamesToWin }, (_, i) => <span key={i} className="sp-dot" style={{ width: 12, height: 12, background: i < wins ? 'var(--sp-gold)' : 'rgba(243,231,207,0.18)' }} />)}
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="sp-card p-3 grid gap-2">
      <div className="flex justify-between items-center px-1">
        <span className="sp-label">{series ? `Game ${st.currentGame} · ${gameTypeLabel(s.gamesToWin)}` : 'One game'}</span>
        <span className="sp-label">To {s.target}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">{side('a')}{side('b')}</div>
    </div>
  )
}

function PlayStep({ game, setGame, onRematch, onEditSetup, onMenu }: { game: QuickGame; setGame: (g: QuickGame) => void; onRematch: () => void; onEditSetup: () => void; onMenu: () => void }) {
  const st = useMemo(() => computeQuick(game), [game])
  const s = game.setup

  if (st.done) return <Results game={game} st={st} onRematch={onRematch} onEditSetup={onEditSetup} onMenu={onMenu} onUndo={() => setGame(undoHand(game))} />

  const justWon = st.nextIsFirstHand && st.games.length > 0 ? st.games[st.games.length - 1] : null

  return (
    <div className="grid gap-4">
      <Scoreboard game={game} st={st} />
      {justWon?.winner && (
        <div className="sp-banner sp-banner-ok text-center">
          Game {justWon.game} goes to {justWon.winner === 'a' ? s.teamA : s.teamB}, {justWon.totalA} to {justWon.totalB}. Scores reset for game {st.currentGame}.
        </div>
      )}
      {st.tiedAtTarget && <div className="sp-banner sp-banner-warn text-center">Tied at {st.current.totalA}. Play another hand.</div>}
      <HandEntry key={game.hands.length} game={game} st={st} onSave={setGame} />
      <History game={game} st={st} onUndo={() => setGame(undoHand(game))} />
      <button
        className="sp-btn sp-btn-ghost sp-btn-block"
        onClick={() => {
          if (!confirm('Quit this game? The score is erased and cannot be brought back.')) return
          if (prompt('Type QUIT to erase the score') !== 'QUIT') return
          onMenu()
        }}
      >
        Quit game (erases the score)
      </button>
      <p className="text-xs text-center" style={{ color: 'var(--sp-dim)' }}>The score is kept on this phone until the game ends, even if you close the page. Open Keep score again to pick up where you left off.</p>
    </div>
  )
}

function HandEntry({ game, st, onSave }: { game: QuickGame; st: QuickState; onSave: (g: QuickGame) => void }) {
  const s = game.setup
  const first = st.nextIsFirstHand
  const [dealer, setDealer] = useState(st.nextDealer)
  const [changingDealer, setChangingDealer] = useState(false)
  const [step, setStep] = useState<'bids' | 'books'>(first ? 'books' : 'bids')
  const [bidA, setBidA] = useState<number | null>(null)
  const [bidB, setBidB] = useState<number | null>(null)
  const [countSide, setCountSide] = useState<Side>('a')
  const [books, setBooks] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const handNo = st.current.rows.length + 1
  const leader = (dealer + 1) % 4
  const name = (k: Side) => (k === 'a' ? s.teamA : s.teamB)
  const booksA = books === null ? null : countSide === 'a' ? books : 13 - books

  const save = () => {
    if (booksA === null) return setMsg({ ok: false, text: 'Tap how many books.' })
    const r = addHand(game, { bidA, bidB, booksA, dealer })
    if (typeof r === 'string') return setMsg({ ok: false, text: r })
    onSave(r)
  }

  return (
    <section className="sp-card-paper p-4 grid gap-4" aria-label={`Hand ${handNo}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="sp-display text-2xl">Hand {handNo}</h2>
          <p className="text-sm mt-1"><b>{seatName(s, dealer)}</b> deals. <b>{seatName(s, leader)}</b> {first ? 'leads' : 'bids and leads'} first.</p>
        </div>
        <button type="button" className="sp-btn sp-btn-sm" onClick={() => setChangingDealer(x => !x)}>{changingDealer ? 'Done' : 'Change dealer'}</button>
      </div>
      {changingDealer && (
        <div className="p-3 rounded-xl" style={{ background: 'var(--sp-ink)' }}>
          <TableSeats setup={s} highlight={dealer} onPick={x => { setDealer(x); setChangingDealer(false) }} label={x => (x === dealer ? 'Dealer' : null)} />
        </div>
      )}

      {first && <div className="rounded-xl p-3 text-sm font-bold" style={{ background: 'rgba(224,173,79,0.25)' }}>First hand: no bidding. The books bid themselves, so each team scores 10 for every book it takes.</div>}

      {step === 'bids' ? (
        <>
          {(['a', 'b'] as Side[]).map(k => (
            <div key={k} className="grid gap-2">
              <span className="sp-label">{name(k)} bid</span>
              <div className="rounded-xl p-2" style={{ background: 'var(--sp-ink)' }}>
                <NumberPad label={`${name(k)} bid`} value={k === 'a' ? bidA : bidB} onChange={n => (k === 'a' ? setBidA(n) : setBidB(n))} />
              </div>
            </div>
          ))}
          <button className="sp-btn sp-btn-gold sp-btn-block" disabled={bidA === null || bidB === null} onClick={() => { setMsg(null); setStep('books') }}>
            {bidA === null || bidB === null ? 'Enter both bids' : `Bids in: ${bidA} and ${bidB}. Play the hand`}
          </button>
        </>
      ) : (
        <>
          {!first && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>Bids: <b>{s.teamA} {bidA}</b> · <b>{s.teamB} {bidB}</b></span>
              <button type="button" className="underline font-bold" onClick={() => setStep('bids')}>Change bids</button>
            </div>
          )}
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="sp-label">Books {name(countSide)} took</span>
              <button type="button" className="text-xs underline font-bold" onClick={() => { setCountSide(countSide === 'a' ? 'b' : 'a'); setBooks(null) }}>
                Count {name(countSide === 'a' ? 'b' : 'a')} instead
              </button>
            </div>
            <div className="rounded-xl p-2" style={{ background: 'var(--sp-ink)' }}>
              <NumberPad label={`Books ${name(countSide)} took`} value={books} onChange={setBooks} />
            </div>
            {booksA !== null && (
              <div className="grid grid-cols-2 gap-2 text-center">
                {(['a', 'b'] as Side[]).map(k => {
                  const b = k === 'a' ? booksA : 13 - booksA
                  const bid = first ? null : k === 'a' ? bidA : bidB
                  const made = bid === null || b >= bid
                  return (
                    <div key={k} className="rounded-xl p-2" style={{ background: made ? 'rgba(76,194,122,0.2)' : 'rgba(255,90,78,0.2)' }}>
                      <div className="text-xs font-bold">{name(k)}</div>
                      <div className="sp-display sp-num text-2xl">{b} books</div>
                      <div className="text-xs font-bold">{bid === null ? '' : made ? 'Made it' : 'Set'}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <Feedback msg={msg} />
          <button className="sp-btn sp-btn-gold sp-btn-block" style={{ minHeight: 56 }} disabled={booksA === null} onClick={save}>Save hand</button>
        </>
      )}
    </section>
  )
}

function History({ game, st, onUndo }: { game: QuickGame; st: QuickState; onUndo: () => void }) {
  const s = game.setup
  if (!game.hands.length) return null
  const rows = st.current.rows.length ? st.current.rows : st.games[st.games.length - 1]?.rows || []
  const fmt = (r: { bid: number | null; books: number; points: number; made: boolean }) => (
    <span>
      <span className="sp-num">{r.bid === null ? '' : `${r.bid} bid, `}{r.books} took</span>
      <b className="sp-num ml-1" style={{ color: r.points > 0 ? 'var(--sp-green)' : r.points < 0 ? 'var(--sp-red)' : 'var(--sp-muted)' }}>{r.points > 0 ? '+' : ''}{r.points}</b>
    </span>
  )
  return (
    <section className="sp-card p-4 grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="sp-display text-xl">Hands{s.gamesToWin > 1 && st.current.rows.length ? ` · game ${st.currentGame}` : ''}</h2>
        <button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => { if (confirm('Take back the last hand?')) onUndo() }}>Undo last hand</button>
      </div>
      {rows.length > 0 && (
        <div className="sp-scroll">
          <table className="sp-table">
            <thead><tr><th>#</th><th>{s.teamA}</th><th>{s.teamB}</th><th className="text-right">Score</th></tr></thead>
            <tbody>
              {[...rows].reverse().map(r => (
                <tr key={r.index}>
                  <td className="sp-num">{r.handInGame}</td>
                  <td className="text-sm">{fmt(r.a)}</td>
                  <td className="text-sm">{fmt(r.b)}</td>
                  <td className="sp-num text-right font-black whitespace-nowrap">{r.totalA} · {r.totalB}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// ---------- results ----------

function cssFont(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback
  const root = document.querySelector('.sp-root')
  const v = root ? getComputedStyle(root).getPropertyValue(name).trim() : ''
  return v ? `${v}, ${fallback}` : fallback
}

async function resultImage(game: QuickGame, st: QuickState): Promise<Blob | null> {
  const s = game.setup
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  if (!ctx) return null
  try { await document.fonts?.ready } catch {}
  const display = cssFont('--sp-font-display', 'Impact, sans-serif')
  const body = cssFont('--sp-font-body', 'system-ui, sans-serif')

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#6e1426')
  bg.addColorStop(1, '#14090b')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#e0ad4f'
  ctx.lineWidth = 10
  ctx.strokeRect(40, 40, W - 80, H - 80)

  const fit = (text: string, size: number, font: string, max: number) => {
    let sz = size
    ctx.font = `${sz}px ${font}`
    while (ctx.measureText(text).width > max && sz > 20) { sz -= 4; ctx.font = `${sz}px ${font}` }
  }
  ctx.textAlign = 'center'
  ctx.fillStyle = '#e0ad4f'
  ctx.font = `40px ${display}`
  ctx.fillText('SPADES HQ', W / 2, 140)
  ctx.fillStyle = '#c2ad90'
  ctx.font = `600 30px ${body}`
  ctx.fillText(new Date(game.startedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), W / 2, 190)

  const winnerName = st.winner === 'a' ? s.teamA : s.teamB
  ctx.fillStyle = '#f3e7cf'
  ctx.font = `44px ${display}`
  ctx.fillText('WINNER', W / 2, 320)
  ctx.fillStyle = '#e0ad4f'
  fit(winnerName.toUpperCase(), 110, display, W - 180)
  ctx.fillText(winnerName.toUpperCase(), W / 2, 450)

  ctx.fillStyle = '#f3e7cf'
  ctx.font = `600 34px ${body}`
  const sub = s.gamesToWin > 1 ? `Series ${Math.max(st.winsA, st.winsB)} to ${Math.min(st.winsA, st.winsB)} · ${gameTypeLabel(s.gamesToWin)}` : `One game to ${s.target}`
  ctx.fillText(sub, W / 2, 520)

  let y = 640
  const rowH = st.games.length > 4 ? 120 : 150
  for (const gm of st.games) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(120, y - 70, W - 240, rowH - 24)
    if (s.gamesToWin > 1) {
      ctx.fillStyle = '#c2ad90'
      ctx.font = `700 24px ${body}`
      ctx.fillText(`GAME ${gm.game}`, W / 2, y - 36)
    }
    ctx.font = `${s.gamesToWin > 1 ? 48 : 60}px ${display}`
    ctx.textAlign = 'right'
    ctx.fillStyle = gm.winner === 'a' ? '#e0ad4f' : '#f3e7cf'
    ctx.fillText(String(gm.totalA), W / 2 - 40, y + 20)
    ctx.textAlign = 'left'
    ctx.fillStyle = gm.winner === 'b' ? '#e0ad4f' : '#f3e7cf'
    ctx.fillText(String(gm.totalB), W / 2 + 40, y + 20)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#c2ad90'
    ctx.fillText('-', W / 2, y + 16)
    y += rowH
  }

  ctx.font = `700 30px ${body}`
  ctx.textAlign = 'right'
  ctx.fillStyle = '#f3e7cf'
  const colY = y + 10
  fit(s.teamA, 34, `700 ${body}`, W / 2 - 160)
  ctx.fillText(s.teamA, W / 2 - 40, colY)
  ctx.textAlign = 'left'
  fit(s.teamB, 34, `700 ${body}`, W / 2 - 160)
  ctx.fillText(s.teamB, W / 2 + 40, colY)
  ctx.textAlign = 'center'
  const names = (seats: number[]) => seats.map(x => s.players[x]).filter(Boolean).join(' & ')
  ctx.fillStyle = '#c2ad90'
  ctx.font = `500 24px ${body}`
  ctx.textAlign = 'right'
  ctx.fillText(names([0, 2]), W / 2 - 40, colY + 40)
  ctx.textAlign = 'left'
  ctx.fillText(names([1, 3]), W / 2 + 40, colY + 40)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#e0ad4f'
  ctx.font = `30px ${display}`
  ctx.fillText('POWERED BY DJ MASKOFF', W / 2, H - 130)
  ctx.fillStyle = '#c2ad90'
  ctx.font = `600 26px ${body}`
  ctx.fillText('orcafin.app/spades', W / 2, H - 85)

  return new Promise(res => c.toBlob(b => res(b), 'image/png'))
}

function Results({ game, st, onRematch, onEditSetup, onMenu, onUndo }: { game: QuickGame; st: QuickState; onRematch: () => void; onEditSetup: () => void; onMenu: () => void; onUndo: () => void }) {
  const s = game.setup
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const text = resultText(game, st)
  const winner = st.winner === 'a' ? s.teamA : s.teamB
  const fileName = `spades-${s.teamA}-vs-${s.teamB}.png`.replace(/[^\w.-]+/g, '-').toLowerCase()

  const share = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const blob = await resultImage(game, st)
      const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text, title: 'Spades results' })
      else if (navigator.share) await navigator.share({ text, title: 'Spades results' })
      else { await navigator.clipboard.writeText(text); setMsg({ ok: true, text: 'Results copied. Paste them anywhere.' }) }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setMsg({ ok: false, text: 'Could not share. Try Save image or Copy text.' })
    }
    setBusy(false)
  }

  const save = async () => {
    setBusy(true)
    const blob = await resultImage(game, st)
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      setMsg({ ok: true, text: 'Image saved to your downloads.' })
    } else setMsg({ ok: false, text: 'Could not make the image on this phone.' })
    setBusy(false)
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setMsg({ ok: true, text: 'Results copied.' }) } catch { prompt('Copy this', text) }
  }

  return (
    <div className="grid gap-4">
      <div className="sp-card-paper p-6 text-center grid gap-2">
        <p className="sp-label">{s.gamesToWin > 1 ? 'Series winner' : 'Winner'}</p>
        <h1 className="sp-display break-words" style={{ fontSize: 'clamp(36px, 11vw, 60px)' }}>{winner}</h1>
        <p className="font-bold">{s.gamesToWin > 1 ? `Won ${Math.max(st.winsA, st.winsB)} to ${Math.min(st.winsA, st.winsB)} · ${gameTypeLabel(s.gamesToWin)}` : `${st.games[0]?.totalA} to ${st.games[0]?.totalB}`}</p>
      </div>

      <section className="sp-card p-4 grid gap-2">
        {st.games.map(gm => (
          <div key={gm.game} className="flex items-center justify-between gap-2 py-1" style={{ borderBottom: '1px solid rgba(243,231,207,0.08)' }}>
            <span className="sp-label">{s.gamesToWin > 1 ? `Game ${gm.game}` : 'Final'}</span>
            <span className="sp-num font-bold text-right">
              <span style={{ color: gm.winner === 'a' ? 'var(--sp-gold)' : undefined }}>{s.teamA} {gm.totalA}</span>
              <span style={{ color: 'var(--sp-muted)' }}> · </span>
              <span style={{ color: gm.winner === 'b' ? 'var(--sp-gold)' : undefined }}>{s.teamB} {gm.totalB}</span>
            </span>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-3 gap-2">
        <button className="sp-btn sp-btn-gold" disabled={busy} onClick={share}>Share</button>
        <button className="sp-btn" disabled={busy} onClick={save}>Save image</button>
        <button className="sp-btn" disabled={busy} onClick={copy}>Copy text</button>
      </div>
      <Feedback msg={msg} />

      <button className="sp-btn sp-btn-wine sp-btn-block" style={{ minHeight: 60, fontSize: 18 }} onClick={onRematch}>Rematch</button>
      <button className="sp-btn sp-btn-block" onClick={() => { if (confirm('Leave this game? The results are not saved anywhere.')) onMenu() }}>Main menu</button>
      <div className="flex justify-center gap-4 text-sm" style={{ color: 'var(--sp-muted)' }}>
        <button className="underline" onClick={onEditSetup}>New teams or rules</button>
        <button className="underline" onClick={() => { if (confirm('Take back the last hand? The game picks up again.')) onUndo() }}>Undo last hand</button>
      </div>
      <p className="text-xs text-center" style={{ color: 'var(--sp-dim)' }}>{scoringSummary(s)}.</p>
    </div>
  )
}
