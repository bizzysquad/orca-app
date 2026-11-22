'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { postAuth } from './useSpades'

export function SpadeIcon({ size = 24, className = '', title }: { size?: number; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path fill="currentColor" d="M32 4C24 16 8 24 8 38c0 8 6 13 13 13 4 0 7-2 9-4-1 6-4 10-8 13h20c-4-3-7-7-8-13 2 2 5 4 9 4 7 0 13-5 13-13C56 24 40 16 32 4z" />
    </svg>
  )
}

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center justify-center rounded-full" style={{ width: small ? 30 : 38, height: small ? 30 : 38, background: 'var(--sp-cream)', color: 'var(--sp-wine)' }}>
        <SpadeIcon size={small ? 18 : 22} />
      </span>
      <span className="sp-display" style={{ fontSize: small ? 16 : 20 }}>Spades <span style={{ color: 'var(--sp-gold)' }}>HQ</span></span>
    </span>
  )
}

export function ConnectionBadge({ online }: { online: boolean }) {
  return online ? (
    <span className="sp-chip sp-chip-live" role="status" aria-live="polite"><span className="sp-dot sp-dot-pulse" />Live</span>
  ) : (
    <span className="sp-chip sp-chip-bad" role="status" aria-live="assertive"><span className="sp-dot" />Reconnecting</span>
  )
}

const NAV = [
  { href: '/spades', label: 'Home', key: 'home' },
  { href: '/spades/register', label: 'Register', key: 'register' },
  { href: '/spades/bracket', label: 'Scores', key: 'bracket' },
  { href: '/spades/play', label: 'My Table', key: 'play' },
  { href: '/spades/winners', label: 'Winners', key: 'winners' },
  { href: '/spades/rules', label: 'Rules', key: 'rules' },
]

export function Shell({ children, active, online = true, viewer, wide = false, badge = true }: { children: ReactNode; active?: string; online?: boolean; viewer?: any; wide?: boolean; badge?: boolean }) {
  const staff = viewer && (viewer.kind === 'owner' || viewer.kind === 'staff')
  const director = viewer && (viewer.kind === 'owner' || viewer.role === 'director')
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sp-noprint sticky top-0 z-20" style={{ background: 'rgba(20,9,11,0.88)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--sp-line)' }}>
        <div className={`${wide ? 'sp-wrap' : 'sp-wrap'} flex items-center justify-between gap-3 py-3`}>
          <Link href="/spades" aria-label="Spades HQ home"><Logo small /></Link>
          {badge && <ConnectionBadge online={online} />}
        </div>
        <nav className="sp-wrap flex gap-1 overflow-x-auto pb-2" aria-label="Spades HQ">
          {[...NAV, ...(staff ? [{ href: '/spades/supervisor', label: 'Tables', key: 'supervisor' }] : []), ...(director ? [{ href: '/spades/admin', label: 'Director', key: 'admin' }] : [])].map(n => (
            <Link
              key={n.key}
              href={n.href}
              className="px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap"
              style={active === n.key ? { background: 'var(--sp-cream)', color: 'var(--sp-ink)' } : { color: 'var(--sp-muted)' }}
              aria-current={active === n.key ? 'page' : undefined}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      {!online && (
        <div className="sp-wrap pt-3 sp-noprint">
          <div className="sp-banner sp-banner-bad text-sm">Connection lost. Scores on this screen may be out of date. Reconnecting on its own. Nothing you type is sent until you tap again.</div>
        </div>
      )}
      <main className="flex-1 py-5">{children}</main>
      <footer className="sp-noprint py-6 text-center text-xs" style={{ color: 'var(--sp-dim)' }}>
        Recreational tournament. No gambling, betting or wagering of any kind.
        {viewer && viewer.kind !== 'public' && <SignOut />}
      </footer>
    </div>
  )
}

function SignOut() {
  const [busy, setBusy] = useState(false)
  return (
    <button
      className="ml-3 underline"
      disabled={busy}
      onClick={async () => {
        if (!confirm('Sign out of Spades HQ on this device?')) return
        setBusy(true)
        await postAuth({ action: 'logout' })
        window.location.href = '/spades'
      }}
    >
      Sign out
    </button>
  )
}

const LABEL_TONE: Record<string, string> = {
  'Waiting for players': 'sp-chip-info',
  'Waiting for bids': 'sp-chip-warn',
  Playing: 'sp-chip-live',
  'Awaiting book reports': 'sp-chip-warn',
  'Awaiting approval': 'sp-chip-warn',
  Disputed: 'sp-chip-bad',
  Paused: 'sp-chip-dim',
  Completed: 'sp-chip-info',
  Final: 'sp-chip-dim',
  'Not set': 'sp-chip-dim',
}

export function StatusChip({ label }: { label: string }) {
  return <span className={`sp-chip ${LABEL_TONE[label] || 'sp-chip-dim'}`}>{label === 'Playing' && <span className="sp-dot sp-dot-pulse" />}{label}</span>
}

export function NumberPad({ value, onChange, isDisabled, label }: { value: number | null; onChange: (n: number) => void; isDisabled?: (n: number) => boolean; label: string }) {
  return (
    <div role="group" aria-label={label} className="sp-pad">
      {Array.from({ length: 14 }, (_, n) => (
        <button key={n} type="button" aria-pressed={value === n} disabled={isDisabled?.(n)} onClick={() => onChange(n)} aria-label={`${label} ${n}`}>
          {n}
        </button>
      ))}
    </div>
  )
}

export function useTick(ms = 1000) {
  const [, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT(x => x + 1), ms)
    return () => clearInterval(id)
  }, [ms])
}

