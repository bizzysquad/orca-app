'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { Bracket } from '../_components/Bracket'
import { EndMatch } from '../_components/MatchPanel'
import { postAuth, useSpades, type ActResult } from '../_components/useSpades'
import { normalizeRules, ruleSummary } from '@/lib/spades/rules'

const defaultSections = (r: any) => ruleSummary(normalizeRules(r))
const NL = String.fromCharCode(10)
import { ErrorBox, Feedback, Loading, MatchTimer, Shell, StatusChip, fmtTime } from '../_components/ui'

type Act = (action: string, payload?: Record<string, unknown>) => Promise<ActResult>
type Msg = { ok: boolean; text: string } | null
const TABS = ['Activity', 'Events', 'Winners', 'Settings', 'Test Mode'] as const

function useRun(act: Act) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const run = async (action: string, payload: Record<string, unknown>, ok = 'Saved'): Promise<ActResult> => {
    setBusy(true)
    setMsg(null)
    const r = await act(action, payload)
    setBusy(false)
    setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error || 'Failed' })
    return r
  }
  return { busy, msg, run, setMsg }
}

function Login() {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="sp-card p-5 grid gap-3"
      onSubmit={async e => {
        e.preventDefault()
        setBusy(true)
        const r = await postAuth({ action: 'login', password: pw })
        setBusy(false)
        if (r.ok) window.location.reload()
        else setErr(r.data?.error || 'Sign in failed')
      }}
    >
      <h2 className="sp-display text-2xl">Director sign in</h2>
      <label className="sp-field"><span>Director password</span>
        <input className="sp-input" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} />
      </label>
      {err && <div className="sp-banner sp-banner-bad text-sm" role="alert">{err}</div>}
      <button className="sp-btn sp-btn-gold" disabled={busy || !pw}>{busy ? 'Signing in' : 'Sign in'}</button>
      <p className="text-xs" style={{ color: 'var(--sp-dim)' }}>Supervisors: sign in at /spades/join with the access code from the director.</p>
    </form>
  )
}

