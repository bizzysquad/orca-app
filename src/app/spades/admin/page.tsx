'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Bracket } from '../_components/Bracket'
import { postAuth, useSpades, type ActResult } from '../_components/useSpades'
import { ErrorBox, Feedback, Loading, MatchTimer, Shell, StatusChip, fmtTime } from '../_components/ui'

type Act = (action: string, payload?: Record<string, unknown>) => Promise<ActResult>
type Msg = { ok: boolean; text: string } | null
const TABS = ['Run', 'Teams', 'Staff', 'Bracket', 'Disputes', 'Settings', 'Audit', 'Export'] as const

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
      <p className="text-xs" style={{ color: 'var(--sp-dim)' }}>Supervisors: open the staff invitation link from the director instead.</p>
    </form>
  )
}

function Admin() {
  const t = useSearchParams().get('t')
  const { data, error, status, loading, online, act, serverNow, reload } = useSpades<any>('admin', { t })
  const [tab, setTab] = useState<(typeof TABS)[number]>('Run')
  useEffect(() => {
    try { const s = sessionStorage.getItem('sp-admin-tab'); if (s && (TABS as readonly string[]).includes(s)) setTab(s as any) } catch {}
  }, [])
  useEffect(() => { try { sessionStorage.setItem('sp-admin-tab', tab) } catch {} }, [tab])

  if (loading && !data) return <Shell active="admin"><Loading /></Shell>
  if (status === 401 || status === 403) {
    return <Shell active="admin" online={online} viewer={data?.viewer}><div className="sp-wrap-narrow grid gap-4"><h1 className="sp-display text-4xl">Director</h1>{data?.viewer?.kind === 'staff' && <div className="sp-banner sp-banner-warn text-sm">You are signed in as a supervisor. Director access needs the director password.</div>}<Login /></div></Shell>
  }
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
              {x}{x === 'Disputes' && data.openDisputes ? ` (${data.openDisputes})` : ''}
            </button>
          ))}
        </nav>
        {tab === 'Run' && <RunTab data={data} act={act} serverNow={serverNow} />}
        {tab === 'Teams' && <TeamsTab data={data} act={act} />}
        {tab === 'Staff' && <StaffTab data={data} act={act} />}
        {tab === 'Bracket' && <BracketTab data={data} act={act} />}
        {tab === 'Disputes' && <DisputesTab data={data} />}
        {tab === 'Settings' && <SettingsTab data={data} act={act} />}
        {tab === 'Audit' && <AuditTab data={data} />}
        {tab === 'Export' && <ExportTab data={data} />}
      </div>
    </Shell>
  )
}

// ─── Run ────────────────────────────────────────────────────────────────────

