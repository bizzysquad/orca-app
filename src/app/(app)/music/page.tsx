'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Music, Plus, ChevronRight, Sparkles, ArrowLeft, Check,
  Circle, Clock, Upload, Star, Instagram, Youtube,
  Play, Edit3, Trash2, X, Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import type { Song, SongStatus } from '@/lib/types'

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'
const BENTLEY_GREEN = '#10B981'
const BENTLEY_PURPLE = '#A78BFA'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

const STATUS_CONFIG: Record<SongStatus, { label: string; color: string; next?: SongStatus }> = {
  'finished':               { label: 'Finished',          color: '#94A3B8',   next: 'artwork-needed' },
  'artwork-needed':         { label: 'Artwork Needed',    color: BENTLEY_GOLD, next: 'artwork-done' },
  'artwork-done':           { label: 'Artwork Done',      color: '#F97316',   next: 'content-ideas-needed' },
  'content-ideas-needed':   { label: 'Content Ideas',     color: BENTLEY_PURPLE, next: 'content-recorded' },
  'content-recorded':       { label: 'Content Recorded',  color: BENTLEY_INDIGO, next: 'release-date-set' },
  'release-date-set':       { label: 'Release Set',       color: '#EC4899',   next: 'uploaded' },
  'uploaded':               { label: 'Uploaded',          color: '#06B6D4',   next: 'promo-scheduled' },
  'promo-scheduled':        { label: 'Promo Scheduled',   color: BENTLEY_GREEN, next: 'released' },
  'released':               { label: 'Released',          color: BENTLEY_GREEN },
}

const PIPELINE_ORDER: SongStatus[] = [
  'finished', 'artwork-needed', 'artwork-done', 'content-ideas-needed',
  'content-recorded', 'release-date-set', 'uploaded', 'promo-scheduled', 'released',
]

const CONTENT_IDEAS_BY_STATUS: Record<string, string[]> = {
  default: [
    'Studio process time-lapse Reel',
    'Behind the beat — show the production',
    '"First time hearing" listener reaction',
    'Lyric breakdown TikTok',
    'Freestyle over the beat (before release)',
    'Day-in-the-life leading up to release day',
    'Loop the hardest 15 seconds for a Short',
  ],
}

