'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, Shield, Eye, EyeOff, Lock } from 'lucide-react'
import AdminShell from '../_components/AdminShell'

const ROLES: { role: string; label: string; description: string }[] = [
  { role: 'owner', label: 'Owner', description: 'Full access, including this settings page.' },
  { role: 'event_admin', label: 'Event Administrator', description: 'Manage events, guests, emails, refunds.' },
  { role: 'door_staff', label: 'Door Staff', description: 'Check guests in at the door.' },
  { role: 'readonly_staff', label: 'Read-Only Staff', description: 'View-only access to everything.' },
]

const inputCls = 'w-full px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none focus:shadow-input-focus focus:border-gold/50 transition'

export default function StaffSettingsPage() {
  const [status, setStatus] = useState<Record<string, 'custom' | 'default'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [showPw, setShowPw] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/rsvp/staff/passwords')
      .then(res => {
        if (res.status === 403 || res.status === 401) { setForbidden(true); return null }
        return res.json()
      })
      .then(d => d && setStatus(d.status))
      .finally(() => setLoading(false))
  }, [])

  const save = async (role: string) => {
    const newPassword = (drafts[role] || '').trim()
    if (newPassword.length < 8) {
      setMessage(m => ({ ...m, [role]: 'Must be at least 8 characters.' }))
      return
    }
    setSaving(role)
    setMessage(m => ({ ...m, [role]: '' }))
    try {
      const res = await fetch('/api/rsvp/staff/passwords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, new_password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus(s => (s ? { ...s, [role]: 'custom' } : s))
      setDrafts(d => ({ ...d, [role]: '' }))
      setMessage(m => ({ ...m, [role]: 'Password updated.' }))
      setTimeout(() => setMessage(m => ({ ...m, [role]: '' })), 3000)
    } catch (e: any) {
      setMessage(m => ({ ...m, [role]: e.message || 'Failed to update' }))
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return <AdminShell><div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={26} /></div></AdminShell>
  }

  if (forbidden) {
    return (
      <AdminShell>
        <div className="text-center py-20">
          <Shield className="mx-auto text-text-muted mb-3" size={28} />
          <p className="text-text-secondary text-sm">Only the Owner can manage staff passwords.</p>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell>
      <h1 className="text-2xl font-extrabold text-text-primary mb-1">Staff Passwords</h1>
      <p className="text-sm text-text-secondary mb-6">
        Each role signs in with one shared password. Change any of them here — takes effect immediately, no redeploy needed.
      </p>

      <div className="space-y-4">
        {ROLES.map(({ role, label, description }) => (
          <div key={role} className="bg-surface-card border border-surface-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-text-primary">{label}</h2>
                <p className="text-2xs text-text-muted">{description}</p>
              </div>
              <span
                className={`text-2xs font-bold px-2.5 py-1 rounded-full ${
                  status?.[role] === 'custom' ? 'bg-gold/15 text-gold' : 'bg-white/10 text-text-secondary'
                }`}
              >
                {status?.[role] === 'custom' ? 'Custom Password Set' : 'Using Default'}
              </span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPw[role] ? 'text' : 'password'}
                  value={drafts[role] || ''}
                  onChange={e => setDrafts(d => ({ ...d, [role]: e.target.value }))}
                  placeholder="New password (min 8 characters)"
                  className={inputCls + ' pl-9 pr-9'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => ({ ...s, [role]: !s[role] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                >
                  {showPw[role] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={() => save(role)}
                disabled={saving === role}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gold-gradient text-brand-black text-xs font-bold disabled:opacity-60 shrink-0"
              >
                {saving === role ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
              </button>
            </div>
            {message[role] && (
              <p className={`text-2xs mt-2 font-semibold ${message[role].includes('updated') ? 'text-gold' : 'text-danger'}`}>
                {message[role]}
              </p>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  )
}
