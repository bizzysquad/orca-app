'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check, X, Trash2, Mail } from 'lucide-react'
import AdminShell from '../_components/AdminShell'

export default function SuggestionsAdminPage() {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending')

  const load = () => {
    setLoading(true)
    fetch('/api/rsvp/suggestions')
      .then(res => res.json())
      .then(d => setSuggestions(d.suggestions || []))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const setApproved = async (id: string, is_approved: boolean) => {
    setSuggestions(s => s.map(x => (x.id === id ? { ...x, is_approved } : x)))
    await fetch(`/api/rsvp/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_approved }),
    })
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this suggestion permanently?')) return
    setSuggestions(s => s.filter(x => x.id !== id))
    await fetch(`/api/rsvp/suggestions/${id}`, { method: 'DELETE' })
  }

  const filtered = suggestions.filter(s => (filter === 'all' ? true : filter === 'pending' ? !s.is_approved : s.is_approved))

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-text-primary">Suggestions</h1>
        <div className="flex gap-1">
          {(['pending', 'approved', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-2xs font-bold capitalize transition ${
                filter === f ? 'bg-gold-gradient text-brand-black' : 'border border-surface-border text-text-secondary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={26} /></div>
      ) : filtered.length === 0 ? (
        <p className="text-text-secondary text-sm text-center py-20">Nothing here.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div key={s.id} className="bg-surface-card border border-surface-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-text-primary text-sm">{s.name}</p>
                  <p className="text-2xs text-text-muted flex items-center gap-1"><Mail size={10} /> {s.email}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {!s.is_approved ? (
                    <button onClick={() => setApproved(s.id, true)} className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"><Check size={14} /></button>
                  ) : (
                    <button onClick={() => setApproved(s.id, false)} className="p-2 rounded-lg bg-white/5 text-text-secondary hover:bg-white/10"><X size={14} /></button>
                  )}
                  <button onClick={() => remove(s.id)} className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20"><Trash2 size={14} /></button>
                </div>
              </div>
              {s.event_idea && <p className="text-sm text-text-secondary mb-1"><strong className="text-text-primary">Idea:</strong> {s.event_idea}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-text-muted">
                {s.preferred_location && <span>📍 {s.preferred_location}</span>}
                {s.preferred_weekend && <span>📅 {s.preferred_weekend}</span>}
                {s.preferred_music && <span>🎵 {s.preferred_music}</span>}
                {s.artist_suggestion && <span>🎤 {s.artist_suggestion}</span>}
                {s.theme_suggestion && <span>🎨 {s.theme_suggestion}</span>}
              </div>
              {s.comments && <p className="text-2xs text-text-muted mt-2 italic">&ldquo;{s.comments}&rdquo;</p>}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