function SongCard({ song, onAdvance, onDelete }: {
  song: Song
  onAdvance: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { theme } = useTheme()
  const config = STATUS_CONFIG[song.status]
  const isReleased = song.status === 'released'

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-2xl overflow-hidden"
      style={{ background: theme.card, border: `1px solid ${theme.border}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base truncate" style={{ color: theme.text }}>{song.title}</h3>
            {song.genre && <p className="text-xs mt-0.5" style={{ color: theme.subtext }}>{song.genre}</p>}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap"
              style={{ background: `${config.color}18`, color: config.color }}
            >
              {config.label}
            </span>
            <button onClick={() => onDelete(song.id)}>
              <Trash2 size={13} style={{ color: theme.subtext }} />
            </button>
          </div>
        </div>

        {/* Pipeline progress */}
        <div className="flex items-center gap-1 mb-3">
          {PIPELINE_ORDER.map((s, i) => {
            const currentIdx = PIPELINE_ORDER.indexOf(song.status)
            const isPast = i < currentIdx
            const isCurrent = i === currentIdx
            const sColor = STATUS_CONFIG[s].color
            return (
              <div
                key={s}
                className="flex-1 h-1 rounded-full"
                style={{
                  background: isPast || isCurrent ? sColor : theme.border,
                  opacity: isCurrent ? 1 : isPast ? 0.6 : 0.3,
                }}
              />
            )
          })}
        </div>

        {song.releaseDate && (
          <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: theme.subtext }}>
            <Calendar size={11} />
            Release: {new Date(song.releaseDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}

        {!isReleased && config.next && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onAdvance(song.id)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: `${config.color}18`, color: config.color, border: `1px solid ${config.color}30` }}
          >
            <Check size={13} />
            Mark as {STATUS_CONFIG[config.next].label}
          </motion.button>
        )}

        {isReleased && (
          <div
            className="py-2.5 rounded-xl text-sm font-semibold text-center"
            style={{ background: `${BENTLEY_GREEN}18`, color: BENTLEY_GREEN }}
          >
            Released
          </div>
        )}
      </div>
    </motion.div>
  )
}

const BLANK_SONG = (): Partial<Song> => ({
  title: '',
  genre: '',
  status: 'finished' as SongStatus,
  contentIdeas: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export default function MusicPage() {
  const { theme } = useTheme()
  const [songs, setSongs] = useState<Song[]>([])
  const [filterStatus, setFilterStatus] = useState<SongStatus | 'all'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSong, setNewSong] = useState<Partial<Song>>(BLANK_SONG())
  const [showIdeas, setShowIdeas] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-songs')
      if (saved) setSongs(JSON.parse(saved))
    } catch {}
  }, [])

  const save = (s: Song[]) => {
    try { localStorage.setItem('orca-songs', JSON.stringify(s)) } catch {}
  }

  const addSong = () => {
    if (!newSong.title?.trim()) return
    const song: Song = {
      id: Date.now().toString(),
      title: newSong.title.trim(),
      genre: newSong.genre,
      status: (newSong.status as SongStatus) || 'finished',
      contentIdeas: [],
      releaseDate: newSong.releaseDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const next = [...songs, song]
    setSongs(next)
    save(next)
    setNewSong(BLANK_SONG())
    setShowAddModal(false)
  }

  const advanceSong = (id: string) => {
    const next = songs.map(s => {
      if (s.id !== id) return s
      const config = STATUS_CONFIG[s.status]
      if (!config.next) return s
      return { ...s, status: config.next, updatedAt: new Date().toISOString() }
    })
    setSongs(next)
    save(next)
  }

  const deleteSong = (id: string) => {
    const next = songs.filter(s => s.id !== id)
    setSongs(next)
    save(next)
  }

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return songs
    return songs.filter(s => s.status === filterStatus)
  }, [songs, filterStatus])

  const stats = useMemo(() => ({
    total: songs.length,
    released: songs.filter(s => s.status === 'released').length,
    ready: songs.filter(s => ['uploaded', 'release-date-set', 'promo-scheduled'].includes(s.status)).length,
    inProgress: songs.filter(s => !['released', 'finished'].includes(s.status)).length,
  }), [songs])

  const priorities = useMemo(() => {
    const p: string[] = []
    const needsArtwork = songs.filter(s => s.status === 'artwork-needed')
    const needsContent = songs.filter(s => s.status === 'content-ideas-needed' || s.status === 'content-recorded')
    const readyToUpload = songs.filter(s => s.status === 'release-date-set')
    if (needsArtwork.length > 0) p.push(`"${needsArtwork[0].title}" needs artwork — what's the concept?`)
    if (needsContent.length > 0) p.push(`"${needsContent[0].title}" needs content recorded — get the camera out.`)
    if (readyToUpload.length > 0) p.push(`"${readyToUpload[0].title}" has a release date — upload to DistroKid.`)
    if (p.length === 0 && songs.length > 0) p.push('All songs are moving. Keep the pipeline full.')
    if (songs.length === 0) p.push('No songs in the pipeline. Time to add what you have done.')
    return p
  }, [songs])

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg, color: theme.text }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 sticky top-0 z-10"
        style={{ background: `${theme.bg}f0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <div className="p-2 rounded-xl" style={{ background: theme.card }}>
              <ArrowLeft size={16} style={{ color: theme.subtext }} />
            </div>
          </Link>
          <div>
            <h1 className="text-lg font-bold" style={{ color: theme.text }}>Music</h1>
            <p className="text-xs" style={{ color: theme.subtext }}>Release Pipeline</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setShowAddModal(true)}
          className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          style={{ background: `${BENTLEY_PURPLE}18`, color: BENTLEY_PURPLE, border: `1px solid ${BENTLEY_PURPLE}30` }}
        >
          <Plus size={12} /> Add Song
        </motion.button>
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="px-4 pt-4 space-y-5 max-w-lg mx-auto lg:max-w-3xl"
      >
        {/* ── Stats ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
          {[
            { label: 'Songs', value: stats.total, color: theme.subtext },
            { label: 'Released', value: stats.released, color: BENTLEY_GREEN },
            { label: 'Ready', value: stats.ready, color: BENTLEY_GOLD },
            { label: 'In Progress', value: stats.inProgress, color: BENTLEY_PURPLE },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-3 text-center"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] font-medium mt-0.5" style={{ color: theme.subtext }}>{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* ── Bentley Briefing ── */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl p-4"
          style={{ background: `linear-gradient(135deg, #0F1A35, #141B2D)`, border: `1px solid ${BENTLEY_GOLD}25` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} style={{ color: BENTLEY_GOLD }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>
              Bentley's Music Notes
            </span>
          </div>
          {priorities.map((p, i) => (
            <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: BENTLEY_GOLD }} />
              <p className="text-sm leading-snug" style={{ color: '#CBD5E1' }}>{p}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Content Ideas ── */}
        <motion.div variants={fadeUp}>
          <button
            onClick={() => setShowIdeas(!showIdeas)}
            className="w-full flex items-center justify-between p-4 rounded-2xl"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div className="flex items-center gap-2">
              <Instagram size={14} style={{ color: '#EC4899' }} />
              <span className="text-sm font-semibold" style={{ color: theme.text }}>Content Ideas</span>
            </div>
            <ChevronRight
              size={14}
              style={{ color: theme.subtext, transform: showIdeas ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </button>
          <AnimatePresence>
            {showIdeas && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2">
                  {CONTENT_IDEAS_BY_STATUS.default.map((idea, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ background: `${BENTLEY_PURPLE}20`, color: BENTLEY_PURPLE }}>
                        {i + 1}
                      </div>
                      <p className="text-sm" style={{ color: theme.text }}>{idea}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Filter chips ── */}
        <motion.div variants={fadeUp}>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'artwork-needed', 'content-ideas-needed', 'uploaded', 'released'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                style={{
                  background: filterStatus === s ? BENTLEY_PURPLE : theme.card,
                  color: filterStatus === s ? '#fff' : theme.subtext,
                  border: `1px solid ${filterStatus === s ? BENTLEY_PURPLE : theme.border}`,
                }}
              >
                {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Song List ── */}
        {filtered.length === 0 ? (
          <motion.div variants={fadeUp}>
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <Music size={32} style={{ color: theme.subtext, margin: '0 auto 12px' }} />
              <p className="text-sm font-medium" style={{ color: theme.text }}>No songs here yet.</p>
              <p className="text-xs mt-1" style={{ color: theme.subtext }}>
                {songs.length === 0 ? 'Add your finished songs to start the pipeline.' : 'No songs match this filter.'}
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map(song => (
              <SongCard key={song.id} song={song} onAdvance={advanceSong} onDelete={deleteSong} />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Add Song Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6 space-y-4"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>Add Song</h3>
              <input
                type="text"
                value={newSong.title || ''}
                onChange={e => setNewSong(p => ({ ...p, title: e.target.value }))}
                placeholder="Song title"
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
                autoFocus
              />
              <input
                type="text"
                value={newSong.genre || ''}
                onChange={e => setNewSong(p => ({ ...p, genre: e.target.value }))}
                placeholder="Genre (optional)"
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
              />
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: theme.subtext }}>Current Stage</p>
                <select
                  value={newSong.status || 'finished'}
                  onChange={e => setNewSong(p => ({ ...p, status: e.target.value as SongStatus }))}
                  className="w-full rounded-xl px-4 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
                >
                  {PIPELINE_ORDER.map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
              <input
                type="date"
                value={newSong.releaseDate || ''}
                onChange={e => setNewSong(p => ({ ...p, releaseDate: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
              />
              <div className="flex gap-3">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: theme.card, color: theme.subtext }}>
                  Cancel
                </button>
                <button onClick={addSong} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: BENTLEY_PURPLE, color: '#fff' }}>
                  Add Song
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
