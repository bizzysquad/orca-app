'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSpades } from '../_components/useSpades'
import { Empty, ErrorBox, Feedback, Loading, MatchTimer, Shell, StatusChip } from '../_components/ui'

export default function SupervisorPage() {
  const { data, error, status, loading, online, act, serverNow, reload } = useSpades<any>('supervisor')
  const [filter, setFilter] = useState<'all' | 'mine' | 'action'>('all')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  if (loading && !data) return <Shell active="supervisor"><Loading /></Shell>
  if (status === 401 || !data?.cards) {
    return (
      <Shell active="supervisor" online={online} viewer={data?.viewer}>
        <div className="sp-wrap-narrow grid gap-4">
          <h1 className="sp-display text-4xl">Table dashboard</h1>
          {status === 401 ? (
            <Empty title="Staff only">Supervisors sign in with the staff invitation link from the tournament director. Directors sign in on the Director page.</Empty>
          ) : <ErrorBox message={error || 'Could not load'} onRetry={reload} />}
          <Link href="/spades/admin" className="sp-btn">Director sign in</Link>
        </div>
      </Shell>
    )
  }
  const v = data.viewer
  const names = new Map<string, string>(data.teamsFull.map((t: any) => [t.id, t.name]))
  const live = data.cards.filter((c: any) => !['pending'].includes(c.match.status))
  const shown = live.filter((c: any) => filter === 'all' ? true : filter === 'mine' ? c.mine || !c.table?.supervisor : c.pending.length > 0)
  const quick = async (action: string, payload: Record<string, unknown>, ok: string) => {
    const r = await act(action, payload)
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error || 'Failed' })
  }

  return (
    <Shell active="supervisor" online={online} viewer={v} wide>
      <div className="sp-wrap grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>{data.tournament.name}</p>
            <h1 className="sp-display text-4xl mt-1">Tables</h1>
            <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Signed in as {v.name} ({v.role === 'director' ? 'Director' : 'Supervisor'}). {data.openDisputes ? <b style={{ color: 'var(--sp-red)' }}>{data.openDisputes} open dispute{data.openDisputes > 1 ? 's' : ''}</b> : 'No open disputes.'}</p>
          </div>
          <div className="flex gap-1 p-1 rounded-xl" role="tablist" style={{ background: 'rgba(0,0,0,0.3)' }}>
            {(['all', 'mine', 'action'] as const).map(f => (
              <button key={f} role="tab" aria-selected={filter === f} className="px-3 py-2 rounded-lg text-sm font-bold" style={filter === f ? { background: 'var(--sp-cream)', color: 'var(--sp-ink)' } : { color: 'var(--sp-muted)' }} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All tables' : f === 'mine' ? 'My tables' : 'Needs action'}
              </button>
            ))}
          </div>
        </div>
        <Feedback msg={msg} />

        {shown.length === 0 ? (
          <Empty title={live.length ? 'Nothing here' : 'No matches yet'}>{live.length ? 'Try another filter.' : 'Matches show up once the director publishes the bracket.'}</Empty>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {shown.map((d: any) => {
              const m = d.match
              const c = d.current
              const canAct = d.viewer.canSupervise
              return (
                <article key={m.id} className="sp-card p-4 grid gap-3" style={d.pending.length ? { borderColor: d.current?.status === 'disputed' || d.disputes.some((x: any) => x.status === 'open') ? 'var(--sp-red)' : 'var(--sp-gold)' } : undefined}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="sp-display text-3xl">T{d.table?.number ?? '?'}</span>
                      <div>
                        <div className="sp-label">{m.roundName}</div>
                        <div className="text-xs" style={{ color: 'var(--sp-muted)' }}>Supervisor: {d.table?.supervisor || 'Unassigned'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <StatusChip label={m.label} />
                      <div className="mt-1"><MatchTimer m={m} serverNow={serverNow} /></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['a', 'b'] as const).map(side => {
                      const t = side === 'a' ? d.teamA : d.teamB
                      return (
                        <div key={side} className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
                          <div className="font-black truncate">{t?.name}</div>
                          <div className="text-xs truncate" style={{ color: 'var(--sp-muted)' }}>{t?.players.map((p: any) => p.name + (p.isCaptain ? ' (C)' : '')).join(' & ')}</div>
                          <div className="flex items-end justify-between mt-1">
                            <span className="sp-display sp-num text-4xl">{side === 'a' ? m.scoreA : m.scoreB}</span>
                            <span className="text-xs sp-num">bags {side === 'a' ? m.bagsA : m.bagsB}</span>
                          </div>
                          {c && <div className="text-xs mt-1">Bid: <b className="sp-num">{c.teamBid[side] ?? (c.seats.filter((s: any) => s.side === side && s.submitted).length + '/2 in')}</b></div>}
                        </div>
                      )
                    })}
                  </div>
                  <div className="text-sm flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--sp-muted)' }}>
                    {c && <span>Hand <b style={{ color: 'var(--sp-cream)' }}>{c.handNumber}</b>{c.isTiebreak ? ' (tiebreaker)' : ''}</span>}
                    <span>To {m.target}</span>
                    {d.history.length > 0 && (() => { const h = d.history[d.history.length - 1]; return <span>Last verified: hand {h.handNumber}, {h.a.points > 0 ? '+' : ''}{h.a.points} / {h.b.points > 0 ? '+' : ''}{h.b.points}</span> })()}
                  </div>
                  {d.pending.length > 0 && (
                    <ul className="grid gap-1">
                      {d.pending.map((p: string) => <li key={p} className="sp-banner sp-banner-warn text-sm py-2">{p}</li>)}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/spades/match/${m.id}`} className="sp-btn sp-btn-sm sp-btn-gold">View match</Link>
                    {canAct && c?.status === 'bidding' && <Link href={`/spades/match/${m.id}#hand`} className="sp-btn sp-btn-sm">Review bids</Link>}
                    {canAct && c?.status === 'review' && <Link href={`/spades/match/${m.id}#staff`} className="sp-btn sp-btn-sm">Verify hand</Link>}
                    {canAct && d.disputes.some((x: any) => x.status === 'open') && <Link href={`/spades/match/${m.id}#staff`} className="sp-btn sp-btn-sm sp-btn-danger">Resolve dispute</Link>}
                    {canAct && m.status === 'live' && <button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => quick('pause', { matchId: m.id }, `Table ${d.table?.number} paused`)}>Pause match</button>}
                    {canAct && m.status === 'paused' && <button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => quick('resume', { matchId: m.id }, `Table ${d.table?.number} resumed`)}>Resume</button>}
                    {canAct && v.role !== 'director' && ['live', 'paused', 'completed'].includes(m.status) && (
                      <button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => { const reason = prompt('What do you need the director for?'); if (reason) quick('dispute', { matchId: m.id, handId: c?.id || null, kind: 'director_request', reason }, 'Director notified') }}>Request director</button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <section className="sp-card p-4">
          <h2 className="sp-display text-xl mb-3">Check in</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {data.teamsFull.map((t: any) => (
              <button
                key={t.id}
                className={`sp-btn sp-btn-sm ${t.checkedIn ? 'sp-btn-gold' : 'sp-btn-ghost'} justify-between`}
                aria-pressed={t.checkedIn}
                onClick={() => quick('checkIn', { teamId: t.id, present: !t.checkedIn }, `${t.name} ${t.checkedIn ? 'unmarked' : 'checked in'}`)}
              >
                <span className="truncate">{t.name}</span><span>{t.checkedIn ? 'Here' : 'Not yet'}</span>
              </button>
            ))}
          </div>
          {data.teamsFull.length === 0 && <p style={{ color: 'var(--sp-muted)' }}>No approved teams yet.</p>}
          <p className="text-xs mt-2" style={{ color: 'var(--sp-dim)' }}>{data.teamsFull.length} approved teams.</p>
        </section>
      </div>
    </Shell>
  )
}
