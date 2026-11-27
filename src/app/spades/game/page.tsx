'use client'

// Play a game: against the computer on this phone, or at an online table
// with friends who join with an invite code.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Shell, SpadeIcon } from '../_components/ui'
import { LengthPicker, LIVE_LAST_KEY, liveTokenKey, NAME_KEY, postLive, RulesPicker } from '../_components/GameOptions'
import { PRACTICE_KEY, type RuleSetId } from '@/lib/spades/cardgame'

export default function PlayAGame() {
  const router = useRouter()
  const [resumeCpu, setResumeCpu] = useState(false)
  const [lastTable, setLastTable] = useState<string | null>(null)
  const [mode, setMode] = useState<'menu' | 'friends' | 'join'>('menu')
  const [name, setName] = useState('')
  const [rules, setRules] = useState<RuleSetId>('house')
  const [gamesToWin, setGamesToWin] = useState(1)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      setResumeCpu(!!localStorage.getItem(PRACTICE_KEY))
      setName(localStorage.getItem(NAME_KEY) || '')
      const last = localStorage.getItem(LIVE_LAST_KEY)
      if (last && localStorage.getItem(liveTokenKey(last))) setLastTable(last)
    } catch {}
  }, [])

  const create = async () => {
    if (!name.trim()) { setError('Enter your name.'); return }
    setBusy(true)
    setError(null)
    try {
      const r = await postLive({ action: 'create', name, rules, gamesToWin })
      const c = String(r.view.code).replace('-', '')
      localStorage.setItem(liveTokenKey(c), r.token)
      localStorage.setItem(LIVE_LAST_KEY, c)
      localStorage.setItem(NAME_KEY, name.trim())
      router.push(`/spades/game/${c}`)
    } catch (e: any) {
      setError(e.message)
      setBusy(false)
    }
  }

  const join = () => {
    const c = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (c.length !== 8) { setError('Invite codes are 8 letters and numbers, like K7PM-3XQ2.'); return }
    router.push(`/spades/game/${c}`)
  }

  return (
    <Shell badge={false}>
      <div className="sp-wrap-narrow grid gap-5">
        <header className="text-center">
          <SpadeIcon size={40} className="mx-auto" />
          <h1 className="sp-display text-4xl mt-2">Play a game</h1>
          <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>Real spades on your phone. Play the computer, or send friends a code and play together.</p>
        </header>

        {lastTable && mode === 'menu' && (
          <Link href={`/spades/game/${lastTable}`} className="sp-btn sp-btn-gold sp-btn-block" style={{ minHeight: 60 }}>Back to your table ({lastTable.slice(0, 4)}-{lastTable.slice(4)})</Link>
        )}

        {mode === 'menu' && (
          <div className="grid gap-3">
            <Link href="/spades/game/cpu" className="sp-card p-5 grid gap-1" style={{ borderColor: 'var(--sp-gold)' }}>
              <span className="sp-display text-2xl">Play the computer</span>
              <span className="text-sm" style={{ color: 'var(--sp-muted)' }}>{resumeCpu ? 'You have a game in progress. Tap to keep playing.' : 'You and a computer partner against two computer players. Learn mode teaches you as you go.'}</span>
            </Link>
            <button type="button" className="sp-card p-5 grid gap-1 text-left" onClick={() => { setMode('friends'); setError(null) }}>
              <span className="sp-display text-2xl">Play with friends</span>
              <span className="text-sm" style={{ color: 'var(--sp-muted)' }}>Start a table and send the invite code. The computer fills any empty seat.</span>
            </button>
            <button type="button" className="sp-card p-5 grid gap-1 text-left" onClick={() => { setMode('join'); setError(null) }}>
              <span className="sp-display text-2xl">Join with a code</span>
              <span className="text-sm" style={{ color: 'var(--sp-muted)' }}>Someone sent you an invite code? Enter it here.</span>
            </button>
          </div>
        )}

        {mode === 'friends' && (
          <div className="grid gap-4">
            <label className="sp-field">
              <span>Your name</span>
              <input className="sp-input" value={name} maxLength={20} autoComplete="nickname" onChange={e => setName(e.target.value)} placeholder="What your friends call you" />
            </label>
            <RulesPicker value={rules} onChange={setRules} />
            <LengthPicker value={gamesToWin} onChange={setGamesToWin} />
            {error && <div className="sp-banner sp-banner-bad text-sm" role="alert">{error}</div>}
            <button className="sp-btn sp-btn-wine sp-btn-block" style={{ minHeight: 64, fontSize: 19 }} disabled={busy} onClick={create}>{busy ? 'Making your table' : 'Create table'}</button>
            <button className="sp-btn sp-btn-ghost sp-btn-block" onClick={() => setMode('menu')}>Back</button>
          </div>
        )}

        {mode === 'join' && (
          <form className="grid gap-4" onSubmit={e => { e.preventDefault(); join() }}>
            <label className="sp-field">
              <span>Invite code</span>
              <input className="sp-input sp-display" style={{ fontSize: 24, letterSpacing: '0.12em', textAlign: 'center' }} value={code} maxLength={9} autoCapitalize="characters" autoComplete="off" onChange={e => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX" />
            </label>
            {error && <div className="sp-banner sp-banner-bad text-sm" role="alert">{error}</div>}
            <button type="submit" className="sp-btn sp-btn-gold sp-btn-block" style={{ minHeight: 60 }}>Join table</button>
            <button type="button" className="sp-btn sp-btn-ghost sp-btn-block" onClick={() => setMode('menu')}>Back</button>
          </form>
        )}

        {mode === 'menu' && <Link href="/spades" className="sp-btn sp-btn-ghost sp-btn-block">Back to Spades HQ</Link>}
      </div>
    </Shell>
  )
}
