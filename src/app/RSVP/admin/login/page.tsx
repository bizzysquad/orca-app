'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, User, ArrowRight, Loader2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/RSVP/admin'

  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim() || !password) {
      setError('Enter your name and the staff password.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/rsvp/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed.')
        setSubmitting(false)
        return
      }
      router.push(next)
      router.refresh()
    } catch {
      setError('Login failed. Check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-block text-2xs font-bold tracking-[0.2em] text-gold uppercase mb-2">
            DJ Maskoff Events
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary">Staff Sign-In</h1>
          <p className="text-sm text-text-secondary mt-2">
            Event admin dashboard &amp; door check-in tools.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-card animate-fade-in-up"
        >
          <div className="mb-4">
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">Your Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Jordan"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none focus:shadow-input-focus focus:border-gold/50 transition"
                autoFocus
              />
            </div>
            <p className="text-2xs text-text-muted mt-1">Shown in the audit log next to your actions.</p>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">Staff Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Role password"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none focus:shadow-input-focus focus:border-gold/50 transition"
              />
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-danger mb-4">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gold-gradient text-brand-black font-bold text-sm disabled:opacity-60 transition hover:shadow-gold"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <>Sign In <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="text-center text-2xs text-text-muted mt-6">
          Your role (Owner, Event Admin, Door Staff, or Read-Only) is determined by which password you enter.
        </p>
      </div>
    </div>
  )
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
