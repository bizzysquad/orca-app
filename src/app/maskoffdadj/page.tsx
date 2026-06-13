'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic2, Calendar, ChevronLeft, ChevronRight, Check,
  Clock, MapPin, Music, Users, Star, Phone, Mail,
  Headphones, Speaker, Zap, ChevronDown,
} from 'lucide-react'

const DJ_ACCENT = '#6366F1'
const DJ_GOLD = '#F59E0B'
const DJ_DARK = '#070B14'
const DJ_CARD = '#0D1525'
const DJ_BORDER = '#1E2D4A'
const DJ_TEXT = '#F1F5F9'
const DJ_SUBTEXT = '#94A3B8'
const DJ_GREEN = '#10B981'

async function fetchBookedDates(): Promise<string[]> {
  try {
    const res = await fetch('/api/dj-availability')
    if (!res.ok) return []
    const data = await res.json()
    return data.bookedDates || []
  } catch { return [] }
}

type FormStep = 'home' | 'calendar' | 'details' | 'confirm'

interface BookingForm {
  date: string
  startTime: string
  endTime: string
  eventType: string
  customEventType: string
  guestCount: string
  location: string
  city: string
  mcNeeded: 'Yes' | 'No'
  specialRequests: string
  name: string
  email: string
  phone: string
}

const BLANK_FORM: BookingForm = {
  date: '', startTime: '', endTime: '',
  eventType: '', customEventType: '',
  guestCount: '', location: '', city: '',
  mcNeeded: 'No', specialRequests: '',
  name: '', email: '', phone: '',
}

const EVENT_TYPES = [
  'Wedding', 'Birthday Party', 'Corporate Event', 'School Dance',
  'Private Party', 'Family Reunion', 'Holiday Party', 'Community Event',
]

