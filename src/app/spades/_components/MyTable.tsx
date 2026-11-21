'use client'

import Link from 'next/link'
import { useState } from 'react'
import { displayRules, normalizeRules } from '@/lib/spades/rules'
import { Countdown, GamePreview, MatchPanel } from './MatchPanel'
import { Empty, Feedback } from './ui'
import type { ActResult } from './useSpades'

type Act = (action: string, payload?: Record<string, unknown>) => Promise<ActResult>
type Msg = { ok: boolean; text: string } | null

// The player dashboard: team, partner, opponent, game status, bids and
// scores, history and rules. Used by /spades/play and by Test Mode panels.
export function MyTable({ data, act, serverNow, compact = false }: { data: any; act: Act; serverNow: () => number; compact?: boolean }) {
  const viewer = data.viewer
  const me = data.me
  const T = data.tournament
  const team = me?.team
  const am = me?.activeMatch
  const started = am && !['pending', 'ready'].includes(am.match.status)
  const partner = team?.players?.find((p: any) => p.id !== viewer.playerId)
  const opp = am ? (am.viewer.side === 'a' ? am.teamB : am.teamA) : null

  return (
    <div className="grid gap-4">
      <div>
        <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>{T.name}</p>
        <h1 className={`sp-display mt-1 ${compact ? 'text-2xl' : 'text-3xl'}`}>{viewer.name}{viewer.isCaptain ? ' (Captain)' : ''}</h1>
        {team && <p className="sp-serif italic text-lg">Team {team.name}{partner ? ` · with ${partner.name}` : ''}</p>}
      </div>

      {me?.champion && (
        <div className="sp-card-paper p-6 text-center">
          <p className="sp-label">Champions</p>
          <p className="sp-display text-4xl">{team.name}</p>
          <p className="sp-serif italic mt-2">Congratulations. See the director for the trophy.</p>
          <a href="/spades" className="sp-btn sp-btn-sm sp-btn-wine mt-3">Back to home</a>
        </div>
      )}

      {team && team.status !== 'approved' ? (
        <Empty title={team.status === 'waitlist' ? 'You are on the waitlist' : team.status === 'rejected' ? 'Registration not accepted' : 'Waiting for the director to approve your team'}>
          {team.status === 'waitlist' ? 'The event is full. If a spot opens, the director moves you in and this screen updates by itself.'
            : team.status === 'rejected' ? 'See the tournament director.' : 'Look around while you wait: your team settings, the rules and scoring are all below. This screen updates by itself.'}
        </Empty>
      ) : am && started ? (
        <MatchPanel d={am} act={act} serverNow={serverNow} />
      ) : am ? (
        <>
          <WaitingCard d={am} act={act} serverNow={serverNow} selfServe={me?.selfServe} oneMode={T.rules?.scorekeeping === 'one'} />
          <GamePreview d={am} serverNow={serverNow} />
        </>
      ) : me?.rematchable && me?.lastGame ? (
        <ResultCard me={me} viewer={viewer} act={act} />
      ) : me?.eliminated ? (
        <Empty title="Thanks for playing">Your run is over. Follow the rest of the bracket live.<div className="mt-3"><a href="/spades" className="sp-btn sp-btn-sm">Back to home</a></div></Empty>
      ) : !T.bracketPublished ? (
        <Empty title="Waiting for the matchups">The director sets the matchups after registration closes. This screen updates by itself.</Empty>
      ) : (
        <Empty title="Waiting for your next match">Your next opponent is decided when the other match finishes. This screen updates by itself.</Empty>
      )}

      {team && !started && <TeamSettings team={team} viewer={viewer} act={act} partner={partner} selfServe={me?.selfServe} opponentCaptain={opp?.players?.find((p: any) => p.isCaptain)?.name} oneMode={T.rules?.scorekeeping === 'one'} />}

      {opp && !started && (
        <section className="sp-card p-4">
          <p className="sp-label">Your opponent</p>
          <p className="font-black text-xl mt-1">{opp.name}</p>
          {opp.players?.length > 0 && <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>{opp.players.map((p: any) => p.name).join(' & ')}</p>}
        </section>
      )}

      {me?.finished?.length > 0 && (
        <section className="sp-card p-4">
          <h2 className="sp-display text-xl mb-2">Your results</h2>
          <ul className="grid gap-2">
            {me.finished.map((m: any) => {
              const won = m.winner === team?.id
              return (
                <li key={m.id}>
                  <Link href={`/spades/match/${m.id}`} className="flex justify-between p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
                    <span>{m.roundName}</span>
                    <span className={`sp-chip ${won ? 'sp-chip-live' : 'sp-chip-bad'}`}>{won ? 'Won' : 'Lost'} {m.gamesToWin > 1 ? `${m.gamesA} to ${m.gamesB} games` : `${m.scoreA} to ${m.scoreB}`}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <RulesBox rules={T.rules} />
    </div>
  )
}

function WaitingCard({ d, act, serverNow, selfServe, oneMode }: { d: any; act: Act; serverNow: () => number; selfServe?: boolean; oneMode?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const side = d.viewer.side
  const ready = d.match.status === 'ready'
  const mine = side === 'a' ? d.match.readyA : d.match.readyB
  const theirs = side === 'a' ? d.match.readyB : d.match.readyA
  const opp = side === 'a' ? d.teamB?.name : d.teamA?.name
  const tap = async () => {
    setBusy(true)
    const r = await act('ready', { matchId: d.match.id, ready: !mine })
    setBusy(false)
    setMsg(r.ok ? null : { ok: false, text: r.error || 'Failed' })
  }
  return (
    <section className="sp-card p-5 grid gap-3 text-center" style={{ borderColor: 'var(--sp-gold)' }}>
      <p className="sp-label">Waiting for game to start</p>
      <h2 className="sp-display text-3xl">vs {opp || 'TBD'}</h2>
      {d.match.scheduledAt ? (
        <div className="grid gap-1">
          <span className="sp-label">Starts in</span>
          <Countdown at={d.match.scheduledAt} serverNow={serverNow} big />
          <span className="text-xs" style={{ color: 'var(--sp-muted)' }}>{new Date(d.match.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
        </div>
      ) : <p style={{ color: 'var(--sp-muted)' }}>{selfServe ? (oneMode ? 'Tap Ready when all four players are seated and the game begins.' : 'The game begins as soon as both captains tap Ready.') : 'The director starts the game. This screen switches on by itself.'}</p>}
      {d.table && <p className="text-lg font-bold">Sit at table {d.table.number}</p>}
      {ready && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}><div className="sp-label">You</div><div className={`sp-chip mt-1 ${mine ? 'sp-chip-live' : 'sp-chip-dim'}`}>{mine ? 'Ready' : 'Not ready'}</div></div>
            <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}><div className="sp-label">{opp}</div><div className={`sp-chip mt-1 ${theirs ? 'sp-chip-live' : 'sp-chip-dim'}`}>{theirs ? 'Ready' : 'Not ready'}</div></div>
          </div>
          {d.viewer.isCaptain
            ? <button className={`sp-btn sp-btn-block ${mine ? 'sp-btn-ghost' : 'sp-btn-gold'}`} disabled={busy} onClick={tap} style={{ minHeight: 60, fontSize: 18 }}>{busy ? 'Sending' : mine ? 'Not ready yet' : oneMode ? 'Everyone is seated: ready' : 'We are seated and ready'}</button>
            : <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Your captain taps Ready.</p>}
        </>
      )}
      <Feedback msg={msg} />
    </section>
  )
}

function TeamSettings({ team, viewer, act, partner, selfServe, opponentCaptain, oneMode }: { team: any; viewer: any; act: Act; partner: any; selfServe?: boolean; opponentCaptain?: string; oneMode?: boolean }) {
  const [oppCode, setOppCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const captain = viewer.isCaptain
  return (
    <section className="sp-card p-4 grid gap-3">
      <h2 className="sp-display text-xl">Your team</h2>
      <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>{oneMode ? (captain ? 'You keep score for both teams: every bid and the books.' : 'The scorekeeper enters everything. You just play.') : captain ? 'You are the captain: you enter both bids and your books every hand.' : 'Your captain enters both bids and the books. You just play.'}</p>
      {captain && selfServe && !oneMode && (
        <div className="grid gap-2">
          <span className="sp-label">The other captain</span>
          {oppCode ? (
            <div className="p-3 rounded-xl text-center" style={{ border: '2px dashed var(--sp-gold)' }}>
              <p className="text-sm">New code for {opponentCaptain || 'the other captain'}</p>
              <p className="sp-display sp-num" style={{ fontSize: 36, letterSpacing: '0.08em' }}>{oppCode}</p>
              <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>They type it at orcafin.app/spades/join. The old code stops working.</p>
            </div>
          ) : (
            <button className="sp-btn sp-btn-sm" disabled={busy} onClick={async () => { setBusy(true); const r = await act('opponentCode', {}); setBusy(false); if (r.ok) setOppCode(r.data.token); else setMsg({ ok: false, text: r.error || 'Failed' }) }}>Lost their code? Make a new one</button>
          )}
        </div>
      )}
      <Feedback msg={msg} />
    </section>
  )
}

function RulesBox({ rules }: { rules: any }) {
  const r = normalizeRules(rules)
  return (
    <details className="sp-card p-4">
      <summary className="sp-display text-xl">Rules and scoring</summary>
      <div className="grid gap-3 mt-3">
        {displayRules(r).map((sec, i) => (
          <div key={i}>
            <h3 className="font-black mb-1">{sec.title}</h3>
            <ul className="grid gap-1 list-disc pl-5 text-sm">{sec.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
          </div>
        ))}
      </div>
    </details>
  )
}

// Two-team and self-serve games: the last result, the running record, and a
// rematch button. The rematch begins once the other captain taps Ready.
function ResultCard({ me, viewer, act }: { me: any; viewer: any; act: Act }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const g = me.lastGame
  return (
    <section className="sp-card-paper p-6 grid gap-3 text-center">
      <p className="sp-label">{g.won ? 'You won' : 'You lost'}</p>
      <p className="sp-display text-4xl">{g.myScore} to {g.theirScore}</p>
      <p className="sp-serif italic">vs {g.opponent}{g.resultNote ? ` · ${g.resultNote}` : ''}</p>
      <p className="font-bold">Record: {me.record.wins} won, {me.record.losses} lost</p>
      {viewer.isCaptain ? (
        <button className="sp-btn sp-btn-wine sp-btn-block" disabled={busy} style={{ minHeight: 60, fontSize: 18 }} onClick={async () => {
          setBusy(true)
          const r = await act('rematch', {})
          setBusy(false)
          setMsg(r.ok ? { ok: true, text: me.selfServe ? 'Rematch on. It starts when the other captain taps Ready.' : 'Rematch requested. The director begins it.' } : { ok: false, text: r.error || 'Failed' })
        }}>{busy ? 'Sending' : 'Rematch'}</button>
      ) : <p className="text-sm">Your captain can start a rematch.</p>}
      <Feedback msg={msg} />
      <a href="/spades" className="sp-btn sp-btn-ghost sp-btn-block" style={{ color: 'var(--sp-ink)' }}>Done, back to home</a>
    </section>
  )
}
