'use client'

import { useEffect, useState } from 'react'
import { Feedback, MatchTimer, NumberPad, StatusChip } from './ui'
import type { ActResult } from './useSpades'

type Act = (action: string, payload?: Record<string, unknown>) => Promise<ActResult>
type Msg = { ok: boolean; text: string } | null

const SEAT_NAMES = ['North', 'East', 'South', 'West']

function useBusy(act: Act) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const run = async (action: string, payload: Record<string, unknown>, okText?: string) => {
    if (busy) return false
    setBusy(true)
    setMsg(null)
    const r = await act(action, payload)
    setBusy(false)
    setMsg(r.ok ? (okText ? { ok: true, text: okText } : null) : { ok: false, text: r.error || 'Failed' })
    return r.ok
  }
  return { busy, msg, setMsg, run }
}

export function MatchPanel({ d, act, serverNow }: { d: any; act: Act; serverNow: () => number }) {
  const m = d.match
  const c = d.current
  const v = d.viewer
  const names = { a: d.teamA?.name || 'TBD', b: d.teamB?.name || 'TBD' }
  return (
    <div className="grid gap-4">
      <Scoreboard d={d} names={names} serverNow={serverNow} />
      {m.status === 'paused' && <div className="sp-banner sp-banner-warn">Match paused by tournament staff. The clock is stopped.</div>}
      {m.status === 'completed' && (
        <div className="sp-banner sp-banner-info">
          Match complete. {m.winner === d.teamA?.id ? names.a : names.b} wins {Math.max(m.scoreA, m.scoreB)} to {Math.min(m.scoreA, m.scoreB)}. Waiting for the tournament director to make it official.
        </div>
      )}
      {m.status === 'final' && v.level !== 'staff' && <a href="/spades" className="sp-btn sp-btn-sm sp-btn-ghost justify-self-start">Back to home</a>}
      {m.status === 'final' && (
        <div className="sp-banner sp-banner-ok">
          Final: {m.winner === d.teamA?.id ? names.a : names.b} advances.{m.resultKind && m.resultKind !== 'played' ? ` (${m.resultKind === 'dq' ? 'disqualification' : m.resultKind})` : ''}{m.resultNote && m.resultKind !== 'played' ? ` ${m.resultNote}` : ''}
        </div>
      )}
      {c && <HandPanel d={d} act={act} names={names} />}
      {v.canSupervise && <StaffTools d={d} act={act} names={names} />}
      <History d={d} names={names} />
      {d.disputes?.length > 0 && <DisputeList d={d} />}
      {v.level === 'player' && m.status !== 'final' && !m.rules?.selfServe && <RaiseDispute d={d} act={act} />}
    </div>
  )
}

