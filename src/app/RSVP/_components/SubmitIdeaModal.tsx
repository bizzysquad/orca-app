'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Loader2, Check, Lightbulb, ChevronDown } from 'lucide-react'
import { CATEGORIES } from './types'
import type { IdeaDraft } from './IdeaBoard'

const inputCls =
  'w-full px-3.5 py-3 rounded-xl bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none focus:shadow-input-focus focus:border-gold-liquid/50 transition'

export default function SubmitIdeaModal({ open, draft, onClose }: { open: boolean; draft: IdeaDraft | null; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('party')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [music, setMusic] = useState('')
  const [artist, setArtist] = useState('')
  const [theme, setTheme] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDone(false)
    setError('')
    if (draft) {
      setTitle(draft.title)
      setCategory(draft.category)
      setDescription(draft.description)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, draft, onClose])

  const submit = async () => {
    setError('')
    if (!title.trim()) return setError('Give your idea a name')
    if (!description.trim()) return setError('Tell us a little about it')
    if (!name.trim() || !email.trim()) return setError('Add your name and email so we can follow up')
    setSubmitting(true)
    try {
      const res = await fetch('/api/rsvp/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, category, event_idea: description,
          preferred_location: location, preferred_music: music, artist_suggestion: artist, theme_suggestion: theme,
          name, email,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not submit')
      setDone(true)
      setTitle(''); setDescription(''); setLocation(''); setMusic(''); setArtist(''); setTheme('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-idea-title"
            className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-surface-card border border-surface-border rounded-t-3xl sm:rounded-3xl shadow-2xl"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="sm:hidden mx-auto mt-2.5 w-10 h-1 rounded-full bg-white/20" />
            <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-white/5">
              <X size={18} />
            </button>

            {done ? (
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12 }}
                  className="mx-auto w-16 h-16 rounded-full bg-gold-gradient text-brand-black flex items-center justify-center mb-5"
                >
                  <Check size={30} strokeWidth={3} />
                </motion.div>
                <h3 className="text-2xl font-extrabold text-text-primary">Your idea is in!</h3>
                <p className="text-sm text-text-secondary mt-2 max-w-xs mx-auto">
                  We give every submission a quick look. Once it is approved it goes live on the board so the city can vote it up.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
                  <button onClick={() => setDone(false)} className="px-5 py-2.5 rounded-full border border-surface-border text-sm font-bold text-text-secondary hover:text-text-primary">
                    Pitch another
                  </button>
                  <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-gold-gradient text-brand-black text-sm font-bold">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-7">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gold-liquid/15 text-gold flex items-center justify-center"><Lightbulb size={19} /></div>
                  <div>
                    <h3 id="submit-idea-title" className="text-lg font-extrabold text-text-primary">Pitch an event</h3>
                    <p className="text-2xs text-text-muted">If enough people want it, it happens.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Name your idea</label>
                    <input className={inputCls} maxLength={120} placeholder="e.g. Sunday Brunch & Beats" value={title} onChange={e => setTitle(e.target.value)} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">What kind of event?</label>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(c => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setCategory(c.key)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-2xs font-bold border transition ${
                            category === c.key ? 'border-gold bg-gold-liquid/15 text-gold' : 'border-surface-border text-text-secondary hover:border-white/25'
                          }`}
                        >
                          <c.icon size={11} /> {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Paint the picture</label>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      className={inputCls}
                      placeholder="What happens, what it feels like, why the city needs it"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>

                  <button type="button" onClick={() => setShowDetails(s => !s)} className="flex items-center gap-1 text-xs font-bold text-gold">
                    <ChevronDown size={14} className={`transition ${showDetails ? 'rotate-180' : ''}`} />
                    {showDetails ? 'Fewer details' : 'Add venue, music, artist, theme (optional)'}
                  </button>
                  <AnimatePresence initial={false}>
                    {showDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid sm:grid-cols-2 gap-3 pt-1">
                          <input className={inputCls} maxLength={200} placeholder="Venue or area" value={location} onChange={e => setLocation(e.target.value)} />
                          <input className={inputCls} maxLength={200} placeholder="Music / genres" value={music} onChange={e => setMusic(e.target.value)} />
                          <input className={inputCls} maxLength={200} placeholder="DJ or artist" value={artist} onChange={e => setArtist(e.target.value)} />
                          <input className={inputCls} maxLength={200} placeholder="Theme or dress code" value={theme} onChange={e => setTheme(e.target.value)} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-surface-border">
                    <div className="pt-3">
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">Your name</label>
                      <input className={inputCls} autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="sm:pt-3">
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">Email</label>
                      <input className={inputCls} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <p className="text-2xs text-text-muted -mt-1">Never shown publicly. We only use it if your idea moves forward.</p>

                  {error && <p className="text-sm text-danger font-semibold">{error}</p>}

                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-gold-gradient text-brand-black font-bold text-sm disabled:opacity-60 hover:shadow-gold-lg transition"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Lightbulb size={16} />}
                    {submitting ? 'Submitting' : 'Submit My Idea'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
