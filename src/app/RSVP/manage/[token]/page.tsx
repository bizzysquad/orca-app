'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, CheckCircle2, Save } from 'lucide-react'

export default function ManageVotePage() {
  const params = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selected, setSelected] = useState('')
  const [guestCount, setGuestCount] = useState(0)
  const [wantsUpdates, setWantsUpdates] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    fetch(`/api/rsvp/votes/${params.token}`)
      .then(res => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then(d => {
        setData(d)
        setSelected(d.vote.date_id || d.vote.poll_option_id || '')
        setGuestCount(d.vote.guest_count || 0)
        setWantsUpdates(d.vote.wants_updates)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [params.token])

  useEffect(load, [load])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const isDate = !!data.vote.date_id
      const res = await fetch(`/api/rsvp/votes/${params.token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [isDate ? 'date_id' : 'poll_option_id']: selected,
          guest_count: guestCount,
          wants_updates: wantsUpdates,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      setError(e.message || 'Failed to update vote')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gold" size={28} /></div>
  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <p className="text-text-secondary">This link is invalid or has expired.</p>
      </div>
    )
  }

  const { vote, event, options } = data
  const isDate = !!vote.date_id

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-2xs font-bold tracking-[0.2em] text-gold uppercase mb-2">Update Your Vote</div>
          <h1 className="text-xl font-extrabold text-text-primary">{event.name}</h1>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
          <p className="text-xs font-semibold text-text-secondary mb-3">
            {isDate ? 'Change your preferred date' : 'Change your selection'}
          </p>
          <div className="space-y-2 mb-5">
            {options.map((o: any) => (
              <button
                key={o.id}
                onClick={() => setSelected(o.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition ${
                  selected === o.id ? 'border-gold bg-gold/10' : 'border-surface-border hover:border-gold/30'
                }`}
              >
                <div className="font-semibold text-text-primary text-sm">{o.label}</div>
                {o.date && <div className="text-2xs text-text-muted">{new Date(o.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-text-secondary mb-2">
            Guests coming with you:
            <input
              type="number" min={0} max={50} value={guestCount}
              onChange={e => setGuestCount(Math.max(0, Number(e.target.value) || 0))}
              className="w-16 px-2 py-1 rounded bg-brand-soft border border-surface-border text-text-primary text-xs"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-text-secondary mb-5">
            <input type="checkbox" checked={wantsUpdates} onChange={e => setWantsUpdates(e.target.checked)} />
            Email me updates about this event
          </label>

          {error && <p className="text-xs text-danger font-semibold mb-3">{error}</p>}

          {saved ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold py-3">
              <CheckCircle2 size={16} /> Vote updated
            </div>
          ) : (
            <button
              onClick={save}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gold-gradient text-brand-black font-bold text-sm disabled:opacity-60 hover:shadow-gold transition"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={15} /> Save Changes</>}
            </button>
          )}
        </div>

        <p className="text-center text-2xs text-text-muted mt-6">
          <a href={`/RSVP/events/${event.slug}`} className="text-gold">View event page</a>
        </p>
      </div>
    </div>
  )
}