function Scoreboard({ d, names, serverNow }: { d: any; names: { a: string; b: string }; serverNow: () => number }) {
  const m = d.match
  const v = d.viewer
  const col = (side: 'a' | 'b') => {
    const mine = v.side === side
    const won = m.winner && m.winner === (side === 'a' ? d.teamA?.id : d.teamB?.id)
    return (
      <div className="p-4 rounded-xl" style={{ background: mine ? 'rgba(224,173,79,0.12)' : 'rgba(0,0,0,0.2)', border: `2px solid ${won ? 'var(--sp-gold)' : mine ? 'rgba(224,173,79,0.5)' : 'transparent'}` }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="sp-label">{side === 'a' ? 'Team A' : 'Team B'}{mine ? ' · You' : ''}</span>
          {won && <span className="sp-chip sp-chip-warn">Winner</span>}
        </div>
        <div className="font-black text-lg leading-tight break-words">{names[side]}</div>
        {(side === 'a' ? d.teamA : d.teamB)?.players?.length > 0 && (
          <div className="text-xs mt-1" style={{ color: 'var(--sp-muted)' }}>
            {(side === 'a' ? d.teamA : d.teamB).players.map((p: any) => `${p.name}${p.isCaptain ? ' (C)' : ''}`).join(' & ')}
          </div>
        )}
        <div className="sp-display sp-num mt-2" style={{ fontSize: 52 }} aria-label={`${names[side]} score`}>{side === 'a' ? m.scoreA : m.scoreB}</div>
        {(m.rules?.bagsEnabled || m.gamesToWin > 1) && (<div className="text-sm sp-num" style={{ color: 'var(--sp-muted)' }}>{m.rules?.bagsEnabled && <>Bags <b style={{ color: 'var(--sp-cream)' }}>{side === 'a' ? m.bagsA : m.bagsB}</b></>}{m.gamesToWin > 1 && <> · Games won <b style={{ color: 'var(--sp-gold)' }}>{side === 'a' ? m.gamesA : m.gamesB}</b></>}</div>)}
      </div>
    )
  }
  return (
    <section className="sp-card p-4" aria-label="Scoreboard">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="sp-label">{m.roundName}{m.gamesToWin > 1 ? ` · Game ${m.currentGame}` : ''}</span>
          {d.table && <span className="sp-chip sp-chip-info">Table {d.table.number}</span>}
          <StatusChip label={m.label} />
        </div>
        <div className="text-right">
          <div className="sp-label">Time left</div>
          <MatchTimer m={m} serverNow={serverNow} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">{col('a')}{col('b')}</div>
      <div className="flex flex-wrap justify-between gap-2 mt-3 text-xs" style={{ color: 'var(--sp-muted)' }}>
        <span>{m.gamesToWin > 1 ? 'Each game to' : 'Playing to'} <b style={{ color: 'var(--sp-cream)' }}>{m.target}</b>{m.gamesToWin > 1 ? ` · first to ${m.gamesToWin} games` : ''}</span>
        {v.control && <span>{v.control === 'captain' ? 'Your captain enters both bids' : 'Each player enters their own bid'}</span>}
        {d.table?.supervisor && <span>Supervisor: {d.table.supervisor}</span>}
      </div>
    </section>
  )
}

function SeatList({ c, names }: { c: any; names: { a: string; b: string } }) {
  return (
    <ul className="grid gap-2">
      {c.seats.map((s: any) => (
        <li key={s.pos} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
          <div className="min-w-0">
            <div className="text-xs sp-label">{SEAT_NAMES[s.pos]} · {s.side === 'a' ? names.a : names.b}</div>
            <div className="font-bold truncate">
              {s.name || (s.side === 'a' ? 'Team A player' : 'Team B player')}{s.isCaptain ? ' (C)' : ''}
              {c.dealerPos === s.pos && <span className="sp-chip sp-chip-dim ml-2">Dealer</span>}
              {c.leadPos === s.pos && <span className="sp-chip sp-chip-info ml-2">Leads</span>}
              {c.nextToBid === s.pos && <span className="sp-chip sp-chip-warn ml-2">Bidding now</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            {s.bid !== null ? <span className="sp-display sp-num text-2xl">{s.bid}</span> : s.submitted ? <span className="sp-chip sp-chip-live">Bid in</span> : <span className="sp-chip sp-chip-dim">Waiting</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function HandPanel({ d, act, names }: { d: any; act: Act; names: { a: string; b: string } }) {
  const c = d.current
  const v = d.viewer
  const m = d.match
  const live = m.status === 'live'
  const oneMode = m.rules?.scorekeeping === 'one'
  const keeper = oneMode && v.level === 'player' && v.isCaptain
  const readyCount = (side: 'a' | 'b') => c.seats.filter((s: any) => s.side === side && s.submitted).length
  return (
    <section className="sp-card p-4 grid gap-4" aria-label={`Hand ${c.handNumber}`} id="hand">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="sp-display text-2xl">Hand {c.handNumber}{c.isTiebreak && <span className="sp-chip sp-chip-warn ml-2 align-middle">Tiebreaker</span>}</h2>
        <span className="text-sm" style={{ color: 'var(--sp-muted)' }}>
          {c.status === 'bidding' ? `Bids in: ${names.a} ${readyCount('a')}/2 · ${names.b} ${readyCount('b')}/2` : c.locked ? `Bids: ${names.a} ${c.teamBid.a ?? '?'} · ${names.b} ${c.teamBid.b ?? '?'}` : ''}
        </span>
      </div>
      {c.status === 'bidding' && <SeatList c={c} names={names} />}
      {c.status === 'bidding' && v.level === 'player' && live && (keeper ? <KeeperBids d={d} act={act} names={names} /> : oneMode ? <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>The scorekeeper enters every bid.</p> : v.control === 'captain' ? <CaptainBid d={d} act={act} /> : <MyBid d={d} act={act} />)}
      {c.status !== 'bidding' && <LockedBids d={d} names={names} />}
      {c.status === 'playing' && (
        <div className="sp-banner sp-banner-info text-sm">
          Bids are locked. Play all 13 books. When the hand is over, each captain enters the books on their side.
          {c.reports && (c.reports.a || c.reports.b) && ` Reports in: ${c.reports.a ? names.a : ''}${c.reports.a && c.reports.b ? ' and ' : ''}${c.reports.b ? names.b : ''}.`}
        </div>
      )}
      {c.renegeTeamId && <div className="sp-banner sp-banner-bad text-sm">Supervisor ruling: renege by {c.renegeTeamId === d.teamA?.id ? names.a : names.b}. Renege scoring applies to this hand.</div>}
      {c.status === 'disputed' && (
        <div className="sp-banner sp-banner-bad text-sm" role="alert">
          The books do not add up to 13. {c.reports?.a && !c.reports.a.hidden && `${names.a} entered ${c.reports.a.booksA}. `}
          {c.reports?.b && !c.reports.b.hidden && `${names.b} entered ${c.reports.b.booksB}. `}
          Recount the books on each side and enter them again. A supervisor can also settle it.
        </div>
      )}
      {c.status === 'review' && c.provisional && <Provisional d={d} names={names} />}
      {['playing', 'disputed', 'review'].includes(c.status) && v.level === 'player' && v.isCaptain && live && (keeper ? <KeeperBooks d={d} act={act} names={names} /> : <ReportBooks d={d} act={act} names={names} />)}
      {c.status === 'review' && v.level === 'player' && v.isCaptain && live && <ApproveHand d={d} act={act} />}
      {v.level === 'player' && !v.isCaptain && !oneMode && c.status !== 'bidding' && (
        <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Your captain reports books and confirms each hand.</p>
      )}
    </section>
  )
}

function LockedBids({ d, names }: { d: any; names: { a: string; b: string } }) {
  const c = d.current
  return (
    <div className="grid grid-cols-2 gap-3">
      {(['a', 'b'] as const).map(side => (
        <div key={side} className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
          <div className="sp-label">{names[side]} bid</div>
          <div className="sp-display sp-num text-4xl">{c.teamBid[side] ?? '?'}</div>
          <div className="text-xs" style={{ color: 'var(--sp-muted)' }}>
            {c.seats.filter((s: any) => s.side === side).map((s: any) => `${s.name || 'Player'} ${s.bid ?? '?'}`).join(' · ')}
          </div>
        </div>
      ))}
    </div>
  )
}

function MyBid({ d, act }: { d: any; act: Act }) {
  const c = d.current
  const v = d.viewer
  const rules = d.match.rules
  const me = c.seats.find((s: any) => s.playerId === v.playerId)
  const partner = c.seats.find((s: any) => s.side === me?.side && s.playerId !== v.playerId)
  const [val, setVal] = useState<number | null>(me?.bid ?? null)
  const { busy, msg, run } = useBusy(act)
  useEffect(() => { setVal(me?.bid ?? null) }, [c.id]) // new hand clears the pad
  if (!me) return null
  const myTurn = d.match.bidOrder !== 'sequential' || c.nextToBid === me.pos || me.submitted
  const minFor = (n: number) => partner && partner.bid !== null && n + partner.bid < rules.minTeamBid
  return (
    <div className="grid gap-3 p-3 rounded-xl" style={{ border: '2px solid var(--sp-gold)' }}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-black text-lg">{me.submitted ? `Your bid: ${me.bid}` : 'Enter your bid'}</h3>
        {partner && <span className="text-sm" style={{ color: 'var(--sp-muted)' }}>Partner {partner.name}: {partner.bid !== null ? <b style={{ color: 'var(--sp-cream)' }}>{partner.bid}</b> : partner.submitted ? 'in' : 'waiting'}</span>}
      </div>
      {!myTurn ? (
        <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Bids go around the table in order. You are up after the players before you.</p>
      ) : (
        <>
          <NumberPad label="Your bid" value={val} onChange={setVal} isDisabled={minFor} />
          <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>Your team needs at least {rules.minTeamBid} combined. No nil.</p>
          <button
            className="sp-btn sp-btn-gold sp-btn-block"
            disabled={busy || val === null || val === me.bid}
            onClick={() => run('bid', { handId: c.id, bids: [{ playerId: me.playerId, bid: val }] }, 'Bid saved')}
          >
            {busy ? 'Sending' : me.submitted ? `Change my bid to ${val ?? ''}` : `Lock in ${val ?? ''}`}
          </button>
        </>
      )}
      <Feedback msg={msg} />
      {v.isCaptain && partner && !partner.submitted && (
        <details>
          <summary className="text-sm font-bold" style={{ color: 'var(--sp-muted)' }}>Partner not here? Enter both bids yourself</summary>
          <div className="mt-2"><CaptainBid d={d} act={act} /></div>
        </details>
      )}
    </div>
  )
}

function CaptainBid({ d, act }: { d: any; act: Act }) {
  const c = d.current
  const v = d.viewer
  const rules = d.match.rules
  const mine = c.seats.filter((s: any) => s.side === v.side)
  const [vals, setVals] = useState<(number | null)[]>(mine.map((s: any) => s.bid))
  const { busy, msg, run } = useBusy(act)
  useEffect(() => { setVals(mine.map((s: any) => s.bid)) }, [c.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!v.isCaptain) {
    const cap = mine.find((s: any) => s.isCaptain)
    return <p className="text-sm p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>Your captain {cap?.name} enters both bids for your team this match.</p>
  }
  const total = vals[0] !== null && vals[1] !== null ? (vals[0] as number) + (vals[1] as number) : null
  const submitted = mine.every((s: any) => s.submitted)
  return (
    <div className="grid gap-4 p-3 rounded-xl" style={{ border: '2px solid var(--sp-gold)' }}>
      <h3 className="font-black text-lg">{submitted ? 'Team bids entered' : 'Enter both partner bids'}</h3>
      {mine.map((s: any, i: number) => (
        <div key={s.pos} className="grid gap-2">
          <div className="flex justify-between"><span className="font-bold">{s.name}</span><span className="sp-num font-black">{vals[i] ?? '?'}</span></div>
          <NumberPad label={`${s.name} bid`} value={vals[i]} onChange={n => setVals(vs => vs.map((x, j) => (j === i ? n : x)))} />
        </div>
      ))}
      <div className="flex items-center justify-between">
        <span className="sp-label">Combined team bid</span>
        <span className="sp-display sp-num text-3xl" style={{ color: total !== null && total < rules.minTeamBid ? 'var(--sp-red)' : 'var(--sp-cream)' }}>{total ?? '?'}</span>
      </div>
      {total !== null && total < rules.minTeamBid && <p className="text-sm" style={{ color: 'var(--sp-red)' }}>Team must bid at least {rules.minTeamBid}.</p>}
      <button
        className="sp-btn sp-btn-gold sp-btn-block"
        disabled={busy || total === null || total < rules.minTeamBid || (submitted && mine.every((s: any, i: number) => s.bid === vals[i]))}
        onClick={() => run('bid', { handId: c.id, bids: mine.map((s: any, i: number) => ({ playerId: s.playerId, bid: vals[i] })) }, 'Team bids saved')}
      >
        {busy ? 'Sending' : submitted ? 'Update team bids' : `Lock in team bid ${total ?? ''}`}
      </button>
      <Feedback msg={msg} />
    </div>
  )
}

function ReportBooks({ d, act, names }: { d: any; act: Act; names: { a: string; b: string } }) {
  const c = d.current
  const v = d.viewer
  const side: 'a' | 'b' = v.side
  const mineRep = c.reports?.[side]
  const myBooks = mineRep && !mineRep.hidden ? (side === 'a' ? mineRep.booksA : mineRep.booksB) : null
  const [val, setVal] = useState<number | null>(myBooks)
  const { busy, msg, run } = useBusy(act)
  useEffect(() => { setVal(myBooks) }, [c.id, myBooks])
  const other = side === 'a' ? 'b' : 'a'
  const send = () => {
    if (val === null) return
    const booksA = side === 'a' ? val : 13 - val
    run('report', { handId: c.id, booksA, booksB: 13 - booksA }, 'Books reported')
  }
  return (
    <div className="grid gap-3 p-3 rounded-xl" style={{ border: '2px solid var(--sp-gold)' }}>
      <h3 className="font-black text-lg">{mineRep ? `You entered ${myBooks} books` : 'Hand over? Count the books on your side'}</h3>
      <NumberPad label="Books on our side" value={val} onChange={setVal} />
      <button className="sp-btn sp-btn-gold sp-btn-block" disabled={busy || val === null || val === myBooks} onClick={send}>
        {busy ? 'Sending' : val === null ? 'Pick a number' : mineRep ? `Change to ${val} books` : `We have ${val} books`}
      </button>
      {mineRep && c.status === 'playing' && <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Sent. Waiting for {names[other]} to enter theirs. The hand scores itself when the two add up to 13.</p>}
      <Feedback msg={msg} />
    </div>
  )
}

function Provisional({ d, names }: { d: any; names: { a: string; b: string } }) {
  const p = d.current.provisional
  const row = (side: 'a' | 'b') => {
    const r = p[side]
    return (
      <tr key={side}>
        <td className="font-bold">{names[side]}</td>
        <td className="sp-num">{r.bid}</td>
        <td className="sp-num">{r.books}</td>
        <td>{r.renege ? <span className="sp-chip sp-chip-bad">Renege</span> : r.made ? <span className="sp-chip sp-chip-live">Made</span> : <span className="sp-chip sp-chip-bad">Set</span>}</td>
        <td className="sp-num font-black" style={{ color: r.points < 0 ? 'var(--sp-red)' : 'var(--sp-green)' }}>{r.points > 0 ? '+' : ''}{r.points}</td>
        {d.match.rules?.bagsEnabled && <td className="sp-num">{r.bagsEarned}{r.bagPenalty ? <span style={{ color: 'var(--sp-red)' }}> (minus {r.bagPenalty})</span> : ''}</td>}
        <td className="sp-num font-black">{r.totalAfter}</td>
      </tr>
    )
  }
  return (
    <div className="sp-scroll">
      <p className="sp-label mb-2">Provisional result. Not official until both captains confirm.</p>
      <table className="sp-table">
        <thead><tr><th>Team</th><th>Bid</th><th>Books</th><th>Result</th><th>Points</th>{d.match.rules?.bagsEnabled && <th>Bags</th>}<th>Total</th></tr></thead>
        <tbody>{row('a')}{row('b')}</tbody>
      </table>
    </div>
  )
}

function ApproveHand({ d, act }: { d: any; act: Act }) {
  const c = d.current
  const v = d.viewer
  const { busy, msg, run } = useBusy(act)
  const mine = c.approvals[v.side]
  const theirs = c.approvals[v.side === 'a' ? 'b' : 'a']
  const openDispute = d.disputes.some((x: any) => x.status === 'open' && x.handId === c.id)
  return (
    <div className="grid gap-2">
      {openDispute && <div className="sp-banner sp-banner-warn text-sm">A dispute is open on this hand. A supervisor has to clear it before it can be confirmed.</div>}
      <button className="sp-btn sp-btn-gold sp-btn-block" disabled={busy || mine || openDispute} onClick={() => run('approve', { handId: c.id }, 'Confirmed')}>
        {mine ? (theirs ? 'Confirmed' : 'Confirmed. Waiting on the other captain') : busy ? 'Sending' : 'Confirm this hand'}
      </button>
      <Feedback msg={msg} />
    </div>
  )
}

function History({ d, names }: { d: any; names: { a: string; b: string } }) {
  if (!d.history?.length) return null
  const cell = (r: any) => r ? (
    <>
      <span className="sp-num">{r.bid}/{r.books}</span>{' '}
      <b className="sp-num" style={{ color: r.points < 0 ? 'var(--sp-red)' : 'var(--sp-green)' }}>{r.points > 0 ? '+' : ''}{r.points}</b>
      {r.bagPenalty > 0 && <span className="sp-chip sp-chip-bad ml-1">Bag penalty</span>}
      {r.renege && <span className="sp-chip sp-chip-bad ml-1">Renege</span>}
    </>
  ) : null
  return (
    <section className="sp-card p-4" aria-label="Hand history">
      <h2 className="sp-display text-xl mb-2">Hand by hand</h2>
      <div className="sp-scroll">
        <table className="sp-table">
          <thead>
            <tr><th>#</th>{d.match.gamesToWin > 1 && <th>Game</th>}<th>{names.a} bid/books</th><th>{d.match.rules?.bagsEnabled ? 'Total · bags' : 'Total'}</th><th>{names.b} bid/books</th><th>{d.match.rules?.bagsEnabled ? 'Total · bags' : 'Total'}</th></tr>
          </thead>
          <tbody>
            {d.history.map((h: any) => (
              <tr key={h.handNumber}>
                <td className="sp-num font-bold">{h.handNumber}{h.isTiebreak ? ' TB' : ''}</td>
                {d.match.gamesToWin > 1 && <td className="sp-num">{h.game}</td>}
                <td>{cell(h.a)}</td>
                <td className="sp-num font-black">{h.a?.total}{d.match.rules?.bagsEnabled ? ` · ${h.a?.bags}` : ''}</td>
                <td>{cell(h.b)}</td>
                <td className="sp-num font-black">{h.b?.total}{d.match.rules?.bagsEnabled ? ` · ${h.b?.bags}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {d.history.some((h: any) => h.ruling) && (
        <ul className="mt-2 text-xs grid gap-1" style={{ color: 'var(--sp-muted)' }}>
          {d.history.filter((h: any) => h.ruling).map((h: any) => <li key={h.handNumber}>Hand {h.handNumber} ruling: {h.ruling}</li>)}
        </ul>
      )}
      {d.voided?.length > 0 && <p className="mt-2 text-xs" style={{ color: 'var(--sp-muted)' }}>Voided: {d.voided.map((x: any) => `hand ${x.handNumber}${x.ruling ? ` (${x.ruling})` : ''}`).join(', ')}</p>}
    </section>
  )
}

const KIND_LABEL: Record<string, string> = {
  report_mismatch: 'Report mismatch', renege: 'Renege', other: 'Other', correction_request: 'Correction request',
  director_request: 'Director requested', forfeit_report: 'No show or forfeit report',
}

function DisputeList({ d }: { d: any }) {
  return (
    <section className="sp-card p-4" aria-label="Disputes" id="disputes">
      <h2 className="sp-display text-xl mb-2">Disputes</h2>
      <ul className="grid gap-2">
        {d.disputes.map((x: any) => (
          <li key={x.id} className="p-3 rounded-lg text-sm" style={{ background: 'rgba(0,0,0,0.22)' }}>
            <div className="flex flex-wrap gap-2 items-center mb-1">
              <span className={`sp-chip ${x.status === 'open' ? 'sp-chip-bad' : 'sp-chip-dim'}`}>{x.status}</span>
              <b>{KIND_LABEL[x.kind] || x.kind}</b>
              {x.handNumber && <span>Hand {x.handNumber}</span>}
              <span style={{ color: 'var(--sp-muted)' }}>by {x.raisedBy}</span>
            </div>
            <div>{x.reason}</div>
            {x.resolution && <div className="mt-1" style={{ color: 'var(--sp-muted)' }}>Ruling by {x.resolvedBy}: {x.resolution}</div>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function RaiseDispute({ d, act }: { d: any; act: Act }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('renege')
  const [reason, setReason] = useState('')
  const { busy, msg, run } = useBusy(act)
  return (
    <section className="sp-card p-4">
      {!open ? (
        <button className="sp-btn sp-btn-ghost sp-btn-block" onClick={() => setOpen(true)}>Flag a problem for the supervisor</button>
      ) : (
        <div className="grid gap-3">
          <label className="sp-field"><span>What happened?</span>
            <select className="sp-select" value={kind} onChange={e => setKind(e.target.value)}>
              <option value="renege">Suspected renege</option>
              <option value="correction_request">A score or bid looks wrong</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <label className="sp-field"><span>Details (the supervisor will review before anything changes)</span>
            <textarea className="sp-textarea" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button className="sp-btn sp-btn-wine flex-1" disabled={busy || !reason.trim()} onClick={async () => { if (await run('dispute', { matchId: d.match.id, handId: d.current?.id || null, kind, reason }, 'Sent to the supervisor')) { setReason(''); setOpen(false) } }}>Send to supervisor</button>
            <button className="sp-btn sp-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <Feedback msg={msg} />
    </section>
  )
}

// ─── staff ──────────────────────────────────────────────────────────────────

function StaffTools({ d, act, names }: { d: any; act: Act; names: { a: string; b: string } }) {
  const m = d.match
  const c = d.current
  const v = d.viewer
  const { busy, msg, run } = useBusy(act)
  const openDisputes = d.disputes.filter((x: any) => x.status === 'open')
  return (
    <section className="sp-card p-4 grid gap-4" aria-label="Supervisor tools" id="staff" style={{ borderColor: 'rgba(127,180,255,0.5)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="sp-display text-xl">Supervisor tools</h2>
        <div className="flex flex-wrap gap-2">
          {m.status === 'live' && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => run('pause', { matchId: m.id }, 'Paused')}>Pause match</button>}
          {m.status === 'paused' && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => run('resume', { matchId: m.id }, 'Resumed')}>Resume match</button>}
          {m.status === 'completed' && !m.completionVerifiedBy && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => run('verifyCompletion', { matchId: m.id }, 'Completion verified')}>Verify completion</button>}
          {m.status === 'completed' && v.isDirector && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy || openDisputes.length > 0} onClick={() => { if (confirm('Finalize this result and advance the winner?')) run('finalize', { matchId: m.id }, 'Finalized. Winner advanced.') }}>Finalize and advance</button>}
        </div>
      </div>
      <Feedback msg={msg} />
      {m.completionVerifiedBy && <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Completion verified by {m.completionVerifiedBy}.</p>}

      {openDisputes.map((x: any) => <ResolveDispute key={x.id} x={x} d={d} act={act} names={names} />)}

      {c && c.status === 'bidding' && ['live', 'paused'].includes(m.status) && <StaffBids d={d} act={act} />}
      {c && ['playing', 'review', 'disputed'].includes(c.status) && ['live', 'paused'].includes(m.status) && <StaffBooks d={d} act={act} names={names} />}
      {c && c.status === 'review' && (
        <button className="sp-btn sp-btn-gold" disabled={busy || openDisputes.some((x: any) => x.handId === c.id)} onClick={() => run('approve', { handId: c.id }, 'Hand verified')}>
          Verify hand {c.handNumber} for both teams
        </button>
      )}
      {c && <ReasonAction label={`Redeal hand ${c.handNumber}`} action="voidHand" payload={{ handId: c.id }} act={act} danger skip={v.isDirector} />}
      {d.history?.length > 0 && <CorrectHand d={d} act={act} names={names} />}
      <div className="grid sm:grid-cols-2 gap-2">
        <ReasonAction label="Request the director" action="dispute" payload={{ matchId: m.id, handId: c?.id || null, kind: 'director_request' }} field="reason" act={act} />
        <ReasonAction label="Report a no show or forfeit" action="dispute" payload={{ matchId: m.id, kind: 'forfeit_report' }} field="reason" act={act} />
      </div>
      {v.isDirector && <DirectorMatchTools d={d} act={act} names={names} />}
    </section>
  )
}

function StaffBids({ d, act }: { d: any; act: Act }) {
  const c = d.current
  const [pos, setPos] = useState<number | null>(null)
  const [val, setVal] = useState<number | null>(null)
  const { busy, msg, run } = useBusy(act)
  const seat = pos !== null ? c.seats[pos] : null
  return (
    <details className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
      <summary className="font-bold">Enter a bid for a player</summary>
      <div className="grid gap-3 mt-3">
        <div className="grid grid-cols-2 gap-2">
          {c.seats.map((s: any) => (
            <button key={s.pos} className={`sp-btn sp-btn-sm ${pos === s.pos ? 'sp-btn-gold' : 'sp-btn-ghost'}`} onClick={() => { setPos(s.pos); setVal(s.bid) }}>
              {s.name} {s.submitted ? '(in)' : ''}
            </button>
          ))}
        </div>
        {seat && (
          <>
            <NumberPad label={`${seat.name} bid`} value={val} onChange={setVal} />
            <button className="sp-btn sp-btn-gold" disabled={busy || val === null} onClick={() => run('bid', { handId: c.id, bids: [{ playerId: seat.playerId, bid: val }] }, `Saved ${seat.name}: ${val}`)}>Save bid for {seat.name}</button>
          </>
        )}
        <Feedback msg={msg} />
      </div>
    </details>
  )
}

function StaffBooks({ d, act, names }: { d: any; act: Act; names: { a: string; b: string } }) {
  const c = d.current
  const [val, setVal] = useState<number | null>(null)
  const { busy, msg, run } = useBusy(act)
  return (
    <details className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
      <summary className="font-bold">Enter books for both captains (assisted)</summary>
      <div className="grid gap-3 mt-3">
        {c.reports && (
          <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>
            {names.a} report: {c.reports.a ? `${c.reports.a.booksA} to ${c.reports.a.booksB}${c.reports.a.by ? ` (${c.reports.a.by})` : ''}` : 'none'} · {names.b} report: {c.reports.b ? `${c.reports.b.booksA} to ${c.reports.b.booksB}${c.reports.b.by ? ` (${c.reports.b.by})` : ''}` : 'none'}
          </p>
        )}
        <span className="sp-label">Books won by {names.a}</span>
        <NumberPad label={`${names.a} books`} value={val} onChange={setVal} />
        {val !== null && <p className="font-bold">{names.a} {val} · {names.b} {13 - val}</p>}
        <button className="sp-btn sp-btn-gold" disabled={busy || val === null} onClick={() => run('report', { handId: c.id, booksA: val, booksB: 13 - (val as number), teamId: 'both' }, 'Recorded for both teams. Captains confirm next, or verify it below.')}>
          Record for both teams
        </button>
        <Feedback msg={msg} />
      </div>
    </details>
  )
}

function ResolveDispute({ x, d, act, names }: { x: any; d: any; act: Act; names: { a: string; b: string } }) {
  const [resolution, setResolution] = useState('')
  const [books, setBooks] = useState<number | null>(null)
  const [renege, setRenege] = useState<string>('')
  const { busy, msg, run } = useBusy(act)
  const handOpen = d.current && d.current.id === x.handId
  const needsBooks = x.kind === 'report_mismatch' && handOpen && d.current.status === 'disputed'
  const directorOnly = x.kind === 'director_request' && !d.viewer.isDirector
  return (
    <div className="p-3 rounded-lg grid gap-3" style={{ background: 'rgba(255,90,78,0.08)', border: '2px solid var(--sp-red)' }}>
      <div>
        <div className="font-black">{KIND_LABEL[x.kind] || x.kind}{x.handNumber ? ` · Hand ${x.handNumber}` : ''}</div>
        <div className="text-sm">{x.reason}</div>
        <div className="text-xs" style={{ color: 'var(--sp-muted)' }}>Raised by {x.raisedBy}</div>
      </div>
      {directorOnly ? <p className="text-sm">Waiting for the tournament director.</p> : (
        <>
          {(needsBooks || x.kind === 'correction_request') && x.handId && (
            <div className="grid gap-2">
              <span className="sp-label">Official books for {names.a}{needsBooks ? ' (required)' : ' (optional)'}</span>
              <NumberPad label="Official books" value={books} onChange={setBooks} />
              {books !== null && <p className="text-sm font-bold">{names.a} {books} · {names.b} {13 - books}</p>}
            </div>
          )}
          {x.kind === 'renege' && x.handId && (
            <label className="sp-field"><span>Ruling</span>
              <select className="sp-select" value={renege} onChange={e => setRenege(e.target.value)}>
                <option value="">No renege (dismiss the claim)</option>
                <option value={d.teamA?.id}>Renege confirmed: {names.a}</option>
                <option value={d.teamB?.id}>Renege confirmed: {names.b}</option>
              </select>
            </label>
          )}
          <label className="sp-field"><span>{d.viewer.isDirector ? 'Note (optional)' : 'Resolution (required, recorded in the audit log)'}</span>
            <textarea className="sp-textarea" maxLength={500} value={resolution} onChange={e => setResolution(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              className="sp-btn sp-btn-gold"
              disabled={busy || (!resolution.trim() && !d.viewer.isDirector) || (needsBooks && books === null)}
              onClick={() => {
                const payload: Record<string, unknown> = { disputeId: x.id, resolution }
                if (books !== null) { payload.booksA = books; payload.booksB = 13 - books }
                if (x.kind === 'renege') {
                  if (renege) payload.renegeTeamId = renege
                  else payload.dismiss = true
                }
                run('resolve', payload, 'Ruling recorded')
              }}
            >
              Record ruling
            </button>
            {!needsBooks && x.kind !== 'renege' && <button className="sp-btn sp-btn-ghost" disabled={busy || (!resolution.trim() && !d.viewer.isDirector)} onClick={() => run('resolve', { disputeId: x.id, resolution, dismiss: true }, 'Dismissed')}>Dismiss</button>}
          </div>
        </>
      )}
      <Feedback msg={msg} />
    </div>
  )
}

function CorrectHand({ d, act, names }: { d: any; act: Act; names: { a: string; b: string } }) {
  const [hand, setHand] = useState<number>(d.history[d.history.length - 1].handNumber)
  const h = d.history.find((x: any) => x.handNumber === hand)
  const [books, setBooks] = useState<number | null>(null)
  const [renege, setRenege] = useState<string>('keep')
  const [reason, setReason] = useState('')
  const { busy, msg, run } = useBusy(act)
  const finalLocked = d.match.status === 'final' && !d.viewer.isDirector
  return (
    <details className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
      <summary className="font-bold">Correct a verified hand</summary>
      {finalLocked ? <p className="text-sm mt-2">This match is finalized. Only the director can correct it.</p> : (
        <div className="grid gap-3 mt-3">
          <label className="sp-field"><span>Hand</span>
            <select className="sp-select" value={hand} onChange={e => { setHand(Number(e.target.value)); setBooks(null) }}>
              {d.history.map((x: any) => <option key={x.handNumber} value={x.handNumber}>Hand {x.handNumber}: {names.a} {x.a?.books} · {names.b} {x.b?.books}</option>)}
            </select>
          </label>
          <span className="sp-label">Corrected books for {names.a} (leave unpicked to keep {h?.a?.books})</span>
          <NumberPad label="Corrected books" value={books} onChange={setBooks} />
          <label className="sp-field"><span>Renege</span>
            <select className="sp-select" value={renege} onChange={e => setRenege(e.target.value)}>
              <option value="keep">No change</option>
              <option value="none">No renege</option>
              <option value={d.teamA?.id}>Renege by {names.a}</option>
              <option value={d.teamB?.id}>Renege by {names.b}</option>
            </select>
          </label>
          <label className="sp-field"><span>{d.viewer.isDirector ? 'Note (optional)' : 'Reason (required)'}</span>
            <textarea className="sp-textarea" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
          </label>
          <button
            className="sp-btn sp-btn-wine"
            disabled={busy || (!reason.trim() && !d.viewer.isDirector) || (books === null && renege === 'keep')}
            onClick={() => {
              if (!confirm('Change an official hand? Every later hand will be recalculated.')) return
              const payload: Record<string, unknown> = { handId: h.handId, reason }
              if (books !== null) { payload.booksA = books; payload.booksB = 13 - books }
              if (renege !== 'keep') payload.renegeTeamId = renege === 'none' ? null : renege
              run('correct', payload, 'Correction saved and scores recalculated')
            }}
          >
            Save correction
          </button>
        </div>
      )}
      <Feedback msg={msg} />
    </details>
  )
}

function ReasonAction({ label, action, payload, act, danger = false, field = 'reason', skip = false }: { label: string; action: string; payload: Record<string, unknown>; act: Act; danger?: boolean; field?: string; skip?: boolean }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { busy, msg, run } = useBusy(act)
  if (skip) {
    // Director: one tap, no explanation needed.
    return (
      <div className="grid gap-2">
        <button className={`sp-btn sp-btn-sm ${danger ? 'sp-btn-danger' : 'sp-btn-ghost'}`} disabled={busy} onClick={() => { if (confirm(`${label}?`)) run(action, { ...payload, [field]: '' }, 'Done') }}>{label}</button>
        <Feedback msg={msg} />
      </div>
    )
  }
  return (
    <div className="grid gap-2">
      {!open ? (
        <button className={`sp-btn sp-btn-sm ${danger ? 'sp-btn-danger' : 'sp-btn-ghost'}`} onClick={() => setOpen(true)}>{label}</button>
      ) : (
        <div className="grid gap-2 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
          <label className="sp-field"><span>{label}: reason</span>
            <textarea className="sp-textarea" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button className={`sp-btn sp-btn-sm ${danger ? 'sp-btn-danger' : 'sp-btn-gold'}`} disabled={busy || !reason.trim()} onClick={async () => { if (await run(action, { ...payload, [field]: reason }, 'Done')) { setOpen(false); setReason('') } }}>Confirm</button>
            <button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      <Feedback msg={msg} />
    </div>
  )
}

function DirectorMatchTools({ d, act, names }: { d: any; act: Act; names: { a: string; b: string } }) {
  const m = d.match
  const [winner, setWinner] = useState('')
  const [kind, setKind] = useState('forfeit')
  const [reason, setReason] = useState('')
  const [limit, setLimit] = useState(String(m.timeLimitMin))
  const [when, setWhen] = useState(m.scheduledAt ? toLocal(m.scheduledAt) : '')
  const { busy, msg, run } = useBusy(act)
  return (
    <details className="p-3 rounded-lg" style={{ background: 'rgba(224,173,79,0.08)', border: '1px solid var(--sp-gold)' }}>
      <summary className="font-bold">Director controls</summary>
      <div className="grid gap-4 mt-3">
        {m.status !== 'final' && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="sp-field flex-1"><span>Time limit (minutes, 0 for none)</span>
              <input className="sp-input" inputMode="numeric" value={limit} onChange={e => setLimit(e.target.value.replace(/\D/g, ''))} />
            </label>
            <button className="sp-btn sp-btn-sm" disabled={busy || !limit} onClick={() => run('editMatch', { matchId: m.id, timeLimitMin: Number(limit) }, 'Time limit updated')}>Save</button>
          </div>
        )}
        {['pending', 'ready'].includes(m.status) && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="sp-field flex-1"><span>Scheduled start (players see a countdown)</span>
              <input type="datetime-local" className="sp-input" value={when} onChange={e => setWhen(e.target.value)} />
            </label>
            <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => run('editMatch', { matchId: m.id, scheduledAt: when ? new Date(when).toISOString() : null }, when ? 'Start time saved' : 'Start time cleared')}>{when ? 'Save' : 'Clear'}</button>
          </div>
        )}
        {['ready', 'live', 'paused', 'completed'].includes(m.status) && d.teamA && d.teamB && (
          <EndMatch d={d} act={act} names={names} />
        )}
        {['ready', 'live', 'paused', 'completed'].includes(m.status) && (
          <div className="grid gap-2">
            <span className="sp-label">Forfeit or disqualification</span>
            <select className="sp-select" value={winner} onChange={e => setWinner(e.target.value)}>
              <option value="">Choose the team that advances</option>
              <option value={d.teamA?.id}>{names.a} advances</option>
              <option value={d.teamB?.id}>{names.b} advances</option>
            </select>
            <select className="sp-select" value={kind} onChange={e => setKind(e.target.value)}>
              <option value="forfeit">Forfeit / no show</option>
              <option value="dq">Disqualification</option>
            </select>
            <textarea className="sp-textarea" placeholder="Note (optional)" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
            <button className="sp-btn sp-btn-danger" disabled={busy || !winner} onClick={() => { if (confirm('End this match by forfeit and advance the chosen team?')) run('forfeit', { matchId: m.id, winnerTeamId: winner, kind, reason }, 'Recorded and advanced') }}>Record and advance</button>
          </div>
        )}
        {!['pending', 'ready'].includes(m.status) && m.resultKind !== 'bye' && (
          <ReasonAction label="Restart this game from zero" action="resetMatch" payload={{ matchId: m.id }} act={act} danger skip />
        )}
        <Feedback msg={msg} />
      </div>
    </details>
  )
}

function toLocal(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// Countdown to a scheduled start. Shows "Starting now" once the time passes.
export function Countdown({ at, serverNow, big = false }: { at: string; serverNow: () => number; big?: boolean }) {
  const [, setT] = useState(0)
  useEffect(() => { const id = setInterval(() => setT(x => x + 1), 1000); return () => clearInterval(id) }, [])
  const ms = new Date(at).getTime() - serverNow()
  if (ms <= 0) return <span className={`sp-display ${big ? 'text-4xl' : 'text-xl'}`} style={{ color: 'var(--sp-green)' }}>Starting now</span>
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const text = h ? `${h}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`
  return <span className={`sp-display sp-num ${big ? 'text-5xl' : 'text-2xl'}`} aria-label={`Starts in ${text}`}>{text}</span>
}

// Before the game begins: the full table layout with every control locked,
// so players can look around and learn it.
export function GamePreview({ d, serverNow }: { d: any; serverNow: () => number }) {
  const names = { a: d.teamA?.name || 'TBD', b: d.teamB?.name || 'TBD' }
  const v = d.viewer
  const mineTeam = v.side === 'a' ? d.teamA : d.teamB
  return (
    <div className="grid gap-4" aria-label="Game preview">
      <Scoreboard d={d} names={names} serverNow={serverNow} />
      <section className="sp-card p-4 grid gap-3" style={{ opacity: 0.92 }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="sp-display text-2xl">Hand 1</h2>
          <span className="sp-chip sp-chip-dim">Locked until the game starts</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>
          {d.match.rules?.scorekeeping === 'one'
            ? 'When the game starts, the scorekeeper enters both team bids here before every hand, and the books after it.'
            : v.control === 'captain'
            ? `When the game starts, ${mineTeam?.players?.find((p: any) => p.isCaptain)?.name || 'your captain'} enters both of your bids here before every hand.`
            : 'When the game starts, you enter your own bid here before every hand. Your partner enters theirs.'}
        </p>
        <div aria-disabled="true" style={{ pointerEvents: 'none', opacity: 0.45 }}>
          <NumberPad label="Bid (locked)" value={null} onChange={() => {}} isDisabled={() => true} />
        </div>
        <ol className="grid gap-1 text-sm list-decimal pl-5">
          <li>Everyone bids. The hand starts when all four bids are locked.</li>
          <li>Play the hand with real cards.</li>
          <li>When the hand is over, each captain enters the books on their side.</li>
          <li>If the two add up to 13 the hand scores itself and every phone updates.</li>
        </ol>
      </section>
    </div>
  )
}

// Director: end this match now. Leader wins by default; pick a team to override
// (required when tied). Final immediately; winner advances in a bracket.
export function EndMatch({ d, act, names }: { d: any; act: Act; names: { a: string; b: string } }) {
  const m = d.match
  const leader = m.gamesToWin > 1 && m.gamesA !== m.gamesB ? (m.gamesA > m.gamesB ? 'a' : 'b') : m.scoreA !== m.scoreB ? (m.scoreA > m.scoreB ? 'a' : 'b') : null
  const [pick, setPick] = useState('')
  const { busy, msg, run } = useBusy(act)
  const winnerId = pick || (leader ? (leader === 'a' ? d.teamA?.id : d.teamB?.id) : '')
  const winnerName = winnerId === d.teamA?.id ? names.a : winnerId === d.teamB?.id ? names.b : ''
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select className="sp-select" style={{ maxWidth: 260, minHeight: 40, padding: '6px 10px' }} value={pick} onChange={e => setPick(e.target.value)} aria-label="Winner">
          <option value="">{leader ? `Leader wins (${leader === 'a' ? names.a : names.b})` : 'Pick the winner'}</option>
          <option value={d.teamA?.id}>{names.a} wins</option>
          <option value={d.teamB?.id}>{names.b} wins</option>
        </select>
        <button className="sp-btn sp-btn-sm sp-btn-danger" disabled={busy || !winnerId} onClick={() => { if (confirm(`End this match now with ${winnerName} as the winner?`)) run('endNow', { matchId: m.id, winnerTeamId: winnerId }, `Ended. ${winnerName} wins.`) }}>End match</button>
      </div>
      <Feedback msg={msg} />
    </div>
  )
}

// One scorekeeper: enter each team's bid (as a team total) in one go.
function KeeperBids({ d, act, names }: { d: any; act: Act; names: { a: string; b: string } }) {
  const c = d.current
  const rules = d.match.rules
  const seatsOf = (side: 'a' | 'b') => c.seats.filter((s: any) => s.side === side)
  const sum = (side: 'a' | 'b') => { const ss = seatsOf(side); return ss.every((s: any) => s.bid !== null) ? ss.reduce((t: number, s: any) => t + s.bid, 0) : null }
  const [a, setA] = useState<number | null>(sum('a'))
  const [b, setB] = useState<number | null>(sum('b'))
  const { busy, msg, run } = useBusy(act)
  useEffect(() => { setA(sum('a')); setB(sum('b')) }, [c.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const low = (n: number) => n < rules.minTeamBid
  const bids = () => (['a', 'b'] as const).flatMap(side => {
    const ss = seatsOf(side)
    const total = side === 'a' ? a : b
    return ss.map((s: any, i: number) => ({ playerId: s.playerId, bid: i === 0 ? total : 0 }))
  })
  return (
    <div className="grid gap-4 p-3 rounded-xl" style={{ border: '2px solid var(--sp-gold)' }}>
      <h3 className="font-black text-lg">Enter both team bids</h3>
      {(['a', 'b'] as const).map(side => (
        <div key={side} className="grid gap-2">
          <div className="flex justify-between"><span className="font-bold">{names[side]}</span><span className="sp-display sp-num text-2xl">{(side === 'a' ? a : b) ?? '?'}</span></div>
          <NumberPad label={`${names[side]} bid`} value={side === 'a' ? a : b} onChange={side === 'a' ? setA : setB} isDisabled={low} />
        </div>
      ))}
      <button className="sp-btn sp-btn-gold sp-btn-block" disabled={busy || a === null || b === null} onClick={() => run('bid', { handId: c.id, bids: bids() }, 'Bids locked')}>
        {busy ? 'Sending' : a === null || b === null ? 'Pick both bids' : `Lock in ${names.a} ${a}, ${names.b} ${b}`}
      </button>
      <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>Each team bids at least {rules.minTeamBid}.</p>
      <Feedback msg={msg} />
    </div>
  )
}

// One scorekeeper: after the hand, one number: books won by the first team.
function KeeperBooks({ d, act, names }: { d: any; act: Act; names: { a: string; b: string } }) {
  const c = d.current
  const [val, setVal] = useState<number | null>(null)
  const { busy, msg, run } = useBusy(act)
  useEffect(() => { setVal(null) }, [c.id])
  return (
    <div className="grid gap-3 p-3 rounded-xl" style={{ border: '2px solid var(--sp-gold)' }}>
      <h3 className="font-black text-lg">Hand over? Books won by {names.a}</h3>
      <NumberPad label={`Books won by ${names.a}`} value={val} onChange={setVal} />
      {val !== null && <p className="font-bold text-center">{names.a} {val} · {names.b} {13 - val}</p>}
      <button className="sp-btn sp-btn-gold sp-btn-block" disabled={busy || val === null} onClick={() => run('report', { handId: c.id, booksA: val, booksB: 13 - (val as number) }, 'Hand scored')}>
        {busy ? 'Sending' : val === null ? 'Pick a number' : 'Score this hand'}
      </button>
      <Feedback msg={msg} />
    </div>
  )
}
