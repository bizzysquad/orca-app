'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Disc3, Music2, MapPin, Palette } from 'lucide-react'
import { POLL_KINDS, Poll } from './types'

const PREVIEW_TILES = [
  { icon: Disc3, title: 'Who plays?', body: 'Pick the DJ or artist on the lineup.' },
  { icon: Music2, title: 'What is the sound?', body: 'Vote on the genres that run the night.' },
  { icon: MapPin, title: 'Where is it?', body: 'Choose the venue or part of town.' },
  { icon: Palette, title: 'What is the vibe?', body: 'Decide the theme and the special touches.' },
]

function PollCard({ poll, index }: { poll: Poll; index: number }) {
  const kind = POLL_KINDS[poll.kind] || POLL_KINDS.custom
  const leaderVotes = Math.max(0, ...poll.options.map(o => o.votes || 0))
  const total = poll.totalVotes || 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: (index % 3) * 0.08 }}
      className="flex flex-col rounded-3xl border border-surface-border bg-surface-card p-5"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-gold">
          <kind.icon size={12} /> {kind.label}
        </span>
        <span className="text-2xs text-text-muted truncate">{poll.event.name}</span>
      </div>
      <h3 className="font-bold text-text-primary text-lg leading-snug">{poll.question}</h3>

      <ul className="mt-4 space-y-2 flex-1">
        {poll.options.slice(0, 4).map(o => {
          const p = poll.totalVotes == null || total === 0 ? 0 : Math.round(((o.votes || 0) / total) * 100)
          const leading = o.votes != null && o.votes > 0 && o.votes === leaderVotes
          return (
            <li key={o.id} className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
              <motion.div
                aria-hidden
                className={`absolute inset-y-0 left-0 ${leading ? 'bg-gold-liquid/20' : 'bg-white/[0.06]'}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${p}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
              <div className="relative flex items-center justify-between gap-2 text-sm">
                <span className={`truncate ${leading ? 'text-text-primary font-semibold' : 'text-text-secondary'}`}>{o.label}</span>
                {poll.totalVotes != null && <span className="text-2xs font-bold text-text-muted tabular-nums">{p}%</span>}
              </div>
            </li>
          )
        })}
        {poll.options.length > 4 && <li className="text-2xs text-text-muted pl-1">+{poll.options.length - 4} more options</li>}
      </ul>

      <Link
        href={`/RSVP/events/${poll.event.slug}`}
        className="group mt-4 flex items-center justify-between rounded-full bg-gold-gradient text-brand-black px-4 py-2.5 text-xs font-bold hover:shadow-gold transition"
      >
        Cast your vote
        <span className="flex items-center gap-1">
          {poll.totalVotes != null && <span className="opacity-70">{total} {total === 1 ? 'vote' : 'votes'}</span>}
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition" />
        </span>
      </Link>
    </motion.div>
  )
}

export default function PollsSection({ polls, onSubmitIdea }: { polls: Poll[]; onSubmitIdea: () => void }) {
  return (
    <section id="polls" className="scroll-mt-20 py-20 sm:py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <p className="text-2xs font-bold uppercase tracking-[0.2em] text-gold">Community-Curated</p>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-text-primary mt-2 tracking-tight">You shape the details</h2>
        <p className="text-sm text-text-secondary mt-2 max-w-lg">
          It does not stop at the idea. The lineup, the sound, the venue, and the theme are all up for a vote.
        </p>

        {polls.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {polls.map((p, i) => <PollCard key={p.id} poll={p} index={i} />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
              {PREVIEW_TILES.map((t, i) => (
                <motion.div
                  key={t.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border border-surface-border bg-gradient-to-b from-surface-card to-brand-soft p-4 sm:p-5"
                >
                  <div className="w-10 h-10 rounded-xl bg-gold-liquid/15 text-gold flex items-center justify-center mb-3">
                    <t.icon size={18} />
                  </div>
                  <p className="font-bold text-text-primary text-sm sm:text-base">{t.title}</p>
                  <p className="text-2xs sm:text-xs text-text-secondary mt-1 leading-relaxed">{t.body}</p>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-sm text-text-secondary mt-6">
              Polls open as soon as an event is proposed.{' '}
              <button onClick={onSubmitIdea} className="text-gold font-bold hover:underline">Pitch one to get it started.</button>
            </p>
          </>
        )}
      </div>
    </section>
  )
}
