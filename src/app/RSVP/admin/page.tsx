'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, MapPin, Users, Loader2, ImageOff } from 'lucide-react'
import AdminShell from './_components/AdminShell'

interface RsvpEvent {
  id: string
  slug: string
  name: string
  flyer_url: string | null
  city: string
  state: string
  status: string
  start_time: string | null
  rsvp_capacity: number | null
  ticket_capacity: number | null
  is_paid: boolean
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-white/10 text-text-secondary',
  collecting_interest: 'bg-blue-500/15 text-blue-300',
  voting_open: 'bg-purple-500/15 text-purple-300',
  date_selected: 'bg-amber-500/15 text-amber-300',
  rsvp_open: 'bg-emerald-500/15 text-emerald-300',
  tickets_on_sale: 'bg-gold/15 text-gold',
  sold_out: 'bg-red-500/15 text-red-300',
  completed: 'bg-white/10 text-text-secondary',
  cancelled: 'bg-red-900/30 text-red-400',
}

function statusLabel(s: string) {
  return s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export default function AdminEventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<RsvpEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/rsvp/events')
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const createEvent = async () => {
    const name = window.prompt('New event name (you can change this later):')
    if (!name || !name.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/rsvp/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create event')
      router.push(`/RSVP/admin/events/${data.event.id}`)
    } catch (e: any) {
      setError(e.message)
      setCreating(false)
    }
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">Events</h1>
          <p className="text-sm text-text-secondary mt-1">Create, preview, and manage DJ Maskoff events.</p>
        </div>
        <button
          onClick={createEvent}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gold-gradient text-brand-black font-bold text-sm disabled:opacity-60 hover:shadow-gold transition"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} New Event
        </button>
      </div>

      {error && <p className="text-sm text-danger font-semibold mb-4">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-gold" size={28} />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-surface-border rounded-2xl">
          <p className="text-text-secondary text-sm">No events yet. Create your first one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map(ev => (
            <button
              key={ev.id}
              onClick={() => router.push(`/RSVP/admin/events/${ev.id}`)}
              className="text-left bg-surface-card border border-surface-border rounded-2xl overflow-hidden hover:border-gold/40 hover:shadow-card-hover transition group"
            >
              <div className="aspect-[4/3] bg-brand-soft flex items-center justify-center relative overflow-hidden">
                {ev.flyer_url ? (
                  <img
                    src={ev.flyer_url}
                    alt={ev.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <ImageOff className="text-text-muted" size={28} />
                )}
                <span
                  className={`absolute top-2 right-2 text-2xs font-bold px-2 py-1 rounded-full ${STATUS_STYLES[ev.status] || 'bg-white/10 text-text-secondary'}`}
                >
                  {statusLabel(ev.status)}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-text-primary truncate">{ev.name}</h3>
                <div className="flex items-center gap-3 mt-2 text-2xs text-text-secondary">
                  {ev.start_time && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {new Date(ev.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {(ev.city || ev.state) && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin size={11} /> {[ev.city, ev.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {ev.ticket_capacity && (
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {ev.ticket_capacity}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
