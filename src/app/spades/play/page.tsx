'use client'

import Link from 'next/link'
import { MatchPanel } from '../_components/MatchPanel'
import { useSpades } from '../_components/useSpades'
import { Empty, ErrorBox, Feedback, Loading, Shell } from '../_components/ui'
import { useState } from 'react'

function ReadyCard({ d, act }: { d: any; act: (a: string, p?: Record<string, unknown>) => Promise<any> }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const side = d.viewer.side
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
    <section className="sp-card p-5 grid gap-3 text-center">
      <p className="sp-label">Your match is up next</p>
      <h2 className="sp-display text-3xl">vs {opp}</h2>
      {d.table && <p className="text-lg font-bold">Sit at table {d.table.number}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}><div className="sp-label">You</div><div className={`sp-chip mt-1 ${mine ? 'sp-chip-live' : 'sp-chip-dim'}`}>{mine ? 'Ready' : 'Not ready'}</div></div>
        <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}><div className="sp-label">{opp}</div><div className={`sp-chip mt-1 ${theirs ? 'sp-chip-live' : 'sp-chip-dim'}`}>{theirs ? 'Ready' : 'Not ready'}</div></div>
      </div>
      {d.viewer.isCaptain ? (
        <button className={`sp-btn sp-btn-block ${mine ? 'sp-btn-ghost' : 'sp-btn-gold'}`} disabled={busy} onClick={tap} style={{ minHeight: 64, fontSize: 20 }}>
          {busy ? 'Sending' : mine ? 'Not ready yet' : 'We are seated and ready'}
        </button>
      ) : <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Your scorekeeper taps Ready.</p>}
      <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>{mine && theirs ? 'Both teams are ready. The director will tap Begin.' : 'Tap Ready once both partners are at the table. The game starts when the director taps Begin.'}</p>
      <Feedback msg={msg} />
    </section>
  )
}

export default function PlayPage() {
  const { data, error, loading, online, act, serverNow, reload } = useSpades<any>('play')
  if (loading && !data) return <Shell active="play"><Loading /></Shell>
  const viewer = data?.viewer
  if (!data?.tournament) return <Shell active="play" online={online}><div className="sp-wrap-narrow"><ErrorBox message={error || 'Could not load'} onRetry={reload} /></div></Shell>

  if (!viewer || viewer.kind === 'public') {
    return (
      <Shell active="play" online={online} viewer={viewer}>
        <div className="sp-wrap-narrow grid gap-4">
          <h1 className="sp-display text-4xl">My table</h1>
          <Empty title="Register your team on this phone">
            The phone that registers your team keeps score for it all night. Already registered? Tap I have an access code and type the code you got when you registered.
          </Empty>
          {data.tournament.registrationOpen && !data.tournament.rosterLocked && <Link href="/spades/register" className="sp-btn sp-btn-gold">Register a team</Link>}
          <Link href="/spades/join" className="sp-btn sp-btn-ghost">I have an access code</Link>
        </div>
      </Shell>
    )
  }
  if (viewer.kind !== 'player') {
    return (
      <Shell active="play" online={online} viewer={viewer}>
        <div className="sp-wrap-narrow grid gap-3">
          <h1 className="sp-display text-4xl">Signed in as staff</h1>
          <p style={{ color: 'var(--sp-muted)' }}>You are signed in as {viewer.name}. Use the table dashboard to follow matches.</p>
          <Link href="/spades/supervisor" className="sp-btn sp-btn-gold">Open table dashboard</Link>
        </div>
      </Shell>
    )
  }

  const me = data.me
  const T = data.tournament
  return (
    <Shell active="play" online={online} viewer={viewer}>
      <div className="sp-wrap-narrow grid gap-4">
        <div>
          <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>{T.name}</p>
          <h1 className="sp-display text-3xl mt-1">{viewer.name}{viewer.isCaptain ? ' (Scorekeeper)' : ''}</h1>
          {me?.team && <p className="sp-serif italic text-lg">Team {me.team.name} · with {me.team.players.filter((p: any) => p.id !== viewer.playerId).map((p: any) => p.name).join('')}</p>}
        </div>
        {me?.champion && (
          <div className="sp-card-paper p-6 text-center">
            <p className="sp-label">Champions</p>
            <p className="sp-display text-4xl">{me.team.name}</p>
            <p className="sp-serif italic mt-2">Congratulations. See the director for the trophy.</p>
          </div>
        )}
        {me?.team && me.team.status !== 'approved' ? (
          <Empty title={me.team.status === 'waitlist' ? 'You are on the waitlist' : me.team.status === 'rejected' ? 'Registration not accepted' : 'Waiting for the director to approve your team'}>
            {me.team.status === 'waitlist'
              ? 'The bracket is full. If a spot opens, the director moves you in and this screen updates by itself.'
              : me.team.status === 'rejected'
                ? 'See the tournament director.'
                : 'Check in with the tournament director. Keep this page open; it updates by itself.'}
          </Empty>
        ) : me?.activeMatch ? (
          me.activeMatch.match.status === 'ready' ? (
            <ReadyCard d={me.activeMatch} act={act} />
          ) : (
            <MatchPanel d={me.activeMatch} act={act} serverNow={serverNow} />
          )
        ) : me?.eliminated ? (
          <Empty title="Thanks for playing">Your run is over tonight. Follow the rest of the bracket live.</Empty>
        ) : !T.bracketPublished ? (
          <Empty title="Waiting for the bracket">
            The director draws the bracket after check in closes. This screen updates by itself. {me?.team?.checkedIn ? 'Your team is checked in.' : 'Check in with the director when you arrive.'}
          </Empty>
        ) : (
          <Empty title="Waiting for your next match">Your next opponent is decided when the other match finishes. This screen updates by itself.</Empty>
        )}
        {me?.finished?.length > 0 && (
          <section className="sp-card p-4">
            <h2 className="sp-display text-xl mb-2">Your results</h2>
            <ul className="grid gap-2">
              {me.finished.map((m: any) => {
                const won = m.winner === me.team?.id
                return (
                  <li key={m.id}>
                    <Link href={`/spades/match/${m.id}`} className="flex justify-between p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
                      <span>{m.roundName}</span>
                      <span className={`sp-chip ${won ? 'sp-chip-live' : 'sp-chip-bad'}`}>{won ? 'Won' : 'Lost'} {m.scoreA} to {m.scoreB}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
        <Link href="/spades/bracket" className="sp-btn sp-btn-ghost">See the full bracket</Link>
      </div>
    </Shell>
  )
}
