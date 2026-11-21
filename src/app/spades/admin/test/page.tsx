'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { MyTable } from '../../_components/MyTable'
import { useSpades, type ActResult } from '../../_components/useSpades'
import { ErrorBox, Feedback, Loading, MatchTimer, Shell, StatusChip } from '../../_components/ui'

// Test Mode console: one screen, four simulated phones. Each panel loads the
// real player dashboard as that player (director only, test events only),
// so everything you tap here is exactly what a player would do.

function PlayerPhone({ t, player, teamName }: { t: string; player: any; teamName: string }) {
  const { data, act, serverNow, online } = useSpades<any>('play', { t, as: player.id })
  return (
    <div className="rounded-3xl p-3" style={{ border: '3px solid var(--sp-line)', background: 'rgba(0,0,0,0.25)' }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="sp-label">{teamName} · {player.name}{player.isCaptain ? ' (Captain)' : ''}</span>
        <span className={`sp-chip ${online ? 'sp-chip-live' : 'sp-chip-bad'}`}>{online ? 'Live' : 'Offline'}</span>
      </div>
      {data?.me ? <MyTable data={data} act={act} serverNow={serverNow} compact /> : <Loading label="Loading phone" />}
    </div>
  )
}

function Console() {
  const t = useSearchParams().get('t') || ''
  const { data, error, status, loading, online, act, serverNow, reload } = useSpades<any>('admin', { t })
  const [focus, setFocus] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  if (loading && !data) return <Shell active="admin"><Loading /></Shell>
  if (status === 401 || status === 403) return <Shell active="admin"><div className="sp-wrap-narrow grid gap-3"><ErrorBox message="Director sign in required" /><Link href="/spades/admin" className="sp-btn">Director sign in</Link></div></Shell>
  if (!data?.tournamentFull) return <Shell active="admin" online={online}><div className="sp-wrap-narrow"><ErrorBox message={error || 'Could not load'} onRetry={reload} /></div></Shell>
  const T = data.tournamentFull
  if (!T.isTest) return <Shell active="admin"><div className="sp-wrap-narrow"><ErrorBox message="Test Mode only works on test matches. Create one on the Director page, Test Mode tab." /></div></Shell>

  const m = data.matches.find((x: any) => x.resultKind !== 'bye')
  const teams: any[] = data.teamsFull
  const phones = teams.flatMap((tm: any) => tm.players.map((p: any) => ({ ...p, teamName: tm.name })))
  const go = async (action: string, payload: Record<string, unknown>, ok: string): Promise<ActResult> => {
    setBusy(true)
    setMsg(null)
    const r = await act(action, payload)
    setBusy(false)
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error || 'Failed' })
    return r
  }
  const startOver = async () => {
    if (!confirm('Delete this test match and start a fresh one?')) return
    const g = T.gamesToWin
    const target = m?.target || 100
    const del = await go('deleteTest', { tournamentId: T.id }, 'Deleted')
    if (!del.ok) return
    const r = await go('createTest', { gamesToWin: g, target }, 'Fresh test match ready')
    if (r.ok) window.location.href = `/spades/admin/test?t=${r.data.slug}`
  }

  return (
    <Shell active="admin" online={online} viewer={data.viewer} wide>
      <div className="sp-wrap grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>Test Mode · not official</p>
            <h1 className="sp-display text-3xl mt-1">{T.name}</h1>
            <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Every panel below is exactly what that player sees on their phone. Tap through bids, books and confirmations for all four.</p>
          </div>
          <Link href={`/spades/admin?t=${T.slug}`} className="sp-btn sp-btn-sm sp-btn-ghost">Full director view</Link>
        </div>

        {m && (
          <section className="sp-card p-4 grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip label={m.label} />
                <span className="font-bold">{data.teams.find((x: any) => x.id === m.teamA)?.name} {m.status === 'ready' ? 'vs' : `${m.scoreA} to ${m.scoreB}`} {data.teams.find((x: any) => x.id === m.teamB)?.name}</span>
                {m.gamesToWin > 1 && <span className="text-sm" style={{ color: 'var(--sp-muted)' }}>Game {m.currentGame} · games {m.gamesA} to {m.gamesB}</span>}
              </div>
              {m.startedAt && <MatchTimer m={m} serverNow={serverNow} />}
            </div>
            <div className="flex flex-wrap gap-2">
              {m.status === 'ready' && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => go('startMatch', { matchId: m.id }, 'Game on: bidding is unlocked')}>Begin game now</button>}
              {m.status === 'ready' && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => go('scheduleRound', { tournamentId: T.id, round: 1, scheduledAt: new Date(serverNow() + 60000).toISOString(), autoStart: true }, 'Starts on its own in 1 minute. Watch the countdowns.')}>Auto start in 1 minute</button>}
              {m.status === 'live' && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => go('pause', { matchId: m.id }, 'Paused')}>Pause</button>}
              {m.status === 'paused' && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => go('resume', { matchId: m.id }, 'Resumed')}>Resume</button>}
              {['live', 'paused', 'completed', 'final'].includes(m.status) && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => go('resetMatch', { matchId: m.id, reason: 'Test restart' }, 'Restarted from zero')}>Restart game</button>}
              {['live', 'paused'].includes(m.status) && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => go('endNow', { matchId: m.id, reason: 'Test: ended early' }, 'Ended, leader wins')}>End now (leader wins)</button>}
              {m.status === 'completed' && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => go('finalize', { matchId: m.id }, 'Finalized. Winner crowned.')}>Finalize winner</button>}
              <Link href={`/spades/match/${m.id}`} className="sp-btn sp-btn-sm sp-btn-ghost">Supervisor view</Link>
              <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={startOver}>Start over</button>
              <button className="sp-btn sp-btn-sm sp-btn-danger" disabled={busy} onClick={async () => { if (confirm('Delete this test match?')) { const r = await go('deleteTest', { tournamentId: T.id }, 'Deleted'); if (r.ok) window.location.href = '/spades/admin' } }}>Delete</button>
            </div>
            <Feedback msg={msg} />
          </section>
        )}

        {/* Phones: all four side by side on a big screen, one at a time on a phone. */}
        <div className="flex gap-1 p-1 rounded-xl lg:hidden overflow-x-auto" style={{ background: 'rgba(0,0,0,0.3)' }} role="tablist">
          {phones.map((p, i) => (
            <button key={p.id} role="tab" aria-selected={focus === i} className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap" style={focus === i ? { background: 'var(--sp-cream)', color: 'var(--sp-ink)' } : { color: 'var(--sp-muted)' }} onClick={() => setFocus(i)}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 2xl:grid-cols-4 gap-4">
          {phones.map((p, i) => (
            <div key={p.id} className={focus === i ? '' : 'hidden lg:block'}>
              <PlayerPhone t={T.slug} player={p} teamName={p.teamName} />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

export default function Page() {
  return <Suspense fallback={<Loading />}><Console /></Suspense>
}