function CalendarPicker({
  bookedDates, selectedDate, onSelect,
}: { bookedDates: string[]; selectedDate: string; onSelect: (d: string) => void }) {
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const handleMonthChange = (dir: number) => {
    let m = month + dir, y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m); setYear(y)
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isBooked = bookedDates.includes(dateStr)
    const isPast = dateStr < todayStr
    const isSelected = dateStr === selectedDate
    const isToday = dateStr === todayStr
    const disabled = isBooked || isPast
    cells.push(
      <button
        key={d} disabled={disabled}
        onClick={() => !disabled && onSelect(dateStr)}
        className="aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all relative"
        style={{
          backgroundColor: isSelected ? DJ_ACCENT : isBooked ? `${DJ_ACCENT}18` : isToday ? `${DJ_GOLD}22` : 'transparent',
          color: isSelected ? '#fff' : disabled ? `${DJ_SUBTEXT}50` : isToday ? DJ_GOLD : DJ_TEXT,
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: isToday && !isSelected ? `1px solid ${DJ_GOLD}60` : '1px solid transparent',
        }}
      >
        {d}
        {isBooked && !isPast && <span className="absolute bottom-0.5 text-[7px] font-bold" style={{ color: '#EF4444' }}>BOOKED</span>}
      </button>
    )
  }

  return (
    <div className="rounded-2xl p-5 w-full" style={{ backgroundColor: DJ_CARD, border: `1px solid ${DJ_BORDER}` }}>
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-xl" style={{ color: DJ_SUBTEXT }}><ChevronLeft size={18} /></button>
        <h3 className="font-bold" style={{ color: DJ_TEXT }}>{monthName}</h3>
        <button onClick={() => handleMonthChange(1)} className="p-2 rounded-xl" style={{ color: DJ_SUBTEXT }}><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold py-1" style={{ color: DJ_SUBTEXT }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>
      <div className="flex gap-4 mt-4 pt-3 border-t" style={{ borderColor: DJ_BORDER }}>
        {[
          { color: DJ_ACCENT, label: 'Selected' },
          { color: '#EF4444', label: 'Booked' },
          { color: DJ_GOLD, label: 'Today' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[10px]" style={{ color: DJ_SUBTEXT }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MaskOffBookingPage() {
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [step, setStep] = useState<FormStep>('home')
  const [form, setForm] = useState<BookingForm>(BLANK_FORM)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showEventCustom, setShowEventCustom] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const [scheduleEvents, setScheduleEvents] = useState<{id:string;date:string;event_type:string;city?:string;start_time?:string;end_time?:string;status:string}[]>([])

  useEffect(() => {
    fetchBookedDates().then(setBookedDates)
    fetch('/api/dj/schedule').then(r => r.json()).then(d => setScheduleEvents(d.events || [])).catch(() => {})
  }, [])

  const openBookingForm = (toStep: FormStep = 'calendar') => {
    setStep(toStep)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const f = (field: Partial<BookingForm>) => setForm(p => ({ ...p, ...field }))

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.date) return
    setSubmitting(true)
    const eventType = form.customEventType || form.eventType
    try {
      await fetch('/api/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, eventType, name: form.name, email: form.email, phone: form.phone }),
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedDateFormatted = form.date
    ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const STEP_ORDER: FormStep[] = ['home', 'calendar', 'details', 'confirm']
  const stepIndex = STEP_ORDER.indexOf(step)

  const inputCls = "w-full px-4 py-3 rounded-xl border text-sm outline-none"
  const inputStyle = { backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: DJ_DARK }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `linear-gradient(135deg, ${DJ_GREEN}, #059669)` }}>
            <Check size={36} color="#fff" />
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ color: DJ_TEXT }}>Request Sent!</h2>
          <p className="text-lg mb-2" style={{ color: DJ_SUBTEXT }}>
            Your request for{' '}
            <span style={{ color: DJ_GOLD }}>{selectedDateFormatted}</span>{' '}
            has been submitted.
          </p>
          <p className="text-sm mb-2" style={{ color: DJ_SUBTEXT }}>
            I'll review your request and get back to you within 24 hours.
          </p>
          <p className="text-xs mb-8 font-semibold" style={{ color: DJ_ACCENT }}>Check your email at {form.email} for confirmation.</p>
          <button
            onClick={() => { setSubmitted(false); setStep('home'); setForm(BLANK_FORM) }}
            className="px-8 py-3 rounded-xl font-bold"
            style={{ backgroundColor: DJ_ACCENT, color: '#fff' }}
          >
            Submit Another Request
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: DJ_DARK, color: DJ_TEXT }}>

      {/* ── HERO ── */}
      <div
        className="relative overflow-hidden px-6 py-16 sm:py-24 text-center"
        style={{ background: `linear-gradient(180deg, ${DJ_ACCENT}35 0%, ${DJ_DARK}80 100%)` }}
      >
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)`, boxShadow: `0 0 60px ${DJ_ACCENT}40` }}>
            <Mic2 size={44} color="#fff" />
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4 leading-none" style={{ color: DJ_TEXT }}>
            Mask Off <span style={{ color: DJ_ACCENT }}>Da DJ</span>
          </h1>
          <p className="text-xl sm:text-2xl font-semibold mb-3" style={{ color: DJ_TEXT }}>
            Professional DJ Services for Weddings, Parties & Special Events
          </p>
          <p className="text-base mb-8 max-w-xl mx-auto" style={{ color: DJ_SUBTEXT }}>
            Great music, professional sound, and unforgettable experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => openBookingForm('calendar')}
              className="px-8 py-4 rounded-2xl font-bold text-lg shadow-lg transition-transform hover:scale-105"
              style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)`, color: '#fff', boxShadow: `0 8px 30px ${DJ_ACCENT}40` }}
            >
              Request a Quote
            </button>
            <button
              onClick={() => openBookingForm('calendar')}
              className="px-8 py-4 rounded-2xl font-bold text-lg border transition-transform hover:scale-105"
              style={{ borderColor: DJ_ACCENT, color: DJ_ACCENT }}
            >
              Check Availability
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── WHY CHOOSE ── */}
      <div className="px-4 sm:px-6 py-12 max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8" style={{ color: DJ_TEXT }}>
          Why Choose <span style={{ color: DJ_ACCENT }}>Mask Off Da DJ?</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Clock, title: 'Always Early', desc: 'I arrive 30–45 minutes before the event to ensure everything is set up and ready before guests arrive.' },
            { icon: Headphones, title: 'Pro Equipment', desc: 'Professional DJ setup with wireless microphones and two 15-inch powered speaker monitors.' },
            { icon: Music, title: 'All Genres', desc: 'Extensive library covering Hip-Hop, R&B, Pop, Country, Gospel, Top 40, Old School, Dance, Latin & more.' },
            { icon: Star, title: 'Custom Playlists', desc: 'Every playlist is tailored specifically to your event, guests, and preferences.' },
            { icon: Users, title: 'Family Friendly', desc: 'Family-friendly or explicit music options — your call. Clean or turnt, we got you.' },
            { icon: Zap, title: 'Reliable & Pro', desc: 'Reliable communication, clean setup, and professional service from start to finish.' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl p-5"
              style={{ backgroundColor: DJ_CARD, border: `1px solid ${DJ_BORDER}` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${DJ_ACCENT}20` }}>
                <item.icon size={20} style={{ color: DJ_ACCENT }} />
              </div>
              <h3 className="font-bold mb-1.5" style={{ color: DJ_TEXT }}>{item.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: DJ_SUBTEXT }}>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── SERVICES ── */}
      <div className="px-4 sm:px-6 py-10 max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8" style={{ color: DJ_TEXT }}>Services</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            'Weddings', 'Birthday Parties', 'Corporate Events',
            'School Events', 'Private Parties', 'Community Events',
          ].map(s => (
            <div key={s} className="rounded-2xl p-4 text-center" style={{ backgroundColor: DJ_CARD, border: `1px solid ${DJ_BORDER}` }}>
              <Mic2 size={20} className="mx-auto mb-2" style={{ color: DJ_ACCENT }} />
              <p className="font-bold text-sm" style={{ color: DJ_TEXT }}>{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── EQUIPMENT ── */}
      <div className="px-4 sm:px-6 py-10 max-w-4xl mx-auto">
        <div className="rounded-2xl p-6" style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}15, ${DJ_CARD})`, border: `1px solid ${DJ_ACCENT}30` }}>
          <h2 className="text-xl font-bold mb-5" style={{ color: DJ_TEXT }}>What's Included in Every Booking</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Professional DJ setup',
              'Wireless microphones',
              'Two 15" powered speaker monitors',
              'High-quality sound system',
              '30–45 min early arrival & setup',
              'Extensive music library (all genres)',
              'Custom playlist tailored to your event',
              'Reliable, professional communication',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${DJ_GREEN}20` }}>
                  <Check size={11} style={{ color: DJ_GREEN }} />
                </div>
                <span className="text-sm" style={{ color: DJ_TEXT }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOOKING POSTERBOARD ── */}
      {scheduleEvents.length > 0 && (
        <div className="px-4 sm:px-6 py-10 max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: DJ_TEXT }}>
              Upcoming <span style={{ color: DJ_ACCENT }}>Schedule</span>
            </h2>
            <p className="text-sm" style={{ color: DJ_SUBTEXT }}>Confirmed upcoming events — follow the activity below.</p>
          </div>
          <div className="grid gap-3">
            {scheduleEvents.map(ev => {
              const evDate = ev.date ? new Date(ev.date + 'T00:00:00') : null
              const dateLabel = evDate ? evDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '—'
              const today2 = new Date(); today2.setHours(0,0,0,0)
              const daysAway = evDate ? Math.ceil((evDate.getTime() - today2.getTime()) / 86400000) : null
              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-4 rounded-2xl px-5 py-4"
                  style={{ backgroundColor: DJ_CARD, border: `1px solid ${DJ_BORDER}` }}
                >
                  <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}30, ${DJ_ACCENT}15)`, border: `1px solid ${DJ_ACCENT}40` }}>
                    <span className="text-xs font-bold uppercase" style={{ color: DJ_SUBTEXT }}>
                      {evDate ? evDate.toLocaleDateString('en-US', { month: 'short' }) : ''}
                    </span>
                    <span className="text-xl font-black leading-tight" style={{ color: DJ_ACCENT }}>
                      {evDate ? evDate.getDate() : '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-bold" style={{ color: DJ_TEXT }}>{ev.event_type}</p>
                      {daysAway !== null && daysAway >= 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${DJ_ACCENT}25`, color: DJ_ACCENT }}>
                          {daysAway === 0 ? 'Today!' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: DJ_SUBTEXT }}>
                      {dateLabel}{ev.city ? ` · ${ev.city}` : ''}
                      {(ev.start_time || ev.end_time) && ` · ${ev.start_time || ''} – ${ev.end_time || ''}`}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="px-3 py-1.5 rounded-xl text-xs font-bold"
                      style={{ backgroundColor: `${DJ_GREEN}20`, color: DJ_GREEN }}>
                      Booked
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MUSIC GENRES ── */}
      <div className="px-4 sm:px-6 py-8 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-center" style={{ color: DJ_TEXT }}>Music Genres</h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {['Hip-Hop', 'R&B', 'Pop', 'Country', 'Gospel', 'Top 40', 'Old School Classics', 'Dance', 'Latin', 'Custom Playlists'].map(g => (
            <span key={g} className="px-3 py-1.5 rounded-full text-sm font-semibold" style={{ backgroundColor: `${DJ_ACCENT}20`, color: DJ_ACCENT, border: `1px solid ${DJ_ACCENT}30` }}>{g}</span>
          ))}
        </div>
      </div>

      {/* ── BOOKING FORM SECTION ── */}
      <div id="quote" ref={formRef} className="px-4 sm:px-6 py-12 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2" style={{ color: DJ_TEXT }}>Request a Quote</h2>
          <p className="text-base" style={{ color: DJ_SUBTEXT }}>Simple, fast, and professional. Fill out the form below and I'll get back to you within 24 hours.</p>
        </div>

        {/* Step Indicator — only shown when not on home */}
        {step !== 'home' && (
          <div className="flex items-center gap-2 mb-8">
            {(['calendar', 'details', 'confirm'] as FormStep[]).map((s, i) => {
              const idx = ['calendar', 'details', 'confirm'].indexOf(step)
              const done = idx > i
              const active = step === s
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: active ? DJ_ACCENT : done ? `${DJ_ACCENT}40` : `${DJ_BORDER}80`,
                        color: active ? '#fff' : done ? DJ_ACCENT : DJ_SUBTEXT,
                      }}
                    >
                      {done ? <Check size={12} /> : i + 1}
                    </div>
                    <span className="text-xs font-semibold hidden sm:block" style={{ color: active ? DJ_TEXT : DJ_SUBTEXT }}>
                      {s === 'calendar' ? 'Pick Date' : s === 'details' ? 'Event Info' : 'Confirm'}
                    </span>
                  </div>
                  {i < 2 && <div className="flex-1 h-0.5 mx-2 rounded" style={{ backgroundColor: done ? DJ_ACCENT : DJ_BORDER }} />}
                </div>
              )
            })}
          </div>
        )}

        {/* Step: Home / CTA */}
        {step === 'home' && (
          <div className="text-center">
            <button
              onClick={() => setStep('calendar')}
              className="px-10 py-4 rounded-2xl font-bold text-lg"
              style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)`, color: '#fff', boxShadow: `0 8px 30px ${DJ_ACCENT}40` }}
            >
              Start Your Quote Request →
            </button>
          </div>
        )}

        {/* Step: Calendar */}
        {step === 'calendar' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <h3 className="text-xl font-bold" style={{ color: DJ_TEXT }}>Pick Your Event Date</h3>
            <CalendarPicker bookedDates={bookedDates} selectedDate={form.date} onSelect={d => f({ date: d })} />
            {form.date && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 p-4 rounded-2xl mb-4" style={{ backgroundColor: `${DJ_ACCENT}15`, border: `1px solid ${DJ_ACCENT}40` }}>
                  <Check size={18} style={{ color: DJ_ACCENT }} />
                  <div>
                    <p className="font-bold" style={{ color: DJ_TEXT }}>{selectedDateFormatted}</p>
                    <p className="text-sm" style={{ color: DJ_SUBTEXT }}>Available · Continue to fill in your event details</p>
                  </div>
                </div>
                <button
                  onClick={() => setStep('details')}
                  className="w-full py-4 rounded-xl font-bold text-base"
                  style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)`, color: '#fff' }}
                >
                  Next: Event Details →
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div>
              <h3 className="text-xl font-bold mb-1" style={{ color: DJ_TEXT }}>Event Details</h3>
              <p className="text-sm" style={{ color: DJ_SUBTEXT }}>Date: <span style={{ color: DJ_GOLD }}>{selectedDateFormatted}</span></p>
            </div>

            {/* Event Type */}
            <div>
              <label className="text-xs font-bold block mb-2 uppercase tracking-wider" style={{ color: DJ_SUBTEXT }}>Event Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => { f({ eventType: t, customEventType: '' }); setShowEventCustom(false) }}
                    className="px-3 py-3 rounded-xl text-sm font-semibold text-left transition-all"
                    style={{
                      backgroundColor: form.eventType === t && !form.customEventType ? `${DJ_ACCENT}20` : DJ_CARD,
                      border: `1px solid ${form.eventType === t && !form.customEventType ? DJ_ACCENT : DJ_BORDER}`,
                      color: form.eventType === t && !form.customEventType ? DJ_ACCENT : DJ_SUBTEXT,
                    }}
                  >
                    {t}
                  </button>
                ))}
                <button
                  onClick={() => { setShowEventCustom(true); f({ eventType: '' }) }}
                  className="px-3 py-3 rounded-xl text-sm font-semibold text-left transition-all col-span-2"
                  style={{
                    backgroundColor: showEventCustom ? `${DJ_GOLD}15` : DJ_CARD,
                    border: `1px solid ${showEventCustom ? DJ_GOLD : DJ_BORDER}`,
                    color: showEventCustom ? DJ_GOLD : DJ_SUBTEXT,
                  }}
                >
                  + Other (specify below)
                </button>
              </div>
              {showEventCustom && (
                <input
                  className={inputCls + ' mt-2'}
                  style={inputStyle}
                  placeholder="Describe your event type..."
                  value={form.customEventType}
                  onChange={e => f({ customEventType: e.target.value })}
                  autoFocus
                />
              )}
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1.5 uppercase tracking-wider" style={{ color: DJ_SUBTEXT }}>Start Time *</label>
                <input type="time" className={inputCls} style={inputStyle} value={form.startTime} onChange={e => f({ startTime: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1.5 uppercase tracking-wider" style={{ color: DJ_SUBTEXT }}>End Time *</label>
                <input type="time" className={inputCls} style={inputStyle} value={form.endTime} onChange={e => f({ endTime: e.target.value })} />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1.5 uppercase tracking-wider" style={{ color: DJ_SUBTEXT }}>Venue / Location Name</label>
                <input type="text" className={inputCls} style={inputStyle} placeholder="Venue or location name" value={form.location} onChange={e => f({ location: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1.5 uppercase tracking-wider" style={{ color: DJ_SUBTEXT }}>City *</label>
                <input type="text" className={inputCls} style={inputStyle} placeholder="Durham, Raleigh, etc." value={form.city} onChange={e => f({ city: e.target.value })} />
              </div>
            </div>

            {/* Guests */}
            <div>
              <label className="text-xs font-bold block mb-1.5 uppercase tracking-wider" style={{ color: DJ_SUBTEXT }}>Estimated Guest Count</label>
              <input type="number" className={inputCls} style={inputStyle} placeholder="50" value={form.guestCount} onChange={e => f({ guestCount: e.target.value })} />
            </div>

            {/* MC Services */}
            <div>
              <label className="text-xs font-bold block mb-2 uppercase tracking-wider" style={{ color: DJ_SUBTEXT }}>MC Services Needed?</label>
              <div className="flex gap-3">
                {(['No', 'Yes'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => f({ mcNeeded: v })}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                    style={{
                      background: form.mcNeeded === v ? (v === 'Yes' ? `${DJ_GOLD}20` : `${DJ_ACCENT}20`) : DJ_CARD,
                      border: `1px solid ${form.mcNeeded === v ? (v === 'Yes' ? DJ_GOLD : DJ_ACCENT) : DJ_BORDER}`,
                      color: form.mcNeeded === v ? (v === 'Yes' ? DJ_GOLD : DJ_ACCENT) : DJ_SUBTEXT,
                    }}
                  >
                    {v === 'Yes' ? 'Yes, include MC' : 'No MC needed'}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Requests */}
            <div>
              <label className="text-xs font-bold block mb-1.5 uppercase tracking-wider" style={{ color: DJ_SUBTEXT }}>Additional Notes / Special Requests</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 rounded-xl border text-sm resize-none outline-none"
                style={inputStyle}
                placeholder="Music genres, themes, announcements, special songs..."
                value={form.specialRequests}
                onChange={e => f({ specialRequests: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('calendar')} className="flex-1 py-4 rounded-xl font-bold border" style={{ borderColor: DJ_BORDER, color: DJ_SUBTEXT }}>← Back</button>
              <button
                onClick={() => setStep('confirm')}
                disabled={(!form.eventType && !form.customEventType) || !form.startTime || !form.endTime || !form.city}
                className="flex-[2] py-4 rounded-xl font-bold disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)`, color: '#fff' }}
              >
                Next: Your Info →
              </button>
            </div>
          </motion.div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div>
              <h3 className="text-xl font-bold mb-1" style={{ color: DJ_TEXT }}>Your Contact Info</h3>
              <p className="text-sm" style={{ color: DJ_SUBTEXT }}>Last step — I'll reach out to confirm and send pricing details.</p>
            </div>

            {/* Event Summary */}
            <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: `${DJ_ACCENT}10`, border: `1px solid ${DJ_ACCENT}30` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DJ_ACCENT }}>Event Summary</p>
              {[
                { icon: Calendar, label: 'Date', value: selectedDateFormatted },
                { icon: Clock, label: 'Time', value: form.startTime && form.endTime ? `${form.startTime} – ${form.endTime}` : 'TBD' },
                { icon: Music, label: 'Event', value: form.customEventType || form.eventType },
                { icon: MapPin, label: 'Location', value: `${form.location ? form.location + ', ' : ''}${form.city}` },
                { icon: Users, label: 'Guests', value: form.guestCount || 'Not specified' },
                { icon: Mic2, label: 'MC Services', value: form.mcNeeded },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3">
                  <row.icon size={14} style={{ color: DJ_SUBTEXT }} />
                  <span className="text-xs w-16 shrink-0" style={{ color: DJ_SUBTEXT }}>{row.label}:</span>
                  <span className="text-xs font-semibold" style={{ color: DJ_TEXT }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Contact fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1.5 uppercase tracking-wider" style={{ color: DJ_SUBTEXT }}>Full Name *</label>
                <input type="text" className={inputCls} style={inputStyle} placeholder="Your name" value={form.name} onChange={e => f({ name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1.5 uppercase tracking-wider" style={{ color: DJ_SUBTEXT }}>Phone Number *</label>
                <input type="tel" className={inputCls} style={inputStyle} placeholder="(919) 555-0123" value={form.phone} onChange={e => f({ phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1.5 uppercase tracking-wider" style={{ color: DJ_SUBTEXT }}>Email Address *</label>
                <input type="email" className={inputCls} style={inputStyle} placeholder="your@email.com" value={form.email} onChange={e => f({ email: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('details')} className="flex-1 py-4 rounded-xl font-bold border" style={{ borderColor: DJ_BORDER, color: DJ_SUBTEXT }}>← Back</button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.email || !form.phone || submitting}
                className="flex-[2] py-4 rounded-xl font-bold disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)`, color: '#fff' }}
              >
                {submitting ? 'Submitting...' : 'Submit Request →'}
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div className="px-6 py-10 text-center border-t" style={{ borderColor: DJ_BORDER }}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)` }}>
            <Mic2 size={20} color="#fff" />
          </div>
          <span className="text-xl font-black" style={{ color: DJ_TEXT }}>Mask Off <span style={{ color: DJ_ACCENT }}>Da DJ</span></span>
        </div>
        <p className="text-sm mb-4" style={{ color: DJ_SUBTEXT }}>Professional DJ services in the Durham/Raleigh area</p>
        <div className="flex items-center justify-center gap-6 text-sm" style={{ color: DJ_SUBTEXT }}>
          <a href="mailto:maskoffdadj@gmail.com" className="flex items-center gap-1.5 hover:opacity-80" style={{ color: DJ_ACCENT }}>
            <Mail size={14} /> maskoffdadj@gmail.com
          </a>
        </div>
        <p className="text-xs mt-6" style={{ color: `${DJ_SUBTEXT}60` }}>© 2025 Mask Off Da DJ · All rights reserved</p>
      </div>
    </div>
  )
}
