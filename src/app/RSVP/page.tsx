'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Loader2, PartyPopper } from 'lucide-react'

interface RsvpEvent {
  id: string
  slug: string
  name: string
  flyer_url: string | null
  city: string
  state: string
  status: string
  start_time: string | null
}

const STATUS_LABELS: Record<string, string> = {
  collecting_interest: 'Gauging Interest',
  voting_open: 'Vote Now',
  date_selected: 'Date Locked In',
  rsvp_open: 'RSVP Open',
  tickets_on_sale: 'Tickets On Sale',
  sold_out: 'Sold Out',
  completed: 'Past Event',
}

export default function RsvpHubPage() {
  const [events, setEvents] = useState<RsvpEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rsvp/events')
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .finally(() => setLoading(false))
  }, [])

  const upcoming = events.filter(e => e.status !== 'completed' && e.status !== 'cancelled')
  const past = events.filter(e => e.status === 'completed')

  // Group upcoming events by month (events without a date fall under "Date TBA", shown last)
  const TBA_KEY = 'Date TBA'
  const monthGroups = new Map<string, RsvpEvent[]>()
  for (const ev of upcoming) {
    const key = ev.start_time
      ? new Date(ev.start_time).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : TBA_KEY
    if (!monthGroups.has(key)) monthGroups.set(key, [])
    monthGroups.get(key)!.push(ev)
  }
  for (const group of Array.from(monthGroups.values())) {
    group.sort((a: RsvpEvent, b: RsvpEvent) => (a.start_time || '').localeCompare(b.start_time || ''))
  }
  const sortedMonthKeys = Array.from(monthGroups.keys()).sort((a, b) => {
    if (a === TBA_KEY) return 1
    if (b === TBA_KEY) return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })

  return (
    <div className="min-h-screen">
      <header className="text-center pt-16 pb-10 px-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary tracking-tight">Events</h1>
        <p className="text-text-secondary mt-3 max-w-md mx-auto text-sm">
          Vote on what&apos;s next, RSVP, or grab your ticket.
        </p>
        <p className="text-text-muted mt-4 max-w-lg mx-auto text-2xs leading-relaxed">
          Here&apos;s how it works: vote on upcoming events to help pick what happens next, RSVP once a date is locked in to reserve your spot, then grab your ticket when sales open. Tap any event below to get started.
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={28} /></div>
        ) : upcoming.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-surface-border rounded-2xl">
            <PartyPopper className="mx-auto text-text-muted mb-3" size={28} />
            <p className="text-text-secondary text-sm">Nothing on the calendar yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {sortedMonthKeys.map(monthKey => (
              <section key={monthKey}>
                <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">{monthKey}</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {monthGroups.get(monthKey)!.map(ev => (
                    <Link
                      key={ev.id}
                      href={`/RSVP/events/${ev.slug}`}
                      className="group bg-surface-card border border-surface-border rounded-2xl overflow-hidden hover:border-gold/50 hover:shadow-gold-lg transition animate-fade-in-up"
                    >
                      <div className="aspect-[4/5] bg-brand-soft relative overflow-hidden">
                        {ev.flyer_url ? (
                          <img src={ev.flyer_url} alt={ev.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-muted">
                            <PartyPopper size={32} />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                        <span className="absolute top-3 right-3 text-2xs font-bold px-2.5 py-1 rounded-full bg-gold-gradient text-brand-black">
                          {STATUS_LABELS[ev.status] || ev.status}
                        </span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-text-primary group-hover:text-gold transition">{ev.name}</h3>
                        <div className="flex items-center gap-3 mt-2 text-2xs text-text-secondary">
                          {ev.start_time && (
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              {new Date(ev.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {(ev.city || ev.state) && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin size={11} /> {[ev.city, ev.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">Past Events</h2>
            <div className="flex flex-wrap gap-3">
              {past.map(ev => (
                <Link
                  key={ev.id}
                  href={`/RSVP/events/${ev.slug}`}
                  className="px-4 py-2 rounded-full border border-surface-border text-2xs text-text-secondary hover:text-text-primary hover:border-gold/40 transition"
                >
                  {ev.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-10 border-t border-surface-border">
        <p className="text-2xs text-text-muted">
          Questions? <a href="mailto:maskoffdadj@gmail.com" className="text-gold">maskoffdadj@gmail.com</a>
        </p>
      </footer>
    </div>
  )
}