function Admin() {
  const t = useSearchParams().get('t')
  const { data, error, status, loading, online, act, serverNow, reload } = useSpades<any>('admin', { t })
  const [tab, setTab] = useState<(typeof TABS)[number]>('Activity')
  useEffect(() => {
    try { const s = sessionStorage.getItem('sp-admin-tab'); if (s && (TABS as readonly string[]).includes(s)) setTab(s as any) } catch {}
  }, [])
  useEffect(() => { try { sessionStorage.setItem('sp-admin-tab', tab) } catch {} }, [tab])

  if (loading && !data) return <Shell active="admin"><Loading /></Shell>
  if (status === 401 || status === 403) {
    return <Shell active="admin" online={online} viewer={data?.viewer}><div className="sp-wrap-narrow grid gap-4"><h1 className="sp-display text-4xl">Director</h1>{data?.viewer?.kind === 'staff' && <div className="sp-banner sp-banner-warn text-sm">You are signed in as a supervisor. Director access needs the director password.</div>}<Login /></div></Shell>
  }
  if (data?.noEvent) return <NoEventAdmin data={data} act={act} online={online} />
  if (!data?.tournamentFull) return <Shell active="admin" online={online}><div className="sp-wrap-narrow"><ErrorBox message={error || 'Could not load'} onRetry={reload} /></div></Shell>
  const T = data.tournamentFull
  return (
    <Shell active="admin" online={online} viewer={data.viewer} wide>
      <div className="sp-wrap grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>Tournament director</p>
            <h1 className="sp-display text-3xl mt-1">{T.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="sp-chip sp-chip-info">{T.status}</span>
              <span className="sp-chip sp-chip-warn">{EVENT_LABEL[T.eventType] || T.eventType}{T.gamesToWin > 1 ? ` · best of ${T.gamesToWin * 2 - 1}` : ''}</span>
              {T.isTest && <span className="sp-chip sp-chip-bad">Test event, not official</span>}
              <span className={`sp-chip ${T.registrationOpen ? 'sp-chip-live' : 'sp-chip-dim'}`}>Registration {T.registrationOpen ? 'open' : 'closed'}</span>
              <span className={`sp-chip ${T.rosterLocked ? 'sp-chip-warn' : 'sp-chip-dim'}`}>Roster {T.rosterLocked ? 'locked' : 'open'}</span>
              <span className={`sp-chip ${T.bracketPublished ? 'sp-chip-live' : 'sp-chip-dim'}`}>Bracket {T.bracketPublished ? 'published' : 'hidden'}</span>
              {data.openDisputes > 0 && <span className="sp-chip sp-chip-bad">{data.openDisputes} open disputes</span>}
            </div>
          </div>
          {data.tournaments && data.tournaments.length > 1 && (
            <select className="sp-select" style={{ maxWidth: 280 }} value={T.slug} onChange={e => { window.location.href = `/spades/admin?t=${e.target.value}` }} aria-label="Switch tournament">
              {data.tournaments.map((x: any) => <option key={x.slug} value={x.slug}>{x.name} ({x.status})</option>)}
            </select>
          )}
        </div>
        <nav className="flex gap-1 overflow-x-auto p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }} role="tablist">
          {TABS.map(x => (
            <button key={x} role="tab" aria-selected={tab === x} className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap" style={tab === x ? { background: 'var(--sp-cream)', color: 'var(--sp-ink)' } : { color: 'var(--sp-muted)' }} onClick={() => setTab(x)}>
              {x}
            </button>
          ))}
        </nav>
        {tab === 'Activity' && <ActivityHub data={data} act={act} serverNow={serverNow} />}
        {tab === 'Events' && <EventsTab data={data} act={act} />}
        {tab === 'Winners' && <WinnersTab data={data} />}
        {tab === 'Settings' && <SettingsTab data={data} act={act} />}
        {tab === 'Test Mode' && <TestModeTab data={data} act={act} />}
      </div>
    </Shell>
  )
}

// ─── Run ────────────────────────────────────────────────────────────────────

// Close registration, set up the games with whoever signed up, then offer
// to begin them all right away.
async function closeAndBegin(T: any, data: any, run: (a: string, p: Record<string, unknown>, ok?: string) => Promise<ActResult>) {
  const teams = data.allTeams.filter((x: any) => x.status === 'approved' || x.status === 'pending').length
  if (!confirm(`Close registration with ${teams} team${teams === 1 ? '' : 's'}? ${T.useBracket ? 'The bracket is drawn with everyone who signed up.' : 'Teams are paired into games.'}`)) return
  const locked = await run('rosterLock', { tournamentId: T.id, locked: true }, 'Registration closed')
  if (!locked.ok) return
  if (teams < 2) return
  const setup = T.useBracket
    ? await run('publishBracket', { tournamentId: T.id, published: true }, 'Bracket drawn and live')
    : await run('autoPair', { tournamentId: T.id }, 'Games set up')
  if (!setup.ok) return
  if (confirm('Registration is closed and the games are set. Begin all the games now?')) {
    const r = await run('startAll', { tournamentId: T.id }, 'Games started. Good luck!')
    if (r.ok && r.data?.skipped?.length) alert(`${r.data.started} started. ${r.data.skipped.length} could not start:\n${r.data.skipped.map((x: any) => x.reason).join('\n')}`)
  }
}

function RunTab({ data, act, serverNow }: { data: any; act: Act; serverNow: () => number }) {
  const T = data.tournamentFull
  const { busy, msg, run } = useRun(act)
  const teams = new Map<string, string>(data.allTeams.map((x: any) => [x.id, x.name]))
  const approved = data.allTeams.filter((x: any) => x.status === 'approved')
  const checkedIn = approved.filter((x: any) => x.checkedIn).length
  const rounds = Array.from({ length: T.rounds }, (_, i) => i + 1)
  const open = !T.useBracket
  const step = open ? (approved.length < 2 ? 1 : !data.matches.length ? 2 : 3) : !T.rosterLocked ? 1 : !data.matches.length ? 2 : !T.bracketPublished ? 3 : 4
  return (
    <div className="grid gap-4">
      <section className="sp-card p-4 grid gap-3">
        <h2 className="sp-display text-xl">Step by step</h2>
        <ol className="grid gap-2">
          {(open ? [
            `Teams: ${approved.length} of ${T.teamLimit} approved, ${checkedIn} checked in.`,
            'Close registration and teams are paired into games for you, or add games by hand below.',
            'Tap Begin on a game, or Begin all ready games. Finalize each game when it ends; the standings update.',
          ] : [
            `Teams: ${approved.length} of ${T.teamLimit} approved, ${checkedIn} checked in.`,
            'Close registration whenever you are ready, even with fewer teams. The bracket is drawn with whoever signed up, and you can begin every game in one tap.',
            'Tap Begin to start round 1. Teams wait on their phones until you do. Finalize each match when it completes to move winners forward.',
          ]).map((s, i) => (
            <li key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: step === i + 1 ? 'rgba(224,173,79,0.15)' : 'rgba(0,0,0,0.2)', border: step === i + 1 ? '1px solid var(--sp-gold)' : '1px solid transparent' }}>
              <span className="sp-display text-xl" style={{ color: step > i + 1 ? 'var(--sp-green)' : 'var(--sp-gold)' }}>{step > i + 1 ? '✓' : i + 1}</span><span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          {!T.rosterLocked && (T.registrationOpen ? <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => closeAndBegin(T, data, run)}>Close registration</button> : <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => run('updateTournament', { tournamentId: T.id, patch: { registration_open: true } }, 'Registration open')}>Open registration</button>)}
{!T.rosterLocked && !T.registrationOpen && data.allTeams.some((x: any) => x.status === 'approved' || x.status === 'pending') && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => closeAndBegin(T, data, run)}>Set up games</button>}
          {open ? null : !T.rosterLocked ? (
            <span />
          ) : T.status !== 'live' && T.status !== 'completed' && (
            <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => { if (confirm('Reopen registration? This clears the bracket so it can be drawn again.')) run('rosterLock', { tournamentId: T.id, locked: false }, 'Roster unlocked') }}>Reopen registration</button>
          )}
          {T.useBracket && T.rosterLocked && data.matches.length > 0 && !data.matches.some((m: any) => ['live', 'paused', 'completed'].includes(m.status) || (m.status === 'final' && m.resultKind !== 'bye')) && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={async () => { if (!confirm('Redraw the bracket at random?')) return; const r = await run('generateBracket', { tournamentId: T.id, mode: 'random' }, 'Redrawn'); if (r.ok) await run('publishBracket', { tournamentId: T.id, published: true }, 'Redrawn and live') }}>Redraw bracket</button>}
          {T.rosterLocked && data.matches.length > 0 && !T.bracketPublished && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => run('publishBracket', { tournamentId: T.id, published: true }, 'Bracket published')}>Publish bracket</button>}
          <Link href="/spades/display" target="_blank" className="sp-btn sp-btn-sm sp-btn-ghost">Open TV display</Link>
          <Link href="/spades/print?kind=scorecards" target="_blank" className="sp-btn sp-btn-sm sp-btn-ghost">Print backup scorecards</Link>
        </div>
        <Feedback msg={msg} />
      </section>

      {open && <AddGame data={data} act={act} />}

      {data.matches.length > 0 && (
        <section className="sp-card p-4 grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="sp-display text-xl">{open ? 'Games' : 'Matches'}</h2>
            <BulkStart T={T} data={data} act={act} />
          </div>
          {(open ? [1] : rounds).map(r => {
            const ms = data.matches.filter((m: any) => m.round === r)
            const readyCount = ms.filter((m: any) => m.status === 'ready').length
            return (
              <div key={r} className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black" style={{ color: 'var(--sp-gold)' }}>{open ? `${ms.length} game${ms.length === 1 ? '' : 's'}` : ms[0]?.roundName}</h3>
                  {readyCount > 0 && <span className="text-xs" style={{ color: 'var(--sp-muted)' }}>{ms.filter((m: any) => m.status === 'ready' && m.readyA && m.readyB).length} of {readyCount} tables ready</span>}
                  {ms.some((m: any) => ['pending', 'ready'].includes(m.status) && m.resultKind !== 'bye') && <ScheduleRound T={T} round={r} ms={ms} act={act} />}
                  {readyCount > 0 && T.bracketPublished && !open && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => { if (confirm(`Start ${readyCount} ${ms[0]?.roundName} match${readyCount > 1 ? 'es' : ''} now? Every team at those tables sees their game begin and the clocks start.`)) run('startRound', { tournamentId: T.id, round: r }, 'Game on') }}>Begin {ms[0]?.roundName}</button>}
                </div>
                {ms.map((m: any) => <MatchRow key={m.id} m={m} data={data} act={act} teams={teams} serverNow={serverNow} />)}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}

function MatchRow({ m, data, act, teams, serverNow }: { m: any; data: any; act: Act; teams: Map<string, string>; serverNow: () => number }) {
  const { busy, msg, run } = useRun(act)
  const card = data.cards.find((c: any) => c.match.id === m.id)
  const T = data.tournamentFull
  const tableId = data.tables.find((x: any) => x.number === m.table)?.id || ''
  if (m.resultKind === 'bye') return <div className="text-sm p-2" style={{ color: 'var(--sp-dim)' }}>Bye: {teams.get(m.winner) || ''} advances</div>
  return (
    <div className="p-3 rounded-lg grid gap-2" style={{ background: 'rgba(0,0,0,0.22)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold">{teams.get(m.teamA) || 'TBD'} <span className="sp-num" style={{ color: 'var(--sp-gold)' }}>{m.status !== 'pending' && m.status !== 'ready' ? `${m.scoreA} to ${m.scoreB}` : 'vs'}</span> {teams.get(m.teamB) || 'TBD'}</div>
        <div className="flex items-center gap-2"><StatusChip label={m.label} />{m.startedAt && <MatchTimer m={m} serverNow={serverNow} />}</div>
      </div>
      {m.status === 'ready' && m.teamA && m.teamB && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`sp-chip ${m.readyA ? 'sp-chip-live' : 'sp-chip-dim'}`}>{teams.get(m.teamA)}: {m.readyA ? 'ready' : 'not ready'}</span>
          <span className={`sp-chip ${m.readyB ? 'sp-chip-live' : 'sp-chip-dim'}`}>{teams.get(m.teamB)}: {m.readyB ? 'ready' : 'not ready'}</span>
          {m.readyA && m.readyB && <span className="sp-chip sp-chip-warn">Both ready, tap Begin</span>}
        </div>
      )}
      {card?.pending?.length > 0 && <div className="text-xs" style={{ color: 'var(--sp-gold)' }}>{card.pending.join(' · ')}</div>}
      {card && ['ready', 'live', 'paused', 'completed'].includes(m.status) && <EndMatch d={card} act={act} names={{ a: teams.get(m.teamA) || 'Team A', b: teams.get(m.teamB) || 'Team B' }} />}
      <div className="flex flex-wrap items-center gap-2">
        {['pending', 'ready'].includes(m.status) && (
          <select className="sp-select" style={{ maxWidth: 150, minHeight: 40, padding: '6px 10px' }} value={tableId} aria-label="Table" onChange={e => run('editMatch', { matchId: m.id, tableId: e.target.value || null }, 'Table set')}>
            <option value="">No table</option>
            {data.tables.map((x: any) => <option key={x.id} value={x.id}>Table {x.number}</option>)}
          </select>
        )}
        {!T.useBracket && ['ready', 'pending'].includes(m.status) && (
          <>
            {(['teamA', 'teamB'] as const).map(k => (
              <select key={k} className="sp-select" style={{ maxWidth: 170, minHeight: 40, padding: '6px 10px' }} aria-label={k === 'teamA' ? 'Team A' : 'Team B'} value={m[k] || ''}
                onChange={e => run('gameTeams', { matchId: m.id, teamAId: k === 'teamA' ? e.target.value : m.teamA, teamBId: k === 'teamB' ? e.target.value : m.teamB }, 'Matchup changed')}>
                {data.allTeams.filter((x: any) => x.status === 'approved').map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            ))}
            <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => { if (confirm('Delete this game?')) run('deleteGame', { matchId: m.id }, 'Game deleted') }}>Delete</button>
          </>
        )}
        {m.status === 'ready' && T.bracketPublished && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => run('startMatch', { matchId: m.id }, 'Game on')}>Begin game</button>}
        {m.status === 'completed' && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => { if (confirm(`Finalize: ${teams.get(m.winner)} wins ${Math.max(m.scoreA, m.scoreB)} to ${Math.min(m.scoreA, m.scoreB)}?`)) run('finalize', { matchId: m.id }, 'Finalized, winner advanced') }}>Finalize {teams.get(m.winner)}</button>}
        {m.status === 'live' && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => run('pause', { matchId: m.id }, 'Paused')}>Pause</button>}
        {card?.current && ['live', 'paused'].includes(m.status) && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => { if (confirm(`Redeal hand ${card.current.handNumber}?`)) run('voidHand', { handId: card.current.id, reason: '' }, 'Redealt') }}>Redeal</button>}
        {['live', 'paused', 'completed', 'final'].includes(m.status) && m.resultKind !== 'bye' && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => { if (confirm('Restart this game from zero?')) run('resetMatch', { matchId: m.id, reason: '' }, 'Restarted') }}>Restart</button>}
        {m.status === 'paused' && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => run('resume', { matchId: m.id }, 'Resumed')}>Resume</button>}
        {m.teamA && m.teamB && <Link href={`/spades/match/${m.id}`} className="sp-btn sp-btn-sm sp-btn-ghost">Open match</Link>}
        {['pending', 'ready'].includes(m.status) && <span className="text-xs" style={{ color: 'var(--sp-muted)' }}>To {m.target}{m.gamesToWin > 1 ? ` · first to ${m.gamesToWin} games` : ` · ${m.timeLimitMin} min`}{m.scheduledAt ? ` · starts ${new Date(m.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${T.autoStart ? ' (auto)' : ''}` : ''}</span>}
        {['live', 'paused'].includes(m.status) && m.gamesToWin > 1 && <span className="text-xs" style={{ color: 'var(--sp-muted)' }}>Game {m.currentGame} · games {m.gamesA} to {m.gamesB}</span>}
      </div>
      <Feedback msg={msg} />
    </div>
  )
}

