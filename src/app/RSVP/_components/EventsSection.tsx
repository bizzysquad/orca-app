'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Calendar, MapPin, Flame, PartyPopper, Users, ArrowRight, Lightbulb, ChevronUp } from 'lucide-react'
import { CommunityEvent, STAGE_META, STATUS_CTA, Stage, scrollToId, stageOf } from './types'

type Filter = 'all' | Exclude<Stage, 'past'>

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'proposed', label: 'Proposed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'upcoming', label: 'Upcoming' },
]

function pct(ev: CommunityEvent) {
  if (!ev.goal || ev.supporters == null) return null
  return Math.min(100, Math.round((ev.supporters / ev.goal) * 100))
}

function MomentumBar({ ev }: { ev: CommunityEvent }) {
  const p = pct(ev)
  if (ev.supporters == null) return null
  if (p == null) {
    return (
      <p className="flex items-center gap-1.5 text-2xs text-text-secondary">
        <Users size={12} className="text-gold" />
        <strong className="text-text-primary">{ev.supporters}</strong> {ev.supporters === 1 ? 'supporter' : 'supporters'} so far
      </p>
    )
  }
  return (
    <div>
      <div className="flex items-baseline justify-between text-2xs mb-1.5">
        <span className="text-text-secondary">
          <strong className="text-text-primary text-sm">{ev.supporters}</strong> / {ev.goal} needed
        </span>
        <span className={`font-bold ${p >= 100 ? 'text-success' : 'text-gold'}`}>{p >= 100 ? 'Goal hit!' : `${p}%`}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${p >= 100 ? 'bg-success' : 'bg-gold-gradient'}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.max(p, 3)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}

function EventCard({ ev, hot, index }: { ev: CommunityEvent; hot: boolean; index: number }) {
  const stage = stageOf(ev.status)
  const meta = STAGE_META[stage]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: (index % 3) * 0.08, duration: 0.5 }}
    >
      <Link
        href={`/RSVP/events/${ev.slug}`}
        className="group flex flex-col h-full bg-surface-card border border-surface-border rounded-3xl overflow-hidden hover:border-gold-liquid/50 hover:shadow-gold-lg hover:-translate-y-1 transition-all duration-300"
      >
        <div className="aspect-[4/3] bg-brand-soft relative overflow-hidden">
          {ev.flyer_url ? (
            <img src={ev.flyer_url} alt={ev.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/40 via-brand-soft to-gold-liquid/10">
              <PartyPopper size={40} className="text-gold-liquid/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <span className={`absolute top-3 left-3 text-2xs font-bold px-2.5 py-1 rounded-full border backdrop-blur ${meta.badge}`}>{meta.label}</span>
          {hot && (
            <span className="absolute top-3 right-3 flex items-center gap-1 text-2xs font-bold px-2.5 py-1 rounded-full bg-orange-500/90 text-white shadow-lg">
              <Flame size={11} /> Gaining Momentum
            </span>
          )}
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="font-extrabold text-lg text-white leading-tight group-hover:text-gold-highlight transition">{ev.name}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-2xs text-white/75">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {ev.start_time ? new Date(ev.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date TBD by vote'}
              </span>
              {(ev.city || ev.state) && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {[ev.city, ev.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 flex flex-col gap-3 flex-1">
          {ev.music_genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ev.music_genres.slice(0, 3).map(g => (
                <span key={g} className="text-2xs px-2 py-0.5 rounded-full bg-white/5 text-text-secondary">{g}</span>
              ))}
            </div>
          )}
          <MomentumBar ev={ev} />
          <span className="mt-auto flex items-center justify-between text-xs font-bold text-gold pt-1">
            {STATUS_CTA[ev.status] || 'View Event'}
            <ArrowRight size={14} className="group-hover:translate-x-1 transition" />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

export default function EventsSection({ events, onSubmitIdea }: { events: CommunityEvent[]; onSubmitIdea: () => void }) {
  const [filter, setFilter] = useState<Filter>('all')

  const active = useMemo(() => events.filter(e => stageOf(e.status) !== 'past'), [events])
  const past = useMemo(() => events.filter(e => stageOf(e.status) === 'past'), [events])

  // "Hot" = proposed/confirmed events past half their goal, or the top supporter-getter among proposed
  const hotIds = useMemo(() => {
    const ids = new Set<string>()
    const proposed = active.filter(e => stageOf(e.status) !== 'upcoming' && (e.supporters || 0) > 0)
    for (const e of proposed) if ((pct(e) || 0) >= 50) ids.add(e.id)
    const top = [...proposed].sort((a, b) => (b.supporters || 0) - (a.supporters || 0))[0]
    if (top) ids.add(top.id)
    return ids
  }, [active])

  const sorted = useMemo(() => {
    const order: Record<string, number> = { upcoming: 0, confirmed: 1, proposed: 2 }
    return active
      .filter(e => filter === 'all' || stageOf(e.status) === filter)
      .sort((a, b) => {
        const ha = hotIds.has(a.id) ? 0 : 1
        const hb = hotIds.has(b.id) ? 0 : 1
        if (ha !== hb) return ha - hb
        const so = order[stageOf(a.status)] - order[stageOf(b.status)]
        if (so) return so
        return (a.start_time || '9999').localeCompare(b.start_time || '9999')
      })
  }, [active, filter, hotIds])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: active.length, proposed: 0, confirmed: 0, upcoming: 0 }
    for (const e of active) c[stageOf(e.status)]++
    return c
  }, [active])

  return (
    <section id="events" className="scroll-mt-20 py-20 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
          <div>
            <p className="text-2xs font-bold uppercase tracking-[0.2em] text-gold">Events in Motion</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-text-primary mt-2 tracking-tight">Powered by RSVPs</h2>
            <p className="text-sm text-text-secondary mt-2 max-w-lg">
              Proposed events go live when enough people say they are in. Every RSVP moves the bar.
            </p>
          </div>
          {active.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 scrollbar-none">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${
                    filter === f.key ? 'bg-gold-gradient text-brand-black' : 'border border-surface-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {f.label} <span className="opacity-60 ml-0.5">{counts[f.key]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {active.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-gold-liquid/20 bg-gradient-to-br from-gold-liquid/10 via-surface-card to-violet-900/20 p-8 sm:p-12 text-center">
            <div aria-hidden className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gold-liquid/20 blur-[100px]" />
            <div className="relative">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gold-liquid/15 text-gold flex items-center justify-center mb-5">
                <Calendar size={28} />
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-text-primary">Nothing is locked in yet.</h3>
              <p className="text-text-secondary mt-3 max-w-md mx-auto">
                That is where you come in. The next event on this calendar starts as an idea from someone in this city. Make it yours.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={onSubmitIdea} className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gold-gradient text-brand-black font-bold text-sm hover:scale-[1.03] transition">
                  <Lightbulb size={16} /> Pitch the Next Event
                </button>
                <button onClick={() => scrollToId('ideas')} className="flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/15 text-text-primary font-bold text-sm hover:border-gold-liquid/50 transition">
                  <ChevronUp size={16} /> Vote on Ideas
                </button>
              </div>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-center text-sm text-text-secondary py-16 border border-dashed border-surface-border rounded-3xl">
            No {filter} events right now. <button onClick={() => setFilter('all')} className="text-gold font-semibold">See all</button>
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map((ev, i) => (
              <EventCard key={ev.id} ev={ev} hot={hotIds.has(ev.id)} index={i} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div className="mt-12">
            <h3 className="text-2xs font-bold text-text-muted uppercase tracking-wider mb-3">Made it happen</h3>
            <div className="flex flex-wrap gap-2">
              {past.map(ev => (
                <Link
                  key={ev.id}
                  href={`/RSVP/events/${ev.slug}`}
                  className="px-4 py-2 rounded-full border border-surface-border text-2xs text-text-secondary hover:text-text-primary hover:border-gold-liquid/40 transition"
                >
                  {ev.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
