'use client'

import { useCallback, useEffect, useState } from 'react'
import { MotionConfig, motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { Lightbulb, Loader2, Plus } from 'lucide-react'
import Hero from './_components/Hero'
import HowItWorks from './_components/HowItWorks'
import EventsSection from './_components/EventsSection'
import IdeaBoard, { IdeaDraft } from './_components/IdeaBoard'
import PollsSection from './_components/PollsSection'
import SubmitIdeaModal from './_components/SubmitIdeaModal'
import { CommunityEvent, CommunityStats, Idea, Poll, scrollToId, stageOf } from './_components/types'

const NAV = [
  { id: 'events', label: 'Events' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'polls', label: 'Polls' },
  { id: 'how', label: 'How It Works' },
]

export default function RsvpHubPage() {
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [polls, setPolls] = useState<Poll[]>([])
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [upvotesEnabled, setUpvotesEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<IdeaDraft | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [toast, setToast] = useState('')

  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', y => setScrolled(y > 80))

  useEffect(() => {
    fetch('/api/rsvp/community')
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || [])
        setIdeas(data.ideas || [])
        setPolls(data.polls || [])
        setStats(data.stats || null)
        setUpvotesEnabled(data.upvotesEnabled !== false)
      })
      .finally(() => setLoading(false))
    fetch('/api/rsvp/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/RSVP', referrer: document.referrer }),
    }).catch(() => {})
  }, [])

  const openSubmit = useCallback((d?: IdeaDraft) => {
    setDraft(d || null)
    setModalOpen(true)
  }, [])
  const closeSubmit = useCallback(() => setModalOpen(false), [])

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const upvote = async (id: string) => {
    const before = ideas.find(i => i.id === id)
    if (!before) return
    const optimistic = (list: Idea[]) =>
      list.map(i => (i.id === id ? { ...i, voted: !i.voted, upvotes: Math.max(0, i.upvotes + (i.voted ? -1 : 1)) } : i))
    setIdeas(optimistic)
    setStats(s => (s ? { ...s, ideaVotes: Math.max(0, s.ideaVotes + (before.voted ? -1 : 1)) } : s))
    try {
      const res = await fetch(`/api/rsvp/suggestions/${id}/upvote`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Vote failed')
      setIdeas(list => list.map(i => (i.id === id ? { ...i, voted: data.voted, upvotes: data.upvotes } : i)))
    } catch (e: any) {
      setIdeas(list => list.map(i => (i.id === id ? before : i)))
      setStats(s => (s ? { ...s, ideaVotes: Math.max(0, s.ideaVotes + (before.voted ? 1 : -1)) } : s))
      flashToast(e.message)
    }
  }

  const hasLiveEvents = events.some(e => stageOf(e.status) !== 'past')
  const eventsBlock = <EventsSection key="events" events={events} onSubmitIdea={() => openSubmit()} />
  const ideasBlock = <IdeaBoard key="ideas" ideas={ideas} upvotesEnabled={upvotesEnabled} onUpvote={upvote} onSubmitIdea={openSubmit} />

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-hidden">
        {/* Sticky nav */}
        <header
          className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
            scrolled ? 'bg-brand-black/85 backdrop-blur-lg border-b border-white/5' : 'bg-transparent'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="font-extrabold tracking-tight text-text-primary">
              DJ Maskoff <span className="text-gold">Events</span>
            </button>
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map(n => (
                <button key={n.id} onClick={() => scrollToId(n.id)} className="px-3 py-2 rounded-full text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/5 transition">
                  {n.label}
                </button>
              ))}
            </nav>
            <button
              onClick={() => openSubmit()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gold-gradient text-brand-black text-xs font-bold hover:shadow-gold transition"
            >
              <Lightbulb size={14} /> <span className="hidden sm:inline">Submit an Idea</span><span className="sm:hidden">Pitch</span>
            </button>
          </div>
        </header>

        <Hero stats={stats} onSubmitIdea={() => openSubmit()} />
        <HowItWorks />

        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="animate-spin text-gold" size={28} /></div>
        ) : (
          <>
            {/* When nothing is scheduled, lead with participation instead of an empty calendar */}
            {hasLiveEvents ? [eventsBlock, ideasBlock] : [ideasBlock, eventsBlock]}
            <PollsSection polls={polls} onSubmitIdea={() => openSubmit()} />
          </>
        )}

        {/* Closing CTA */}
        <section className="px-4 pb-24">
          <div className="relative overflow-hidden max-w-5xl mx-auto rounded-[2rem] bg-gold-gradient p-8 sm:p-14 text-center">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="relative">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-brand-black tracking-tight">Your city is waiting on your idea.</h2>
              <p className="text-brand-black/75 mt-3 max-w-md mx-auto font-medium">
                Every event here started with one person saying &ldquo;somebody should throw this.&rdquo; Be that somebody.
              </p>
              <button
                onClick={() => openSubmit()}
                className="mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-brand-black text-gold-highlight font-bold text-sm hover:scale-[1.03] transition"
              >
                <Lightbulb size={16} /> Submit an Idea
              </button>
            </div>
          </div>
        </section>

        <footer className="text-center py-10 border-t border-surface-border">
          <p className="text-2xs text-text-muted">
            Questions? <a href="mailto:maskoffdadj@gmail.com" className="text-gold">maskoffdadj@gmail.com</a>
          </p>
        </footer>

        {/* Mobile floating action */}
        <motion.button
          onClick={() => openSubmit()}
          aria-label="Submit an idea"
          className="md:hidden fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gold-gradient text-brand-black shadow-gold-lg flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: scrolled ? 1 : 0 }}
          whileTap={{ scale: 0.9 }}
        >
          <Plus size={24} strokeWidth={2.5} />
        </motion.button>

        {toast && (
          <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-surface-elevated border border-surface-border text-sm text-text-primary shadow-card-hover animate-fade-in-up">
            {toast}
          </div>
        )}

        <SubmitIdeaModal open={modalOpen} draft={draft} onClose={closeSubmit} />
      </div>
    </MotionConfig>
  )
}
