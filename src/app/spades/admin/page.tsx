'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { TournamentsTab, toLocalInput } from '../_components/TournamentsAdmin'
import { postAuth, useSpades, type ActResult } from '../_components/useSpades'
import { normalizeRules, ruleSummary } from '@/lib/spades/rules'

const defaultSections = (r: any) => ruleSummary(normalizeRules(r))
const NL = String.fromCharCode(10)
import { ErrorBox, Feedback, Loading, Shell } from '../_components/ui'

type Act = (action: string, payload?: Record<string, unknown>) => Promise<ActResult>
type Msg = { ok: boolean; text: string } | null
const TABS = ['Tournaments', 'Winners', 'Settings', 'Test Mode'] as const

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
  const [tab, setTab] = useState<(typeof TABS)[number]>('Tournaments')
  useEffect(() => {
    try { const s = sessionStorage.getItem('sp-admin-tab'); if (s && (TABS as readonly string[]).includes(s)) setTab(s as any) } catch {}
  }, [])
  useEffect(() => { try { sessionStorage.setItem('sp-admin-tab', tab) } catch {} }, [tab])

  if (loading && !data) return <Shell active="admin"><Loading /></Shell>
  if (status === 401 || status === 403) {
    return <Shell active="admin" online={online} viewer={data?.viewer}><div className="sp-wrap-narrow grid gap-4"><h1 className="sp-display text-4xl">Director</h1>{data?.viewer?.kind === 'staff' && <div className="sp-banner sp-banner-warn text-sm">You are signed in as a supervisor. Director access needs the director password.</div>}<Login /></div></Shell>
  }
  if (!data?.noEvent && !data?.tournamentFull) return <Shell active="admin" online={online}><div className="sp-wrap-narrow"><ErrorBox message={error || 'Could not load'} onRetry={reload} /></div></Shell>
  const T = data.noEvent ? null : data.tournamentFull
  // Test events and old self-started games open straight on Test Mode / Settings.
  const tabs = TABS.filter(x => T || (x !== 'Settings'))
  const safe = T ? data : { ...data, tournamentFull: { slug: null, name: '', championTeamId: null }, allTeams: [], matches: [], cards: [] }
  return (
    <Shell active="admin" online={online} viewer={data.viewer} wide>
      <div className="sp-wrap grid gap-4">
        <div>
          <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>Tournament director</p>
          <h1 className="sp-display text-3xl mt-1">Spades HQ</h1>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }} role="tablist">
          {tabs.map(x => (
            <button key={x} role="tab" aria-selected={tab === x} className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap" style={tab === x ? { background: 'var(--sp-cream)', color: 'var(--sp-ink)' } : { color: 'var(--sp-muted)' }} onClick={() => setTab(x)}>
              {x}
            </button>
          ))}
        </nav>
        {tab === 'Tournaments' && <TournamentsTab data={data} act={act} serverNow={serverNow} />}
        {tab === 'Winners' && <WinnersTab data={safe} />}
        {tab === 'Settings' && T && <SettingsTab data={data} act={act} />}
        {tab === 'Test Mode' && <TestModeTab data={safe} act={act} />}
      </div>
    </Shell>
  )
}


// ─── Settings ───────────────────────────────────────────────────────────────


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
        <h2 className="sp-display text-xl">{T.name}: details</h2>
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
          <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Create new tournaments on the Tournaments tab.</p>
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
        <p className="text-xs" style={{ color: 'var(--sp-muted)' }}>Championship tournaments also keep every game on the Winners page records, even after you clear the scoreboard.</p>
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


export default function Page() {
  return <Suspense fallback={<Loading />}><Admin /></Suspense>
}
