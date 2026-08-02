'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import {
  Loader2, MapPin, Calendar, Clock, Music2, Users, Share2, ShieldCheck,
  CheckCircle2, ChevronDown, Sparkles,
} from 'lucide-react'
import VotingSection from './VotingSection'
import RsvpTicketSection from './RsvpTicketSection'

const VOTING_STATUSES = new Set(['draft', 'collecting_interest', 'voting_open'])
const RSVP_STATUSES = new Set(['rsvp_open', 'tickets_on_sale', 'sold_out', 'completed'])

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function fmtTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const load = useCallback(() => {
    fetch(`/api/rsvp/public/events/${params.slug}?revealed=${localStorage.getItem(`rsvp-voted-${params.slug}`) ? '1' : '0'}`)
      .then(res => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [params.slug])

  useEffect(load, [load])

  useEffect(() => {
    if (!data?.event?.id) return
    fetch('/api/rsvp/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: data.event.id, path: window.location.pathname, referrer: document.referrer }),
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.event?.id])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gold" size={28} /></div>
  }
  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Event not found</h1>
          <a href="/RSVP" className="text-gold text-sm">Back to all events</a>
        </div>
      </div>
    )
  }

  const { event, proposedDates, pollQuestions, ticketTypes, showTallies, totalInterested, isPreview } = data
  const isVotingPhase = VOTING_STATUSES.has(event.status)
  const isRsvpPhase = RSVP_STATUSES.has(event.status)

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try { await navigator.share({ title: event.name, url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied!')
    }
  }

  return (
    <div className="min-h-screen">
      {isPreview && (
        <div className="bg-gold text-brand-black text-center text-2xs font-bold py-2 sticky top-0 z-50">
          STAFF PREVIEW — status: {event.status}
        </div>
      )}

      {/* Hero */}
      <div className="relative">
        <div className="aspect-[3/4] sm:aspect-[16/9] max-h-[560px] w-full bg-brand-soft relative overflow-hidden">
          {event.flyer_url ? (
            <img src={event.flyer_url} alt={event.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Sparkles className="text-text-muted" size={40} /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/40 to-transparent" />
        </div>
        <div className="absolute bottom-0 inset-x-0 px-4 sm:px-8 pb-6 max-w-4xl mx-auto left-0 right-0">
          <div className="text-2xs font-bold tracking-[0.2em] text-gold uppercase mb-2">DJ Maskoff Events</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight">{event.name}</h1>
          {event.start_time && (
            <p className="text-white/80 text-sm mt-2 flex items-center gap-1.5">
              <Calendar size={14} /> {fmtDate(event.start_time)}
              {event.end_time && <><Clock size={14} className="ml-2" /> {fmtTime(event.start_time)}–{fmtTime(event.end_time)}</>}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        {/* Quick facts */}
        <div className="flex flex-wrap gap-3 mb-8">
          {event.venue && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-card border border-surface-border rounded-full px-3 py-1.5">
              <MapPin size={12} /> {event.venue}{event.city ? `, ${event.city}` : ''}
            </div>
          )}
          {event.age_requirement && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-card border border-surface-border rounded-full px-3 py-1.5">
              <ShieldCheck size={12} /> {event.age_requirement}
            </div>
          )}
          {event.music_genres?.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-card border border-surface-border rounded-full px-3 py-1.5">
              <Music2 size={12} /> {event.music_genres.join(', ')}
            </div>
          )}
          {totalInterested != null && (
            <div className="flex items-center gap-1.5 text-xs text-gold bg-gold/10 border border-gold/30 rounded-full px-3 py-1.5">
              <Users size={12} /> {totalInterested} interested
            </div>
          )}
          <button onClick={share} className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-card border border-surface-border rounded-full px-3 py-1.5 hover:border-gold/40 transition">
            <Share2 size={12} /> Share
          </button>
        </div>

        {event.description && <p className="text-text-secondary leading-relaxed whitespace-pre-wrap mb-10">{event.description}</p>}

        {/* Voting or RSVP/Ticket section */}
        {isVotingPhase && (
          <VotingSection
            event={event}
            proposedDates={proposedDates}
            pollQuestions={pollQuestions}
            showTallies={showTallies}
            onVoted={() => {
              localStorage.setItem(`rsvp-voted-${params.slug}`, '1')
              load()
            }}
          />
        )}

        {event.status === 'date_selected' && (
          <div className="bg-surface-card border border-gold/30 rounded-2xl p-6 text-center mb-10">
            <CheckCircle2 className="mx-auto text-gold mb-3" size={28} />
            <h3 className="text-lg font-bold text-text-primary">The date is locked in!</h3>
            <p className="text-text-secondary text-sm mt-1">RSVP and tickets will open soon — check back or watch your email.</p>
          </div>
        )}

        {isRsvpPhase && (
          <Suspense fallback={null}>
            <RsvpTicketSection event={event} ticketTypes={ticketTypes} />
          </Suspense>
        )}

        {/* FAQs */}
        {event.faqs?.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-text-primary mb-4">FAQs</h2>
            <div className="space-y-2">
              {event.faqs.map((f: any, i: number) => (
                <div key={i} className="border border-surface-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-text-primary"
                  >
                    {f.question}
                    <ChevronDown size={16} className={`text-text-muted transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && <p className="px-4 pb-4 text-sm text-text-secondary">{f.answer}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Policies */}
        {event.policies && (
          <div className="mt-10 text-2xs text-text-muted border-t border-surface-border pt-6">
            <p className="whitespace-pre-wrap">{event.policies}</p>
          </div>
        )}

        <div className="mt-8 text-center text-2xs text-text-muted">
          Questions? <a href={`mailto:${event.contact_email}`} className="text-gold">{event.contact_email}</a>
        </div>
      </div>
    </div>
  )
}
