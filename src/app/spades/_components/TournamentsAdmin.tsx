'use client'

import Link from 'next/link'
import { useState } from 'react'
import { EndMatch } from './MatchPanel'
import { Feedback, MatchTimer, StatusChip } from './ui'
import type { ActResult } from './useSpades'

type Act = (action: string, payload?: Record<string, unknown>) => Promise<ActResult>
type Msg = { ok: boolean; text: string } | null

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

export function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '')

// The director's home: one tournament at a time. Before it starts, the
// sign up sheet; after, its games. Each tournament holds only its teams and
// its games.
export function TournamentsTab({ data, act, serverNow }: { data: any; act: Act; serverNow: () => number }) {
  const all = (data.tournaments || []).filter((x: any) => !x.isTest && !x.rules?.selfServe)
  const active = all.filter((x: any) => x.status !== 'archived')
  const cleared = all.filter((x: any) => x.status === 'archived')
  const T = data.noEvent ? null : data.tournamentFull
  const showing = T && T.status !== 'archived' && !T.isTest && !T.rules?.selfServe ? T : null
  return (
    <div className="grid gap-4">
      {active.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Pick a tournament">
          {active.map((x: any) => (
            <a key={x.slug} role="tab" aria-selected={showing?.slug === x.slug} href={`/spades/admin?t=${x.slug}`} className="px-4 py-3 rounded-xl font-bold whitespace-nowrap"
              style={showing?.slug === x.slug ? { background: 'var(--sp-cream)', color: 'var(--sp-ink)' } : { background: 'rgba(0,0,0,0.3)', color: 'var(--sp-muted)', border: '1px solid var(--sp-line)' }}>
              {x.name}{x.rules?.championship ? ' 🏆' : ''}
            </a>
          ))}
        </div>
      )}
      {showing ? <TournamentPanel data={data} act={act} serverNow={serverNow} /> : (
        active.length > 0 && (
          <section className="sp-card p-4 grid gap-2">
            <h2 className="sp-display text-xl">Your tournaments</h2>
            {active.map((x: any) => (
              <a key={x.slug} href={`/spades/admin?t=${x.slug}`} className="flex items-center justify-between gap-2 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
                <span className="font-bold">{x.name}</span><span className="sp-btn sp-btn-sm sp-btn-gold">Open</span>
              </a>
            ))}
          </section>
        )
      )}
      <CreateTournament act={act} open={!showing} />
      {cleared.length > 0 && (
        <details className="sp-card p-4">
          <summary className="sp-display text-xl">Cleared from the scoreboard ({cleared.length})</summary>
          <div className="grid gap-2 mt-3">
            {cleared.map((x: any) => (
              <div key={x.slug} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
                <span><span className="font-bold">{x.name}</span>{x.rules?.championship && <span className="sp-chip sp-chip-warn ml-2">Championship</span>}<span className="text-xs block" style={{ color: 'var(--sp-muted)' }}>{when(x.startsAt)}</span></span>
                <a className="sp-btn sp-btn-sm sp-btn-ghost" href={`/spades/admin?t=${x.slug}`}>Look back</a>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function CreateTournament({ act, open }: { act: Act; open: boolean }) {
  const { busy, msg, run } = useRun(act)
  const [f, setF] = useState({ name: '', startsAt: '', championship: true, target: '250', venue: '' })
  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const r = await run('createTournament', { house: true, name: f.name, startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : undefined, championship: f.championship, target: Number(f.target) || 250, venue: f.venue || undefined }, 'Tournament created. Sign ups are open.')
    if (r.ok) window.location.href = `/spades/admin?t=${r.data.slug}`
  }
  const choice = (on: boolean) => ({ background: on ? 'rgba(224,173,79,0.18)' : 'rgba(0,0,0,0.22)', border: `2px solid ${on ? 'var(--sp-gold)' : 'transparent'}` })
  return (
    <details className="sp-card p-4" open={open}>
      <summary className="sp-display text-xl">Create a tournament</summary>
      <form onSubmit={create} className="grid gap-3 mt-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="sp-field"><span>Name</span><input className="sp-input" maxLength={120} value={f.name} placeholder="Friday Night Spades" onChange={e => setF({ ...f, name: e.target.value })} /></label>
          <label className="sp-field"><span>Date and time (optional)</span><input type="datetime-local" className="sp-input" value={f.startsAt} onChange={e => setF({ ...f, startsAt: e.target.value })} /></label>
          <label className="sp-field"><span>Where (optional)</span><input className="sp-input" maxLength={120} value={f.venue} onChange={e => setF({ ...f, venue: e.target.value })} /></label>
          <label className="sp-field"><span>Games play to</span><input className="sp-input" inputMode="numeric" value={f.target} onChange={e => setF({ ...f, target: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></label>
        </div>
        <span className="sp-label">Is this for the trophy?</span>
        <div className="grid sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Championship">
          {[{ v: true, t: 'Championship for the trophy', d: 'The winner goes on the Winners page and every game counts toward team records.' }, { v: false, t: 'Just for fun', d: 'Same bracket, but nothing goes on the Winners page.' }].map(o => (
            <button key={String(o.v)} type="button" role="radio" aria-checked={f.championship === o.v} onClick={() => setF({ ...f, championship: o.v })} className="p-3 rounded-xl text-left" style={choice(f.championship === o.v)}>
              <div className="font-black">{o.t}</div><div className="text-xs mt-1" style={{ color: 'var(--sp-muted)' }}>{o.d}</div>
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>Sign ups open on the home page as soon as you create it. Scoring: first hand bids itself, then 10 points per book bid, set scores 0, extra books earn nothing, no bid minimum. One scorekeeper per table.</p>
        <Feedback msg={msg} />
        <button className="sp-btn sp-btn-gold" disabled={busy || !f.name.trim() || !f.target}>Create tournament</button>
      </form>
    </details>
  )
}

function TournamentPanel({ data, act, serverNow }: { data: any; act: Act; serverNow: () => number }) {
  const T = data.tournamentFull
  const { busy, msg, run } = useRun(act)
  const [editing, setEditing] = useState(false)
  const started = T.rosterLocked
  const running = data.matches.some((m: any) => ['live', 'paused', 'completed'].includes(m.status))
  const champ = T.championTeamId ? data.allTeams.find((x: any) => x.id === T.championTeamId) : null
  return (
    <div className="grid gap-4">
      <section className="sp-card p-4 grid gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="sp-display text-3xl">{T.name}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`sp-chip ${T.rules.championship ? 'sp-chip-warn' : 'sp-chip-dim'}`}>{T.rules.championship ? '🏆 Championship' : 'Just for fun'}</span>
              <span className={`sp-chip ${started ? (T.status === 'completed' ? 'sp-chip-info' : 'sp-chip-live') : T.registrationOpen ? 'sp-chip-live' : 'sp-chip-dim'}`}>{T.status === 'completed' ? 'Finished' : started ? 'In progress' : T.registrationOpen ? 'Sign ups open' : 'Sign ups closed'}</span>
              <span className="sp-chip sp-chip-dim">To {T.rules.targetDefault}</span>
              {T.startsAt && <span className="sp-chip sp-chip-dim">{when(T.startsAt)}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!started && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => run('updateTournament', { tournamentId: T.id, patch: { registration_open: !T.registrationOpen } }, T.registrationOpen ? 'Sign ups closed' : 'Sign ups open')}>{T.registrationOpen ? 'Close sign ups' : 'Open sign ups'}</button>}
            {!started && <button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => setEditing(x => !x)}>{editing ? 'Close' : 'Edit'}</button>}
            <a className="sp-btn sp-btn-sm sp-btn-ghost" href={`/spades/bracket?t=${T.slug}`} target="_blank" rel="noreferrer">Scores page</a>
            <a className="sp-btn sp-btn-sm sp-btn-ghost" href={`/spades/display?t=${T.slug}`} target="_blank" rel="noreferrer">TV display</a>
          </div>
        </div>
        {editing && <EditTournament T={T} act={act} onDone={() => setEditing(false)} />}
        <Feedback msg={msg} />
      </section>

      {!started ? <SignupSheet data={data} act={act} /> : (
        <>
          {champ && (
            <div className="sp-card-paper p-5 text-center">
              <p className="sp-label">{T.rules.championship ? 'Champions' : 'Winners'}</p>
              <p className="sp-display text-4xl">{champ.name}</p>
              <p className="font-bold">{champ.players.map((p: any) => p.name).join(' & ')}</p>
              {T.rules.championship && <p className="text-sm mt-1">This result is on the Winners page records. Add their trophy photo on the Winners tab.</p>}
            </div>
          )}
          <Games data={data} act={act} serverNow={serverNow} />
          <BenchList data={data} />
        </>
      )}

      <section className="sp-card p-4 grid gap-2">
        <h2 className="sp-display text-xl">When it is over</h2>
        <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Clear the scoreboard to take this tournament off the home page and the Scores page. {T.rules.championship ? 'The champion and every game record stay on the Winners page.' : ''}</p>
        <div className="flex flex-wrap gap-2">
          <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy || running} onClick={() => { if (confirm(`Clear ${T.name} from the scoreboard?`)) run('updateTournament', { tournamentId: T.id, patch: { status: 'archived' } }, 'Scoreboard cleared') }}>Clear the scoreboard</button>
          {data.viewer.kind === 'owner' && (
            <button className="sp-btn sp-btn-sm sp-btn-danger" disabled={busy} onClick={async () => {
              if (!confirm(`Delete ${T.name} completely? Sign ups, games${T.rules.championship ? ' and its Winners page records' : ''} are removed for good.`)) return
              const r = await run('deleteEvent', { tournamentId: T.id }, 'Deleted')
              if (r.ok) window.location.href = '/spades/admin'
            }}>Delete</button>
          )}
        </div>
        {running && <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>Finish or finalize the games still going before clearing.</p>}
      </section>
    </div>
  )
}

function EditTournament({ T, act, onDone }: { T: any; act: Act; onDone: () => void }) {
  const { busy, msg, run } = useRun(act)
  const [f, setF] = useState({ name: T.name, startsAt: toLocalInput(T.startsAt), venue: T.venue || '', target: String(T.rules.targetDefault), championship: !!T.rules.championship })
  return (
    <form className="grid gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.22)' }} onSubmit={async e => {
      e.preventDefault()
      const target = Number(f.target)
      const r = await run('updateTournament', { tournamentId: T.id, patch: { name: f.name, starts_at: f.startsAt ? new Date(f.startsAt).toISOString() : null, venue: f.venue || null, rules: { championship: f.championship, targetDefault: target, targetFinal: target } } }, 'Saved')
      if (r.ok) onDone()
    }}>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="sp-field"><span>Name</span><input className="sp-input" maxLength={120} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label className="sp-field"><span>Date and time</span><input type="datetime-local" className="sp-input" value={f.startsAt} onChange={e => setF({ ...f, startsAt: e.target.value })} /></label>
        <label className="sp-field"><span>Where</span><input className="sp-input" maxLength={120} value={f.venue} onChange={e => setF({ ...f, venue: e.target.value })} /></label>
        <label className="sp-field"><span>Games play to</span><input className="sp-input" inputMode="numeric" value={f.target} onChange={e => setF({ ...f, target: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></label>
      </div>
      <label className="flex items-center gap-3 font-bold"><input type="checkbox" className="w-6 h-6" checked={f.championship} onChange={e => setF({ ...f, championship: e.target.checked })} /> Championship for the trophy</label>
      <Feedback msg={msg} />
      <div className="flex gap-2"><button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy || !f.name.trim() || !f.target}>Save</button><button type="button" className="sp-btn sp-btn-sm sp-btn-ghost" onClick={onDone}>Cancel</button></div>
    </form>
  )
}

// ─── sign up sheet ──────────────────────────────────────────────────────────

function SignupSheet({ data, act }: { data: any; act: Act }) {
  const T = data.tournamentFull
  const { busy, msg, run, setMsg } = useRun(act)
  const [code, setCode] = useState<{ name: string; token: string } | null>(null)
  const entries = data.allTeams.filter((x: any) => x.status !== 'rejected')
  const teams = entries.filter((x: any) => !x.solo)
  const solos = entries.filter((x: any) => x.solo)
  const readyTeams = teams.filter((x: any) => x.checkedIn)
  const readySolos = solos.filter((x: any) => x.checkedIn)
  const getCode = async (p: any) => {
    const lost = p.invite.status === 'used' || p.invite.activeSessions > 0
    if (lost && !confirm(`${p.name} is already signed in on a phone. Make a new code and sign that phone out?`)) return
    const r = await run('invite', { playerId: p.id, revokeSessions: lost }, 'Code ready')
    if (r.ok) setCode({ name: p.name, token: r.data.token })
  }
  const pair = async () => {
    if (!confirm(`Pair ${readySolos.length} ready players at random?${readySolos.length % 2 ? ' One will be left over until someone else is ready.' : ''}`)) return
    const r = await run('pairSolos', { tournamentId: T.id }, 'Paired')
    if (r.ok) setMsg({ ok: true, text: `New teams: ${r.data.pairs.join(', ')}.${r.data.left ? ` ${r.data.left} is still waiting for a partner.` : ''}` })
  }
  const start = async () => {
    const notReady = entries.length - readyTeams.length
    if (!confirm(`Start the tournament with these ${readyTeams.length} teams?\n\n${readyTeams.map((x: any) => x.name).join('\n')}${notReady ? `\n\n${notReady} sign up${notReady === 1 ? ' is' : 's are'} not ready (or still need a partner) and will sit out.` : ''}\n\nThe bracket is drawn at random and the first games begin right away.`)) return
    const r = await run('startTournament', { tournamentId: T.id }, 'Tournament started. Good luck!')
    if (r.ok && r.data?.skipped?.length) alert(`${r.data.started} games started. ${r.data.skipped.length} could not start:\n${r.data.skipped.map((x: any) => x.reason).join('\n')}`)
  }
  return (
    <div className="grid gap-4">
      <section className="sp-card p-4 grid gap-3" style={{ borderColor: 'var(--sp-gold)' }}>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat n={entries.length} label="Signed up" />
          <Stat n={readyTeams.length} label="Teams ready" tone="var(--sp-green)" />
          <Stat n={readySolos.length} label="Ready, need a partner" tone="var(--sp-gold)" />
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <button className="sp-btn" disabled={busy || readySolos.length < 2} onClick={pair}>Pair {readySolos.length >= 2 ? readySolos.length - (readySolos.length % 2) : ''} ready players at random</button>
          <button className="sp-btn sp-btn-gold" disabled={busy || readyTeams.length < 2} onClick={start} style={{ minHeight: 56 }}>Start with {readyTeams.length} ready team{readyTeams.length === 1 ? '' : 's'}</button>
        </div>
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>People tap &quot;I&apos;m here and ready&quot; on their phone when they are seated. You can also tap Ready for them below. Only ready teams are put in the bracket.</p>
        <Feedback msg={msg} />
        {code && (
          <div className="sp-card-paper p-4 text-center grid gap-1">
            <p className="sp-label">Access code for {code.name}</p>
            <p className="sp-display sp-num" style={{ fontSize: 38, letterSpacing: '0.08em' }}>{code.token}</p>
            <p className="text-sm">They type it at orcafin.app/spades/join to get back in. Their old code stops working.</p>
            <button className="sp-btn sp-btn-sm justify-self-center" onClick={() => setCode(null)}>Done</button>
          </div>
        )}
      </section>

      <section className="grid gap-2">
        <h3 className="sp-display text-xl">Teams <span style={{ color: 'var(--sp-dim)' }}>{teams.length}</span></h3>
        {teams.length === 0 && <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>No teams yet.</p>}
        {teams.map((t: any) => <EntryRow key={t.id} t={t} act={act} onCode={getCode} />)}
      </section>
      <section className="grid gap-2">
        <h3 className="sp-display text-xl">Need a partner <span style={{ color: 'var(--sp-dim)' }}>{solos.length}</span></h3>
        {solos.length === 0 && <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Nobody is waiting for a partner.</p>}
        {solos.map((t: any) => <EntryRow key={t.id} t={t} act={act} onCode={getCode} />)}
      </section>
      <AddSignup T={T} act={act} />
    </div>
  )
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.25)' }}>
      <div className="sp-display sp-num text-4xl" style={{ color: tone }}>{n}</div>
      <div className="text-xs font-bold" style={{ color: 'var(--sp-muted)' }}>{label}</div>
    </div>
  )
}

function EntryRow({ t, act, onCode }: { t: any; act: Act; onCode: (p: any) => void }) {
  const { busy, msg, run } = useRun(act)
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(t.name)
  return (
    <div className="sp-card p-3 grid gap-2" style={{ borderColor: t.checkedIn ? 'var(--sp-green)' : undefined }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-black text-lg leading-tight break-words">{t.solo ? t.players[0]?.name : t.name}</div>
          <div className="text-sm" style={{ color: 'var(--sp-muted)' }}>{t.solo ? 'Needs a partner' : t.players.map((p: any) => p.name).join(' & ')}{t.contact ? ` · ${t.contact}` : ''}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={`sp-btn sp-btn-sm ${t.checkedIn ? 'sp-btn-gold' : 'sp-btn-ghost'}`} disabled={busy} onClick={() => run('checkIn', { teamId: t.id, present: !t.checkedIn }, t.checkedIn ? 'Marked not ready' : 'Marked ready')}>{t.checkedIn ? '✓ Ready' : 'Not ready'}</button>
          {!t.solo && <button className="sp-btn sp-btn-sm sp-btn-ghost" onClick={() => setEdit(x => !x)}>Rename</button>}
          {t.players.map((p: any) => <button key={p.id} className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => onCode(p)} title={`New access code for ${p.name}`}>Code{t.players.length > 1 ? `: ${p.name}` : ''}</button>)}
          <button className="sp-btn sp-btn-sm sp-btn-danger" disabled={busy} onClick={() => { if (confirm(`Remove ${t.solo ? t.players[0]?.name : t.name} from the sign up sheet?`)) run('removeTeam', { teamId: t.id }, 'Removed') }}>Remove</button>
        </div>
      </div>
      {edit && (
        <form className="flex gap-2" onSubmit={async e => { e.preventDefault(); const r = await run('updateTeam', { teamId: t.id, name }, 'Renamed'); if (r.ok) setEdit(false) }}>
          <input className="sp-input" aria-label="Team name" maxLength={40} value={name} onChange={e => setName(e.target.value)} />
          <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy || !name.trim()}>Save</button>
        </form>
      )}
      <Feedback msg={msg} />
    </div>
  )
}

function AddSignup({ T, act }: { T: any; act: Act }) {
  const { busy, msg, run } = useRun(act)
  const empty = { player1: '', player2: '', name: '' }
  const [f, setF] = useState(empty)
  const solo = !f.player2.trim()
  return (
    <details className="sp-card p-4">
      <summary className="font-black">Add someone who is here without a phone</summary>
      <form className="grid gap-3 mt-3" onSubmit={async e => {
        e.preventDefault()
        const r = await run('addTeam', { tournamentId: T.id, solo, player1: f.player1, player2: f.player2, name: f.name }, solo ? 'Added. They need a partner.' : 'Team added')
        if (r.ok) setF(empty)
      }}>
        <div className="grid sm:grid-cols-3 gap-2">
          <input className="sp-input" placeholder="Name" aria-label="Name" maxLength={40} value={f.player1} onChange={e => setF({ ...f, player1: e.target.value })} />
          <input className="sp-input" placeholder="Partner (leave blank if they need one)" aria-label="Partner" maxLength={40} value={f.player2} onChange={e => setF({ ...f, player2: e.target.value })} />
          {!solo && <input className="sp-input" placeholder="Team name" aria-label="Team name" maxLength={40} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />}
        </div>
        <button className="sp-btn sp-btn-sm sp-btn-gold justify-self-start" disabled={busy || !f.player1.trim() || (!solo && !f.name.trim())}>Add</button>
        <Feedback msg={msg} />
      </form>
    </details>
  )
}

// ─── games ──────────────────────────────────────────────────────────────────

function Games({ data, act, serverNow }: { data: any; act: Act; serverNow: () => number }) {
  const T = data.tournamentFull
  const { busy, msg, run } = useRun(act)
  const teams = new Map<string, string>(data.allTeams.map((x: any) => [x.id, x.name]))
  const rounds = Array.from(new Set<number>(data.matches.map((m: any) => m.round))).sort((x, y) => x - y)
  return (
    <section className="sp-card p-4 grid gap-4">
      <h2 className="sp-display text-2xl">Games</h2>
      {rounds.map(r => {
        const ms = data.matches.filter((m: any) => m.round === r)
        const prevDone = r === 1 || data.matches.filter((m: any) => m.round === r - 1).every((m: any) => m.status === 'final')
        const ready = ms.filter((m: any) => m.status === 'ready')
        return (
          <div key={r} className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black" style={{ color: 'var(--sp-gold)' }}>{ms[0]?.roundName}</h3>
              {ready.length > 0 && prevDone && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => { if (confirm(`Begin the ${ms[0]?.roundName}?`)) run('startRound', { tournamentId: T.id, round: r }, 'Game on') }}>Begin {ms[0]?.roundName}</button>}
              {ms.every((m: any) => m.status === 'pending') && <span className="text-xs" style={{ color: 'var(--sp-muted)' }}>Waiting on the earlier round</span>}
            </div>
            {ms.map((m: any) => <MatchRow key={m.id} m={m} data={data} act={act} teams={teams} serverNow={serverNow} />)}
          </div>
        )
      })}
      <Feedback msg={msg} />
    </section>
  )
}

function BenchList({ data }: { data: any }) {
  const bench = data.allTeams.filter((x: any) => x.status === 'waitlist')
  if (!bench.length) return null
  return (
    <section className="sp-card p-4 grid gap-1">
      <h2 className="sp-display text-xl">Sat out</h2>
      <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>{bench.map((x: any) => (x.solo ? x.players[0]?.name : x.name)).join(', ')}</p>
    </section>
  )
}

export function MatchRow({ m, data, act, teams, serverNow }: { m: any; data: any; act: Act; teams: Map<string, string>; serverNow: () => number }) {
  const { busy, msg, run } = useRun(act)
  const card = data.cards.find((c: any) => c.match.id === m.id)
  if (m.resultKind === 'bye') return <div className="text-sm p-2" style={{ color: 'var(--sp-dim)' }}>Bye: {teams.get(m.winner) || ''} moves on</div>
  const atTable = card ? [...(card.teamA?.players || []), ...(card.teamB?.players || [])] : []
  return (
    <div className="p-3 rounded-lg grid gap-2" style={{ background: 'rgba(0,0,0,0.22)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold">{teams.get(m.teamA) || 'TBD'} <span className="sp-num" style={{ color: 'var(--sp-gold)' }}>{m.status !== 'pending' && m.status !== 'ready' ? `${m.scoreA} to ${m.scoreB}` : 'vs'}</span> {teams.get(m.teamB) || 'TBD'}</div>
        <div className="flex items-center gap-2"><StatusChip label={m.label} />{m.startedAt && m.timeLimitMin > 0 && <MatchTimer m={m} serverNow={serverNow} />}</div>
      </div>
      {card && ['live', 'paused'].includes(m.status) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span style={{ color: 'var(--sp-muted)' }}>Scorekeeper:</span>
          <select className="sp-select" style={{ maxWidth: 220, minHeight: 36, padding: '4px 10px' }} value={card.scorekeeper?.playerId || ''} aria-label="Scorekeeper"
            onChange={e => run('setKeeper', { matchId: m.id, playerId: e.target.value || null }, 'Scorekeeper changed')}>
            <option value="">Not picked yet</option>
            {atTable.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {card.current && <span style={{ color: 'var(--sp-muted)' }}>Hand {card.current.handNumber}</span>}
        </div>
      )}
      {card && ['live', 'paused', 'completed'].includes(m.status) && <EndMatch d={card} act={act} names={{ a: teams.get(m.teamA) || 'Team A', b: teams.get(m.teamB) || 'Team B' }} />}
      <div className="flex flex-wrap items-center gap-2">
        {m.status === 'ready' && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => run('startMatch', { matchId: m.id }, 'Game on')}>Begin game</button>}
        {m.status === 'completed' && <button className="sp-btn sp-btn-sm sp-btn-gold" disabled={busy} onClick={() => { if (confirm(`Make it official: ${teams.get(m.winner)} wins ${Math.max(m.scoreA, m.scoreB)} to ${Math.min(m.scoreA, m.scoreB)}?`)) run('finalize', { matchId: m.id }, 'Official. Winner moves on.') }}>Make it official: {teams.get(m.winner)} wins</button>}
        {m.status === 'live' && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => run('pause', { matchId: m.id }, 'Paused')}>Pause</button>}
        {m.status === 'paused' && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => run('resume', { matchId: m.id }, 'Resumed')}>Resume</button>}
        {card?.current && ['live', 'paused'].includes(m.status) && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => { if (confirm(`Redeal hand ${card.current.handNumber}? Only this hand is thrown out. The score stays.`)) run('voidHand', { handId: card.current.id, reason: '' }, 'Redealt') }}>Redeal hand</button>}
        {['live', 'paused', 'completed', 'final'].includes(m.status) && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => {
          if (!confirm('Restart this game from zero? Every hand is erased.')) return
          if (prompt('Type RESTART to confirm') !== 'RESTART') return
          run('resetMatch', { matchId: m.id, reason: '' }, 'Restarted')
        }}>Restart game</button>}
        {m.teamA && m.teamB && <Link href={`/spades/match/${m.id}`} className="sp-btn sp-btn-sm sp-btn-ghost">Open game</Link>}
      </div>
      <Feedback msg={msg} />
    </div>
  )
}
