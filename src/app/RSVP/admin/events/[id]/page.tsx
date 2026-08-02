'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Loader2, Save, Upload, Plus, Trash2, ExternalLink, Eye,
  Calendar, MapPin, Music2, Ticket, Percent, ListChecks, HelpCircle,
} from 'lucide-react'
import AdminShell from '../../_components/AdminShell'

const STATUSES = [
  'draft', 'collecting_interest', 'voting_open', 'date_selected',
  'rsvp_open', 'tickets_on_sale', 'sold_out', 'completed', 'cancelled',
]

function statusLabel(s: string) {
  return s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
}

const GENRES = ['Hip-Hop', 'R&B', 'Afrobeats', 'Amapiano', 'House', 'EDM', 'Top 40', 'Reggae/Dancehall', 'Latin', 'Old School']

// ── Small field primitives ──────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-text-secondary mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-2xs text-text-muted mt-1">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none focus:shadow-input-focus focus:border-gold/50 transition'

function Section({ icon: Icon, title, action, children }: { icon: any; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary uppercase tracking-wide">
          <Icon size={16} className="text-gold" /> {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function SaveButton({ onClick, saving, label = 'Save' }: { onClick: () => void; saving: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-gradient text-brand-black text-2xs font-bold disabled:opacity-60 hover:shadow-gold transition"
    >
      {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {label}
    </button>
  )
}

export default function EventEditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [event, setEvent] = useState<any>(null)
  const [dates, setDates] = useState<any[]>([])
  const [pollQuestions, setPollQuestions] = useState<any[]>([])
  const [ticketTypes, setTicketTypes] = useState<any[]>([])
  const [promoCodes, setPromoCodes] = useState<any[]>([])

  const [savingCore, setSavingCore] = useState(false)
  const [savingDates, setSavingDates] = useState(false)
  const [savingPolls, setSavingPolls] = useState(false)
  const [savingTickets, setSavingTickets] = useState(false)
  const [savingPromo, setSavingPromo] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const flash = (msg: string, isError = false) => {
    if (isError) setErrorMsg(msg)
    else setMessage(msg)
    setTimeout(() => { setMessage(''); setErrorMsg('') }, 3000)
  }

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/rsvp/events/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then(data => {
        setEvent(data.event)
        setDates(data.proposedDates || [])
        setPollQuestions((data.pollQuestions || []).map((q: any) => ({ ...q, options: q.rsvp_poll_options || q.options || [] })))
        setTicketTypes(data.ticketTypes || [])
        setPromoCodes(data.promoCodes || [])
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(load, [load])

  const setField = (field: string, value: any) => setEvent((e: any) => ({ ...e, [field]: value }))

  const saveCore = async () => {
    setSavingCore(true)
    setErrorMsg('')
    try {
      const res = await fetch(`/api/rsvp/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEvent(data.event)
      flash('Saved')
    } catch (e: any) {
      flash(e.message || 'Failed to save', true)
    } finally {
      setSavingCore(false)
    }
  }

  const uploadFlyer = async (file: File) => {
    setUploading(true)
    setErrorMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/rsvp/flyers', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setField('flyer_url', data.url)
      await fetch(`/api/rsvp/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flyer_url: data.url }),
      })
      flash('Flyer uploaded')
    } catch (e: any) {
      flash(e.message || 'Upload failed', true)
    } finally {
      setUploading(false)
    }
  }

  const saveDates = async () => {
    setSavingDates(true)
    try {
      const res = await fetch(`/api/rsvp/events/${id}/dates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDates(data.dates)
      flash('Dates saved')
    } catch (e: any) {
      flash(e.message || 'Failed to save dates', true)
    } finally {
      setSavingDates(false)
    }
  }

  const savePolls = async () => {
    setSavingPolls(true)
    try {
      const res = await fetch(`/api/rsvp/events/${id}/polls`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: pollQuestions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPollQuestions(data.questions)
      flash('Polls saved')
    } catch (e: any) {
      flash(e.message || 'Failed to save polls', true)
    } finally {
      setSavingPolls(false)
    }
  }

  const saveTicketTypes = async () => {
    setSavingTickets(true)
    try {
      const res = await fetch(`/api/rsvp/events/${id}/ticket-types`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketTypes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTicketTypes(data.ticketTypes)
      flash('Ticket types saved')
    } catch (e: any) {
      flash(e.message || 'Failed to save ticket types', true)
    } finally {
      setSavingTickets(false)
    }
  }

  const savePromoCodes = async () => {
    setSavingPromo(true)
    try {
      const res = await fetch(`/api/rsvp/events/${id}/promo-codes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCodes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPromoCodes(data.promoCodes)
      flash('Promo codes saved')
    } catch (e: any) {
      flash(e.message || 'Failed to save promo codes', true)
    } finally {
      setSavingPromo(false)
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-gold" size={28} /></div>
      </AdminShell>
    )
  }
  if (notFound || !event) {
    return (
      <AdminShell>
        <p className="text-text-secondary">Event not found. <button className="text-gold underline" onClick={() => router.push('/RSVP/admin')}>Back to events</button></p>
      </AdminShell>
    )
  }

  const genres: string[] = event.music_genres || []
  const toggleGenre = (g: string) =>
    setField('music_genres', genres.includes(g) ? genres.filter(x => x !== g) : [...genres, g])

  const customQuestions: any[] = event.custom_rsvp_questions || []
  const faqs: any[] = event.faqs || []

  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <button onClick={() => router.push('/RSVP/admin')} className="text-2xs text-text-muted hover:text-text-secondary mb-1">← All events</button>
          <h1 className="text-2xl font-extrabold text-text-primary">{event.name}</h1>
          <p className="text-2xs text-text-muted mt-1">/RSVP/events/{event.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          {message && <span className="text-2xs text-emerald-400 font-semibold">{message}</span>}
          {errorMsg && <span className="text-2xs text-danger font-semibold">{errorMsg}</span>}
          <a
            href={`/RSVP/events/${event.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-gold/40 transition"
          >
            <Eye size={13} /> Preview <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* STATUS */}
      <Section icon={ListChecks} title="Status" action={<SaveButton onClick={saveCore} saving={savingCore} />}>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setField('status', s)}
              className={`px-3 py-1.5 rounded-full text-2xs font-bold border transition ${
                event.status === s
                  ? 'bg-gold-gradient text-brand-black border-transparent'
                  : 'border-surface-border text-text-secondary hover:border-gold/40'
              }`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </Section>

      {/* BASICS */}
      <Section icon={Music2} title="Event Basics">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Event Name">
            <input className={inputCls} value={event.name || ''} onChange={e => setField('name', e.target.value)} />
          </Field>
          <Field label="Slug (URL)" hint={`orcafin.app/RSVP/events/${event.slug}`}>
            <input className={inputCls} value={event.slug || ''} onChange={e => setField('slug', e.target.value)} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Flyer / Promo Image">
            <div className="flex items-center gap-4">
              {event.flyer_url && (
                <img src={event.flyer_url} alt="Flyer" className="w-20 h-20 rounded-lg object-cover border border-surface-border" />
              )}
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-surface-border text-xs font-semibold text-text-secondary hover:border-gold/40 hover:text-text-primary cursor-pointer transition">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Uploading…' : 'Upload Flyer'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && uploadFlyer(e.target.files[0])}
                />
              </label>
            </div>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Description">
            <textarea rows={4} className={inputCls} value={event.description || ''} onChange={e => setField('description', e.target.value)} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Music Genres">
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className={`px-3 py-1.5 rounded-full text-2xs font-semibold border transition ${
                    genres.includes(g) ? 'bg-gold/15 border-gold text-gold' : 'border-surface-border text-text-secondary'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-4">
          <Field label="DJ / Performer Info">
            <textarea rows={2} className={inputCls} value={event.performer_info || ''} onChange={e => setField('performer_info', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* VENUE & SCHEDULE */}
      <Section icon={MapPin} title="Venue & Schedule">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Venue Name">
            <input className={inputCls} value={event.venue || ''} onChange={e => setField('venue', e.target.value)} />
          </Field>
          <Field label="Address">
            <input className={inputCls} value={event.address || ''} onChange={e => setField('address', e.target.value)} />
          </Field>
          <Field label="City">
            <input className={inputCls} value={event.city || ''} onChange={e => setField('city', e.target.value)} />
          </Field>
          <Field label="State">
            <input className={inputCls} value={event.state || ''} onChange={e => setField('state', e.target.value)} />
          </Field>
          <Field label="Age Requirement">
            <input className={inputCls} placeholder="e.g. 21+" value={event.age_requirement || ''} onChange={e => setField('age_requirement', e.target.value)} />
          </Field>
          <Field label="Dress Code">
            <input className={inputCls} value={event.dress_code || ''} onChange={e => setField('dress_code', e.target.value)} />
          </Field>
          <Field label="Start Time">
            <input type="datetime-local" className={inputCls} value={event.start_time ? event.start_time.slice(0, 16) : ''} onChange={e => setField('start_time', e.target.value)} />
          </Field>
          <Field label="End Time">
            <input type="datetime-local" className={inputCls} value={event.end_time ? event.end_time.slice(0, 16) : ''} onChange={e => setField('end_time', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* VOTING: PROPOSED DATES */}
      <Section
        icon={Calendar}
        title="Proposed Dates (Voting)"
        action={<SaveButton onClick={saveDates} saving={savingDates} />}
      >
        <div className="mb-3">
          <Field label="Vote Visibility">
            <select
              className={inputCls}
              value={event.vote_visibility}
              onChange={e => setField('vote_visibility', e.target.value)}
            >
              <option value="public">Publicly Visible</option>
              <option value="hidden_until_voted">Hidden Until Visitor Votes</option>
              <option value="admin_only">Admin Only</option>
            </select>
          </Field>
        </div>
        <div className="space-y-2">
          {dates.map((d, i) => (
            <div key={d.id || i} className="flex items-center gap-2">
              <input
                className={inputCls}
                placeholder="Label (e.g. Fri Aug 22)"
                value={d.label || ''}
                onChange={e => setDates(ds => ds.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))}
              />
              <input
                type="date"
                className={inputCls + ' max-w-[160px]'}
                value={d.date || ''}
                onChange={e => setDates(ds => ds.map((x, xi) => (xi === i ? { ...x, date: e.target.value } : x)))}
              />
              <button onClick={() => setDates(ds => ds.filter((_, xi) => xi !== i))} className="p-2 text-text-muted hover:text-danger">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setDates(ds => [...ds, { label: '', date: '' }])}
          className="flex items-center gap-1.5 mt-3 text-2xs font-semibold text-gold"
        >
          <Plus size={13} /> Add Date Option
        </button>
      </Section>

      {/* POLLS */}
      <Section icon={ListChecks} title="Polls (Genre / Theme / Format)" action={<SaveButton onClick={savePolls} saving={savingPolls} />}>
        <div className="space-y-5">
          {pollQuestions.map((q, qi) => (
            <div key={q.id || qi} className="border border-surface-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <select
                  className={inputCls + ' max-w-[140px]'}
                  value={q.kind}
                  onChange={e => setPollQuestions(qs => qs.map((x, xi) => (xi === qi ? { ...x, kind: e.target.value } : x)))}
                >
                  <option value="genre">Genre</option>
                  <option value="theme">Theme</option>
                  <option value="format">Format</option>
                  <option value="custom">Custom</option>
                </select>
                <input
                  className={inputCls}
                  placeholder="Question (e.g. What genre should we play?)"
                  value={q.question || ''}
                  onChange={e => setPollQuestions(qs => qs.map((x, xi) => (xi === qi ? { ...x, question: e.target.value } : x)))}
                />
                <button onClick={() => setPollQuestions(qs => qs.filter((_, xi) => xi !== qi))} className="p-2 text-text-muted hover:text-danger">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="space-y-2 pl-2">
                {(q.options || []).map((o: any, oi: number) => (
                  <div key={o.id || oi} className="flex items-center gap-2">
                    <input
                      className={inputCls}
                      placeholder="Option label"
                      value={o.label || ''}
                      onChange={e =>
                        setPollQuestions(qs =>
                          qs.map((x, xi) =>
                            xi === qi ? { ...x, options: x.options.map((y: any, yi: number) => (yi === oi ? { ...y, label: e.target.value } : y)) } : x
                          )
                        )
                      }
                    />
                    <button
                      onClick={() =>
                        setPollQuestions(qs => qs.map((x, xi) => (xi === qi ? { ...x, options: x.options.filter((_: any, yi: number) => yi !== oi) } : x)))
                      }
                      className="p-2 text-text-muted hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setPollQuestions(qs => qs.map((x, xi) => (xi === qi ? { ...x, options: [...(x.options || []), { label: '' }] } : x)))}
                  className="text-2xs font-semibold text-gold flex items-center gap-1"
                >
                  <Plus size={12} /> Add Option
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setPollQuestions(qs => [...qs, { kind: 'genre', question: '', options: [] }])}
          className="flex items-center gap-1.5 mt-4 text-2xs font-semibold text-gold"
        >
          <Plus size={13} /> Add Poll Question
        </button>
      </Section>

      {/* CAPACITY & PRICING */}
      <Section icon={Ticket} title="RSVP / Ticketing">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="RSVP Capacity">
            <input type="number" className={inputCls} value={event.rsvp_capacity ?? ''} onChange={e => setField('rsvp_capacity', e.target.value ? Number(e.target.value) : null)} />
          </Field>
          <Field label="Ticket Capacity">
            <input type="number" className={inputCls} value={event.ticket_capacity ?? ''} onChange={e => setField('ticket_capacity', e.target.value ? Number(e.target.value) : null)} />
          </Field>
          <Field label="Base Ticket Price (USD)">
            <input
              type="number"
              step="0.01"
              className={inputCls}
              value={event.ticket_price_cents ? (event.ticket_price_cents / 100).toFixed(2) : ''}
              onChange={e => setField('ticket_price_cents', Math.round(Number(e.target.value || 0) * 100))}
            />
          </Field>
          <Field label="Free or Paid">
            <div className="flex gap-2">
              <button
                onClick={() => setField('is_paid', false)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition ${!event.is_paid ? 'bg-gold/15 border-gold text-gold' : 'border-surface-border text-text-secondary'}`}
              >
                Free RSVP
              </button>
              <button
                onClick={() => setField('is_paid', true)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition ${event.is_paid ? 'bg-gold/15 border-gold text-gold' : 'border-surface-border text-text-secondary'}`}
              >
                Paid Tickets
              </button>
            </div>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Refund Policy">
            <textarea rows={2} className={inputCls} value={event.refund_policy || ''} onChange={e => setField('refund_policy', e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Contact Email">
            <input className={inputCls} value={event.contact_email || ''} onChange={e => setField('contact_email', e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Policies (shown at RSVP / checkout for agreement)">
            <textarea rows={3} className={inputCls} value={event.policies || ''} onChange={e => setField('policies', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* TICKET TYPES */}
      {event.is_paid && (
        <Section icon={Ticket} title="Ticket Types" action={<SaveButton onClick={saveTicketTypes} saving={savingTickets} />}>
          <div className="space-y-3">
            {ticketTypes.map((t, i) => (
              <div key={t.id || i} className="grid sm:grid-cols-6 gap-2 items-center border border-surface-border rounded-xl p-3">
                <input
                  className={inputCls + ' sm:col-span-2'}
                  placeholder="Name (GA, VIP, Early-Bird...)"
                  value={t.name || ''}
                  onChange={e => setTicketTypes(ts => ts.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))}
                />
                <input
                  type="number"
                  step="0.01"
                  className={inputCls}
                  placeholder="Price $"
                  value={t.price_cents ? (t.price_cents / 100).toFixed(2) : ''}
                  onChange={e => setTicketTypes(ts => ts.map((x, xi) => (xi === i ? { ...x, price_cents: Math.round(Number(e.target.value || 0) * 100) } : x)))}
                />
                <input
                  type="number"
                  className={inputCls}
                  placeholder="Qty limit"
                  value={t.quantity_limit ?? ''}
                  onChange={e => setTicketTypes(ts => ts.map((x, xi) => (xi === i ? { ...x, quantity_limit: e.target.value ? Number(e.target.value) : null } : x)))}
                />
                <label className="flex items-center gap-1.5 text-2xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={!!t.is_complimentary}
                    onChange={e => setTicketTypes(ts => ts.map((x, xi) => (xi === i ? { ...x, is_complimentary: e.target.checked } : x)))}
                  />
                  Comp
                </label>
                <button onClick={() => setTicketTypes(ts => ts.filter((_, xi) => xi !== i))} className="p-2 text-text-muted hover:text-danger justify-self-end">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setTicketTypes(ts => [...ts, { name: '', price_cents: 0, quantity_limit: null, is_complimentary: false }])}
            className="flex items-center gap-1.5 mt-3 text-2xs font-semibold text-gold"
          >
            <Plus size={13} /> Add Ticket Type
          </button>
        </Section>
      )}

      {/* PROMO CODES */}
      {event.is_paid && (
        <Section icon={Percent} title="Promo Codes" action={<SaveButton onClick={savePromoCodes} saving={savingPromo} />}>
          <div className="space-y-3">
            {promoCodes.map((c, i) => (
              <div key={c.id || i} className="grid sm:grid-cols-6 gap-2 items-center border border-surface-border rounded-xl p-3">
                <input
                  className={inputCls + ' sm:col-span-2'}
                  placeholder="CODE"
                  value={c.code || ''}
                  onChange={e => setPromoCodes(cs => cs.map((x, xi) => (xi === i ? { ...x, code: e.target.value.toUpperCase() } : x)))}
                />
                <select
                  className={inputCls}
                  value={c.discount_type || 'percent'}
                  onChange={e => setPromoCodes(cs => cs.map((x, xi) => (xi === i ? { ...x, discount_type: e.target.value } : x)))}
                >
                  <option value="percent">% Off</option>
                  <option value="amount">$ Off</option>
                </select>
                <input
                  type="number"
                  className={inputCls}
                  placeholder="Value"
                  value={c.discount_value ?? ''}
                  onChange={e => setPromoCodes(cs => cs.map((x, xi) => (xi === i ? { ...x, discount_value: Number(e.target.value || 0) } : x)))}
                />
                <input
                  type="number"
                  className={inputCls}
                  placeholder="Max uses"
                  value={c.max_uses ?? ''}
                  onChange={e => setPromoCodes(cs => cs.map((x, xi) => (xi === i ? { ...x, max_uses: e.target.value ? Number(e.target.value) : null } : x)))}
                />
                <button onClick={() => setPromoCodes(cs => cs.filter((_, xi) => xi !== i))} className="p-2 text-text-muted hover:text-danger justify-self-end">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setPromoCodes(cs => [...cs, { code: '', discount_type: 'percent', discount_value: 10 }])}
            className="flex items-center gap-1.5 mt-3 text-2xs font-semibold text-gold"
          >
            <Plus size={13} /> Add Promo Code
          </button>
        </Section>
      )}

      {/* CUSTOM RSVP QUESTIONS */}
      <Section icon={HelpCircle} title="Custom RSVP Questions" action={<SaveButton onClick={saveCore} saving={savingCore} />}>
        <div className="space-y-2">
          {customQuestions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className={inputCls}
                placeholder="Question text"
                value={q.label || ''}
                onChange={e => setField('custom_rsvp_questions', customQuestions.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))}
              />
              <select
                className={inputCls + ' max-w-[130px]'}
                value={q.type || 'text'}
                onChange={e => setField('custom_rsvp_questions', customQuestions.map((x, xi) => (xi === i ? { ...x, type: e.target.value } : x)))}
              >
                <option value="text">Short Text</option>
                <option value="checkbox">Yes/No</option>
              </select>
              <label className="flex items-center gap-1 text-2xs text-text-secondary whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={!!q.required}
                  onChange={e => setField('custom_rsvp_questions', customQuestions.map((x, xi) => (xi === i ? { ...x, required: e.target.checked } : x)))}
                />
                Required
              </label>
              <button
                onClick={() => setField('custom_rsvp_questions', customQuestions.filter((_, xi) => xi !== i))}
                className="p-2 text-text-muted hover:text-danger"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setField('custom_rsvp_questions', [...customQuestions, { label: '', type: 'text', required: false }])}
          className="flex items-center gap-1.5 mt-3 text-2xs font-semibold text-gold"
        >
          <Plus size={13} /> Add Question
        </button>
      </Section>

      {/* FAQS */}
      <Section icon={HelpCircle} title="FAQs" action={<SaveButton onClick={saveCore} saving={savingCore} />}>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="border border-surface-border rounded-xl p-3 space-y-2">
              <input
                className={inputCls}
                placeholder="Question"
                value={f.question || ''}
                onChange={e => setField('faqs', faqs.map((x, xi) => (xi === i ? { ...x, question: e.target.value } : x)))}
              />
              <div className="flex items-center gap-2">
                <textarea
                  rows={2}
                  className={inputCls}
                  placeholder="Answer"
                  value={f.answer || ''}
                  onChange={e => setField('faqs', faqs.map((x, xi) => (xi === i ? { ...x, answer: e.target.value } : x)))}
                />
                <button onClick={() => setField('faqs', faqs.filter((_, xi) => xi !== i))} className="p-2 text-text-muted hover:text-danger">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setField('faqs', [...faqs, { question: '', answer: '' }])}
          className="flex items-center gap-1.5 mt-3 text-2xs font-semibold text-gold"
        >
          <Plus size={13} /> Add FAQ
        </button>
      </Section>

      <div className="flex justify-end pb-12">
        <button
          onClick={saveCore}
          disabled={savingCore}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gold-gradient text-brand-black font-bold text-sm disabled:opacity-60 hover:shadow-gold transition"
        >
          {savingCore ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save All Changes
        </button>
      </div>
    </AdminShell>
  )
}
