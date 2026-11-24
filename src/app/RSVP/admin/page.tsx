'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Calendar, MapPin, Users, Loader2, ImageOff, Trash2, Pencil, ExternalLink } from 'lucide-react'
import AdminShell from './_components/AdminShell'
import { useTheme } from '@/context/ThemeContext'
import { PageHeader, Button, RowMenu, EmptyState, Sheet, Field, useField } from '@/components/ui/kit'
import { Segmented } from '@/components/layout/CustomizePanel'

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

const LIVE = new Set(['collecting_interest', 'voting_open', 'date_selected', 'rsvp_open', 'tickets_on_sale', 'sold_out'])

function statusLabel(s: string) {
  return s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

export default function AdminEventsPage() {
  const router = useRouter()
  const { theme } = useTheme()
  const field = useField()
  const [events, setEvents] = useState<RsvpEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [filter, setFilter] = useState<'all' | 'live' | 'draft' | 'past'>('all')
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
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/rsvp/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create event')
      router.push(`/RSVP/admin/events/${data.event.id}`)
    } catch (e: any) {
      setError(e.message)
      setCreating(false)
    }
  }

  const deleteEvent = async (ev: RsvpEvent) => {
    const typed = window.prompt(
      `This permanently deletes "${ev.name}" along with all of its votes, polls, RSVPs, orders, and tickets. This cannot be undone.

Type DELETE to confirm:`
    )
    if (typed !== 'DELETE') return
    setError('')
    const res = await fetch(`/api/rsvp/events/${ev.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(res.status === 403 ? 'Only the Owner role can delete events' : data.error || 'Failed to delete event')
      return
    }
    setEvents(list => list.filter(x => x.id !== ev.id))
  }

  const bucket = (s: string) => (LIVE.has(s) ? 'live' : s === 'draft' ? 'draft' : 'past')
  const counts = { live: events.filter(e => bucket(e.status) === 'live').length, draft: events.filter(e => bucket(e.status) === 'draft').length, past: events.filter(e => bucket(e.status) === 'past').length }
  const shown = filter === 'all' ? events : events.filter(e => bucket(e.status) === filter)
  const tone = (s: string) => (LIVE.has(s) ? (s === 'sold_out' ? theme.warn : theme.ok) : s === 'cancelled' ? theme.bad : theme.subtext)

  return (
    <AdminShell>
      <PageHeader
        title="Events"
        sub="Create, publish and manage DJ Maskoff events"
        right={<Button variant="primary" onClick={() => { setNewName(''); setNewOpen(true) }}><Plus size={15} /> New event</Button>}
      />

      {error && <p className="text-[13px] mb-4" style={{ color: theme.bad }}>{error}</p>}

      {!loading && events.length > 0 && (
        <div className="mb-4 overflow-x-auto no-scrollbar">
          <Segmented size="sm" value={filter} onChange={v => setFilter(v as typeof filter)} options={[
            { value: 'all', label: `All · ${events.length}` },
            { value: 'live', label: `Live · ${counts.live}` },
            { value: 'draft', label: `Drafts · ${counts.draft}` },
            { value: 'past', label: `Ended · ${counts.past}` },
          ]} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" size={24} style={{ color: theme.subtext }} /></div>
      ) : events.length === 0 ? (
        <EmptyState title="No events yet" sub="Create your first event to start collecting RSVPs." action={<Button variant="primary" onClick={() => setNewOpen(true)}><Plus size={15} /> New event</Button>} />
      ) : shown.length === 0 ? (
        <EmptyState title="Nothing in this list" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {shown.map(ev => (
            <div key={ev.id} className="rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <button onClick={() => router.push(`/RSVP/admin/events/${ev.id}`)} className="text-left">
                <div className="aspect-[16/10] flex items-center justify-center overflow-hidden" style={{ backgroundColor: `${theme.text}08` }}>
                  {ev.flyer_url ? <img src={ev.flyer_url} alt={ev.name} className="w-full h-full object-cover" /> : <ImageOff size={26} style={{ color: theme.subtext }} />}
                </div>
              </button>
              <div className="flex items-start gap-2 p-4">
                <button className="flex-1 min-w-0 text-left" onClick={() => router.push(`/RSVP/admin/events/${ev.id}`)}>
                  <p className="text-[11.5px] flex items-center gap-1.5 mb-1" style={{ color: tone(ev.status) }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone(ev.status) }} />{LIVE.has(ev.status) ? `Live · ${statusLabel(ev.status)}` : statusLabel(ev.status)}
                  </p>
                  <h3 className="text-[15px] font-semibold truncate" style={{ color: theme.text }}>{ev.name}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-[12px] flex-wrap" style={{ color: theme.subtext }}>
                    {ev.start_time && <span className="flex items-center gap-1"><Calendar size={12} />{new Date(ev.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                    {(ev.city || ev.state) && <span className="flex items-center gap-1 truncate"><MapPin size={12} />{[ev.city, ev.state].filter(Boolean).join(', ')}</span>}
                    {ev.ticket_capacity ? <span className="flex items-center gap-1"><Users size={12} />{ev.ticket_capacity}</span> : null}
                  </div>
                </button>
                <RowMenu label={`Actions for ${ev.name}`} items={[
                  { label: 'Edit', icon: Pencil, onClick: () => router.push(`/RSVP/admin/events/${ev.id}`) },
                  { label: 'View public page', icon: ExternalLink, onClick: () => window.open(`/RSVP/events/${ev.slug}`, '_blank') },
                  { label: 'Delete', icon: Trash2, danger: true, onClick: () => deleteEvent(ev) },
                ]} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New event"
        sub="Start with a name. You can change it and fill in everything else next."
        footer={<>
          <Button className="flex-1" onClick={() => setNewOpen(false)}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!newName.trim() || creating} onClick={createEvent}>{creating ? <Loader2 size={14} className="animate-spin" /> : null} Create and edit</Button>
        </>}
      >
        <Field label="Event name"><input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createEvent()} autoFocus placeholder="e.g. Maskoff Friday Vol. 3" {...field} /></Field>
      </Sheet>
    </AdminShell>
  )
}
