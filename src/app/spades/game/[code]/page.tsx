'use client'

// An online table: join screen, lobby with the invite code, then the game.
// The server deals and plays the computer seats; this page polls about once
// a second and only ever receives this player's own cards.

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Loading, Shell } from '../../_components/ui'
import { CardTable, relativeName } from '../../_components/CardTable'
import { LEARN_KEY, LearnToggle, LIVE_LAST_KEY, liveTokenKey, NAME_KEY, postLive, RuleNotes } from '../../_components/GameOptions'
import { gameTypeLabel } from '@/lib/spades/quickgame'
import { ruleSet } from '@/lib/spades/cardgame'
import type { LiveView } from '@/lib/spades/live'

const POLL_MS = 1000
const POLL_HIDDEN_MS = 5000
const TEAMS = [{ label: 'Team 1', seats: [0, 2] }, { label: 'Team 2', seats: [1, 3] }]

export default function LiveTable() {
  const params = useParams<{ code: string }>()
  const code = String(params?.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<LiveView | null>(null)
  const [gone, setGone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [learn, setLearn] = useState(true)
  const tokenRef = useRef<string | null>(null)

  useEffect(() => {
    try {
      const t = localStorage.getItem(liveTokenKey(code))
      tokenRef.current = t
      const l = localStorage.getItem(LEARN_KEY)
      if (l !== null) setLearn(l === '1')
    } catch {}
    setReady(true)
  }, [code])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/spades/live?code=${code}`, { headers: { 'x-seat-token': tokenRef.current || '' }, cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 404) { setGone(data.error || 'That table has closed.'); return }
      if (res.ok) setView(data)
    } catch {}
  }, [code])

  useEffect(() => {
    if (!ready || gone) return
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    const loop = async () => {
      await refresh()
      if (alive) timer = setTimeout(loop, document.hidden ? POLL_HIDDEN_MS : POLL_MS)
    }
    loop()
    return () => { alive = false; clearTimeout(timer) }
  }, [ready, gone, refresh])

  const send = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true)
    setError(null)
    try {
      const r = await postLive({ action, code, token: tokenRef.current, ...extra })
      if (r.closed) {
        try { localStorage.removeItem(liveTokenKey(code)) } catch {}
        setGone(action === 'end' || action === 'leave' ? 'You closed the table.' : 'That table has closed.')
      } else if (r.view) setView(r.view)
      return r
    } catch (e: any) {
      setError(e.message)
      refresh()
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    const host = view?.isHost
    const text = host ? 'Close this table for everyone?' : view?.status === 'lobby' ? 'Leave this table?' : 'Leave the game? The computer will take your seat.'
    if (!confirm(text)) return
    await send('leave')
    try {
      localStorage.removeItem(liveTokenKey(code))
      if (localStorage.getItem(LIVE_LAST_KEY) === code) localStorage.removeItem(LIVE_LAST_KEY)
    } catch {}
    tokenRef.current = null
    if (!host) setGone('You left the table.')
  }

  const setLearnMode = (v: boolean) => {
    setLearn(v)
    try { localStorage.setItem(LEARN_KEY, v ? '1' : '0') } catch {}
  }

  if (gone) {
    return (
      <Shell badge={false}>
        <div className="sp-wrap-narrow grid gap-4 text-center">
          <h1 className="sp-display text-3xl">Table closed</h1>
          <p style={{ color: 'var(--sp-muted)' }}>{gone}</p>
          <Link href="/spades/game" className="sp-btn sp-btn-gold sp-btn-block">Play a game</Link>
        </div>
      </Shell>
    )
  }
  if (!view) return <Shell badge={false}><Loading label="Finding your table" /></Shell>

  const hostName = view.seats[0]?.name || 'The host'

  if (view.canReclaim !== null) {
    return (
      <Shell badge={false}>
        <div className="sp-wrap-narrow grid gap-4 text-center">
          <h1 className="sp-display text-3xl">The computer has your seat</h1>
          <p style={{ color: 'var(--sp-muted)' }}>{hostName} let the computer play for you while you were away. Take it back to keep playing.</p>
          {error && <div className="sp-banner sp-banner-bad text-sm">{error}</div>}
          <button className="sp-btn sp-btn-gold sp-btn-block" disabled={busy} onClick={() => send('reclaim')}>Take my seat back</button>
        </div>
      </Shell>
    )
  }

  if (view.you === null) {
    return (
      <Shell badge={false}>
        <JoinScreen view={view} code={code} onJoined={(t, v) => {
          try {
            localStorage.setItem(liveTokenKey(code), t)
            localStorage.setItem(LIVE_LAST_KEY, code)
          } catch {}
          tokenRef.current = t
          setView(v)
        }} />
      </Shell>
    )
  }

  if (view.status === 'lobby') {
    return (
      <Shell badge={false}>
        <Lobby view={view} busy={busy} error={error} send={send} onLeave={leave} />
      </Shell>
    )
  }

  const me = view.you
  const names = view.seats.map((s, i) => (i === me ? 'You' : s.kind === 'bot' ? `${relativeName(i, me)} (CPU)` : s.name))
  return (
    <Shell badge={false}>
      <div className="sp-wrap-narrow grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="sp-chip sp-chip-dim">Table {view.code}</span>
          <LearnToggle compact value={learn} onChange={setLearnMode} />
        </div>
        {view.game && (
          <CardTable
            g={view.game}
            me={me}
            names={names}
            handCounts={view.handCounts}
            learn={learn}
            busy={busy}
            error={error}
            onBid={bid => send('bid', { bid })}
            onPlay={card => send('play', { card })}
            onNext={() => send('next')}
            seatExtra={seat => {
              const s = view.seats[seat]
              if (seat === me) return null
              if (s.covered) return <span className="text-xs" style={{ color: 'var(--sp-gold)' }}>{s.name} is away</span>
              if (s.kind === 'human' && !s.online) {
                return (
                  <>
                    <span className="text-xs" style={{ color: 'var(--sp-red)' }}>Not connected</span>
                    {view.isHost && <button className="sp-btn sp-btn-sm mt-1" style={{ minHeight: 32, padding: '4px 8px', fontSize: 11 }} disabled={busy} onClick={() => { if (confirm(`Let the computer play for ${s.name}? They can take the seat back when they return.`)) send('fill', { seat }) }}>CPU plays</button>}
                  </>
                )
              }
              return null
            }}
            endActions={view.isHost ? (
              <>
                <button className="sp-btn sp-btn-wine sp-btn-block" disabled={busy} onClick={() => send('rematch')}>Rematch, same seats</button>
                <button className="sp-btn sp-btn-block" disabled={busy} onClick={() => send('end')}>Close the table</button>
              </>
            ) : (
              <p className="text-center text-sm font-bold">Waiting for {hostName} to start a rematch.</p>
            )}
          />
        )}
        <button className="sp-btn sp-btn-ghost sp-btn-sm justify-self-center mt-2" onClick={leave}>{view.isHost ? 'Close table' : 'Leave table'}</button>
      </div>
    </Shell>
  )
}

function seatLabel(seat: number): string {
  return seat === 0 ? 'Host' : seat === 2 ? "Host's partner" : seat === 1 ? 'Left of host' : 'Right of host'
}

function JoinScreen({ view, code, onJoined }: { view: LiveView; code: string; onJoined: (token: string, view: LiveView) => void }) {
  const [name, setName] = useState('')
  const [seat, setSeat] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { try { setName(localStorage.getItem(NAME_KEY) || '') } catch {} }, [])
  const open = (i: number) => (view.status === 'lobby' ? view.seats[i].kind === 'open' : view.status === 'playing' && view.seats[i].kind === 'bot' && !view.seats[i].covered)
  const anyOpen = [0, 1, 2, 3].some(open)

  const join = async () => {
    if (!name.trim()) { setError('Enter your name.'); return }
    if (seat === null) { setError('Pick a seat.'); return }
    setBusy(true)
    setError(null)
    try {
      const r = await postLive({ action: 'join', code, name, seat })
      try { localStorage.setItem(NAME_KEY, name.trim()) } catch {}
      onJoined(r.token, r.view)
    } catch (e: any) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="sp-wrap-narrow grid gap-4">
      <header className="text-center">
        <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>Table {view.code}</p>
        <h1 className="sp-display text-3xl mt-1">{view.seats[0]?.name || 'A friend'} invited you to play</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--sp-muted)' }}>{ruleSet(view.settings.rules).name}, {gameTypeLabel(view.settings.gamesToWin).toLowerCase()}{view.status !== 'lobby' ? '. The game already started.' : ''}</p>
      </header>
      {!anyOpen ? (
        <div className="sp-card p-5 text-center" style={{ color: 'var(--sp-muted)' }}>Every seat is taken. Ask the host to start a new table.</div>
      ) : (
        <>
          <label className="sp-field">
            <span>Your name</span>
            <input className="sp-input" value={name} maxLength={20} autoComplete="nickname" onChange={e => setName(e.target.value)} placeholder="What your friends call you" />
          </label>
          <div className="grid gap-3">
            <p className="sp-label">Pick a seat. Partners sit across from each other.</p>
            {TEAMS.map(t => (
              <div key={t.label} className="sp-card p-3 grid gap-2">
                <p className="sp-label">{t.label}</p>
                {t.seats.map(i => {
                  const s = view.seats[i]
                  const can = open(i)
                  return (
                    <button key={i} type="button" disabled={!can} aria-pressed={seat === i} onClick={() => setSeat(i)} className={`sp-btn sp-btn-block ${seat === i ? 'sp-btn-gold' : can ? '' : 'sp-btn-ghost'}`} style={{ justifyContent: 'space-between' }}>
                      <span>{seatLabel(i)}</span>
                      <span className="text-sm normal-case">{s.kind === 'open' ? 'Open' : s.kind === 'bot' ? (can ? 'Computer, take over' : 'Computer') : s.name}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <details className="sp-card p-3">
            <summary className="sp-label">The rules at this table</summary>
            <div className="mt-2"><RuleNotes id={view.settings.rules} /></div>
          </details>
          {error && <div className="sp-banner sp-banner-bad text-sm" role="alert">{error}</div>}
          <button className="sp-btn sp-btn-wine sp-btn-block" style={{ minHeight: 60 }} disabled={busy} onClick={join}>{busy ? 'Joining' : 'Join the table'}</button>
        </>
      )}
      <Link href="/spades/game" className="sp-btn sp-btn-ghost sp-btn-block">Back</Link>
    </div>
  )
}

function Lobby({ view, busy, error, send, onLeave }: { view: LiveView; busy: boolean; error: string | null; send: (a: string, x?: Record<string, unknown>) => Promise<any>; onLeave: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/spades/game/${view.code.replace('-', '')}` : ''
  const empty = view.seats.filter(s => s.kind === 'open').length
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what) } catch { setCopied(null) }
    setTimeout(() => setCopied(null), 2000)
  }
  const share = async () => {
    const text = `Play spades with me on Spades HQ. Invite code ${view.code}`
    if (navigator.share) {
      try { await navigator.share({ title: 'Spades HQ', text, url }); return } catch {}
    }
    copy(`${text}\n${url}`, 'invite')
  }
  return (
    <div className="sp-wrap-narrow grid gap-4">
      <div className="sp-card-paper p-5 text-center grid gap-2">
        <p className="sp-label">Invite code</p>
        <p className="sp-display sp-num" style={{ fontSize: 'clamp(30px, 11vw, 44px)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{view.code}</p>
        <p className="text-sm">Friends open orcafin.app/spades, tap Play a game, then Join with a code. Or send them the link.</p>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <button className="sp-btn sp-btn-gold" onClick={share}>{copied === 'invite' ? 'Copied' : 'Share invite'}</button>
          <button className="sp-btn" onClick={() => copy(view.code, 'code')}>{copied === 'code' ? 'Copied' : 'Copy code'}</button>
        </div>
      </div>

      <p className="text-sm text-center" style={{ color: 'var(--sp-muted)' }}>{ruleSet(view.settings.rules).name}, {gameTypeLabel(view.settings.gamesToWin).toLowerCase()}. Partners sit across from each other.</p>

      {TEAMS.map(t => (
        <div key={t.label} className="sp-card p-3 grid gap-2">
          <p className="sp-label">{t.label}</p>
          {t.seats.map(i => {
            const s = view.seats[i]
            return (
              <div key={i} className="flex items-center justify-between gap-2 py-1">
                <div className="grid">
                  <span className="font-black">
                    {s.kind === 'open' ? 'Open seat' : s.kind === 'bot' ? 'Computer' : s.name}
                    {s.you && ' (you)'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--sp-muted)' }}>
                    {seatLabel(i)}{s.kind === 'human' ? (s.online ? ' · here' : ' · not connected') : ''}
                  </span>
                </div>
                {view.isHost && i !== 0 && s.kind === 'open' && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => send('fill', { seat: i })}>Add computer</button>}
                {view.isHost && i !== 0 && s.kind !== 'open' && <button className="sp-btn sp-btn-sm sp-btn-ghost" disabled={busy} onClick={() => send('clear', { seat: i })}>Remove</button>}
                {!view.isHost && s.kind === 'open' && <button className="sp-btn sp-btn-sm" disabled={busy} onClick={() => send('seat', { seat: i })}>Move here</button>}
              </div>
            )
          })}
        </div>
      ))}

      {error && <div className="sp-banner sp-banner-bad text-sm" role="alert">{error}</div>}
      {view.isHost ? (
        <button className="sp-btn sp-btn-wine sp-btn-block" style={{ minHeight: 64, fontSize: 19 }} disabled={busy} onClick={() => send('start')}>
          {empty ? `Start (computer takes ${empty} seat${empty === 1 ? '' : 's'})` : 'Start the game'}
        </button>
      ) : (
        <p className="text-center font-black">Waiting for {view.seats[0]?.name || 'the host'} to start the game.</p>
      )}
      <button className="sp-btn sp-btn-ghost sp-btn-sm justify-self-center" onClick={onLeave}>{view.isHost ? 'Close table' : 'Leave table'}</button>
    </div>
  )
}