// ─── Teams + invitations ────────────────────────────────────────────────────

function inviteUrl(token: string) {
  return `${window.location.origin}/spades/join#${token}`
}

function InviteCard({ inv }: { inv: { name: string; token: string; kind: string; expiresAt: string } }) {
  const [copied, setCopied] = useState(false)
  const text = `Spades HQ access code for ${inv.name}: ${inv.token}. Sign in at ${typeof window !== 'undefined' ? window.location.origin : ''}/spades/join`
  return (
    <div className="sp-card-paper p-5 grid gap-2 justify-items-center text-center">
      <p className="sp-label">{inv.kind === 'staff' ? 'Staff access code' : 'Team access code'}</p>
      <p className="sp-display text-2xl">{inv.name}</p>
      <p className="sp-display sp-num" style={{ fontSize: 42, letterSpacing: '0.08em' }}>{inv.token}</p>
      <p className="text-sm">Type it at <b>orcafin.app/spades/join</b>. Any older code for this person stops working. Expires {new Date(inv.expiresAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.</p>
      <div className="flex flex-wrap gap-2 justify-center">
        <button className="sp-btn sp-btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true) } catch { prompt('Copy this', text) } }}>{copied ? 'Copied' : 'Copy'}</button>
        {typeof navigator !== 'undefined' && 'share' in navigator && <button className="sp-btn sp-btn-sm sp-btn-wine" onClick={() => navigator.share({ title: 'Spades HQ access code', text }).catch(() => {})}>Text it</button>}
      </div>
    </div>
  )
}

const INVITE_LABEL: Record<string, string> = { none: 'No code yet', pending: 'Code given, not used yet', used: 'Code used', revoked: 'Code replaced', expired: 'Code expired' }

function TeamsTab({ data, act }: { data: any; act: Act }) {
  const T = data.tournamentFull
  const { busy, msg, run } = useRun(act)
  const [form, setForm] = useState({ name: '', player1: '', player2: '', captainSeat: 1, contact: '' })
  const [issued, setIssued] = useState<any[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const groups: [string, any[]][] = [
    ['Approved', data.allTeams.filter((x: any) => x.status === 'approved')],
    ['Pending', data.allTeams.filter((x: any) => x.status === 'pending')],
    ['Waitlist', data.allTeams.filter((x: any) => x.status === 'waitlist')],
    ['Rejected', data.allTeams.filter((x: any) => x.status === 'rejected')],
  ]
  const invite = async (action: string, payload: Record<string, unknown>) => {
    const r = await run(action, payload, 'Access code ready above')
    if (r.ok) setIssued(r.data.invites ? r.data.invites : [r.data])
  }
  return (
    <div className="grid gap-4">
      {issued.length > 0 && (
        <section className="grid gap-3">
          <div className="flex items-center justify-between"><h2 className="sp-display text-xl">New access codes</h2><button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => setIssued([])}>Done</button></div>
          <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Codes are shown once. Read the code to the player or text it. Making a new code stops the old one.</p>
          <div className="grid sm:grid-cols-2 gap-3">{issued.map(inv => <InviteCard key={inv.token} inv={inv} />)}</div>
        </section>
      )}
      {!T.rosterLocked && (
        <form className="sp-card p-4 grid gap-3" onSubmit={async e => { e.preventDefault(); const r = await run('addTeam', { tournamentId: T.id, ...form }, 'Team added'); if (r.ok) setForm({ name: '', player1: '', player2: '', captainSeat: 1, contact: '' }) }}>
          <h2 className="sp-display text-xl">Add a team</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <input className="sp-input" placeholder="Team name" aria-label="Team name" maxLength={40} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="sp-input" placeholder="Player 1" aria-label="Player 1" maxLength={40} value={form.player1} onChange={e => setForm({ ...form, player1: e.target.value })} />
            <input className="sp-input" placeholder="Player 2" aria-label="Player 2" maxLength={40} value={form.player2} onChange={e => setForm({ ...form, player2: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <select className="sp-select" aria-label="Captain" value={form.captainSeat} onChange={e => setForm({ ...form, captainSeat: Number(e.target.value) })}>
              <option value={1}>Captain: {form.player1 || 'Player 1'}</option>
              <option value={2}>Captain: {form.player2 || 'Player 2'}</option>
            </select>
            <input className="sp-input" placeholder="Contact (optional)" aria-label="Contact" maxLength={120} value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
            <button className="sp-btn sp-btn-gold" disabled={busy || !form.name || !form.player1 || !form.player2}>Add team</button>
          </div>
        </form>
      )}
      <Feedback msg={msg} />
      {!T.rosterLocked && data.allTeams.some((x: any) => x.status === 'pending') && (
        <div className="sp-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-black">{data.allTeams.filter((x: any) => x.status === 'pending').length} teams waiting for approval</div>
            <div className="text-sm" style={{ color: 'var(--sp-muted)' }}>{T.teamLimit - data.allTeams.filter((x: any) => x.status === 'approved').length} spots left. Teams are approved in the order they signed up.</div>
          </div>
          <button className="sp-btn sp-btn-gold" disabled={busy} onClick={async () => {
            const r = await run('approveAll', { tournamentId: T.id }, 'Approved')
            if (r.ok && r.data?.leftPending) alert(`${r.data.approved} approved. ${r.data.leftPending} still pending because the bracket is full. Waitlist or reject them.`)
          }}>Approve all</button>
        </div>
      )}
      {groups.filter(([, list]) => list.length).map(([label, list]) => (
        <section key={label} className="grid gap-2">
          <h2 className="sp-display text-xl">{label} <span className="sp-num" style={{ color: 'var(--sp-dim)' }}>{list.length}{label === 'Approved' ? `/${T.teamLimit}` : ''}</span></h2>
          {list.map((team: any) => (
            <div key={team.id} className="sp-card p-4 grid gap-3">
              {editing === team.id ? (
                <EditTeam team={team} act={act} onDone={() => setEditing(null)} />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-black text-lg">{team.seed ? <span className="sp-num mr-2" style={{ color: 'var(--sp-gold)' }}>#{team.seed}</span> : null}{team.name}</div>
                      {team.contact && <div className="text-xs" style={{ color: 'var(--sp-muted)' }}>{team.contact}</div>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className={`sp-btn sp-btn-sm ${team.checkedIn ? 'sp-btn-gold' : 'sp-btn-ghost'}`} onClick={() => run('checkIn', { teamId: team.id, present: !team.checkedIn }, team.checkedIn ? 'Unmarked' : 'Checked in')}>{team.checkedIn ? 'Checked in' : 'Check in'}</button>
                      {!T.rosterLocked && team.status !== 'approved' && <button className="sp-btn sp-btn-sm" onClick={() => run('teamStatus', { teamId: team.id, status: 'approved' }, 'Approved')}>Approve</button>}
                      {!T.rosterLocked && team.status !== 'waitlist' && <button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => run('teamStatus', { teamId: team.id, status: 'waitlist' }, 'Moved to waitlist')}>Waitlist</button>}
                      {!T.rosterLocked && team.status === 'pending' && <button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => run('teamStatus', { teamId: team.id, status: 'rejected' }, 'Rejected')}>Reject</button>}
                      <button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => setEditing(team.id)}>Edit</button>
                      {!T.rosterLocked && <button className="sp-btn sp-btn-sm sp-btn-danger" onClick={() => { if (confirm(`Remove ${team.name}?`)) run('removeTeam', { teamId: team.id }, 'Removed') }}>Remove</button>}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {team.players.map((p: any) => (
                      <div key={p.id} className="p-3 rounded-lg flex flex-wrap items-center justify-between gap-2" style={{ background: 'rgba(0,0,0,0.22)' }}>
                        <div>
                          <div className="font-bold">{p.name}{p.isCaptain ? ' (Captain)' : ''}</div>
                          <div className="text-xs" style={{ color: p.invite.activeSessions ? 'var(--sp-green)' : 'var(--sp-muted)' }}>{p.invite.activeSessions ? `Signed in on ${p.invite.activeSessions} phone${p.invite.activeSessions > 1 ? 's' : ''}` : INVITE_LABEL[p.invite.status]}</div>
                        </div>
                        {team.status === 'approved' && (
                          <div className="flex gap-2">
                            <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => {
                              const lost = p.invite.status === 'used'
                              if (lost && !confirm(`${p.name} is already signed in. Make a new code and sign out their old phone?`)) return
                              invite('invite', { playerId: p.id, revokeSessions: lost })
                            }}>{p.invite.status === 'none' ? 'Get code' : 'New code'}</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {team.status === 'approved' && team.players.some((p: any) => p.invite.status === 'none') && (
                    <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => invite('teamInvites', { teamId: team.id })}>Make codes for both</button>
                  )}
                </>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

function EditTeam({ team, act, onDone }: { team: any; act: Act; onDone: () => void }) {
  const [f, setF] = useState({ name: team.name, player1: team.players[0]?.name || '', player2: team.players[1]?.name || '', captainSeat: team.players.find((p: any) => p.isCaptain)?.seat || 1, contact: team.contact || '' })
  const { busy, msg, run } = useRun(act)
  return (
    <form className="grid gap-3" onSubmit={async e => { e.preventDefault(); const r = await run('updateTeam', { teamId: team.id, ...f }, 'Saved'); if (r.ok) onDone() }}>
      <div className="grid sm:grid-cols-3 gap-2">
        <input className="sp-input" aria-label="Team name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
        <input className="sp-input" aria-label="Player 1" value={f.player1} onChange={e => setF({ ...f, player1: e.target.value })} />
        <input className="sp-input" aria-label="Player 2" value={f.player2} onChange={e => setF({ ...f, player2: e.target.value })} />
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        <select className="sp-select" aria-label="Captain" value={f.captainSeat} onChange={e => setF({ ...f, captainSeat: Number(e.target.value) })}>
          <option value={1}>Captain: {f.player1}</option><option value={2}>Captain: {f.player2}</option>
        </select>
        <input className="sp-input" aria-label="Contact" placeholder="Contact" value={f.contact} onChange={e => setF({ ...f, contact: e.target.value })} />
        <div className="flex gap-2"><button className="sp-btn sp-btn-gold flex-1" disabled={busy}>Save</button><button type="button" className="sp-btn sp-btn-ghost" onClick={onDone}>Cancel</button></div>
      </div>
      <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>Changing a player name means a new person: their old link and phone stop working and they need a new invitation.</p>
      <Feedback msg={msg} />
    </form>
  )
}

// ─── Staff + tables ─────────────────────────────────────────────────────────

// ─── Bracket ────────────────────────────────────────────────────────────────

// ─── Disputes, audit, export ────────────────────────────────────────────────

// ─── Settings ───────────────────────────────────────────────────────────────

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function SettingsTab({ data, act }: { data: any; act: Act }) {
  const T = data.tournamentFull
  const { busy, msg, run } = useRun(act)
  const [ev, setEv] = useState({ name: T.name, subtitle: T.subtitle || '', venue: T.venue || '', address: T.address || '', schedule_note: T.scheduleNote || '', award: T.award || '', starts_at: toLocalInput(T.startsAt), ends_at: toLocalInput(T.endsAt) })
  const [r, setR] = useState({ ...T.rules })
  const [limit, setLimit] = useState(String(T.teamLimit))
  const live = data.matches.some((m: any) => ['live', 'paused'].includes(m.status))
  const num = (k: string) => (
    <label className="sp-field"><span>{({ minTeamBid: 'Minimum team bid', targetDefault: 'Target, opening rounds', targetFinal: 'Target, championship', timeDefaultMin: 'Minutes, opening rounds', timeFinalMin: 'Minutes, championship', initialBags: 'Starting bags', pointsPerBook: 'Points per book bid', setPenaltyPerBook: 'Points lost per book when set (0 = none)', bagValue: 'Points per extra book (0 = none)', bagLimit: 'Bags per penalty', bagPenalty: 'Bag penalty points' } as any)[k]}</span>
      <input className="sp-input" inputMode="numeric" value={r[k]} onChange={e => setR({ ...r, [k]: e.target.value.replace(/\D/g, '') })} />
    </label>
  )
  return (
    <div className="grid gap-4">
      <form className="sp-card p-4 grid gap-3" onSubmit={e => { e.preventDefault(); run('updateTournament', { tournamentId: T.id, patch: { ...ev, starts_at: ev.starts_at ? new Date(ev.starts_at).toISOString() : null, ends_at: ev.ends_at ? new Date(ev.ends_at).toISOString() : null } }, 'Event details saved') }}>
        <h2 className="sp-display text-xl">Event details</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {(['name', 'subtitle', 'venue', 'address', 'schedule_note', 'award'] as const).map(k => (
            <label key={k} className="sp-field"><span>{k.replace('_', ' ')}</span><input className="sp-input" value={(ev as any)[k]} onChange={e => setEv({ ...ev, [k]: e.target.value })} /></label>
          ))}
          <label className="sp-field"><span>Starts (your local time)</span><input type="datetime-local" className="sp-input" value={ev.starts_at} onChange={e => setEv({ ...ev, starts_at: e.target.value })} /></label>
          <label className="sp-field"><span>Ends</span><input type="datetime-local" className="sp-input" value={ev.ends_at} onChange={e => setEv({ ...ev, ends_at: e.target.value })} /></label>
        </div>
        <button className="sp-btn sp-btn-gold" disabled={busy}>Save details</button>
      </form>

      <form className="sp-card p-4 grid gap-3" onSubmit={e => { e.preventDefault(); const patch: any = { ...r }; delete patch.customSections; for (const k of Object.keys(patch)) if (typeof patch[k] === 'string' && /^\d+$/.test(patch[k])) patch[k] = Number(patch[k]); run('updateTournament', { tournamentId: T.id, patch: { rules: patch } }, 'Rules saved. They apply to matches that start from now on.') }}>
        <h2 className="sp-display text-xl">House rules</h2>
        {live && <div className="sp-banner sp-banner-warn text-sm">Running matches keep the rules they started with. Changes apply to matches started after you save.</div>}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="sp-field"><span>Bid order</span>
            <select className="sp-select" value={r.bidOrder} onChange={e => setR({ ...r, bidOrder: e.target.value })}>
              <option value="simultaneous">At the same time, hidden until locked</option>
              <option value="sequential">In seat order, earlier bids visible</option>
            </select>
          </label>
          <label className="sp-field"><span>Who keeps score</span>
            <select className="sp-select" value={r.scorekeeping} onChange={e => setR({ ...r, scorekeeping: e.target.value })}>
              <option value="two">Each team captain enters their own team</option>
              <option value="one">One scorekeeper enters everything</option>
            </select>
          </label>
          <label className="sp-field"><span>Match format</span>
            <select className="sp-select" value={r.gamesToWin} onChange={e => setR({ ...r, gamesToWin: Number(e.target.value) })}>
              <option value={1}>Single game</option>
              <option value={2}>Best of 3 (first to 2 games)</option>
              <option value={3}>Best of 5 (first to 3 games)</option>
            </select>
          </label>
          {num('pointsPerBook')}{num('setPenaltyPerBook')}{num('bagValue')}{num('minTeamBid')}{r.bagsEnabled && num('initialBags')}{num('targetDefault')}{num('targetFinal')}{num('timeDefaultMin')}{num('timeFinalMin')}{r.bagsEnabled && num('bagLimit')}{r.bagsEnabled && num('bagPenalty')}
          <label className="flex items-center gap-3 font-bold"><input type="checkbox" className="w-6 h-6" checked={r.bagsEnabled} onChange={e => setR({ ...r, bagsEnabled: e.target.checked })} /> Count bags (10 extra books costs 100 points)</label>
          <label className="flex items-center gap-3 font-bold"><input type="checkbox" className="w-6 h-6" checked={r.requireCaptainApproval} onChange={e => setR({ ...r, requireCaptainApproval: e.target.checked })} /> Extra step: both captains confirm every hand</label>
        </div>
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>Nil and blind nil are off for this engine. Targets and time limits are copied onto each match when the bracket is drawn; adjust a single match from its match page.</p>
        <button className="sp-btn sp-btn-gold" disabled={busy}>Save rules</button>
      </form>

      <RulesTextEditor T={T} act={act} />

      <section className="sp-card p-4 grid gap-3">
        <h2 className="sp-display text-xl">Team limit and waitlist</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="sp-field" style={{ maxWidth: 200 }}><span>Most teams allowed</span>
            <input className="sp-input" inputMode="numeric" value={limit} disabled={data.matches.length > 0} onChange={e => setLimit(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button className="sp-btn sp-btn-sm" disabled={busy || !limit || Number(limit) === T.teamLimit || data.matches.length > 0} onClick={() => run('updateTournament', { tournamentId: T.id, patch: { team_limit: Number(limit) } }, 'Team limit saved')}>Save</button>
          <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => run('updateTournament', { tournamentId: T.id, patch: { waitlist_enabled: !T.waitlistEnabled } }, 'Saved')}>Waitlist {T.waitlistEnabled ? 'on' : 'off'}</button>
        </div>
      </section>

      {data.viewer.kind === 'owner' && (
        <section className="sp-card p-4 grid gap-3">
          <h2 className="sp-display text-xl">This event</h2>
          <div className="flex flex-wrap gap-2">
            {!T.isFeatured && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => run('updateTournament', { tournamentId: T.id, patch: { is_featured: true } }, 'Now the main /spades event')}>Make this the main /spades event</button>}
            {T.status === 'completed' && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => { if (confirm('Archive this tournament? It becomes read only.')) run('updateTournament', { tournamentId: T.id, patch: { status: 'archived' } }, 'Archived') }}>Archive</button>}
          </div>
          <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Create new events on the Events tab.</p>
        </section>
      )}
      <Feedback msg={msg} />
    </div>
  )
}

// Edit the text players see on /spades/rules. One rule per line.
function RulesTextEditor({ T, act }: { T: any; act: Act }) {
  const { busy, msg, run } = useRun(act)
  const custom = T.rules.customSections?.length > 0
  const start = () => (custom ? T.rules.customSections : defaultSections(T.rules)).map((s: any) => ({ title: s.title, text: s.items.join(NL) }))
  const [secs, setSecs] = useState<{ title: string; text: string }[]>(start)
  const set = (i: number, k: 'title' | 'text', v: string) => setSecs(xs => xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const save = (sections: { title: string; items: string[] }[], ok: string) => run('updateTournament', { tournamentId: T.id, patch: { rules: { customSections: sections } } }, ok)
  return (
    <section className="sp-card p-4 grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="sp-display text-xl">Rules page text</h2>
        <span className={`sp-chip ${custom ? 'sp-chip-warn' : 'sp-chip-dim'}`}>{custom ? 'Your custom text' : 'Generated from the settings above'}</span>
      </div>
      <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>This is what players read on the Rules page. One rule per line. Scoring itself always follows the House rules settings above, so keep the two in agreement.</p>
      {secs.map((s, i) => (
        <div key={i} className="grid gap-2 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
          <div className="flex gap-2">
            <input className="sp-input" aria-label={`Section ${i + 1} title`} value={s.title} maxLength={80} onChange={e => set(i, 'title', e.target.value)} />
            <button type="button" className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => setSecs(xs => xs.filter((_, j) => j !== i))} aria-label={`Remove section ${s.title}`}>Remove</button>
          </div>
          <textarea className="sp-textarea" aria-label={`${s.title} rules`} rows={Math.max(3, s.text.split(NL).length + 1)} value={s.text} onChange={e => set(i, 'text', e.target.value)} />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => setSecs(xs => [...xs, { title: 'New section', text: '' }])}>Add section</button>
        <button type="button" className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => save(secs.map(s => ({ title: s.title.trim(), items: s.text.split(NL).map(x => x.trim()).filter(Boolean) })).filter(s => s.title || s.items.length), 'Rules page saved')}>Save rules page</button>
        {custom && <button type="button" className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={async () => { if (!confirm('Go back to the generated rules text?')) return; const r = await save([], 'Back to generated text'); if (r.ok) setSecs(defaultSections({ ...T.rules, customSections: [] }).map((s: any) => ({ title: s.title, text: s.items.join(NL) }))) }}>Reset to generated text</button>}
        <Link href={`/spades/rules?t=${T.slug}`} target="_blank" className="sp-btn sp-btn-sm sp-btn-ghost">View rules page</Link>
      </div>
      <Feedback msg={msg} />
    </section>
  )
}

const EVENT_LABEL: Record<string, string> = {
  tournament: 'Full tournament', small: 'Small tournament', exhibition: 'Exhibition', series: 'Series', custom: 'Custom', test: 'Test',
}

function ScheduleRound({ T, round, ms, act }: { T: any; round: number; ms: any[]; act: Act }) {
  const first = ms.find((m: any) => m.scheduledAt)?.scheduledAt
  const [when, setWhen] = useState(first ? toLocalInput(first) : '')
  const { busy, msg, run } = useRun(act)
  return (
    <details className="w-full">
      <summary className="text-xs font-bold" style={{ color: 'var(--sp-muted)' }}>{first ? `Scheduled ${new Date(first).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}${T.autoStart ? ', starts on its own' : ''}` : 'Schedule a start time'}</summary>
      <div className="flex flex-wrap items-end gap-2 mt-2">
        <label className="sp-field"><span>Start time (players see a countdown)</span><input type="datetime-local" className="sp-input" value={when} onChange={e => setWhen(e.target.value)} /></label>
        <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy || !when} onClick={() => run('scheduleRound', { tournamentId: T.id, round, scheduledAt: new Date(when).toISOString(), autoStart: true }, 'Scheduled. Games begin on their own at that time.')}>Start on its own</button>
        <button className="sp-btn sp-btn-sm" disabled={busy || !when} onClick={() => run('scheduleRound', { tournamentId: T.id, round, scheduledAt: new Date(when).toISOString(), autoStart: false }, 'Scheduled. You tap Begin when ready.')}>Countdown only</button>
        {first && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => { setWhen(''); run('scheduleRound', { tournamentId: T.id, round, scheduledAt: null }, 'Schedule cleared') }}>Clear</button>}
      </div>
      <Feedback msg={msg} />
    </details>
  )
}

const EVENT_TYPES = [
  { k: 'tournament', t: 'Full tournament', d: 'Up to 8 teams by default, single elimination. Raise the limit any time before the draw.' },
  { k: 'small', t: 'Small tournament', d: '2, 4 or 6 teams. With 6, the top two seeds get a first round bye.' },
  { k: 'exhibition', t: 'Exhibition match', d: 'Two teams, one game. Not counted in the winners history.' },
  { k: 'series', t: 'Best of 3 series', d: 'Two teams play until one wins two games. Scores reset every game.' },
  { k: 'custom', t: 'Custom', d: 'Pick the number of teams, the format and the target score.' },
]

function AddGame({ data, act }: { data: any; act: Act }) {
  const T = data.tournamentFull
  const { busy, msg, run } = useRun(act)
  const teams = data.allTeams.filter((x: any) => x.status === 'approved')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [table, setTable] = useState('')
  const [when, setWhen] = useState('')
  return (
    <section className="sp-card p-4 grid gap-3">
      <h2 className="sp-display text-xl">Add a game</h2>
      {teams.length < 2 ? <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Approve at least two teams on the Teams tab first.</p> : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <select className="sp-select" aria-label="Team A" value={a} onChange={e => setA(e.target.value)}><option value="">Team A</option>{teams.map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <select className="sp-select" aria-label="Team B" value={b} onChange={e => setB(e.target.value)}><option value="">Team B</option>{teams.filter((x: any) => x.id !== a).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <select className="sp-select" aria-label="Table" value={table} onChange={e => setTable(e.target.value)}><option value="">Any free table</option>{data.tables.map((x: any) => <option key={x.id} value={x.id}>Table {x.number}</option>)}</select>
            <input type="datetime-local" className="sp-input" aria-label="Start time (optional)" value={when} onChange={e => setWhen(e.target.value)} />
          </div>
          <button className="sp-btn sp-btn-gold" disabled={busy || !a || !b || a === b} onClick={async () => {
            const r = await run('createGame', { tournamentId: T.id, teamAId: a, teamBId: b, tableId: table || null, scheduledAt: when ? new Date(when).toISOString() : null }, 'Game added')
            if (r.ok) { setA(''); setB(''); setWhen('') }
          }}>Add game</button>
          <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>A start time is optional; players see a countdown. Use Schedule below to make games start on their own.</p>
        </>
      )}
      <Feedback msg={msg} />
    </section>
  )
}

function BulkStart({ T, data, act }: { T: any; data: any; act: Act }) {
  const { busy, msg, run } = useRun(act)
  const ready = data.matches.filter((m: any) => m.status === 'ready' && m.teamA && m.teamB)
  const both = ready.filter((m: any) => m.readyA && m.readyB)
  if (!ready.length || (T.useBracket && !T.bracketPublished)) return null
  const go = async (onlyBothReady: boolean) => {
    const n = onlyBothReady ? both.length : ready.length
    if (!confirm(`Begin ${n} game${n === 1 ? '' : 's'} now? Clocks start and bidding unlocks.`)) return
    const r = await run('startAll', { tournamentId: T.id, onlyBothReady }, 'Started')
    if (r.ok && r.data.skipped?.length) alert(`${r.data.started} started. ${r.data.skipped.length} could not start:\n${r.data.skipped.map((x: any) => x.reason).join('\n')}`)
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {both.length > 0 && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => go(true)}>Begin {both.length} where both teams are ready</button>}
      <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => go(false)}>Begin all {ready.length} ready game{ready.length === 1 ? '' : 's'}</button>
      <Feedback msg={msg} />
    </div>
  )
}

function EventEditor({ ev, act, isCurrent }: { ev: any; act: Act; isCurrent: boolean }) {
  const { busy, msg, run } = useRun(act)
  const r = ev.rules
  const [f, setF] = useState({
    name: ev.name, starts_at: toLocalInput(ev.startsAt), team_limit: String(ev.teamLimit), gamesToWin: String(r.gamesToWin),
    targetDefault: String(r.targetDefault), targetFinal: String(r.targetFinal), useBracket: r.useBracket ? 'yes' : 'no', scorekeeping: r.scorekeeping,
  })
  const save = () => {
    const patch: Record<string, unknown> = {
      name: f.name, starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
      rules: { gamesToWin: Number(f.gamesToWin), targetDefault: Number(f.targetDefault), targetFinal: Number(f.targetFinal), useBracket: f.useBracket === 'yes', scorekeeping: f.scorekeeping },
    }
    if (Number(f.team_limit) !== ev.teamLimit) patch.team_limit = Number(f.team_limit)
    run('updateTournament', { tournamentId: ev.id, patch }, 'Event saved')
  }
  return (
    <div className="grid gap-3 mt-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <label className="sp-field"><span>Name</span><input className="sp-input" value={f.name} maxLength={120} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label className="sp-field"><span>Starts</span><input type="datetime-local" className="sp-input" value={f.starts_at} onChange={e => setF({ ...f, starts_at: e.target.value })} /></label>
        <label className="sp-field"><span>Most teams</span><input className="sp-input" inputMode="numeric" value={f.team_limit} onChange={e => setF({ ...f, team_limit: e.target.value.replace(/\D/g, '') })} /></label>
        <label className="sp-field"><span>Bracket</span><select className="sp-select" value={f.useBracket} onChange={e => setF({ ...f, useBracket: e.target.value })}><option value="yes">Use a bracket</option><option value="no">No bracket, just keep score</option></select></label>
        <label className="sp-field"><span>Who keeps score</span><select className="sp-select" value={f.scorekeeping} onChange={e => setF({ ...f, scorekeeping: e.target.value })}><option value="two">Each team captain</option><option value="one">One scorekeeper for both teams</option></select></label>
        <label className="sp-field"><span>Format</span><select className="sp-select" value={f.gamesToWin} onChange={e => setF({ ...f, gamesToWin: e.target.value })}><option value="1">Single game</option><option value="2">Best of 3</option><option value="3">Best of 5</option></select></label>
        <label className="sp-field"><span>Play to</span><input className="sp-input" inputMode="numeric" value={f.targetDefault} onChange={e => setF({ ...f, targetDefault: e.target.value.replace(/\D/g, '') })} /></label>
        {f.useBracket === 'yes' && <label className="sp-field"><span>Championship plays to</span><input className="sp-input" inputMode="numeric" value={f.targetFinal} onChange={e => setF({ ...f, targetFinal: e.target.value.replace(/\D/g, '') })} /></label>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy || !f.name.trim()} onClick={save}>Save changes</button>
        <button className="sp-btn sp-btn-sm" disabled={busy || ev.rosterLocked} onClick={() => run('updateTournament', { tournamentId: ev.id, patch: { registration_open: !ev.registrationOpen } }, ev.registrationOpen ? 'Registration closed' : 'Registration opened')}>{ev.registrationOpen ? 'Close registration' : 'Open registration'}</button>
        {!ev.isFeatured && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => run('updateTournament', { tournamentId: ev.id, patch: { is_featured: true } }, 'Now the main /spades event')}>Make main /spades event</button>}
        {!isCurrent && <a className="sp-btn sp-btn-sm sp-btn-ghost" href={`/spades/admin?t=${ev.slug}`}>Run this event</a>}
        <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy || ev.status === 'archived'} onClick={() => { if (confirm(`Archive ${ev.name}? It stays in the records but becomes read only.`)) run('updateTournament', { tournamentId: ev.id, patch: { status: 'archived' } }, 'Archived') }}>Archive</button>
        <button className="sp-btn sp-btn-sm sp-btn-danger" disabled={busy} onClick={async () => {
          if (!confirm(`Delete ${ev.name} completely? Teams, games and all history are removed for good. Add the winners on the Winners tab first if you want to keep them.`)) return
          const res = await run('deleteEvent', { tournamentId: ev.id }, 'Event deleted')
          if (res.ok && isCurrent) window.location.href = '/spades/admin'
        }}>Delete</button>
      </div>
      <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>Team limit and bracket on or off can only change before any matches exist. Format and targets apply to matches that have not started yet.</p>
      <Feedback msg={msg} />
    </div>
  )
}

function EventsTab({ data, act }: { data: any; act: Act }) {
  const { busy, msg, run } = useRun(act)
  const [type, setType] = useState('tournament')
  const [name, setName] = useState('')
  const [teams, setTeams] = useState('8')
  const [small, setSmall] = useState('4')
  const [games, setGames] = useState('1')
  const [target, setTarget] = useState('25')
  const [bracket, setBracket] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  if (data.viewer.kind !== 'owner') return <div className="sp-banner sp-banner-info text-sm">Only the site owner can create and edit events.</div>
  const list = (data.tournaments || []).filter((x: any) => !x.isTest)
  const twoTeam = type === 'exhibition' || type === 'series'
  const create = async () => {
    const payload: Record<string, unknown> = { name, eventType: type, useBracket: twoTeam ? true : bracket }
    if (type === 'tournament') payload.teamLimit = Number(teams)
    if (type === 'small') payload.teamLimit = Number(small)
    if (type === 'series') payload.gamesToWin = 2
    if (type === 'custom') { payload.teamLimit = Number(teams); payload.gamesToWin = Number(games); payload.targetDefault = Number(target); payload.targetFinal = Number(target) }
    const r = await run('createTournament', payload, 'Event created')
    if (r.ok) window.location.href = `/spades/admin?t=${r.data.slug}`
  }
  return (
    <div className="grid gap-4">
      <section className="sp-card p-4 grid gap-2">
        <h2 className="sp-display text-xl">Your events</h2>
        {list.length === 0 && <p style={{ color: 'var(--sp-muted)' }}>No events yet.</p>}
        {list.map((x: any) => (
          <div key={x.slug} className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)', border: x.slug === data.tournamentFull.slug ? '1px solid var(--sp-gold)' : '1px solid transparent' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-bold">{x.name}{x.slug === data.tournamentFull.slug ? ' (open now)' : ''}{x.isFeatured ? ' · main /spades event' : ''}</div>
                <div className="text-xs" style={{ color: 'var(--sp-muted)' }}>
                  {EVENT_LABEL[x.eventType] || 'Tournament'} · {x.rules.useBracket ? 'bracket' : 'no bracket'} · {x.rules.gamesToWin > 1 ? `best of ${x.rules.gamesToWin * 2 - 1}` : 'single game'} · up to {x.teamLimit} teams · {x.status}
                  {x.startsAt ? ` · ${new Date(x.startsAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="sp-btn sp-btn-sm" onClick={() => setOpenId(openId === x.id ? null : x.id)}>{openId === x.id ? 'Close' : 'Edit'}</button>
                {x.slug !== data.tournamentFull.slug && <a className="sp-btn sp-btn-sm sp-btn-gold" href={`/spades/admin?t=${x.slug}`}>Run</a>}
              </div>
            </div>
            {openId === x.id && <EventEditor ev={x} act={act} isCurrent={x.slug === data.tournamentFull.slug} />}
          </div>
        ))}
      </section>

      <section className="sp-card p-4 grid gap-3">
        <h2 className="sp-display text-xl">Create an event</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2" role="radiogroup" aria-label="Event type">
          {EVENT_TYPES.map(o => (
            <button key={o.k} role="radio" aria-checked={type === o.k} onClick={() => setType(o.k)} className="p-3 rounded-xl text-left" style={{ background: type === o.k ? 'rgba(224,173,79,0.18)' : 'rgba(0,0,0,0.22)', border: `2px solid ${type === o.k ? 'var(--sp-gold)' : 'transparent'}` }}>
              <div className="font-black">{o.t}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--sp-muted)' }}>{o.d}</div>
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-2 items-end">
          <label className="sp-field"><span>Event name</span><input className="sp-input" value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>
          {(type === 'tournament' || type === 'custom') && <label className="sp-field"><span>Most teams</span><input className="sp-input" inputMode="numeric" value={teams} onChange={e => setTeams(e.target.value.replace(/\D/g, ''))} /></label>}
          {type === 'small' && <label className="sp-field"><span>Teams</span><select className="sp-select" value={small} onChange={e => setSmall(e.target.value)}><option value="2">2 teams</option><option value="4">4 teams</option><option value="6">6 teams</option></select></label>}
          {type === 'custom' && <label className="sp-field"><span>Format</span><select className="sp-select" value={games} onChange={e => setGames(e.target.value)}><option value="1">Single game</option><option value="2">Best of 3</option><option value="3">Best of 5</option></select></label>}
          {type === 'custom' && <label className="sp-field"><span>Play to</span><input className="sp-input" inputMode="numeric" value={target} onChange={e => setTarget(e.target.value.replace(/\D/g, ''))} /></label>}
          {!twoTeam && (
            <label className="flex items-center gap-3 font-bold"><input type="checkbox" className="w-6 h-6" checked={bracket} onChange={e => setBracket(e.target.checked)} /> Use a bracket (off = just keep score for games you set up)</label>
          )}
        </div>
        <button className="sp-btn sp-btn-gold" disabled={busy || !name.trim()} onClick={create}>Create event</button>
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>Each event has its own registration, teams, schedule, games and scoreboard.</p>
        <Feedback msg={msg} />
      </section>
    </div>
  )
}

function TestModeTab({ data, act }: { data: any; act: Act }) {
  const { busy, msg, run } = useRun(act)
  const [games, setGames] = useState('1')
  const [target, setTarget] = useState('15')
  if (data.viewer.kind !== 'owner') return <div className="sp-banner sp-banner-info text-sm">Only the site owner can use Test Mode.</div>
  const tests = (data.tournaments || []).filter((x: any) => x.isTest)
  return (
    <div className="grid gap-4">
      <section className="sp-card p-4 grid gap-3">
        <h2 className="sp-display text-xl">Practice by yourself</h2>
        <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Creates a private test match: two teams, four simulated players, one table, ready to begin. You see all four phones side by side and can bid and score for every player. Test matches never show on the public pages or in the winners history, and you can delete them completely.</p>
        <div className="grid sm:grid-cols-3 gap-2">
          <label className="sp-field"><span>Format</span><select className="sp-select" value={games} onChange={e => setGames(e.target.value)}><option value="1">Single game</option><option value="2">Best of 3</option></select></label>
          <label className="sp-field"><span>Play to (low = quick test)</span><input className="sp-input" inputMode="numeric" value={target} onChange={e => setTarget(e.target.value.replace(/\D/g, ''))} /></label>
        </div>
        <button className="sp-btn sp-btn-gold" disabled={busy || !target} onClick={async () => {
          const r = await run('createTest', { gamesToWin: Number(games), target: Number(target) }, 'Test match ready')
          if (r.ok) window.location.href = `/spades/admin/test?t=${r.data.slug}`
        }}>Create test match</button>
        <Feedback msg={msg} />
      </section>
      {tests.length > 0 && (
        <section className="sp-card p-4 grid gap-2">
          <h2 className="sp-display text-xl">Your test matches</h2>
          {tests.map((x: any) => (
            <div key={x.slug} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
              <div><div className="font-bold">{x.name}</div><div className="text-xs" style={{ color: 'var(--sp-muted)' }}>{x.status}</div></div>
              <div className="flex gap-2">
                <a className="sp-btn sp-btn-sm sp-btn-gold" href={`/spades/admin/test?t=${x.slug}`}>Open</a>
                <button className="sp-btn sp-btn-sm sp-btn-danger" disabled={busy} onClick={() => { if (confirm(`Delete ${x.name}? Everything in it is removed.`)) run('deleteTest', { tournamentId: x.id }, 'Deleted') }}>Delete</button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

// Owner only: every game players started from the home page.
function ActivityTab() {
  const { data, error, loading } = useSpades<any>('activity')
  if (loading && !data) return <Loading label="Loading activity" />
  if (error) return <ErrorBox message={error} />
  const T = data.totals
  const stat = (label: string, n: number) => (
    <div className="sp-card p-4"><div className="sp-label">{label}</div><div className="sp-display sp-num text-4xl mt-1">{n}</div></div>
  )
  return (
    <div className="grid gap-4">
      <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Games people started themselves from the home page. These are private: they never show on the public pages or in your events.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stat('Live now', T.live)}{stat('New today', T.today)}{stat('All games', T.events)}{stat('Games finished', T.gamesPlayed)}{stat('Hands played', T.hands)}{stat('Players', T.players)}
      </div>
      <section className="sp-card p-4 grid gap-2">
        <h2 className="sp-display text-xl">Games</h2>
        {data.games.length === 0 && <p style={{ color: 'var(--sp-muted)' }}>No one has started a game yet.</p>}
        {data.games.map((g: any) => (
          <div key={g.slug} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)', border: g.liveMatchId ? '1px solid var(--sp-green)' : '1px solid transparent' }}>
            <div>
              <div className="font-bold">{g.name}{g.liveMatchId && <span className="sp-chip sp-chip-live ml-2"><span className="sp-dot sp-dot-pulse" />Live</span>}</div>
              <div className="text-xs" style={{ color: 'var(--sp-muted)' }}>
                {g.score ? `${g.score} · ` : ''}{g.gamesPlayed} finished · {g.hands} hands · to {g.target} · started {new Date(g.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
            {g.latestMatchId && <a className="sp-btn sp-btn-sm" href={`/spades/match/${g.latestMatchId}`}>Watch</a>}
          </div>
        ))}
      </section>
    </div>
  )
}

// One place to run everything: pick an event, see and control every game,
// see its teams. Self-started games from the home page have their own view.
function ActivityHub({ data, act, serverNow }: { data: any; act: Act; serverNow: () => number }) {
  const T = data.tournamentFull
  const [view, setView] = useState<'event' | 'self'>('event')
  const events = (data.tournaments || []).filter((x: any) => !x.isTest)
  const teamCount = data.allTeams.filter((x: any) => x.status === 'approved').length
  const { busy, msg, run } = useRun(act)
  return (
    <div className="grid gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Pick an event">
        {events.map((e: any) => (
          <a key={e.slug} role="tab" aria-selected={view === 'event' && e.slug === T.slug} href={`/spades/admin?t=${e.slug}`} onClick={ev => { if (e.slug === T.slug) { ev.preventDefault(); setView('event') } }}
            className="px-4 py-3 rounded-xl font-bold whitespace-nowrap"
            style={view === 'event' && e.slug === T.slug ? { background: 'var(--sp-cream)', color: 'var(--sp-ink)' } : { background: 'rgba(0,0,0,0.3)', color: 'var(--sp-muted)', border: '1px solid var(--sp-line)' }}>
            {e.name}
          </a>
        ))}
        <button role="tab" aria-selected={view === 'self'} onClick={() => setView('self')} className="px-4 py-3 rounded-xl font-bold whitespace-nowrap"
          style={view === 'self' ? { background: 'var(--sp-cream)', color: 'var(--sp-ink)' } : { background: 'rgba(0,0,0,0.3)', color: 'var(--sp-muted)', border: '1px solid var(--sp-line)' }}>
          Self-started games
        </button>
      </div>
      {view === 'self' ? <ActivityTab /> : (
        <>
          <section className="sp-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-black text-lg">{T.name}</div>
              <div className="text-sm" style={{ color: 'var(--sp-muted)' }}>{teamCount} of {T.teamLimit} teams · {T.registrationOpen && !T.rosterLocked ? 'registration open' : 'registration closed'} · {T.useBracket ? 'bracket' : 'open play'}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!T.rosterLocked && (T.registrationOpen ? <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => closeAndBegin(T, data, run)}>Close registration</button> : <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => run('updateTournament', { tournamentId: T.id, patch: { registration_open: true } }, 'Registration open')}>Open registration</button>)}
{!T.rosterLocked && !T.registrationOpen && data.allTeams.some((x: any) => x.status === 'approved' || x.status === 'pending') && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => closeAndBegin(T, data, run)}>Set up games</button>}
              <a className="sp-btn sp-btn-sm sp-btn-ghost" href={`/spades?t=${T.slug}`} target="_blank" rel="noreferrer">Public page</a>
              <a className="sp-btn sp-btn-sm sp-btn-ghost" href={`/spades/display?t=${T.slug}`} target="_blank" rel="noreferrer">TV display</a>
            </div>
            <Feedback msg={msg} />
          </section>
          <RunTab data={data} act={act} serverNow={serverNow} />
          <details className="sp-card p-4">
            <summary className="sp-display text-xl">Teams ({data.allTeams.length})</summary>
            <div className="mt-3"><TeamsTab data={data} act={act} /></div>
          </details>
        </>
      )}
    </div>
  )
}

// Weekly winners wall: upload the champions' trophy photo.
function WinnersTab({ data }: { data: any }) {
  const T = data.tournamentFull
  const champ = T?.championTeamId ? data.allTeams.find((x: any) => x.id === T.championTeamId) : null
  const [list, setList] = useState<any[] | null>(null)
  const [f, setF] = useState({ team: champ?.name || '', players: champ ? champ.players.map((p: any) => p.name).join(' & ') : '', event: T?.name || '', week: new Date().toISOString().slice(0, 10) })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const load = () => fetch('/api/spades/winners', { cache: 'no-store' }).then(r => r.json()).then(j => setList(j.winners || [])).catch(() => setList([]))
  useEffect(() => { load() }, [])
  const post = (body: Record<string, unknown>) => fetch('/api/spades/winners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }).then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) }))
  const save = async () => {
    setBusy(true)
    setMsg(null)
    let photoUrl: string | null = null
    if (file) {
      const u = await post({ action: 'uploadUrl', filename: file.name })
      if (!u.ok) { setBusy(false); setMsg({ ok: false, text: u.data.error || 'Upload failed' }); return }
      const put = await fetch(u.data.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type || 'image/jpeg' }, body: file })
      if (!put.ok) { setBusy(false); setMsg({ ok: false, text: 'Photo upload failed. Try a smaller photo.' }); return }
      photoUrl = u.data.publicUrl
    }
    const r = await post({ action: 'add', ...f, photoUrl })
    setBusy(false)
    if (!r.ok) { setMsg({ ok: false, text: r.data.error || 'Could not save' }); return }
    setMsg({ ok: true, text: 'Added to the Winners page' })
    setFile(null)
    load()
  }
  return (
    <div className="grid gap-4">
      <section className="sp-card p-4 grid gap-3">
        <h2 className="sp-display text-xl">Add this week&apos;s winners</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="sp-field"><span>Team</span><input className="sp-input" value={f.team} maxLength={60} onChange={e => setF({ ...f, team: e.target.value })} /></label>
          <label className="sp-field"><span>Players</span><input className="sp-input" value={f.players} maxLength={120} onChange={e => setF({ ...f, players: e.target.value })} /></label>
          <label className="sp-field"><span>Event</span><input className="sp-input" value={f.event} maxLength={120} onChange={e => setF({ ...f, event: e.target.value })} /></label>
          <label className="sp-field"><span>Week of</span><input type="date" className="sp-input" value={f.week} onChange={e => setF({ ...f, week: e.target.value })} /></label>
          <label className="sp-field sm:col-span-2"><span>Photo with the trophy</span><input type="file" accept="image/*" className="sp-input" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
        </div>
        <button className="sp-btn sp-btn-gold" disabled={busy || !f.team.trim()} onClick={save}>{busy ? 'Saving' : 'Add to Winners page'}</button>
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>Winners are the only thing kept long term. Once they are added you can delete the event on the Events tab.</p>
        <Feedback msg={msg} />
      </section>
      <section className="sp-card p-4 grid gap-2">
        <div className="flex items-center justify-between"><h2 className="sp-display text-xl">On the Winners page</h2><a className="sp-btn sp-btn-sm sp-btn-ghost" href="/spades/winners" target="_blank" rel="noreferrer">View page</a></div>
        {list === null ? <Loading /> : list.length === 0 ? <p style={{ color: 'var(--sp-muted)' }}>No winners posted yet.</p> : list.map(w => (
          <div key={w.id} className="flex items-center justify-between gap-3 p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
            <div className="flex items-center gap-3">
              {w.photoUrl ? <img src={w.photoUrl} alt="" width={56} height={56} className="rounded-lg object-cover" style={{ width: 56, height: 56 }} /> : null}
              <div><div className="font-bold">{w.team}</div><div className="text-xs" style={{ color: 'var(--sp-muted)' }}>{w.week} · {w.event}</div></div>
            </div>
            <button className="sp-btn sp-btn-sm sp-btn-danger" onClick={async () => { if (confirm(`Remove ${w.team} from the Winners page?`)) { await post({ action: 'delete', id: w.id }); load() } }}>Remove</button>
          </div>
        ))}
      </section>
    </div>
  )
}

function NoEventAdmin({ data, act, online }: { data: any; act: Act; online: boolean }) {
  const [tab, setTab] = useState<'Events' | 'Self-started games' | 'Winners' | 'Test Mode'>('Events')
  const safe = { ...data, tournamentFull: { slug: null, name: '', championTeamId: null }, allTeams: [] }
  return (
    <Shell active="admin" online={online} viewer={data.viewer} wide>
      <div className="sp-wrap grid gap-4">
        <div>
          <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>Tournament director</p>
          <h1 className="sp-display text-3xl mt-1">No events yet</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--sp-muted)' }}>Create an event to post it on the home page.</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }} role="tablist">
          {(['Events', 'Self-started games', 'Winners', 'Test Mode'] as const).map(x => (
            <button key={x} role="tab" aria-selected={tab === x} className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap" style={tab === x ? { background: 'var(--sp-cream)', color: 'var(--sp-ink)' } : { color: 'var(--sp-muted)' }} onClick={() => setTab(x)}>{x}</button>
          ))}
        </nav>
        {tab === 'Events' && <EventsTab data={safe} act={act} />}
        {tab === 'Self-started games' && <ActivityTab />}
        {tab === 'Winners' && <WinnersTab data={safe} />}
        {tab === 'Test Mode' && <TestModeTab data={safe} act={act} />}
      </div>
    </Shell>
  )
}

export default function Page() {
  return <Suspense fallback={<Loading />}><Admin /></Suspense>
}
