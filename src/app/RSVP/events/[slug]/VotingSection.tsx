'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Users, Send } from 'lucide-react'

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none focus:shadow-input-focus focus:border-gold/50 transition'

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full bg-gold-gradient rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function VoteOption({
  label, sublabel, selected, onSelect, voteCount, pct, showTallies,
}: {
  label: string; sublabel?: string; selected: boolean; onSelect: () => void
  voteCount?: number; pct?: number; showTallies: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border transition ${
        selected ? 'border-gold bg-gold/10' : 'border-surface-border bg-surface-card hover:border-gold/30'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-text-primary text-sm">{label}</div>
          {sublabel && <div className="text-2xs text-text-muted">{sublabel}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showTallies && <span className="text-2xs text-text-secondary">{voteCount} votes</span>}
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-gold bg-gold' : 'border-surface-border'}`}>
            {selected && <CheckCircle2 size={14} className="text-brand-black" />}
          </div>
        </div>
      </div>
      {showTallies && typeof pct === 'number' && (
        <div className="mt-2">
          <ProgressBar pct={pct} />
          <div className="text-2xs text-text-muted mt-1">{pct.toFixed(0)}%</div>
        </div>
      )}
    </button>
  )
}

export default function VotingSection({
  event, proposedDates, pollQuestions, showTallies, onVoted,
}: {
  event: any; proposedDates: any[]; pollQuestions: any[]; showTallies: boolean; onVoted: () => void
}) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [guestCount, setGuestCount] = useState(0)
  const [wantsUpdates, setWantsUpdates] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [sName, setSName] = useState('')
  const [sEmail, setSEmail] = useState('')
  const [sIdea, setSIdea] = useState('')
  const [sLocation, setSLocation] = useState('')
  const [sWeekend, setSWeekend] = useState('')
  const [sMusic, setSMusic] = useState('')
  const [sArtist, setSArtist] = useState('')
  const [sTheme, setSTheme] = useState('')
  const [sComments, setSComments] = useState('')
  const [sSubmitting, setSSubmitting] = useState(false)
  const [sSuccess, setSSuccess] = useState(false)

  const totalDateVotes = proposedDates.reduce((sum, d) => sum + (d.voteCount || 0), 0)

  const submitVotes = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Enter your name and email.')
      return
    }
    if (!selectedDate && Object.keys(selectedOptions).length === 0) {
      setError('Pick at least one option to vote on.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const calls: Promise<Response>[] = []
      if (selectedDate) {
        calls.push(
          fetch('/api/rsvp/votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_id: event.id, type: 'date', date_id: selectedDate,
              voter_name: name.trim(), voter_email: email.trim(), guest_count: guestCount, wants_updates: wantsUpdates,
            }),
          })
        )
      }
      for (const q of pollQuestions) {
        const optionId = selectedOptions[q.id]
        if (!optionId) continue
        calls.push(
          fetch('/api/rsvp/votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_id: event.id, type: 'poll', poll_question_id: q.id, poll_option_id: optionId,
              voter_name: name.trim(), voter_email: email.trim(), guest_count: guestCount, wants_updates: wantsUpdates,
            }),
          })
        )
      }
      const results = await Promise.all(calls)
      const failed = []
      for (const r of results) {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          failed.push(d.error || 'Vote failed')
        }
      }
      if (failed.length && failed.length === results.length) {
        setError(failed[0])
      } else {
        setSuccess(true)
        onVoted()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const submitSuggestion = async () => {
    if (!sName.trim() || !sEmail.trim()) return
    setSSubmitting(true)
    try {
      const res = await fetch('/api/rsvp/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id, name: sName.trim(), email: sEmail.trim(), event_idea: sIdea,
          preferred_location: sLocation, preferred_weekend: sWeekend, preferred_music: sMusic,
          artist_suggestion: sArtist, theme_suggestion: sTheme, comments: sComments,
        }),
      })
      if (res.ok) {
        setSSuccess(true)
        setSName(''); setSEmail(''); setSIdea(''); setSLocation(''); setSWeekend('')
        setSMusic(''); setSArtist(''); setSTheme(''); setSComments('')
      }
    } finally {
      setSSubmitting(false)
    }
  }

  return (
    <div className="mb-12">
      {proposedDates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-1">Which date works best?</h2>
          {showTallies && <p className="text-2xs text-text-muted mb-4">{totalDateVotes} votes so far</p>}
          <div className="space-y-2 mt-4">
            {proposedDates.map(d => (
              <VoteOption
                key={d.id}
                label={d.label}
                sublabel={new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                selected={selectedDate === d.id}
                onSelect={() => setSelectedDate(d.id)}
                voteCount={d.voteCount}
                pct={totalDateVotes ? (100 * (d.voteCount || 0)) / totalDateVotes : 0}
                showTallies={showTallies}
              />
            ))}
          </div>
        </div>
      )}

      {pollQuestions.map((q: any) => {
        const total = (q.options || []).reduce((sum: number, o: any) => sum + (o.voteCount || 0), 0)
        return (
          <div key={q.id} className="mb-8">
            <h2 className="text-lg font-bold text-text-primary mb-4">{q.question}</h2>
            <div className="space-y-2">
              {(q.options || []).map((o: any) => (
                <VoteOption
                  key={o.id}
                  label={o.label}
                  selected={selectedOptions[q.id] === o.id}
                  onSelect={() => setSelectedOptions(s => ({ ...s, [q.id]: o.id }))}
                  voteCount={o.voteCount}
                  pct={total ? (100 * (o.voteCount || 0)) / total : 0}
                  showTallies={showTallies}
                />
              ))}
            </div>
          </div>
        )
      })}

      {(proposedDates.length > 0 || pollQuestions.length > 0) && (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5 sm:p-6">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 className="mx-auto text-gold mb-2" size={28} />
              <p className="font-bold text-text-primary">Your vote is in! We&apos;ll email you the results.</p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-bold text-text-primary mb-4">Cast your vote</h3>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <input className={inputCls} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
                <input className={inputCls} placeholder="Your email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <Users size={14} /> How many might come with you?
                  <input
                    type="number" min={0} max={50} value={guestCount}
                    onChange={e => setGuestCount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-16 px-2 py-1 rounded bg-brand-soft border border-surface-border text-text-primary text-xs"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input type="checkbox" checked={wantsUpdates} onChange={e => setWantsUpdates(e.target.checked)} />
                  Email me updates about this event
                </label>
              </div>
              {error && <p className="text-xs text-danger font-semibold mb-3">{error}</p>}
              <button
                onClick={submitVotes}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gold-gradient text-brand-black font-bold text-sm disabled:opacity-60 hover:shadow-gold transition"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <>Submit My Vote <Send size={15} /></>}
              </button>
            </>
          )}
        </div>
      )}

      {/* Suggestions */}
      <div className="mt-10 bg-surface-card border border-surface-border rounded-2xl p-5 sm:p-6">
        <h3 className="text-sm font-bold text-text-primary mb-1">Got an idea for this event?</h3>
        <p className="text-2xs text-text-muted mb-4">Suggest a theme, artist, venue — anything.</p>
        {sSuccess ? (
          <p className="text-sm text-gold font-semibold">Thanks! Your suggestion was submitted.</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input className={inputCls} placeholder="Your name" value={sName} onChange={e => setSName(e.target.value)} />
              <input className={inputCls} placeholder="Your email" type="email" value={sEmail} onChange={e => setSEmail(e.target.value)} />
            </div>
            <textarea className={inputCls + ' mb-3'} rows={2} placeholder="Your event idea" value={sIdea} onChange={e => setSIdea(e.target.value)} />
            <div className="grid sm:grid-cols-3 gap-3 mb-3">
              <input className={inputCls} placeholder="Preferred location" value={sLocation} onChange={e => setSLocation(e.target.value)} />
              <input className={inputCls} placeholder="Preferred weekend" value={sWeekend} onChange={e => setSWeekend(e.target.value)} />
              <input className={inputCls} placeholder="Preferred music" value={sMusic} onChange={e => setSMusic(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input className={inputCls} placeholder="Artist / DJ suggestion" value={sArtist} onChange={e => setSArtist(e.target.value)} />
              <input className={inputCls} placeholder="Theme suggestion" value={sTheme} onChange={e => setSTheme(e.target.value)} />
            </div>
            <textarea className={inputCls + ' mb-3'} rows={2} placeholder="Additional comments" value={sComments} onChange={e => setSComments(e.target.value)} />
            <button
              onClick={submitSuggestion}
              disabled={sSubmitting}
              className="px-5 py-2.5 rounded-lg border border-gold/40 text-gold text-xs font-bold hover:bg-gold/10 transition disabled:opacity-60"
            >
              {sSubmitting ? 'Submitting…' : 'Submit Suggestion'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