export function formatClock(ms: number): string {
  const neg = ms < 0
  const s = Math.floor(Math.abs(ms) / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${neg ? '+' : ''}${m}:${String(r).padStart(2, '0')}`
}

export function MatchTimer({ m, serverNow, big = false }: { m: { startedAt: string | null; pausedMs: number; pausedAt: string | null; timeLimitMin: number; status: string; completedAt?: string | null }; serverNow: () => number; big?: boolean }) {
  useTick(1000)
  if (!m.startedAt) return <span className="sp-label">Not started</span>
  const end = m.completedAt ? new Date(m.completedAt).getTime() : m.pausedAt ? new Date(m.pausedAt).getTime() : serverNow()
  const elapsed = Math.max(0, end - new Date(m.startedAt).getTime() - (m.pausedMs || 0))
  if (!m.timeLimitMin) return <span className="sp-num font-bold">{formatClock(elapsed)}</span>
  const remaining = m.timeLimitMin * 60000 - elapsed
  const over = remaining <= 0
  const warn = remaining < 5 * 60000
  return (
    <span className={`sp-num font-black ${big ? 'text-3xl' : 'text-base'}`} style={{ color: over ? 'var(--sp-red)' : warn ? 'var(--sp-gold)' : 'var(--sp-cream)' }} aria-label={over ? 'Time is up' : `${formatClock(remaining)} remaining`}>
      {m.status === 'paused' ? 'Paused ' : ''}{over ? 'TIME' : formatClock(remaining)}
    </span>
  )
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="sp-wrap-narrow py-16 text-center" role="status" aria-live="polite">
      <div className="mx-auto mb-4 sp-vinyl" style={{ width: 64, height: 64 }} />
      <p className="sp-label">{label}</p>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="sp-banner sp-banner-bad flex items-center justify-between gap-3" role="alert">
      <span>{message}</span>
      {onRetry && <button className="sp-btn sp-btn-sm" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="sp-card p-6 text-center">
      <SpadeIcon size={36} className="mx-auto mb-3 opacity-60" />
      <h3 className="sp-display text-xl mb-2">{title}</h3>
      {children && <div className="text-sm" style={{ color: 'var(--sp-muted)' }}>{children}</div>}
    </div>
  )
}

export function Feedback({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return <div className={`sp-banner ${msg.ok ? 'sp-banner-ok' : 'sp-banner-bad'} text-sm`} role={msg.ok ? 'status' : 'alert'} aria-live="polite">{msg.text}</div>
}

export function fmtTime(iso: string | null | undefined, tz = 'America/New_York') {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz })
}

export function fmtDate(iso: string | null | undefined, tz = 'America/New_York') {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: tz })
}

// Shown when no event is posted yet. Players can still start their own game.
export function NoEvents({ viewer }: { viewer?: any } = {}) {
  return (
    <div className="sp-wrap-narrow grid gap-4">
      <div className="sp-card p-6 text-center grid gap-3">
        <SpadeIcon size={40} className="mx-auto" />
        <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>Powered by DJ MASKOFF</p>
        <h1 className="sp-display text-3xl">No events right now</h1>
        <p style={{ color: 'var(--sp-muted)' }}>The next event shows up here as soon as it is posted. In the meantime, start your own game and keep score.</p>
        {viewer?.kind === 'player' && <Link href="/spades/play" className="sp-btn sp-btn-wine">Back to my game</Link>}
        <Link href="/spades/start" className="sp-btn sp-btn-gold">Start your own game</Link>
        <Link href="/spades/winners" className="sp-btn sp-btn-ghost">See past winners</Link>
      </div>
    </div>
  )
}
