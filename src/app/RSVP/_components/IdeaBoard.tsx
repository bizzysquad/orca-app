'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronUp, Flame, Clock, Trophy, MapPin, Music2, Mic2, Palette, Plus, Sparkles } from 'lucide-react'
import { CATEGORIES, Idea, categoryMeta } from './types'

type Sort = 'trending' | 'top' | 'new'

export interface IdeaDraft {
  title: string
  category: string
  description: string
}

// Shown only when the board is empty, clearly labeled as examples
const SPARKS: (IdeaDraft & { emoji: string })[] = [
  { emoji: '🌅', title: 'Rooftop Afrobeats Day Party', category: 'day_party', description: 'Sunset views, Afrobeats and Amapiano all afternoon, food trucks downstairs.' },
  { emoji: '🛼', title: '90s R&B Skate Night', category: 'themed_night', description: 'Rent out a roller rink, dress code 90s, nothing but R&B slow jams and throwbacks.' },
  { emoji: '🎧', title: 'Open Decks Battle', category: 'dj_set', description: 'Local DJs get 15 minutes each, the crowd votes the winner live.' },
]

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

function UpvoteButton({ idea, onVote, disabled }: { idea: Idea; onVote: () => void; disabled: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onVote}
      disabled={disabled}
      aria-pressed={idea.voted}
      aria-label={idea.voted ? 'Remove your vote' : 'Upvote this idea'}
      className={`shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-2xl border transition ${
        idea.voted
          ? 'bg-gold-gradient border-transparent text-brand-black shadow-gold'
          : 'border-surface-border bg-white/[0.03] text-text-secondary hover:border-gold-liquid/60 hover:text-gold'
      } disabled:opacity-50`}
    >
      <ChevronUp size={20} strokeWidth={2.5} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={idea.upvotes}
          initial={{ y: idea.voted ? 10 : -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: idea.voted ? -10 : 10, opacity: 0 }}
          className="text-sm font-extrabold tabular-nums leading-none"
        >
          {idea.upvotes}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

export default function IdeaBoard({
  ideas,
  upvotesEnabled,
  onUpvote,
  onSubmitIdea,
}: {
  ideas: Idea[]
  upvotesEnabled: boolean
  onUpvote: (id: string) => void
  onSubmitIdea: (draft?: IdeaDraft) => void
}) {
  const [sort, setSort] = useState<Sort>('trending')
  const [category, setCategory] = useState<string>('all')
  const [showAll, setShowAll] = useState(false)

  const trendingTop = useMemo(() => {
    return new Set(
      [...ideas].filter(i => i.upvotes > 0).sort((a, b) => b.trending - a.trending).slice(0, 3).map(i => i.id)
    )
  }, [ideas])

  const visible = useMemo(() => {
    const list = ideas.filter(i => category === 'all' || i.category === category)
    if (sort === 'top') list.sort((a, b) => b.upvotes - a.upvotes)
    else if (sort === 'new') list.sort((a, b) => b.created_at.localeCompare(a.created_at))
    else list.sort((a, b) => b.trending - a.trending)
    return list
  }, [ideas, sort, category])

  const usedCategories = useMemo(() => new Set(ideas.map(i => i.category)), [ideas])
  const shown = showAll ? visible : visible.slice(0, 8)

  return (
    <section id="ideas" className="scroll-mt-20 py-20 sm:py-24 px-4 relative">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-liquid/30 to-transparent" />
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
          <div>
            <p className="text-2xs font-bold uppercase tracking-[0.2em] text-gold">Community Idea Board</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-text-primary mt-2 tracking-tight">What should happen next?</h2>
            <p className="text-sm text-text-secondary mt-2 max-w-lg">
              Upvote the ideas you would pull up to. The most wanted ones get a real shot at becoming events.
            </p>
          </div>
          <button
            onClick={() => onSubmitIdea()}
            className="shrink-0 self-start sm:self-auto flex items-center gap-2 px-5 py-3 rounded-full bg-gold-gradient text-brand-black font-bold text-sm hover:scale-[1.03] transition shadow-gold"
          >
            <Plus size={16} /> Submit an Idea
          </button>
        </div>

        {ideas.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-900/30 via-surface-card to-gold-liquid/10 p-6 sm:p-10">
            <div aria-hidden className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-violet-500/20 blur-[90px]" />
            <div className="relative text-center max-w-xl mx-auto">
              <motion.div
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 1.5 }}
                className="mx-auto w-16 h-16 rounded-2xl bg-gold-gradient text-brand-black flex items-center justify-center mb-5 shadow-gold-lg"
              >
                <Sparkles size={28} />
              </motion.div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-text-primary">Be the first to spark something.</h3>
              <p className="text-text-secondary mt-3">
                The board is wide open. The first idea sets the tone for everything that comes after. Need a nudge? Steal one of these.
              </p>
            </div>
            <div className="relative grid sm:grid-cols-3 gap-3 mt-8">
              {SPARKS.map((s, i) => (
                <motion.button
                  key={s.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => onSubmitIdea(s)}
                  className="group text-left rounded-2xl border border-dashed border-white/20 bg-black/30 p-4 hover:border-gold-liquid/60 hover:bg-black/50 transition"
                >
                  <span className="text-2xs uppercase tracking-wider text-text-muted">Example</span>
                  <p className="text-2xl mt-2">{s.emoji}</p>
                  <p className="font-bold text-text-primary mt-1">{s.title}</p>
                  <p className="text-2xs text-text-secondary mt-1 leading-relaxed">{s.description}</p>
                  <span className="inline-flex items-center gap-1 mt-3 text-2xs font-bold text-gold group-hover:gap-2 transition-all">
                    Pitch this <Plus size={12} />
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="inline-flex self-start p-1 rounded-full bg-white/5 border border-surface-border">
                {([
                  { key: 'trending', label: 'Trending', icon: Flame },
                  { key: 'top', label: 'Top', icon: Trophy },
                  { key: 'new', label: 'New', icon: Clock },
                ] as const).map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSort(s.key)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition ${
                      sort === s.key ? 'bg-gold-gradient text-brand-black' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <s.icon size={13} /> {s.label}
                  </button>
                ))}
              </div>
              {usedCategories.size > 1 && (
                <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none">
                  <button
                    onClick={() => setCategory('all')}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-2xs font-bold border transition ${
                      category === 'all' ? 'border-gold text-gold bg-gold-liquid/10' : 'border-surface-border text-text-secondary'
                    }`}
                  >
                    All
                  </button>
                  {CATEGORIES.filter(c => usedCategories.has(c.key)).map(c => (
                    <button
                      key={c.key}
                      onClick={() => setCategory(c.key)}
                      className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-2xs font-bold border transition ${
                        category === c.key ? 'border-gold text-gold bg-gold-liquid/10' : 'border-surface-border text-text-secondary'
                      }`}
                    >
                      <c.icon size={11} /> {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ideas */}
            <motion.div layout className="grid md:grid-cols-2 gap-3">
              <AnimatePresence initial={false}>
                {shown.map(idea => {
                  const cat = categoryMeta(idea.category)
                  const rank = sort === 'trending' && trendingTop.has(idea.id) ? visible.indexOf(idea) + 1 : 0
                  const details = [
                    idea.location && { icon: MapPin, text: idea.location },
                    idea.music && { icon: Music2, text: idea.music },
                    idea.artist && { icon: Mic2, text: idea.artist },
                    idea.theme && { icon: Palette, text: idea.theme },
                  ].filter(Boolean) as { icon: any; text: string }[]
                  return (
                    <motion.article
                      key={idea.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.25 }}
                      className={`flex gap-4 p-4 rounded-2xl border bg-surface-card transition ${
                        rank ? 'border-gold-liquid/40 shadow-gold-sm' : 'border-surface-border hover:border-white/20'
                      }`}
                    >
                      {upvotesEnabled && <UpvoteButton idea={idea} onVote={() => onUpvote(idea.id)} disabled={false} />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          {rank > 0 && rank <= 3 && (
                            <span className="flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300">
                              <Flame size={10} /> #{rank} Trending
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-2xs text-text-muted">
                            <cat.icon size={11} /> {cat.label}
                          </span>
                          <span className="text-2xs text-text-muted">· {timeAgo(idea.created_at)}</span>
                        </div>
                        <h3 className="font-bold text-text-primary leading-snug">{idea.title || idea.description.slice(0, 80)}</h3>
                        {idea.title && idea.description && (
                          <p className="text-sm text-text-secondary mt-1 line-clamp-2">{idea.description}</p>
                        )}
                        {details.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                            {details.map(d => (
                              <span key={d.text} className="flex items-center gap-1 text-2xs text-text-muted max-w-full truncate">
                                <d.icon size={10} className="text-gold-liquid/70 shrink-0" /> {d.text}
                              </span>
                            ))}
                          </div>
                        )}
                        {upvotesEnabled && (
                          <p className="text-2xs text-text-muted mt-2">
                            {idea.upvotes === 0
                              ? 'Be the first supporter'
                              : `${idea.upvotes} ${idea.upvotes === 1 ? 'person wants' : 'people want'} this${idea.voted ? ', including you' : ''}`}
                          </p>
                        )}
                      </div>
                    </motion.article>
                  )
                })}
              </AnimatePresence>
            </motion.div>

            {visible.length > 8 && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setShowAll(s => !s)}
                  className="px-5 py-2.5 rounded-full border border-surface-border text-xs font-bold text-text-secondary hover:text-text-primary hover:border-gold-liquid/40 transition"
                >
                  {showAll ? 'Show less' : `Show all ${visible.length} ideas`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
