'use client'

import { useState } from 'react'
import { Loader2, Lock } from 'lucide-react'

export default function CrAdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/crookedrumors/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      window.location.href = '/crookedrumor/admin'
      return
    }
    const data = await res.json().catch(() => ({}))
    setError(data.error || 'Login failed')
    setBusy(false)
  }

  return (
    <main className="cr-grain min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="cr-card p-7 w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/crookedrumors/badge.webp" alt="" className="w-24 h-24 rounded-full mx-auto border-[3px] border-[var(--cr-ink)] object-cover" />
        <h1 className="cr-display text-3xl text-center mt-4">Admin</h1>
        <label className="block mt-6">
          <span className="block text-xs font-black uppercase tracking-[0.1em] mb-1.5">Password</span>
          <input className="cr-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus autoComplete="current-password" />
        </label>
        {error && <p className="mt-3 text-sm font-bold text-[var(--cr-red)]">{error}</p>}
        <button className="cr-btn cr-btn-red w-full mt-5" disabled={busy || !password}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Lock size={16} strokeWidth={3} />} Log in
        </button>
      </form>
    </main>
  )
}
