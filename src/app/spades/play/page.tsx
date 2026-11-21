'use client'

import Link from 'next/link'
import { MatchPanel } from '../_components/MatchPanel'
import { useSpades } from '../_components/useSpades'
import { Empty, ErrorBox, Loading, Shell } from '../_components/ui'

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
            The phone that registers your team keeps score for it all night. Already registered on another phone? Use that phone, or ask the tournament director for a sign in link.
          </Empty>
          {data.tournament.registrationOpen && !data.tournament.rosterLocked && <Link href="/spades/register" className="sp-btn sp-btn-gold">Register a team</Link>}
          <Link href="/spades/join" className="sp-btn sp-btn-ghost">I have a sign in link from the director</Link>
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
            <Empty title="Your match is up next">
              {me.activeMatch.table ? `Head to table ${me.activeMatch.table.number}. ` : ''}
              Opponent: {me.activeMatch.viewer.side === 'a' ? me.activeMatch.teamB?.name : me.activeMatch.teamA?.name}. Your game appears here the moment the director taps Begin.
            </Empty>
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
