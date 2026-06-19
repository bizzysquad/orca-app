'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, ArrowRight, Check, CheckCircle2,
  Loader2, Mail, MapPin, Calendar, Users, Mic2, Music2, Star,
} from 'lucide-react'

const C = {
  bg: '#F8FAFC',
  white: '#FFFFFF',
  navy: '#0F172A',
  text: '#1E293B',
  muted: '#64748B',
  border: '#E2E8F0',
  blueAccent: '#2563EB',
  blueLight: '#EFF6FF',
  gold: '#B45309',
  goldLight: '#FEF3C7',
  green: '#15803D',
  greenBg: '#F0FDF4',
  red: '#B91C1C',
  redBg: '#FFF1F2',
}

interface BookingForm {
  client_name: string
  client_email: string
  client_phone: string
  event_type: string
  date: string
  city: string
  location: string
  start_time: string
  end_time: string
  guest_count: string
  mc_needed: boolean
  special_requests: string
  budget_range: string
}

type Step = 'home' | 'calendar' | 'form' | 'confirm' | 'success'

const BLANK_FORM = (): BookingForm => ({
  client_name: '',
  client_email: '',
  client_phone: '',
  event_type: '',
  date: '',
  city: '',
  location: '',
  start_time: '',
  end_time: '',
  guest_count: '',
  mc_needed: false,
  special_requests: '',
  budget_range: '',
})

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EVENT_TYPES = [
  'Wedding', 'Birthday Party', 'Corporate Event', 'Graduation Party',
  'Private Party', 'Club / Nightclub', 'School Dance', 'Holiday Party',
]

const BUDGET_RANGES = [
  'Under $500', '$500–$750', '$750–$1,000', '$1,000–$1,500', '$1,500+', 'Flexible / Open to Discuss',
]

