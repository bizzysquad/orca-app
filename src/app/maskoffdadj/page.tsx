'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { motion } from 'framer-motion'
import {
  Mic2, Calendar, ChevronLeft, ChevronRight, Check, Send,
  Sparkles, Clock, MapPin, Music, Users, Star, Mail,
} from 'lucide-react'

const DJ_ACCENT = '#6366F1'
const DJ_GOLD = '#F59E0B'
const DJ_DARK = '#070B14'
const DJ_CARD = '#0D1525'
const DJ_BORDER = '#1E2D4A'
const DJ_TEXT = '#F1F5F9'
const DJ_SUBTEXT = '#94A3B8'

// Blocked/booked dates will be fetched from the API
async function fetchBookedDates(): Promise<string[]> {
  try {
    const res = await fetch('/api/dj-availability')
    if (!res.ok) return []
    const data = await res.json()
    return data.bookedDates || []
  } catch {
    return []
  }
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type FormStep = 'calendar' | 'details' | 'quote' | 'confirm'

interface BookingForm {
  date: string
  startTime: string
  endTime: string
  eventType: string
  guestCount: string
  location: string
  city: string
  mcNeeded: string
  specialRequests: string
  name: string
  email: string
  phone: string
  budget: string
}

const BLANK_FORM: BookingForm = {
  date: '',
  startTime: '',
  endTime: '',
  eventType: '',
  guestCount: '',
  location: '',
  city: '',
  mcNeeded: 'No',
  specialRequests: '',
  name: '',
  email: '',
  phone: '',
  budget: '',
}

const EVENT_TYPES = [
  'Wedding', 'Corporate Event', 'Birthday Party', 'Private Party',
  'House Party', 'School Event', 'Apartment Community', 'Other',
]

function CalendarPicker({
  bookedDates,
  selectedDate,
  onSelect,
}: {
  bookedDates: string[]
  selectedDate: string
  onSelect: (date: string) => void
}) {
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const handleMonthChange = (dir: number) => {
    let m = month + dir
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m)
    setYear(y)
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
        key={d}
        disabled={disabled}
        onClick={() => !disabled && onSelect(dateStr)}
        className="aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all relative"
        style={{
          backgroundColor: isSelected
            ? DJ_ACCENT
            : isBooked
            ? `${DJ_ACCENT}18`
            : isToday
            ? `${DJ_GOLD}22`
            : 'transparent',
          color: isSelected
            ? '#fff'
            : disabled
            ? `${DJ_SUBTEXT}50`
            : isToday
            ? DJ_GOLD
            : DJ_TEXT,
          cursor: disabled ? 'not-allowed' : 'pointer',
          border: isToday && !isSelected ? `1px solid ${DJ_GOLD}60` : '1px solid transparent',
        }}
      >
        {d}
        {isBooked && !isPast && (
          <span className="absolute bottom-0.5 text-[7px] font-bold" style={{ color: '#EF4444' }}>BOOKED</span>
        )}
      </button>
    )
  }

  return (
    <div className="rounded-2xl p-5 w-full" style={{ backgroundColor: DJ_CARD, border: `1px solid ${DJ_BORDER}` }}>
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => handleMonthChange(-1)}
          className="p-2 rounded-xl transition-colors"
          style={{ color: DJ_SUBTEXT }}
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-bold" style={{ color: DJ_TEXT }}>{monthName}</h3>
        <button
          onClick={() => handleMonthChange(1)}
          className="p-2 rounded-xl transition-colors"
          style={{ color: DJ_SUBTEXT }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold py-1" style={{ color: DJ_SUBTEXT }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{cells}</div>

      <div className="flex gap-4 mt-4 pt-3 border-t" style={{ borderColor: DJ_BORDER }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DJ_ACCENT }} />
          <span className="text-[10px]" style={{ color: DJ_SUBTEXT }}>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
          <span className="text-[10px]" style={{ color: DJ_SUBTEXT }}>Already Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DJ_GOLD }} />
          <span className="text-[10px]" style={{ color: DJ_SUBTEXT }}>Today</span>
        </div>
      </div>
    </div>
  )
}

