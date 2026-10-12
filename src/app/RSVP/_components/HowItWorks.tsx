'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Lightbulb, ChevronUp, Users, Rocket } from 'lucide-react'

const STEPS = [
  {
    icon: Lightbulb,
    title: 'Submit an Idea',
    short: 'Pitch it',
    body: 'Suggest the event you want to see. A theme, an artist, a DJ, a venue, a whole experience. If you would pull up to it, pitch it.',
  },
  {
    icon: ChevronUp,
    title: 'Vote & Shape It',
    short: 'Vote it up',
    body: 'The community upvotes the ideas they love and votes in polls on the details: who plays, what genres, where it goes down, and the vibe.',
  },
  {
    icon: Users,
    title: 'RSVP & Build Momentum',
    short: 'Show up',
    body: 'Proposed events collect RSVPs before they are locked in. Every RSVP pushes the momentum bar closer to the goal and proves the demand is real.',
  },
  {
    icon: Rocket,
    title: 'Make It Happen',
    short: 'Bring it to life',
    body: 'Once the interest is there and the plan is solid, organizers lock the date, book the talent, and bring the experience to your city.',
  },
]

export default function HowItWorks() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setActive(a => (a + 1) % STEPS.length), 4500)
    return () => clearInterval(t)
  }, [paused])

  const step = STEPS[active]
  const Icon = step.icon

  return (
    <section id="how" className="scroll-mt-20 py-20 sm:py-28 px-4">
      <div className="max-w-5xl mx-auto">
        <p className="text-2xs font-bold uppercase tracking-[0.2em] text-gold text-center">How It Works</p>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-text-primary text-center mt-3 tracking-tight">
          From idea to <span className="bg-gold-gradient bg-clip-text text-transparent">dance floor</span>
        </h2>

        <div className="mt-12" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {/* Step rail */}
          <div className="relative grid grid-cols-4 gap-2">
            <div className="absolute top-6 left-[12.5%] right-[12.5%] h-0.5 bg-white/10" aria-hidden />
            <motion.div
              aria-hidden
              className="absolute top-6 left-[12.5%] h-0.5 bg-gold-gradient origin-left"
              animate={{ width: `${(active / (STEPS.length - 1)) * 75}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
            {STEPS.map((s, i) => {
              const StepIcon = s.icon
              const on = i <= active
              return (
                <button
                  key={s.title}
                  onClick={() => { setActive(i); setPaused(true) }}
                  className="relative flex flex-col items-center gap-2 group"
                  aria-current={i === active ? 'step' : undefined}
                >
                  <span
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      i === active
                        ? 'bg-gold-gradient border-transparent text-brand-black scale-110 shadow-gold-lg'
                        : on
                        ? 'bg-brand-black border-gold text-gold'
                        : 'bg-brand-black border-white/15 text-text-muted group-hover:border-gold-liquid/50'
                    }`}
                  >
                    <StepIcon size={20} />
                  </span>
                  <span className={`text-2xs sm:text-xs font-bold text-center transition ${i === active ? 'text-text-primary' : 'text-text-muted'}`}>
                    <span className="sm:hidden">{s.short}</span>
                    <span className="hidden sm:inline">{s.title}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Detail card */}
          <div className="mt-8 relative min-h-[180px] sm:min-h-[160px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-surface-card to-brand-soft p-6 sm:p-8 flex flex-col sm:flex-row gap-5 sm:items-center"
              >
                <div aria-hidden className="absolute -right-10 -bottom-10 text-gold-liquid/5">
                  <Icon size={200} />
                </div>
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-gold-liquid/15 text-gold flex items-center justify-center">
                  <Icon size={26} />
                </div>
                <div className="relative">
                  <p className="text-2xs font-bold text-gold uppercase tracking-wider">Step {active + 1}</p>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-text-primary mt-1">{step.title}</h3>
                  <p className="text-sm sm:text-base text-text-secondary mt-2 leading-relaxed max-w-2xl">{step.body}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