// ── Input style helpers ──────────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: 14,
  borderRadius: 8,
  border: `1.5px solid ${C.border}`,
  backgroundColor: C.white,
  color: C.text,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: C.text,
  marginBottom: 6,
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MaskOffDJPage() {
  const [step, setStep] = useState<Step>('home')
  const [form, setForm] = useState<BookingForm>(BLANK_FORM())
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [formError, setFormError] = useState('')

  const [upcomingGigs, setUpcomingGigs] = useState<{ date: string; venue: string; city: string; eventType: string }[]>([])

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetch('/api/dj/schedule')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        const gigs = (d.gigs || [])
          .filter((g: any) => g.status === 'confirmed' && g.date >= today)
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
          .slice(0, 12)
          .map((g: any) => ({ date: g.date, venue: g.venue || '', city: g.city || '', eventType: g.eventType || g.event_type || '' }))
        setUpcomingGigs(gigs)
      })
      .catch(() => {})
  }, [today])

  const fetchAvailability = useCallback(async () => {
    setLoadingAvail(true)
    try {
      const [availRes, schedRes] = await Promise.all([
        fetch('/api/dj-availability'),
        fetch('/api/dj/schedule'),
      ])
      const blocked: string[] = []
      if (availRes.ok) {
        const data = await availRes.json()
        blocked.push(...(data.booked || []), ...(data.blocked || []))
      }
      if (schedRes.ok) {
        const sd = await schedRes.json()
        const gigBlocked = (sd.gigs || [])
          .filter((g: any) => ['confirmed', 'dj_blocked'].includes(g.status))
          .map((g: any) => g.date)
        blocked.push(...gigBlocked)
      }
      setBookedDates(Array.from(new Set(blocked)))
    } catch {}
    setLoadingAvail(false)
  }, [])

  useEffect(() => {
    if (step === 'calendar') fetchAvailability()
  }, [step, fetchAvailability])

  const setF = (patch: Partial<BookingForm>) => setForm(p => ({ ...p, ...patch }))

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Submission failed. Please try again.')
      setStep('success')
    } catch (e: any) {
      setSubmitError(e.message)
    }
    setSubmitting(false)
  }

  const formattedDate = form.date
    ? new Date(form.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : ''

  // ── NAV ─────────────────────────────────────────────────────────────────────
  const Nav = () => (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      backgroundColor: C.white,
      borderBottom: `1px solid ${C.border}`,
      height: 64,
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '0 24px',
        height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <button
          onClick={() => setStep('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 6,
            backgroundColor: C.navy,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: C.gold, fontWeight: 900, fontSize: 16, lineHeight: 1 }}>M</span>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.navy, lineHeight: 1.1 }}>MASK OFF</div>
            <div style={{ fontWeight: 700, fontSize: 12, color: C.gold, lineHeight: 1.1 }}>Da DJ</div>
          </div>
        </button>

        {/* Right nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="#services" style={{ fontSize: 14, fontWeight: 600, color: C.muted, textDecoration: 'none' }}>Services</a>
          <a href="#about" style={{ fontSize: 14, fontWeight: 600, color: C.muted, textDecoration: 'none' }}>About</a>
          <a href="mailto:maskoffdadj@gmail.com" style={{ fontSize: 14, fontWeight: 600, color: C.muted, textDecoration: 'none' }}>Contact</a>
          <button
            onClick={() => setStep('calendar')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px', borderRadius: 8,
              backgroundColor: C.navy, color: C.white,
              border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700,
            }}
          >
            Book a Date <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </nav>
  )

  // ── HOME STEP ────────────────────────────────────────────────────────────────
  const HomeStep = () => (
    <div style={{ backgroundColor: C.bg }}>
      {/* Hero */}
      <div style={{
        backgroundColor: C.white,
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          maxWidth: 680, margin: '0 auto',
        }}>
          <div style={{
            display: 'inline-block',
            fontSize: 11, fontWeight: 700,
            color: C.gold, letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            backgroundColor: C.goldLight,
            padding: '4px 12px', borderRadius: 100,
            marginBottom: 20,
          }}>
            Professional DJ Services
          </div>

          <h1 style={{
            fontSize: 52, fontWeight: 900, color: C.navy,
            lineHeight: 1.1, margin: '0 0 20px',
            letterSpacing: '-0.02em',
          }}>
            Every Event Deserves<br />Great Music.
          </h1>

          <p style={{
            fontSize: 18, color: C.muted, lineHeight: 1.7,
            margin: '0 0 36px',
          }}>
            Serving weddings, corporate events, birthdays, and private parties
            across the Durham &amp; Raleigh area.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            <button
              onClick={() => setStep('calendar')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 10,
                backgroundColor: C.navy, color: C.white,
                border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 700,
              }}
            >
              Check My Availability <ArrowRight size={18} />
            </button>
            <a
              href="#services"
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '14px 28px', borderRadius: 10,
                backgroundColor: C.white, color: C.navy,
                border: `2px solid ${C.border}`,
                fontSize: 16, fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              View Services
            </a>
          </div>

          {/* Stats pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 0,
            marginTop: 40,
            backgroundColor: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 100, overflow: 'hidden',
          }}>
            {['Weddings & Birthdays', 'Corporate Events', 'Durham / Raleigh NC'].map((label, i) => (
              <span key={label} style={{
                padding: '8px 20px',
                fontSize: 13, fontWeight: 600, color: C.muted,
                borderRight: i < 2 ? `1px solid ${C.border}` : 'none',
              }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Services section */}
      <div id="services" style={{ backgroundColor: C.bg, padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.navy, margin: '0 0 12px' }}>What I Do</h2>
            <p style={{ fontSize: 16, color: C.muted, margin: 0 }}>
              Professional DJ services tailored to your event, your crowd, and your vision.
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}>
            {[
              { emoji: '💍', title: 'Wedding', desc: 'Set the perfect tone for your big day with curated music that keeps guests on the dance floor all night.' },
              { emoji: '🎂', title: 'Birthday Party', desc: 'From intimate gatherings to big milestone celebrations, I bring the energy that makes birthdays unforgettable.' },
              { emoji: '🏢', title: 'Corporate Event', desc: 'Professional atmosphere with great music for company parties, mixers, and team celebrations.' },
              { emoji: '🎓', title: 'Graduation Party', desc: 'Celebrate your achievement with a party soundtrack that keeps the celebration going.' },
              { emoji: '🎉', title: 'Private Party', desc: 'Whatever the occasion, I bring the sound system and the skills to make your private event a hit.' },
              { emoji: '🎵', title: 'Club / Nightclub', desc: 'High-energy sets that keep the crowd moving and the vibe electric all night long.' },
            ].map(svc => (
              <div key={svc.title} style={{
                backgroundColor: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 24,
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{svc.emoji}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 8 }}>{svc.title}</div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{svc.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div id="about" style={{ backgroundColor: C.white, padding: '64px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.navy, margin: '0 0 12px' }}>How It Works</h2>
            <p style={{ fontSize: 16, color: C.muted, margin: 0 }}>
              Booking your DJ is simple. Here's what to expect.
            </p>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 32,
          }}>
            {[
              { num: 1, title: 'Check Availability', desc: 'Browse the calendar to see which dates are open. No account needed — just pick your date.' },
              { num: 2, title: 'Submit Your Request', desc: 'Fill out the booking form with your event details, preferences, and contact info.' },
              { num: 3, title: "We'll Confirm & Connect", desc: "You'll hear back within 24–48 hours to discuss details, pricing, and lock in your date." },
            ].map(s => (
              <div key={s.num} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  backgroundColor: C.navy, color: C.white,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800,
                  margin: '0 auto 16px',
                }}>
                  {s.num}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.navy, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <button
              onClick={() => setStep('calendar')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 32px', borderRadius: 10,
                backgroundColor: C.navy, color: C.white,
                border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 700,
              }}
            >
              Get Started <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Poster Board — Tour Dates */}
      {upcomingGigs.length > 0 && (
        <div style={{ backgroundColor: C.navy, padding: '72px 24px' }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              fontSize: 11, fontWeight: 700,
              color: C.gold, letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              marginBottom: 12,
            }}>
              ★ Upcoming Events ★
            </div>

            <h2 style={{
              fontSize: 42, fontWeight: 900, color: C.white,
              lineHeight: 1.1, margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}>
              MASK OFF DA DJ
            </h2>
            <p style={{ fontSize: 18, color: C.gold, fontWeight: 700, margin: '0 0 40px', letterSpacing: '0.1em' }}>
              LIVE DATES
            </p>

            <div style={{ borderTop: `1px solid #334155`, paddingTop: 0 }}>
              {upcomingGigs.map((g, i) => {
                const d = new Date(g.date + 'T00:00:00')
                const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
                const day = d.getDate()
                const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 20,
                    padding: '20px 0',
                    borderBottom: `1px solid #334155`,
                  }}>
                    <div style={{ textAlign: 'center', minWidth: 64 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: '0.08em' }}>{month}</div>
                      <div style={{ fontSize: 32, fontWeight: 900, color: C.white, lineHeight: 1 }}>{day}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>{weekday}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>
                        {g.eventType || 'Private Event'}
                      </div>
                      {(g.venue || g.city) && (
                        <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} />
                          {[g.venue, g.city].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div style={{
                      padding: '4px 12px', borderRadius: 100,
                      border: `1px solid ${C.gold}`,
                      fontSize: 11, fontWeight: 700, color: C.gold,
                      letterSpacing: '0.06em',
                    }}>
                      BOOKED
                    </div>
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => setStep('calendar')}
              style={{
                marginTop: 40,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 32px', borderRadius: 10,
                backgroundColor: C.gold, color: C.navy,
                border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 800,
              }}
            >
              Check My Availability <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        backgroundColor: upcomingGigs.length > 0 ? '#020617' : C.navy,
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 6,
            backgroundColor: C.gold,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: C.navy, fontWeight: 900, fontSize: 16 }}>M</span>
          </div>
          <span style={{ color: C.white, fontWeight: 800, fontSize: 18 }}>MASK OFF <span style={{ color: C.gold }}>Da DJ</span></span>
        </div>
        <p style={{ color: '#94A3B8', fontSize: 14, margin: '0 0 16px' }}>
          Professional DJ services in the Durham / Raleigh area
        </p>
        <a
          href="mailto:maskoffdadj@gmail.com"
          style={{ color: C.gold, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Mail size={14} /> maskoffdadj@gmail.com
        </a>
        <p style={{ color: '#475569', fontSize: 12, margin: '24px 0 0' }}>
          © 2025 Mask Off Da DJ · All rights reserved
        </p>
      </div>
    </div>
  )

  // ── CALENDAR STEP ────────────────────────────────────────────────────────────
  const CalendarStep = () => {
    const nowYear = new Date().getFullYear()
    const nowMonth = new Date().getMonth()
    const maxYear = nowYear + 1
    const maxMonth = nowMonth === 0 ? 11 : nowMonth - 1

    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const firstDay = new Date(calYear, calMonth, 1).getDay()

    const prevMonth = () => {
      if (calYear === nowYear && calMonth === nowMonth) return
      if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
      else setCalMonth(m => m - 1)
    }

    const nextMonth = () => {
      const nextIsOver = calYear > nowYear + 1 || (calYear === nowYear + 1 && calMonth >= 5)
      if (nextIsOver) return
      if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
      else setCalMonth(m => m + 1)
    }

    const isPrevDisabled = calYear === nowYear && calMonth === nowMonth

    const cells: React.ReactNode[] = []
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`blank-${i}`} />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isPast = dateStr < today
      const isBooked = bookedDates.includes(dateStr)
      const isSelected = dateStr === form.date
      const isToday = dateStr === today
      const disabled = isPast || isBooked

      let cellStyle: React.CSSProperties = {
        width: '100%',
        aspectRatio: '1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 500,
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: '1px solid transparent',
        transition: 'all 0.12s',
        position: 'relative',
        background: 'none',
        fontFamily: 'inherit',
      }

      if (isSelected) {
        cellStyle = { ...cellStyle, backgroundColor: C.blueAccent, color: C.white }
      } else if (isBooked) {
        cellStyle = { ...cellStyle, backgroundColor: C.redBg, color: C.red, textDecoration: 'line-through' }
      } else if (isPast) {
        cellStyle = { ...cellStyle, color: '#CBD5E1', cursor: 'not-allowed' }
      } else if (isToday) {
        cellStyle = { ...cellStyle, color: C.gold, border: `2px solid ${C.gold}`, backgroundColor: C.white }
      } else {
        cellStyle = { ...cellStyle, color: C.text, border: `1px solid ${C.border}`, backgroundColor: C.white }
      }

      cells.push(
        <button
          key={dateStr}
          disabled={disabled}
          title={isBooked ? 'Unavailable' : undefined}
          onClick={() => { if (!disabled) setF({ date: dateStr }) }}
          style={cellStyle}
        >
          {day}
        </button>
      )
    }

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button
            onClick={() => setStep('home')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, fontSize: 14, fontWeight: 600,
              marginBottom: 16, padding: 0,
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, margin: '0 0 6px' }}>Select Your Date</h2>
          <p style={{ fontSize: 15, color: C.muted, margin: 0 }}>Tap a date to start your booking request</p>
        </div>

        {loadingAvail ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted }}>
            <Loader2 size={28} style={{ display: 'block', margin: '0 auto 12px', animation: 'spin 1s linear infinite', color: C.blueAccent }} />
            Loading availability...
          </div>
        ) : (
          <>
            {/* Month navigator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <button
                onClick={prevMonth}
                disabled={isPrevDisabled}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  backgroundColor: C.white, color: isPrevDisabled ? C.border : C.text,
                  cursor: isPrevDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 14, fontWeight: 600,
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>
                {MONTHS[calMonth]} {calYear}
              </span>
              <button
                onClick={nextMonth}
                style={{
                  padding: '8px 14px', borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  backgroundColor: C.white, color: C.text,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 14, fontWeight: 600,
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Calendar card */}
            <div style={{
              backgroundColor: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 20,
            }}>
              {/* Day labels */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                {DAYS.map(d => (
                  <div key={d} style={{
                    textAlign: 'center', fontSize: 11, fontWeight: 700,
                    color: C.muted, padding: '4px 0', textTransform: 'uppercase' as const,
                    letterSpacing: '0.05em',
                  }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {cells}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' as const }}>
              {[
                { color: C.green, label: 'Available' },
                { color: C.red, label: 'Unavailable' },
                { color: C.blueAccent, label: 'Selected' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: l.color }} />
                  <span style={{ fontSize: 13, color: C.muted }}>{l.label}</span>
                </div>
              ))}
            </div>

            {/* Continue CTA */}
            {form.date && (
              <div style={{ marginTop: 28 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 18px', borderRadius: 10,
                  backgroundColor: C.blueLight, border: `1px solid ${C.blueAccent}`,
                  marginBottom: 16,
                }}>
                  <Check size={18} color={C.blueAccent} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.blueAccent }}>{formattedDate}</div>
                    <div style={{ fontSize: 13, color: C.muted }}>Date selected — continue to fill in details</div>
                  </div>
                </div>
                <button
                  onClick={() => setStep('form')}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 10,
                    backgroundColor: C.navy, color: C.white,
                    border: 'none', cursor: 'pointer',
                    fontSize: 16, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  Continue to Event Details <ArrowRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── FORM STEP ────────────────────────────────────────────────────────────────
  const FormStep = () => {
    const handleContinue = () => {
      if (!form.client_name || !form.client_email || !form.event_type || !form.city) {
        setFormError('Please fill in all required fields.')
        return
      }
      setFormError('')
      setStep('confirm')
    }

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => setStep('calendar')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, fontSize: 14, fontWeight: 600,
              marginBottom: 16, padding: 0,
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, margin: '0 0 10px' }}>Event Details</h2>
          {form.date && (
            <span style={{
              display: 'inline-block',
              fontSize: 13, fontWeight: 600, color: C.blueAccent,
              backgroundColor: C.blueLight, padding: '4px 12px', borderRadius: 100,
            }}>
              <Calendar size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              {formattedDate}
            </span>
          )}
        </div>

        {/* Form card */}
        <div style={{
          backgroundColor: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 28,
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 20 }}>
            {/* Full Name */}
            <div style={{ flex: '1 1 260px' }}>
              <label style={labelStyle}>Full Name <span style={{ color: C.red }}>*</span></label>
              <input
                type="text"
                value={form.client_name}
                onChange={e => setF({ client_name: e.target.value })}
                placeholder="Your full name"
                style={inputBase}
              />
            </div>

            {/* Email */}
            <div style={{ flex: '1 1 260px' }}>
              <label style={labelStyle}>Email Address <span style={{ color: C.red }}>*</span></label>
              <input
                type="email"
                value={form.client_email}
                onChange={e => setF({ client_email: e.target.value })}
                placeholder="you@email.com"
                style={inputBase}
              />
            </div>

            {/* Phone */}
            <div style={{ flex: '1 1 260px' }}>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                value={form.client_phone}
                onChange={e => setF({ client_phone: e.target.value })}
                placeholder="(919) 555-0123"
                style={inputBase}
              />
            </div>

            {/* Event Type */}
            <div style={{ flex: '1 1 260px' }}>
              <label style={labelStyle}>Event Type <span style={{ color: C.red }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <select
                  value={form.event_type}
                  onChange={e => setF({ event_type: e.target.value })}
                  style={{ ...inputBase, appearance: 'none' as any, paddingRight: 36 }}
                >
                  <option value="">Select event type...</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronRight size={14} style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%) rotate(90deg)',
                  color: C.muted, pointerEvents: 'none',
                }} />
              </div>
            </div>

            {/* City */}
            <div style={{ flex: '1 1 260px' }}>
              <label style={labelStyle}>City <span style={{ color: C.red }}>*</span></label>
              <input
                type="text"
                value={form.city}
                onChange={e => setF({ city: e.target.value })}
                placeholder="Durham, Raleigh, etc."
                style={inputBase}
              />
            </div>

            {/* Venue / Location */}
            <div style={{ flex: '1 1 260px' }}>
              <label style={labelStyle}>Venue / Location</label>
              <input
                type="text"
                value={form.location}
                onChange={e => setF({ location: e.target.value })}
                placeholder="Venue name or address"
                style={inputBase}
              />
            </div>

            {/* Start Time */}
            <div style={{ flex: '1 1 180px' }}>
              <label style={labelStyle}>Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => setF({ start_time: e.target.value })}
                style={inputBase}
              />
            </div>

            {/* End Time */}
            <div style={{ flex: '1 1 180px' }}>
              <label style={labelStyle}>End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => setF({ end_time: e.target.value })}
                style={inputBase}
              />
            </div>

            {/* Guest Count */}
            <div style={{ flex: '1 1 180px' }}>
              <label style={labelStyle}>
                <Users size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                # of Guests
              </label>
              <input
                type="number"
                value={form.guest_count}
                onChange={e => setF({ guest_count: e.target.value })}
                placeholder="50"
                min="1"
                style={inputBase}
              />
            </div>

            {/* Budget Range */}
            <div style={{ flex: '1 1 260px' }}>
              <label style={labelStyle}>Budget Range</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={form.budget_range}
                  onChange={e => setF({ budget_range: e.target.value })}
                  style={{ ...inputBase, appearance: 'none' as any, paddingRight: 36 }}
                >
                  <option value="">Select budget range...</option>
                  {BUDGET_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronRight size={14} style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%) rotate(90deg)',
                  color: C.muted, pointerEvents: 'none',
                }} />
              </div>
            </div>

            {/* MC Services */}
            <div style={{ flex: '1 0 100%' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={form.mc_needed}
                  onChange={e => setF({ mc_needed: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: C.navy, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                  <Mic2 size={14} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle', color: C.muted }} />
                  I need MC / Host services
                </span>
              </label>
            </div>

            {/* Special Requests */}
            <div style={{ flex: '1 0 100%' }}>
              <label style={labelStyle}>Special Requests</label>
              <textarea
                rows={4}
                value={form.special_requests}
                onChange={e => setF({ special_requests: e.target.value })}
                placeholder="Music genres, themes, special songs, announcements..."
                style={{ ...inputBase, resize: 'vertical' as const, fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {formError && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8,
              backgroundColor: C.redBg, color: C.red,
              fontSize: 14, fontWeight: 600,
              border: `1px solid ${C.red}`,
            }}>
              {formError}
            </div>
          )}

          <button
            onClick={handleContinue}
            style={{
              width: '100%', marginTop: 24, padding: '14px',
              borderRadius: 10, backgroundColor: C.navy, color: C.white,
              border: 'none', cursor: 'pointer',
              fontSize: 16, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Continue to Review <ArrowRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  // ── CONFIRM STEP ─────────────────────────────────────────────────────────────
  const ConfirmStep = () => {
    const rows: { label: string; value: string }[] = [
      { label: 'Name', value: form.client_name },
      { label: 'Email', value: form.client_email },
      { label: 'Phone', value: form.client_phone || '—' },
      { label: 'Event Type', value: form.event_type },
      { label: 'Date', value: formattedDate },
      { label: 'City', value: form.city },
      { label: 'Venue', value: form.location || '—' },
      { label: 'Start Time', value: form.start_time || '—' },
      { label: 'End Time', value: form.end_time || '—' },
      { label: 'Guests', value: form.guest_count || '—' },
      { label: 'MC Services', value: form.mc_needed ? 'Yes' : 'No' },
      { label: 'Budget', value: form.budget_range || '—' },
    ]

    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => setStep('form')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, fontSize: 14, fontWeight: 600,
              marginBottom: 16, padding: 0,
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, margin: 0 }}>Review Your Request</h2>
        </div>

        {/* Summary card */}
        <div style={{
          backgroundColor: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 28,
          marginBottom: 20,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '14px 24px',
          }}>
            {rows.map(r => (
              <div key={r.label}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 3 }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{r.value}</div>
              </div>
            ))}
          </div>

          {form.special_requests && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>
                Special Requests
              </div>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{form.special_requests}</div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 20 }}>
          Submitting this form sends a quote request — not a confirmed booking. You'll receive a response within 24–48 hours.
        </p>

        {submitError && (
          <div style={{
            padding: '10px 14px', borderRadius: 8,
            backgroundColor: C.redBg, color: C.red,
            fontSize: 14, fontWeight: 600,
            border: `1px solid ${C.red}`,
            marginBottom: 16,
          }}>
            {submitError}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', padding: '16px',
            borderRadius: 10, backgroundColor: C.navy, color: C.white,
            border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: 16, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting
            ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
            : 'Submit Request'}
        </button>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── SUCCESS STEP ─────────────────────────────────────────────────────────────
  const SuccessStep = () => (
    <div style={{ padding: '80px 24px', textAlign: 'center', backgroundColor: C.bg, minHeight: '60vh' }}>
      <div style={{
        maxWidth: 500, margin: '0 auto',
        backgroundColor: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 16, padding: 40,
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          backgroundColor: C.greenBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <CheckCircle2 size={40} color={C.green} />
        </div>

        <h2 style={{ fontSize: 28, fontWeight: 800, color: C.navy, margin: '0 0 16px' }}>
          Request Submitted!
        </h2>

        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, margin: '0 0 24px' }}>
          Thank you, <strong style={{ color: C.text }}>{form.client_name}</strong>! We received your request for
          a <strong style={{ color: C.text }}>{form.event_type}</strong> on{' '}
          <strong style={{ color: C.text }}>{formattedDate}</strong>. We'll be in touch within
          24–48 hours to discuss the details and get everything locked in.
        </p>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, marginBottom: 28 }}>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 8px' }}>Questions? Reach out directly:</p>
          <a
            href="mailto:maskoffdadj@gmail.com"
            style={{ color: C.blueAccent, fontWeight: 700, fontSize: 15, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Mail size={15} /> maskoffdadj@gmail.com
          </a>
        </div>

        <button
          onClick={() => { setForm(BLANK_FORM()); setStep('home') }}
          style={{
            padding: '12px 28px', borderRadius: 10,
            backgroundColor: C.white, color: C.navy,
            border: `2px solid ${C.border}`,
            cursor: 'pointer', fontSize: 15, fontWeight: 700,
          }}
        >
          Submit Another Request
        </button>
      </div>
    </div>
  )

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <Nav />
      {step === 'home' && <HomeStep />}
      {step === 'calendar' && <CalendarStep />}
      {step === 'form' && <FormStep />}
      {step === 'confirm' && <ConfirmStep />}
      {step === 'success' && <SuccessStep />}
    </div>
  )
}