function RunTab({ data, act, serverNow }: { data: any; act: Act; serverNow: () => number }) {
  const T = data.tournamentFull
  const { busy, msg, run } = useRun(act)
  const teams = new Map<string, string>(data.allTeams.map((x: any) => [x.id, x.name]))
  const approved = data.allTeams.filter((x: any) => x.status === 'approved')
  const checkedIn = approved.filter((x: any) => x.checkedIn).length
  const rounds = Array.from({ length: T.rounds }, (_, i) => i + 1)
  const step = !T.rosterLocked ? 1 : !data.matches.length ? 2 : !T.bracketPublished ? 3 : 4
  return (
    <div className="grid gap-4">
      <section className="sp-card p-4 grid gap-3">
        <h2 className="sp-display text-xl">Tonight, step by step</h2>
        <ol className="grid gap-2">
          {[
            `Teams: ${approved.length} of ${T.capacity} approved, ${checkedIn} checked in. Send invitations from the Teams tab.`,
            'Close registration and lock the roster. The bracket is drawn at random automatically.',
            'Check the draw on the Bracket tab, then publish it.',
            'Start round 1. Finalize each match when it completes to move winners forward.',
          ].map((s, i) => (
            <li key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: step === i + 1 ? 'rgba(224,173,79,0.15)' : 'rgba(0,0,0,0.2)', border: step === i + 1 ? '1px solid var(--sp-gold)' : '1px solid transparent' }}>
              <span className="sp-display text-xl" style={{ color: step > i + 1 ? 'var(--sp-green)' : 'var(--sp-gold)' }}>{step > i + 1 ? '✓' : i + 1}</span><span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          {!T.rosterLocked && (
            <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => run('updateTournament', { tournamentId: T.id, patch: { registration_open: !T.registrationOpen } }, T.registrationOpen ? 'Registration closed' : 'Registration opened')}>
              {T.registrationOpen ? 'Close registration' : 'Open registration'}
            </button>
          )}
          {!T.rosterLocked ? (
            <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => { if (confirm(`Lock the roster with ${approved.length} approved teams and draw a random bracket?`)) run('rosterLock', { tournamentId: T.id, locked: true }, 'Roster locked and bracket drawn. Review it on the Bracket tab.') }}>Lock roster and draw bracket</button>
          ) : T.status !== 'live' && T.status !== 'completed' && (
            <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => { if (confirm('Unlock the roster? This deletes the unpublished bracket.')) run('rosterLock', { tournamentId: T.id, locked: false }, 'Roster unlocked') }}>Unlock roster</button>
          )}
          {T.rosterLocked && data.matches.length > 0 && !T.bracketPublished && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => run('publishBracket', { tournamentId: T.id, published: true }, 'Bracket published')}>Publish bracket</button>}
          <Link href="/spades/display" target="_blank" className="sp-btn sp-btn-sm sp-btn-ghost">Open TV display</Link>
          <Link href="/spades/print?kind=scorecards" target="_blank" className="sp-btn sp-btn-sm sp-btn-ghost">Print backup scorecards</Link>
        </div>
        <Feedback msg={msg} />
      </section>

      {data.matches.length > 0 && (
        <section className="sp-card p-4 grid gap-3">
          <h2 className="sp-display text-xl">Matches</h2>
          {rounds.map(r => {
            const ms = data.matches.filter((m: any) => m.round === r)
            const readyCount = ms.filter((m: any) => m.status === 'ready').length
            return (
              <div key={r} className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black" style={{ color: 'var(--sp-gold)' }}>{ms[0]?.roundName}</h3>
                  {readyCount > 0 && T.bracketPublished && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => { if (confirm(`Start ${readyCount} ${ms[0]?.roundName} match${readyCount > 1 ? 'es' : ''} now? The clocks start.`)) run('startRound', { tournamentId: T.id, round: r }, 'Round started') }}>Start {ms[0]?.roundName}</button>}
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
      {card?.pending?.length > 0 && <div className="text-xs" style={{ color: 'var(--sp-gold)' }}>{card.pending.join(' · ')}</div>}
      <div className="flex flex-wrap items-center gap-2">
        {['pending', 'ready'].includes(m.status) && (
          <select className="sp-select" style={{ maxWidth: 150, minHeight: 40, padding: '6px 10px' }} value={tableId} aria-label="Table" onChange={e => run('editMatch', { matchId: m.id, tableId: e.target.value || null }, 'Table set')}>
            <option value="">No table</option>
            {data.tables.map((x: any) => <option key={x.id} value={x.id}>Table {x.number}</option>)}
          </select>
        )}
        {m.status === 'ready' && T.bracketPublished && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => run('startMatch', { matchId: m.id }, 'Match started')}>Start</button>}
        {m.status === 'completed' && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => { if (confirm(`Finalize: ${teams.get(m.winner)} wins ${Math.max(m.scoreA, m.scoreB)} to ${Math.min(m.scoreA, m.scoreB)}?`)) run('finalize', { matchId: m.id }, 'Finalized, winner advanced') }}>Finalize {teams.get(m.winner)}</button>}
        {m.status === 'live' && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => run('pause', { matchId: m.id }, 'Paused')}>Pause</button>}
        {m.status === 'paused' && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => run('resume', { matchId: m.id }, 'Resumed')}>Resume</button>}
        {m.teamA && m.teamB && <Link href={`/spades/match/${m.id}`} className="sp-btn sp-btn-sm sp-btn-ghost">Open match</Link>}
        {['pending', 'ready'].includes(m.status) && <span className="text-xs" style={{ color: 'var(--sp-muted)' }}>To {m.target} · {m.timeLimitMin} min</span>}
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
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const url = inviteUrl(inv.token)
  useEffect(() => { QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: '#14090b', light: '#fff9ee' } }).then(setQr).catch(() => setQr(null)) }, [url])
  return (
    <div className="sp-card-paper p-4 grid gap-2 justify-items-center text-center">
      <p className="sp-label">{inv.kind === 'staff' ? 'Staff invitation' : 'Player invitation'}</p>
      <p className="sp-display text-2xl">{inv.name}</p>
      {qr ? <img src={qr} alt={`Invitation QR code for ${inv.name}`} width={220} height={220} /> : <div style={{ width: 220, height: 220 }} />}
      <p className="text-xs">Scan with the phone camera. Works once. Expires {new Date(inv.expiresAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.</p>
      <div className="flex flex-wrap gap-2 justify-center">
        <button className="sp-btn sp-btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true) } catch { prompt('Copy this link', url) } }}>{copied ? 'Copied' : 'Copy link'}</button>
        {typeof navigator !== 'undefined' && 'share' in navigator && <button className="sp-btn sp-btn-sm sp-btn-wine" onClick={() => navigator.share({ title: 'Spades HQ invitation', text: `Your Spades HQ link, ${inv.name}`, url }).catch(() => {})}>Text it</button>}
      </div>
    </div>
  )
}

const INVITE_LABEL: Record<string, string> = { none: 'No link yet', pending: 'Link sent', used: 'Signed in', revoked: 'Link replaced', expired: 'Link expired' }

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
    const r = await run(action, payload, 'Invitation ready below')
    if (r.ok) setIssued(r.data.invites ? r.data.invites : [r.data])
  }
  return (
    <div className="grid gap-4">
      {issued.length > 0 && (
        <section className="grid gap-3">
          <div className="flex items-center justify-between"><h2 className="sp-display text-xl">New invitations</h2><button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => setIssued([])}>Done</button></div>
          <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>These links are shown once. Have each player scan their own code now, or text the link. Reissuing makes old links stop working.</p>
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
      {groups.filter(([, list]) => list.length).map(([label, list]) => (
        <section key={label} className="grid gap-2">
          <h2 className="sp-display text-xl">{label} <span className="sp-num" style={{ color: 'var(--sp-dim)' }}>{list.length}{label === 'Approved' ? `/${T.capacity}` : ''}</span></h2>
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
                          <div className="text-xs" style={{ color: p.invite.status === 'used' ? 'var(--sp-green)' : 'var(--sp-muted)' }}>{INVITE_LABEL[p.invite.status]}{p.invite.activeSessions ? ` · ${p.invite.activeSessions} device` : ''}</div>
                        </div>
                        {team.status === 'approved' && (
                          <div className="flex gap-2">
                            <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => {
                              const lost = p.invite.status === 'used'
                              if (lost && !confirm(`${p.name} is already signed in. Send a new link and sign out their old phone?`)) return
                              invite('invite', { playerId: p.id, revokeSessions: lost })
                            }}>{p.invite.status === 'none' ? 'Get link' : 'New link'}</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {team.status === 'approved' && team.players.some((p: any) => p.invite.status === 'none') && (
                    <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => invite('teamInvites', { teamId: team.id })}>Make both invitations</button>
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

function StaffTab({ data, act }: { data: any; act: Act }) {
  const T = data.tournamentFull
  const { busy, msg, run } = useRun(act)
  const [name, setName] = useState('')
  const [role, setRole] = useState('supervisor')
  const [issued, setIssued] = useState<any | null>(null)
  const [count, setCount] = useState(String(data.tables.length || 4))
  const isOwner = data.viewer.kind === 'owner'
  return (
    <div className="grid gap-4">
      {issued && <div className="grid gap-2 max-w-sm"><InviteCard inv={issued} /><button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => setIssued(null)}>Done</button></div>}
      <form className="sp-card p-4 grid gap-3" onSubmit={async e => { e.preventDefault(); const r = await run('addStaff', { tournamentId: T.id, name, role }, 'Staff added. Have them scan the code.'); if (r.ok) { setIssued(r.data.invite); setName('') } }}>
        <h2 className="sp-display text-xl">Add a table supervisor</h2>
        <div className="grid sm:grid-cols-3 gap-2">
          <input className="sp-input" placeholder="Name" aria-label="Staff name" maxLength={40} value={name} onChange={e => setName(e.target.value)} />
          <select className="sp-select" aria-label="Role" value={role} onChange={e => setRole(e.target.value)}>
            <option value="supervisor">Table supervisor</option>
            {isOwner && <option value="director">Co director</option>}
          </select>
          <button className="sp-btn sp-btn-gold" disabled={busy || !name.trim()}>Add and get link</button>
        </div>
      </form>
      <Feedback msg={msg} />
      <section className="sp-card p-4 grid gap-2">
        <h2 className="sp-display text-xl">Staff</h2>
        {data.staff.length === 0 && <p style={{ color: 'var(--sp-muted)' }}>No supervisors yet. You can run every table yourself as director.</p>}
        {data.staff.map((s: any) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)', opacity: s.active ? 1 : 0.5 }}>
            <div>
              <div className="font-bold">{s.name} <span className="sp-chip sp-chip-info ml-1">{s.role}</span></div>
              <div className="text-xs" style={{ color: 'var(--sp-muted)' }}>{s.active ? INVITE_LABEL[s.invite.status] : 'Deactivated'}</div>
            </div>
            {s.active && (
              <div className="flex gap-2">
                <button className="sp-btn sp-btn-sm" onClick={async () => { const r = await run('invite', { staffId: s.id, revokeSessions: s.invite.status === 'used' }, 'New link ready'); if (r.ok) setIssued(r.data) }}>New link</button>
                <button className="sp-btn sp-btn-sm sp-btn-danger" onClick={() => { if (confirm(`Deactivate ${s.name}? They are signed out immediately.`)) run('updateStaff', { staffId: s.id, active: false }, 'Deactivated') }}>Deactivate</button>
              </div>
            )}
          </div>
        ))}
      </section>
      <section className="sp-card p-4 grid gap-3">
        <h2 className="sp-display text-xl">Tables</h2>
        <div className="flex items-end gap-2">
          <label className="sp-field" style={{ maxWidth: 160 }}><span>Number of tables</span><input className="sp-input" inputMode="numeric" value={count} onChange={e => setCount(e.target.value.replace(/\D/g, ''))} /></label>
          <button className="sp-btn sp-btn-sm" disabled={busy || !count} onClick={() => run('setTables', { tournamentId: T.id, count: Number(count) }, 'Tables updated')}>Save</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {data.tables.map((tb: any) => (
            <label key={tb.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
              <span className="sp-display text-2xl w-12">T{tb.number}</span>
              <select className="sp-select" value={tb.supervisorId || ''} aria-label={`Supervisor for table ${tb.number}`} onChange={e => run('assignSupervisor', { tableId: tb.id, staffId: e.target.value || null }, `Table ${tb.number} updated`)}>
                <option value="">Any supervisor</option>
                {data.staff.filter((s: any) => s.active).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>A supervisor can act on tables assigned to them and on tables with no one assigned. You can act on every table.</p>
      </section>
    </div>
  )
}

// ─── Bracket ────────────────────────────────────────────────────────────────

function BracketTab({ data, act }: { data: any; act: Act }) {
  const T = data.tournamentFull
  const { busy, msg, run } = useRun(act)
  const approved = data.allTeams.filter((x: any) => x.status === 'approved')
  const [order, setOrder] = useState<string[]>(() => [...approved].sort((a: any, b: any) => (a.seed || 99) - (b.seed || 99)).map((x: any) => x.id))
  const name = (id: string) => approved.find((x: any) => x.id === id)?.name || ''
  const started = data.matches.some((m: any) => ['live', 'paused', 'completed'].includes(m.status) || (m.status === 'final' && m.resultKind !== 'bye'))
  const move = (i: number, d: number) => setOrder(o => { const n = [...o]; const j = i + d; if (j < 0 || j >= n.length) return o; [n[i], n[j]] = [n[j], n[i]]; return n })
  return (
    <div className="grid gap-4">
      {!T.rosterLocked && <div className="sp-banner sp-banner-info text-sm">Lock the roster on the Run tab to draw the bracket.</div>}
      {T.rosterLocked && !started && (
        <section className="sp-card p-4 grid gap-3">
          <h2 className="sp-display text-xl">Draw</h2>
          <div className="flex flex-wrap gap-2">
            <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => { if (confirm('Redraw a new random bracket?')) run('generateBracket', { tournamentId: T.id, mode: 'random' }, 'New random draw') }}>Redraw at random</button>
            {data.matches.length > 0 && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => run('publishBracket', { tournamentId: T.id, published: !T.bracketPublished }, T.bracketPublished ? 'Hidden' : 'Published')}>{T.bracketPublished ? 'Unpublish' : 'Publish bracket'}</button>}
          </div>
          <details>
            <summary className="font-bold">Set seeds by hand</summary>
            <ol className="grid gap-1 mt-2">
              {order.map((id, i) => (
                <li key={id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
                  <span className="sp-num w-6 font-black" style={{ color: 'var(--sp-gold)' }}>{i + 1}</span>
                  <span className="flex-1 font-bold">{name(id)}</span>
                  <button className="sp-btn sp-btn-sm sp-btn-ghost" aria-label={`Move ${name(id)} up`} onClick={() => move(i, -1)}>Up</button>
                  <button className="sp-btn sp-btn-sm sp-btn-ghost" aria-label={`Move ${name(id)} down`} onClick={() => move(i, 1)}>Down</button>
                </li>
              ))}
            </ol>
            <p className="text-xs mt-2" style={{ color: 'var(--sp-muted)' }}>Seed 1 plays seed 8, 4 plays 5, 2 plays 7, 3 plays 6.</p>
            <button className="sp-btn sp-btn-sm sp-btn-gold mt-2" disabled={busy || order.length !== approved.length} onClick={() => run('generateBracket', { tournamentId: T.id, mode: 'manual', order }, 'Bracket set from your seeds')}>Use these seeds</button>
          </details>
          <Feedback msg={msg} />
        </section>
      )}
      {data.matches.length > 0 ? (
        <section>
          <h2 className="sp-display text-xl mb-2">{T.bracketPublished ? 'Published bracket' : 'Preview (only you can see this)'}</h2>
          <Bracket data={data} linkMatches />
        </section>
      ) : T.rosterLocked && <ErrorBox message="No bracket yet. Approve more than half the capacity, then redraw." />}
    </div>
  )
}

// ─── Disputes, audit, export ────────────────────────────────────────────────

function DisputesTab({ data }: { data: any }) {
  const open = data.disputes.filter((d: any) => d.status === 'open')
  const closed = data.disputes.filter((d: any) => d.status !== 'open')
  const row = (d: any) => (
    <Link key={d.id} href={`/spades/match/${d.matchId}#staff`} className="sp-card p-3 grid gap-1 text-sm" style={d.status === 'open' ? { borderColor: 'var(--sp-red)' } : undefined}>
      <div className="flex flex-wrap gap-2 items-center"><span className={`sp-chip ${d.status === 'open' ? 'sp-chip-bad' : 'sp-chip-dim'}`}>{d.status}</span><b>{d.kind.replace(/_/g, ' ')}</b><span>{d.matchLabel}{d.handNumber ? ` · hand ${d.handNumber}` : ''}</span><span style={{ color: 'var(--sp-muted)' }}>{fmtTime(d.createdAt)} by {d.raisedBy}</span></div>
      <div>{d.reason}</div>
      {d.resolution && <div style={{ color: 'var(--sp-muted)' }}>Ruling by {d.resolvedBy}: {d.resolution}</div>}
    </Link>
  )
  return (
    <div className="grid gap-4">
      <section className="grid gap-2"><h2 className="sp-display text-xl">Open</h2>{open.length ? open.map(row) : <p style={{ color: 'var(--sp-muted)' }}>Nothing open.</p>}</section>
      {closed.length > 0 && <section className="grid gap-2"><h2 className="sp-display text-xl">Closed</h2>{closed.map(row)}</section>}
    </div>
  )
}

function AuditTab({ data }: { data: any }) {
  return (
    <section className="sp-card p-4">
      <h2 className="sp-display text-xl mb-2">Audit log (latest 300)</h2>
      <div className="sp-scroll">
        <table className="sp-table">
          <thead><tr><th>Time</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            {data.audit.map((a: any) => (
              <tr key={a.id}>
                <td className="sp-num whitespace-nowrap">{fmtTime(a.at)}</td>
                <td>{a.actor || 'Public'}<div className="text-xs" style={{ color: 'var(--sp-dim)' }}>{a.role}</div></td>
                <td className="font-bold whitespace-nowrap">{a.action}</td>
                <td className="text-xs" style={{ color: 'var(--sp-muted)', maxWidth: 420 }}>
                  {a.reason && <div style={{ color: 'var(--sp-cream)' }}>Reason: {a.reason}</div>}
                  {a.before && <div>Before: {JSON.stringify(a.before)}</div>}
                  {a.after && <div>After: {JSON.stringify(a.after)}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ExportTab({ data }: { data: any }) {
  const slug = data.tournamentFull.slug
  const items = [
    ['teams', 'Team registration'], ['matches', 'Match results'], ['hands', 'Hand by hand scoring'], ['standings', 'Final standings'], ['disputes', 'Disputes and corrections'],
  ]
  return (
    <div className="grid gap-4">
      <section className="sp-card p-4 grid gap-2">
        <h2 className="sp-display text-xl">CSV exports</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {items.map(([k, label]) => <a key={k} className="sp-btn sp-btn-sm" href={`/api/spades/export?t=${slug}&kind=${k}`}>{label}</a>)}
        </div>
      </section>
      <section className="sp-card p-4 grid gap-2">
        <h2 className="sp-display text-xl">Print backups</h2>
        <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>If the wifi drops, tables keep score on paper and a supervisor enters the hands once it is back.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Link className="sp-btn sp-btn-sm" href={`/spades/print?kind=scorecards&t=${slug}`} target="_blank">Table scorecards</Link>
          <Link className="sp-btn sp-btn-sm" href={`/spades/print?kind=bracket&t=${slug}`} target="_blank">Printable bracket</Link>
        </div>
      </section>
    </div>
  )
}

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
  const [capacity, setCapacity] = useState(T.capacity)
  const [nt, setNt] = useState({ name: '', capacity: 8 })
  const live = data.matches.some((m: any) => ['live', 'paused'].includes(m.status))
  const num = (k: string) => (
    <label className="sp-field"><span>{({ minTeamBid: 'Minimum team bid', targetDefault: 'Target, opening rounds', targetFinal: 'Target, championship', timeDefaultMin: 'Minutes, opening rounds', timeFinalMin: 'Minutes, championship', initialBags: 'Starting bags', bagLimit: 'Bags per penalty', bagPenalty: 'Bag penalty points' } as any)[k]}</span>
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

      <form className="sp-card p-4 grid gap-3" onSubmit={e => { e.preventDefault(); const patch: any = { ...r }; for (const k of Object.keys(patch)) if (typeof patch[k] === 'string' && /^\d+$/.test(patch[k])) patch[k] = Number(patch[k]); run('updateTournament', { tournamentId: T.id, patch: { rules: patch } }, 'Rules saved. They apply to matches that start from now on.') }}>
        <h2 className="sp-display text-xl">House rules</h2>
        {live && <div className="sp-banner sp-banner-warn text-sm">Running matches keep the rules they started with. Changes apply to matches started after you save.</div>}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="sp-field"><span>Bidding mode</span>
            <select className="sp-select" value={r.biddingMode} onChange={e => setR({ ...r, biddingMode: e.target.value })}>
              <option value="individual">Individual: every player enters their own bid</option>
              <option value="captain">Team captain enters both partner bids</option>
            </select>
          </label>
          <label className="sp-field"><span>Bid order</span>
            <select className="sp-select" value={r.bidOrder} onChange={e => setR({ ...r, bidOrder: e.target.value })}>
              <option value="simultaneous">At the same time, hidden until locked</option>
              <option value="sequential">In seat order, earlier bids visible</option>
            </select>
          </label>
          {num('minTeamBid')}{num('initialBags')}{num('targetDefault')}{num('targetFinal')}{num('timeDefaultMin')}{num('timeFinalMin')}{num('bagLimit')}{num('bagPenalty')}
          <label className="flex items-center gap-3 font-bold"><input type="checkbox" className="w-6 h-6" checked={r.requireCaptainApproval} onChange={e => setR({ ...r, requireCaptainApproval: e.target.checked })} /> Both captains confirm every hand</label>
        </div>
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>Nil and blind nil are off for this engine. Targets and time limits are copied onto each match when the bracket is drawn; adjust a single match from its match page.</p>
        <button className="sp-btn sp-btn-gold" disabled={busy}>Save rules</button>
      </form>

      <section className="sp-card p-4 grid gap-3">
        <h2 className="sp-display text-xl">Capacity and waitlist</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="sp-field" style={{ maxWidth: 200 }}><span>Bracket size</span>
            <select className="sp-select" value={capacity} onChange={e => setCapacity(Number(e.target.value))} disabled={data.matches.length > 0}>
              {[4, 8, 16, 32, 64].map(n => <option key={n} value={n}>{n} teams</option>)}
            </select>
          </label>
          <button className="sp-btn sp-btn-sm" disabled={busy || capacity === T.capacity} onClick={() => run('updateTournament', { tournamentId: T.id, patch: { capacity } }, 'Capacity saved')}>Save</button>
          <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => run('updateTournament', { tournamentId: T.id, patch: { waitlist_enabled: !T.waitlistEnabled } }, 'Saved')}>Waitlist {T.waitlistEnabled ? 'on' : 'off'}</button>
        </div>
      </section>

      {data.viewer.kind === 'owner' && (
        <section className="sp-card p-4 grid gap-3">
          <h2 className="sp-display text-xl">Tournaments</h2>
          <div className="flex flex-wrap gap-2">
            {!T.isFeatured && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => run('updateTournament', { tournamentId: T.id, patch: { is_featured: true } }, 'Now the main /spades event')}>Make this the main /spades event</button>}
            {T.status === 'completed' && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => { if (confirm('Archive this tournament? It becomes read only.')) run('updateTournament', { tournamentId: T.id, patch: { status: 'archived' } }, 'Archived') }}>Archive</button>}
          </div>
          <form className="grid sm:grid-cols-3 gap-2" onSubmit={async e => { e.preventDefault(); const res = await run('createTournament', { name: nt.name, capacity: nt.capacity }, 'Created'); if (res.ok) window.location.href = `/spades/admin?t=${res.data.slug}` }}>
            <input className="sp-input" placeholder="New tournament name" aria-label="New tournament name" value={nt.name} onChange={e => setNt({ ...nt, name: e.target.value })} />
            <select className="sp-select" aria-label="Capacity" value={nt.capacity} onChange={e => setNt({ ...nt, capacity: Number(e.target.value) })}>{[4, 8, 16, 32, 64].map(n => <option key={n} value={n}>{n} teams</option>)}</select>
            <button className="sp-btn sp-btn-gold" disabled={busy || !nt.name.trim()}>Create tournament</button>
          </form>
        </section>
      )}
      <Feedback msg={msg} />
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<Loading />}><Admin /></Suspense>
}