export default function MaskOffBookingPage() {
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [step, setStep] = useState<FormStep>('calendar')
  const [form, setForm] = useState<BookingForm>(BLANK_FORM)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchBookedDates().then(setBookedDates)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: userMsg }]
    setChatMessages(newMessages)
    setChatLoading(true)

    try {
      const res = await fetch('/api/bentley', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: `You are MaskOff DJ's booking assistant on the public booking page. The customer is inquiring about booking a DJ for an event. Help them understand pricing, availability, and services. Be professional, friendly, and informative. Current form data: ${JSON.stringify(form)}`,
        }),
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.message || 'I\'m here to help you book your perfect event!' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I\'m having trouble connecting right now. Please try again or use the booking form below.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleSubmitBooking = async () => {
    if (!form.name || !form.email || !form.date || !form.eventType) return
    setSubmitting(true)
    try {
      await fetch('/api/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true) // Still show confirmation even if API fails
    } finally {
      setSubmitting(false)
    }
  }

  const selectedDateFormatted = form.date
    ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: DJ_DARK }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)` }}>
            <Check size={36} color="#fff" />
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ color: DJ_TEXT }}>Request Sent!</h2>
          <p className="text-lg mb-2" style={{ color: DJ_SUBTEXT }}>
            Your booking request for{' '}
            <span style={{ color: DJ_GOLD }}>{selectedDateFormatted}</span>{' '}
            has been submitted.
          </p>
          <p className="text-sm mb-8" style={{ color: DJ_SUBTEXT }}>
            We'll review your request and get back to you within 24 hours. Check your email for confirmation.
          </p>
          <button
            onClick={() => { setSubmitted(false); setStep('calendar'); setForm(BLANK_FORM) }}
            className="px-8 py-3 rounded-xl font-bold"
            style={{ backgroundColor: DJ_ACCENT, color: '#fff' }}
          >
            Book Another Date
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: DJ_DARK, color: DJ_TEXT }}>
      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 py-14 sm:py-20 text-center"
        style={{ background: `linear-gradient(180deg, ${DJ_ACCENT}30 0%, ${DJ_DARK} 100%)` }}
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)` }}
          >
            <Mic2 size={38} color="#fff" />
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-3" style={{ color: DJ_TEXT }}>
            MaskOff <span style={{ color: DJ_ACCENT }}>DJ</span>
          </h1>
          <p className="text-lg sm:text-xl font-medium mb-6" style={{ color: DJ_SUBTEXT }}>
            Professional DJ services for every occasion
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            {['Weddings', 'Corporate Events', 'Private Parties', 'School Events'].map(t => (
              <span key={t} className="px-3 py-1.5 rounded-full font-semibold" style={{ backgroundColor: `${DJ_ACCENT}20`, color: DJ_ACCENT }}>
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Services */}
      <div className="px-4 sm:px-6 py-8 max-w-3xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { icon: Music, label: '5+ Years', sub: 'Experience' },
            { icon: Users, label: 'All Sizes', sub: 'Events' },
            { icon: MapPin, label: 'Durham/Raleigh', sub: 'Area' },
            { icon: Star, label: '5-Star', sub: 'Rated' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-4 text-center" style={{ backgroundColor: DJ_CARD, border: `1px solid ${DJ_BORDER}` }}>
              <s.icon size={22} className="mx-auto mb-2" style={{ color: DJ_ACCENT }} />
              <p className="font-bold text-sm" style={{ color: DJ_TEXT }}>{s.label}</p>
              <p className="text-xs" style={{ color: DJ_SUBTEXT }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Booking Steps */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {(['calendar', 'details', 'quote', 'confirm'] as FormStep[]).map((s, i) => (
              <Fragment key={s}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    backgroundColor: step === s ? DJ_ACCENT : ['calendar', 'details', 'quote', 'confirm'].indexOf(step) > i ? `${DJ_ACCENT}40` : `${DJ_BORDER}80`,
                    color: step === s ? '#fff' : ['calendar', 'details', 'quote', 'confirm'].indexOf(step) > i ? DJ_ACCENT : DJ_SUBTEXT,
                  }}
                >
                  {['calendar', 'details', 'quote', 'confirm'].indexOf(step) > i ? <Check size={12} /> : i + 1}
                </div>
                {i < 3 && <div className="flex-1 h-0.5 rounded" style={{ backgroundColor: ['calendar', 'details', 'quote', 'confirm'].indexOf(step) > i ? DJ_ACCENT : DJ_BORDER }} />}
              </Fragment>
            ))}
          </div>
          <div className="flex justify-between text-[10px] font-semibold" style={{ color: DJ_SUBTEXT }}>
            <span>Pick Date</span>
            <span>Event Details</span>
            <span>Get Quote</span>
            <span>Confirm</span>
          </div>
        </div>

        {/* Step: Calendar */}
        {step === 'calendar' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <h2 className="text-2xl font-bold" style={{ color: DJ_TEXT }}>Pick Your Event Date</h2>
            <CalendarPicker
              bookedDates={bookedDates}
              selectedDate={form.date}
              onSelect={date => setForm(f => ({ ...f, date }))}
            />
            {form.date && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-3 p-4 rounded-2xl mb-4" style={{ backgroundColor: `${DJ_ACCENT}15`, border: `1px solid ${DJ_ACCENT}40` }}>
                  <Check size={18} style={{ color: DJ_ACCENT }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: DJ_TEXT }}>{selectedDateFormatted}</p>
                    <p className="text-xs" style={{ color: DJ_SUBTEXT }}>Available · Tap "Next" to continue</p>
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
              <h2 className="text-2xl font-bold mb-1" style={{ color: DJ_TEXT }}>Event Details</h2>
              <p className="text-sm" style={{ color: DJ_SUBTEXT }}>
                Selected: <span style={{ color: DJ_GOLD }}>{selectedDateFormatted}</span>
              </p>
            </div>

            <div className="space-y-4">
              {/* Event Type */}
              <div>
                <label className="text-xs font-bold block mb-2" style={{ color: DJ_SUBTEXT }}>Event Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {EVENT_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, eventType: t }))}
                      className="px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all"
                      style={{
                        backgroundColor: form.eventType === t ? `${DJ_ACCENT}20` : DJ_CARD,
                        borderColor: form.eventType === t ? DJ_ACCENT : DJ_BORDER,
                        border: `1px solid ${form.eventType === t ? DJ_ACCENT : DJ_BORDER}`,
                        color: form.eventType === t ? DJ_ACCENT : DJ_SUBTEXT,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: DJ_SUBTEXT }}>Start Time *</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border text-sm font-medium"
                    style={{ backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: DJ_SUBTEXT }}>End Time *</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border text-sm font-medium"
                    style={{ backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: DJ_SUBTEXT }}>Venue Name</label>
                  <input
                    type="text"
                    placeholder="Venue or location name"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border text-sm"
                    style={{ backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: DJ_SUBTEXT }}>City *</label>
                  <input
                    type="text"
                    placeholder="Durham, Raleigh, etc."
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border text-sm"
                    style={{ backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }}
                  />
                </div>
              </div>

              {/* Guests + MC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: DJ_SUBTEXT }}>Estimated Guests</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={form.guestCount}
                    onChange={e => setForm(f => ({ ...f, guestCount: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border text-sm"
                    style={{ backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: DJ_SUBTEXT }}>MC Services?</label>
                  <select
                    value={form.mcNeeded}
                    onChange={e => setForm(f => ({ ...f, mcNeeded: e.target.value }))}
                    className="w-full px-3 py-3 rounded-xl border text-sm"
                    style={{ backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes (+fee)</option>
                  </select>
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: DJ_SUBTEXT }}>Your Budget Range</label>
                <select
                  value={form.budget}
                  onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                  className="w-full px-3 py-3 rounded-xl border text-sm"
                  style={{ backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }}
                >
                  <option value="">Select a range...</option>
                  <option value="under-500">Under $500</option>
                  <option value="500-800">$500 – $800</option>
                  <option value="800-1200">$800 – $1,200</option>
                  <option value="1200-1800">$1,200 – $1,800</option>
                  <option value="1800-2500">$1,800 – $2,500</option>
                  <option value="2500+">$2,500+</option>
                </select>
              </div>

              {/* Special Requests */}
              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: DJ_SUBTEXT }}>Special Requests</label>
                <textarea
                  rows={3}
                  placeholder="Specific music genres, karaoke, themed music, announcements, etc."
                  value={form.specialRequests}
                  onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))}
                  className="w-full px-3 py-3 rounded-xl border text-sm resize-none"
                  style={{ backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('calendar')}
                className="flex-1 py-4 rounded-xl font-bold border"
                style={{ borderColor: DJ_BORDER, color: DJ_SUBTEXT }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('quote')}
                disabled={!form.eventType || !form.startTime || !form.endTime || !form.city}
                className="flex-[2] py-4 rounded-xl font-bold disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)`, color: '#fff' }}
              >
                Get Your Quote →
              </button>
            </div>
          </motion.div>
        )}

        {/* Step: Quote — AI Chat with Bentley */}
        {step === 'quote' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold mb-1" style={{ color: DJ_TEXT }}>Get Your Quote</h2>
              <p className="text-sm" style={{ color: DJ_SUBTEXT }}>
                Chat with our AI assistant to get a custom quote for your event
              </p>
            </div>

            {/* Event summary */}
            <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: DJ_CARD, border: `1px solid ${DJ_BORDER}` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DJ_ACCENT }}>Event Summary</p>
              {[
                { icon: Calendar, label: 'Date', value: selectedDateFormatted },
                { icon: Clock, label: 'Time', value: `${form.startTime} – ${form.endTime}` },
                { icon: Music, label: 'Event', value: form.eventType },
                { icon: MapPin, label: 'Location', value: `${form.location ? form.location + ', ' : ''}${form.city}` },
                { icon: Users, label: 'Guests', value: form.guestCount || 'Not specified' },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3">
                  <row.icon size={14} style={{ color: DJ_SUBTEXT }} />
                  <span className="text-xs" style={{ color: DJ_SUBTEXT }}>{row.label}:</span>
                  <span className="text-xs font-semibold" style={{ color: DJ_TEXT }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Chat */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${DJ_BORDER}` }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: DJ_CARD, borderBottom: `1px solid ${DJ_BORDER}` }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${DJ_GOLD}, #D97706)` }}>
                  <Sparkles size={13} color="#fff" />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: DJ_TEXT }}>Booking Assistant</p>
                  <p className="text-[10px]" style={{ color: DJ_SUBTEXT }}>Powered by AI</p>
                </div>
              </div>

              <div className="p-4 space-y-3 min-h-[200px] max-h-[320px] overflow-y-auto" style={{ backgroundColor: `${DJ_DARK}80` }}>
                {chatMessages.length === 0 && (
                  <div className="text-center py-6">
                    <Sparkles size={28} className="mx-auto mb-3" style={{ color: `${DJ_GOLD}60` }} />
                    <p className="text-sm font-medium mb-2" style={{ color: DJ_SUBTEXT }}>
                      Hi! I'm your booking assistant.
                    </p>
                    <p className="text-xs" style={{ color: `${DJ_SUBTEXT}80` }}>
                      Ask me about pricing, what's included, or any questions about your event!
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                      style={{
                        backgroundColor: msg.role === 'user' ? DJ_ACCENT : DJ_CARD,
                        color: DJ_TEXT,
                        borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        border: msg.role === 'assistant' ? `1px solid ${DJ_BORDER}` : 'none',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-2xl" style={{ backgroundColor: DJ_CARD, border: `1px solid ${DJ_BORDER}` }}>
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-full animate-bounce"
                            style={{ backgroundColor: DJ_GOLD, animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3" style={{ backgroundColor: DJ_CARD, borderTop: `1px solid ${DJ_BORDER}` }}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask about pricing, availability, services..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm border"
                    style={{ backgroundColor: DJ_DARK, borderColor: DJ_BORDER, color: DJ_TEXT }}
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || chatLoading}
                    className="p-2.5 rounded-xl disabled:opacity-40"
                    style={{ backgroundColor: DJ_ACCENT, color: '#fff' }}
                  >
                    <Send size={16} />
                  </button>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[
                    'What\'s your pricing?',
                    'What\'s included?',
                    'Do you travel?',
                    'How do I book?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q); }}
                      className="px-2.5 py-1 rounded-full text-xs border transition-colors hover:border-indigo-500"
                      style={{ borderColor: DJ_BORDER, color: DJ_SUBTEXT }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('details')}
                className="flex-1 py-4 rounded-xl font-bold border"
                style={{ borderColor: DJ_BORDER, color: DJ_SUBTEXT }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                className="flex-[2] py-4 rounded-xl font-bold"
                style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)`, color: '#fff' }}
              >
                Continue to Book →
              </button>
            </div>
          </motion.div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <h2 className="text-2xl font-bold" style={{ color: DJ_TEXT }}>Your Info</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: DJ_SUBTEXT }}>Your Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: DJ_SUBTEXT }}>Email *</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1.5" style={{ color: DJ_SUBTEXT }}>Phone</label>
                <input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ backgroundColor: DJ_CARD, borderColor: DJ_BORDER, color: DJ_TEXT }}
                />
              </div>
            </div>

            {/* Booking summary */}
            <div className="rounded-2xl p-5" style={{ backgroundColor: DJ_CARD, border: `1px solid ${DJ_BORDER}` }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: DJ_GOLD }}>Booking Summary</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Event Date', value: selectedDateFormatted },
                  { label: 'Time', value: `${form.startTime} – ${form.endTime}` },
                  { label: 'Event Type', value: form.eventType },
                  { label: 'Location', value: `${form.location ? form.location + ', ' : ''}${form.city}` },
                  { label: 'Guests', value: form.guestCount || '—' },
                  { label: 'MC Services', value: form.mcNeeded },
                  { label: 'Budget', value: form.budget || 'Not specified' },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span style={{ color: DJ_SUBTEXT }}>{row.label}</span>
                    <span className="font-semibold text-right max-w-[60%]" style={{ color: DJ_TEXT }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-center" style={{ color: DJ_SUBTEXT }}>
              By submitting, you'll receive a confirmation email and we'll follow up within 24 hours to finalize your booking.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('quote')}
                className="flex-1 py-4 rounded-xl font-bold border"
                style={{ borderColor: DJ_BORDER, color: DJ_SUBTEXT }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmitBooking}
                disabled={!form.name || !form.email || submitting}
                className="flex-[2] py-4 rounded-xl font-bold disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${DJ_ACCENT}, #4F46E5)`, color: '#fff' }}
              >
                {submitting ? 'Sending...' : '✓ Submit Booking Request'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t text-center" style={{ borderColor: DJ_BORDER }}>
          <p className="text-sm font-bold mb-1" style={{ color: DJ_TEXT }}>MaskOff DJ</p>
          <p className="text-xs mb-4" style={{ color: DJ_SUBTEXT }}>Durham / Raleigh, NC · Available for travel</p>
          <div className="flex justify-center gap-6 text-xs" style={{ color: DJ_SUBTEXT }}>
            <a href="mailto:booking@maskoffdj.com" className="flex items-center gap-1.5 hover:opacity-80">
              <Mail size={12} /> booking@maskoffdj.com
            </a>
          </div>
          <p className="text-[10px] mt-6 opacity-40" style={{ color: DJ_SUBTEXT }}>
            Powered by ORCA · Professional DJ Management System
          </p>
        </div>
      </div>
    </div>
  )
}
