'use client'

import { motion } from 'framer-motion'
import { CalendarSearch, Lightbulb, ChevronUp } from 'lucide-react'
import { CommunityStats, scrollToId } from './types'

const LINES = ['Your City.', 'Your Ideas.', 'Your Events.']

function Equalizer() {
  // Decorative DJ-style meter behind the headline
  const bars = Array.from({ length: 28 })
  return (
    <div aria-hidden className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-[3px] sm:gap-1.5 h-28 sm:h-40 opacity-25 pointer-events-none">
      {bars.map((_, i) => (
        <motion.span
          key={i}
          className="w-1.5 sm:w-2.5 rounded-t-full bg-gradient-to-t from-gold-deep via-gold to-gold-highlight"
          initial={{ height: '15%' }}
          animate={{ height: ['15%', `${30 + ((i * 37) % 70)}%`, '20%', `${20 + ((i * 53) % 80)}%`, '15%'] }}
          transition={{ duration: 2.4 + (i % 5) * 0.3, repeat: Infinity, ease: 'easeInOut', delay: (i % 7) * 0.12 }}
        />
      ))}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center px-3">
      <div className="text-2xl sm:text-3xl font-extrabold text-text-primary tabular-nums">{value.toLocaleString()}</div>
      <div className="text-2xs uppercase tracking-wider text-text-muted mt-0.5">{label}</div>
    </div>
  )
}

export default function Hero({ stats, onSubmitIdea }: { stats: CommunityStats | null; onSubmitIdea: () => void }) {
  const hasActivity = !!stats && stats.ideas + stats.ideaVotes + stats.supporters + stats.eventsInMotion > 0

  return (
    <section className="relative overflow-hidden min-h-[min(88svh,56rem)] flex items-center">
      {/* Glow orbs */}
      <motion.div
        aria-hidden
        className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-gold-liquid/25 blur-[120px]"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-violet-600/25 blur-[130px]"
        animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-0 left-1/3 w-[22rem] h-[22rem] rounded-full bg-rose-500/15 blur-[120px]"
        animate={{ x: [0, 40, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <Equalizer />

      <div className="relative w-full max-w-5xl mx-auto px-4 pt-28 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold-liquid/30 bg-gold-liquid/10 text-gold-highlight text-2xs font-bold uppercase tracking-[0.18em] mb-7"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
          </span>
          The People Decide
        </motion.div>

        <h1 className="font-extrabold tracking-tight leading-[0.95] text-[2.75rem] sm:text-7xl lg:text-8xl">
          {LINES.map((line, i) => (
            <motion.span
              key={line}
              className={`block ${i === 2 ? 'bg-gold-gradient bg-clip-text text-transparent pb-2' : 'text-text-primary'}`}
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: 0.15 + i * 0.18, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {line}
            </motion.span>
          ))}
        </h1>

        <motion.p
          className="mt-6 text-base sm:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Pitch the party. Vote on the lineup. RSVP to prove the demand. When the city shows up, we make it happen.
        </motion.p>

        <motion.div
          className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-none mx-auto"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95 }}
        >
          <button
            onClick={onSubmitIdea}
            className="group flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gold-gradient text-brand-black font-bold text-sm shadow-gold-lg hover:scale-[1.03] active:scale-[0.98] transition"
          >
            <Lightbulb size={17} className="group-hover:rotate-12 transition" /> Submit an Idea
          </button>
          <button
            onClick={() => scrollToId('ideas')}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-white/15 bg-white/5 backdrop-blur text-text-primary font-bold text-sm hover:border-gold-liquid/50 hover:bg-white/10 transition"
          >
            <ChevronUp size={17} /> Vote on Ideas
          </button>
          <button
            onClick={() => scrollToId('events')}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-white/15 bg-white/5 backdrop-blur text-text-primary font-bold text-sm hover:border-gold-liquid/50 hover:bg-white/10 transition"
          >
            <CalendarSearch size={17} /> Explore Events
          </button>
        </motion.div>

        {hasActivity && stats && (
          <motion.div
            className="mt-12 inline-grid grid-cols-2 sm:grid-cols-4 gap-y-5 divide-x divide-white/10 rounded-2xl border border-white/10 bg-black/40 backdrop-blur px-2 py-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <Stat value={stats.ideas} label="Ideas" />
            <Stat value={stats.ideaVotes} label="Votes" />
            <Stat value={stats.supporters} label="Supporters" />
            <Stat value={stats.eventsInMotion} label="In Motion" />
          </motion.div>
        )}
      </div>
    </section>
  )
}
