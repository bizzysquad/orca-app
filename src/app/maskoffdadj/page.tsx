'use client'
import { useState, useEffect, useRef } from 'react'
import {
  ArrowRight, CheckCircle2, Loader2, Mail, MapPin, Calendar, Check,
  Users, Mic2, Music2, Star, Phone, Instagram, Clock, DollarSign,
  PartyPopper, Building2, Heart, Coffee, Globe, Sparkles,
  Shield, Headphones, ChevronRight, ChevronLeft, MessageSquareQuote, Send,
  Info,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════════════════════
   Color Palette
   ═══════════════════════════════════════════════════════════════════════════ */
const C = {
  navy: '#0F172A',
  gold: '#B45309',
  goldLight: '#FEF3C7',
  white: '#FFFFFF',
  bg: '#F8FAFC',
  text: '#1E293B',
  muted: '#64748B',
  border: '#E2E8F0',
  green: '#15803D',
  greenBg: '#F0FDF4',
  red: '#B91C1C',
  redBg: '#FFF1F2',
}

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */
interface BookingForm {
  client_name: string
  client_email: string
  client_phone: string
  event_type: string
  date: string
  location: string
  guest_count: string
  start_time: string
  end_time: string
  custom_budget: string
  song_requests: string
  special_requests: string
}

interface Testimonial {
  id?: string
  name: string
  event_type: string
  rating: number
  review: string
  created_at?: string
}

interface Gig {
  date: string
  venue: string
  city: string
  eventType: string
  customEventType?: string
  startTime?: string
  endTime?: string
  ticketLink?: string
}

function to12Hour(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: 'default-1',
    name: 'Ashley T.',
    event_type: 'Wedding Reception',
    rating: 5,
    review: 'DJ Maskoff made our wedding reception absolutely unforgettable. He read the room perfectly and had everyone on the dance floor all night. Could not recommend him more!',
  },
  {
    id: 'default-2',
    name: 'Marcus J.',
    event_type: 'Birthday Party',
    rating: 5,
    review: 'Hired him for my 30th birthday and he killed it. The transitions were smooth, the energy was right, and he played every request. Definitely booking again.',
  },
  {
    id: 'default-3',
    name: 'Christina W.',
    event_type: 'Corporate Event',
    rating: 5,
    review: 'Professional from start to finish. He showed up early, set up quickly, and kept the vibe going for our company holiday party. Our team is still talking about it.',
  },
]

const EVENT_TYPES = [
  'Private Party', 'Corporate Event', 'Wedding / Reception',
  'Lounge / Brunch Event', 'Community Event', 'Birthday Party',
  'Graduation Party', 'Holiday Party', 'Club / Nightclub',
  'School Dance', 'Special Occasion',
]

const BLANK_FORM = (): BookingForm => ({
  client_name: '',
  client_email: '',
  client_phone: '',
  event_type: '',
  date: '',
  location: '',
  guest_count: '',
  start_time: '',
  end_time: '',
  custom_budget: '',
  song_requests: '',
  special_requests: '',
})

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */
function calcTotalHours(start: string, end: string): string {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin <= startMin) endMin += 24 * 60 // next day
  const diff = endMin - startMin
  const hours = Math.floor(diff / 60)
  const mins = diff % 60
  if (mins === 0) return `${hours} hr${hours !== 1 ? 's' : ''}`
  return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

/* ═══════════════════════════════════════════════════════════════════════════
   Shared Styles
   ═══════════════════════════════════════════════════════════════════════════ */
const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  fontSize: 14,
  borderRadius: 8,
  border: `1.5px solid ${C.border}`,
  backgroundColor: C.white,
  color: C.text,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: C.text,
  marginBottom: 6,
}

const sectionPadding: React.CSSProperties = {
  padding: '80px 24px',
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════ */
export default function MaskOffDJPage() {
  // Form state
  const [form, setForm] = useState<BookingForm>(BLANK_FORM())
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [formError, setFormError] = useState('')

  // Booking step (1=calendar, 2=form, 3=review)
  const [bookingStep, setBookingStep] = useState(1)
  // Time selectors (hour 1-12, period AM/PM)
  const [startHour, setStartHour] = useState('')
  const [startPeriod, setStartPeriod] = useState('PM')
  const [endHour, setEndHour] = useState('')
  const [endPeriod, setEndPeriod] = useState('PM')

  // Website settings from cloud
  const [siteSettings, setSiteSettings] = useState<any>({})

  // Website photos
  const [heroPhoto, setHeroPhoto] = useState<string | null>(null)
  const [aboutPhoto, setAboutPhoto] = useState<string | null>(null)

  // Availability
  const [bookedDates, setBookedDates] = useState<string[]>([])

  // Upcoming gigs
  const [upcomingGigs, setUpcomingGigs] = useState<Gig[]>([])

  // Testimonials
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [testimForm, setTestimForm] = useState({ name: '', event_type: '', rating: 5, review: '' })
  const [testimSubmitting, setTestimSubmitting] = useState(false)
  const [testimSuccess, setTestimSuccess] = useState(false)

  // Mobile nav toggle
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Calendar state
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>('')

  const bookingRef = useRef<HTMLDivElement>(null)

  const today = new Date().toISOString().split('T')[0]

  // ── Data fetching ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const [availRes, schedRes] = await Promise.all([
          fetch('/api/dj-availability', { cache: 'no-store' }),
          fetch('/api/dj/schedule', { cache: 'no-store' }),
        ])
        const blocked: string[] = []
        if (availRes.ok) {
          const data = await availRes.json()
          blocked.push(...(data.bookedDates || data.booked || data.blocked || []))
        }
        if (schedRes.ok) {
          const sd = await schedRes.json()
          const gigDates = (sd.gigs || [])
            .filter((g: any) => ['confirmed', 'booked', 'dj_blocked'].includes(g.status))
            .map((g: any) => g.date)
          blocked.push(...gigDates)
        }
        setBookedDates(Array.from(new Set(blocked)))
      } catch {}
    }

    const fetchGigs = async () => {
      try {
        const res = await fetch('/api/dj/schedule', { cache: 'no-store' })
        if (!res.ok) return
        const d = await res.json()
        const seen = new Set<string>()
        const gigs = (d.gigs || [])
          .filter((g: any) => g.status === 'confirmed' && g.date >= today)
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
          .filter((g: any) => {
            const key = g.gigId || g.id || `${g.date}-${g.eventType}-${g.venue}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .slice(0, 12)
          .map((g: any) => ({
            date: g.date,
            venue: g.venue || '',
            city: g.city || '',
            eventType: g.customEventType || g.eventType || g.event_type || '',
            startTime: g.startTime || g.start_time || '',
            endTime: g.endTime || g.end_time || '',
            ticketLink: g.ticketLink || g.ticket_link || '',
          }))
        setUpcomingGigs(gigs)
      } catch {}
    }

    const fetchTestimonials = async () => {
      try {
        const res = await fetch('/api/dj/testimonials', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setTestimonials(data.testimonials || data || [])
      } catch {}
    }

    const fetchPhotos = async () => {
      try {
        const res = await fetch('/api/dj/photos', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const photos = data.photos || []
        const hero = photos.find((p: any) => p.slot === 'hero')
        const about = photos.find((p: any) => p.slot === 'about')
        if (hero?.url) setHeroPhoto(hero.url)
        if (about?.url) setAboutPhoto(about.url)
      } catch {}
    }

    const fetchSiteSettings = async () => {
      try {
        const res = await fetch('/api/dj/site-settings', { cache: 'no-store' })
        if (res.ok) { const d = await res.json(); if (d.settings) setSiteSettings(d.settings) }
      } catch {}
    }

    fetchAvailability()
    fetchGigs()
    fetchTestimonials()
    fetchPhotos()
    fetchSiteSettings()
  }, [today])

  const setF = (patch: Partial<BookingForm>) => setForm(p => ({ ...p, ...patch }))

  const toTime24 = (hour: string, period: string) => {
    if (!hour) return ''
    let h = parseInt(hour)
    if (period === 'PM' && h !== 12) h += 12
    if (period === 'AM' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:00`
  }
  const updateStartTime = (h: string, p: string) => { setStartHour(h); setStartPeriod(p); setF({ start_time: toTime24(h, p) }) }
  const updateEndTime = (h: string, p: string) => { setEndHour(h); setEndPeriod(p); setF({ end_time: toTime24(h, p) }) }

  const isDateBooked = (dateStr: string) => bookedDates.includes(dateStr)

  const isDatePast = (dateStr: string) => dateStr < today

  // ── Calendar navigation ────────────────────────────────────────────────
  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11)
      setCalYear(calYear - 1)
    } else {
      setCalMonth(calMonth - 1)
    }
  }

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0)
      setCalYear(calYear + 1)
    } else {
      setCalMonth(calMonth + 1)
    }
  }

  const handleCalendarDateClick = (dateStr: string) => {
    if (isDateBooked(dateStr) || isDatePast(dateStr)) return
    setSelectedDate(dateStr)
    setF({ date: dateStr })
    setFormError('')
    setBookingStep(2)
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // ── Total hours calc ───────────────────────────────────────────────────
  const totalHours = calcTotalHours(form.start_time, form.end_time)

  // ── Submit booking ─────────────────────────────────────────────────────
  const handleSubmitBooking = async () => {
    if (!form.client_name || !form.client_email || !form.event_type || !form.date) {
      setFormError('Please fill in all required fields (Name, Email, Event Type, and Date).')
      return
    }
    setFormError('')
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = {
        ...form,
        event_time: form.start_time,
        total_hours: totalHours,
      }
      const res = await fetch('/api/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Submission failed. Please try again.')
      setSubmitSuccess(true)
      setForm(BLANK_FORM())
      setSelectedDate('')
    } catch (e: any) {
      setSubmitError(e.message)
    }
    setSubmitting(false)
  }

  // ── Submit testimonial ─────────────────────────────────────────────────
  const handleSubmitTestimonial = async () => {
    if (!testimForm.name || !testimForm.review) return
    setTestimSubmitting(true)
    try {
      const res = await fetch('/api/dj/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testimForm),
      })
      if (res.ok) {
        const data = await res.json()
        setTestimonials(prev => [data.testimonial || testimForm, ...prev])
        setTestimForm({ name: '', event_type: '', rating: 5, review: '' })
        setTestimSuccess(true)
        setTimeout(() => setTestimSuccess(false), 4000)
      }
    } catch {}
    setTestimSubmitting(false)
  }

  // ── Smooth scroll helper ───────────────────────────────────────────────
  const scrollTo = (id: string) => {
    setMobileNavOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── Build calendar grid ────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfWeek(calYear, calMonth)
  const monthName = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)
  // fill remaining to complete the last row
  while (calendarCells.length % 7 !== 0) calendarCells.push(null)

  /* ═════════════════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{
      backgroundColor: C.bg,
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>

      {/* ── 1. STICKY NAV BAR ──────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: C.white,
        borderBottom: `1px solid ${C.border}`,
        height: 64,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => scrollTo('poster')}
          >
            <span style={{
              fontWeight: 900,
              fontSize: 22,
              color: C.navy,
              letterSpacing: '-0.02em',
            }}>
              DJ Maskoff
            </span>
          </div>

          {/* Desktop nav links */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
          }}>
            {[
              { label: 'Book Now', id: 'booking' },
              { label: 'Upcoming Bookings', id: 'poster' },
              { label: 'Services', id: 'services' },
              { label: 'About', id: 'about' },
              { label: 'Testimonials', id: 'testimonials' },
              { label: 'Contact', id: 'footer' },
            ].map(link => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => { e.preventDefault(); scrollTo(link.id) }}
                className="nav-link-desktop"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.muted,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => scrollTo('booking')}
              style={{
                padding: '9px 22px',
                borderRadius: 8,
                backgroundColor: C.navy,
                color: C.white,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Book Now
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="mobile-nav-toggle"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              fontSize: 24,
              color: C.navy,
            }}
          >
            {mobileNavOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileNavOpen && (
          <div className="mobile-nav-dropdown" style={{
            position: 'absolute',
            top: 64,
            left: 0,
            right: 0,
            backgroundColor: C.white,
            borderBottom: `1px solid ${C.border}`,
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}>
            {['Book Now:booking', 'Upcoming Bookings:poster', 'Services:services', 'About:about', 'Testimonials:testimonials', 'Contact:footer'].map(item => {
              const [label, id] = item.split(':')
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  onClick={(e) => { e.preventDefault(); scrollTo(id) }}
                  style={{ fontSize: 16, fontWeight: 600, color: C.text, textDecoration: 'none' }}
                >
                  {label}
                </a>
              )
            })}
            <button
              onClick={() => scrollTo('booking')}
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                backgroundColor: C.navy,
                color: C.white,
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 700,
                width: '100%',
              }}
            >
              Book Now
            </button>
          </div>
        )}
      </nav>

      {/* Booking section pulled to top via flex order */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ order: 1 }}>
      {/* ── POSTER BOARD (Upcoming Gigs) — appears first ────────────────── */}
      <section id="poster" style={{
        backgroundColor: C.navy,
        padding: '80px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {heroPhoto && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${heroPhoto})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: 0.18,
          }} />
        )}
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          {heroPhoto && (
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
              <img src={heroPhoto} alt="DJ Maskoff" style={{
                width: 160, height: 160, borderRadius: '50%', objectFit: 'cover',
                border: `4px solid ${C.gold}`, display: 'block',
              }} />
            </div>
          )}
          <div style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 700,
            color: C.gold,
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
            marginBottom: 12,
          }}>
            {siteSettings.posterSubtitle || 'Upcoming Events'}
          </div>

          <h1 style={{
            fontSize: 44,
            fontWeight: 900,
            color: C.white,
            lineHeight: 1.1,
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}>
            {siteSettings.posterTitle || 'MASK OFF DA DJ'}
          </h1>
          <p style={{
            fontSize: 20,
            color: C.gold,
            fontWeight: 700,
            margin: '0 0 48px',
            letterSpacing: '0.12em',
          }}>
            {siteSettings.posterTagline || 'UPCOMING BOOKINGS'}
          </p>

          {upcomingGigs.length > 0 ? (
            <div style={{ borderTop: '1px solid #334155' }}>
              {upcomingGigs.map((g, i) => {
                const d = new Date(g.date + 'T00:00:00')
                const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
                const day = d.getDate()
                const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                    padding: '22px 0',
                    borderBottom: '1px solid #334155',
                  }}>
                    <div style={{ textAlign: 'center', minWidth: 70 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, letterSpacing: '0.08em' }}>{month}</div>
                      <div style={{ fontSize: 34, fontWeight: 900, color: C.white, lineHeight: 1 }}>{day}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>{weekday}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.white, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                        {g.eventType || 'Private Event'}
                      </div>
                      {(g.startTime || g.endTime) && (
                        <div style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: C.gold,
                          marginTop: 4,
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.05em',
                        }}>
                          {to12Hour(g.startTime || '')}{g.endTime ? ` — ${to12Hour(g.endTime)}` : ''}
                        </div>
                      )}
                      {(g.venue || g.city) && (
                        <div style={{
                          fontSize: 13,
                          color: '#94A3B8',
                          marginTop: 3,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}>
                          <MapPin size={12} />
                          {[g.venue, g.city].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 6 }}>
                      <div style={{
                        padding: '5px 14px',
                        borderRadius: 100,
                        border: `1px solid ${C.gold}`,
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.gold,
                        letterSpacing: '0.06em',
                      }}>
                        BOOKED
                      </div>
                      {g.ticketLink && (
                        <a
                          href={g.ticketLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 100,
                            backgroundColor: C.gold,
                            fontSize: 10,
                            fontWeight: 700,
                            color: C.white,
                            textDecoration: 'none',
                            letterSpacing: '0.06em',
                          }}
                        >
                          TICKETS
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={{ color: '#94A3B8', fontSize: 15, margin: '0 0 20px' }}>
              No upcoming dates listed right now. Check back soon or submit a booking request!
            </p>
          )}

          <button
            onClick={() => scrollTo('calendar')}
            style={{
              marginTop: 44,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '16px 36px',
              borderRadius: 10,
              backgroundColor: C.gold,
              color: C.white,
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            Check My Availability <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Calendar section removed — integrated into booking Step 1 */}

      {/* Placeholder to preserve scroll target */}
      <div id="calendar" />

      {false && (
      <section style={{
        ...sectionPadding,
        backgroundColor: C.white,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.navy, margin: '0 0 12px' }}>
              Availability Calendar
            </h2>
            <p style={{ fontSize: 16, color: C.muted, margin: 0 }}>
              Click an available date to start your booking request.
            </p>
          </div>

          {/* Month Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            maxWidth: 600,
            margin: '0 auto 24px',
          }}>
            <button
              onClick={prevMonth}
              style={{
                background: 'none',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                cursor: 'pointer',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                color: C.text,
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{
              fontSize: 20,
              fontWeight: 700,
              color: C.navy,
            }}>
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              style={{
                background: 'none',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                cursor: 'pointer',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                color: C.text,
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginBottom: 20,
            flexWrap: 'wrap' as const,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: C.white, border: `1px solid ${C.border}` }} />
              Available
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: C.redBg, border: `1px solid ${C.red}` }} />
              Booked
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.muted }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: C.goldLight, border: `1px solid ${C.gold}` }} />
              Selected
            </div>
          </div>

          {/* Calendar Grid */}
          <div style={{
            maxWidth: 600,
            margin: '0 auto',
            backgroundColor: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 20,
          }}>
            {/* Day headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
              marginBottom: 8,
            }}>
              {dayLabels.map(dl => (
                <div key={dl} style={{
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.muted,
                  padding: '8px 0',
                }}>
                  {dl}
                </div>
              ))}
            </div>

            {/* Date cells */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 4,
            }}>
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} style={{ padding: '12px 0' }} />
                }

                const dateStr = formatDateStr(calYear, calMonth, day)
                const booked = isDateBooked(dateStr)
                const past = isDatePast(dateStr)
                const isSelected = selectedDate === dateStr
                const isToday = dateStr === today
                const disabled = booked || past

                let bgColor = C.white
                let textColor = C.text
                let borderColor = 'transparent'
                let cursor: string = 'pointer'

                if (isSelected) {
                  bgColor = C.goldLight
                  borderColor = C.gold
                  textColor = C.navy
                } else if (booked) {
                  bgColor = C.redBg
                  borderColor = C.red
                  textColor = C.red
                  cursor = 'not-allowed'
                } else if (past) {
                  bgColor = '#F1F5F9'
                  textColor = '#CBD5E1'
                  cursor = 'default'
                } else if (isToday) {
                  borderColor = C.navy
                }

                return (
                  <div
                    key={dateStr}
                    onClick={() => !disabled && handleCalendarDateClick(dateStr)}
                    style={{
                      textAlign: 'center',
                      padding: '10px 0',
                      borderRadius: 8,
                      backgroundColor: bgColor,
                      color: textColor,
                      border: `2px solid ${borderColor}`,
                      cursor,
                      fontSize: 14,
                      fontWeight: isToday || isSelected ? 700 : 500,
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                  >
                    {day}
                    {booked && (
                      <div style={{
                        position: 'absolute',
                        bottom: 3,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        backgroundColor: C.red,
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Selected date indicator */}
          {selectedDate && (
            <div style={{
              textAlign: 'center',
              marginTop: 20,
              fontSize: 15,
              color: C.green,
              fontWeight: 600,
            }}>
              <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              {' — Scroll down to continue booking'}
            </div>
          )}
        </div>
      </section>
      )}

      </div>{/* end poster order-1 wrapper */}

      <div style={{ order: 2 }}>
      {/* ── BOOKING REQUEST — Step-by-Step (order 2 = after poster) ── */}
      <section id="booking" ref={bookingRef} style={{
        ...sectionPadding,
        backgroundColor: C.bg,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.navy, margin: '0 0 12px' }}>
              Request a Booking
            </h2>
            <p style={{ fontSize: 16, color: C.muted, margin: 0 }}>
              Follow the steps below to request your date.
            </p>
          </div>

          {/* Step indicator */}
          {!submitSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
              {[
                { n: 1, label: 'Select Date' },
                { n: 2, label: 'Your Details' },
                { n: 3, label: 'Review & Submit' },
              ].map(({ n, label }, i) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => { if (n === 1 || (n === 2 && selectedDate) || (n === 3 && selectedDate && form.client_name && form.client_email && form.event_type)) setBookingStep(n) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 100,
                      border: `2px solid ${bookingStep >= n ? C.navy : C.border}`,
                      background: bookingStep === n ? C.navy : bookingStep > n ? C.goldLight : C.white,
                      color: bookingStep === n ? C.white : bookingStep > n ? C.gold : C.muted,
                      fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {bookingStep > n ? <Check size={14} /> : n} {label}
                  </button>
                  {i < 2 && <div style={{ width: 24, height: 2, background: bookingStep > n ? C.gold : C.border }} />}
                </div>
              ))}
            </div>
          )}

          {submitSuccess ? (
            /* Success message */
            <div style={{
              maxWidth: 560,
              margin: '0 auto',
              backgroundColor: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: 48,
              textAlign: 'center',
            }}>
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                backgroundColor: C.greenBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <CheckCircle2 size={40} color={C.green} />
              </div>
              <h3 style={{ fontSize: 26, fontWeight: 800, color: C.navy, margin: '0 0 16px' }}>
                Request Submitted!
              </h3>
              <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, margin: '0 0 24px' }}>
                Thank you for your booking request. We will review the details and get back to
                you within 24-48 hours to discuss pricing and confirm your date.
              </p>
              <a
                href="mailto:maskoffdadj@gmail.com"
                style={{
                  color: C.gold,
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 24,
                }}
              >
                <Mail size={15} /> maskoffdadj@gmail.com
              </a>
              <div>
                <button
                  onClick={() => { setSubmitSuccess(false); setForm(BLANK_FORM()) }}
                  style={{
                    padding: '12px 28px',
                    borderRadius: 10,
                    backgroundColor: C.navy,
                    color: C.white,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: 700,
                    marginTop: 8,
                  }}
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: '36px 32px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            }}>

              {/* ── STEP 1: Select a date (integrated calendar) ── */}
              {bookingStep === 1 && (
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: '0 0 6px', textAlign: 'center' }}>
                    <Calendar size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                    Check Availability
                  </h3>
                  <p style={{ fontSize: 14, color: C.muted, margin: '0 0 24px', textAlign: 'center' }}>
                    Select an available date to get started.
                  </p>

                  {/* Inline calendar */}
                  <div style={{ maxWidth: 600, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <button onClick={prevMonth} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', padding: '6px 10px', color: C.text }}><ChevronLeft size={18} /></button>
                      <span style={{ fontSize: 17, fontWeight: 700, color: C.navy }}>{monthName}</span>
                      <button onClick={nextMonth} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', padding: '6px 10px', color: C.text }}><ChevronRight size={18} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
                      {dayLabels.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: C.muted, padding: '4px 0' }}>{d}</div>)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                      {calendarCells.map((day, i) => {
                        if (day === null) return <div key={`e${i}`} />
                        const dateStr = formatDateStr(calYear, calMonth, day)
                        const booked = isDateBooked(dateStr)
                        const past = isDatePast(dateStr)
                        const selected = dateStr === selectedDate
                        const isToday = dateStr === today
                        return (
                          <button
                            key={i}
                            onClick={() => handleCalendarDateClick(dateStr)}
                            disabled={booked || past}
                            style={{
                              padding: '10px 0', borderRadius: 8, border: 'none', cursor: booked || past ? 'default' : 'pointer', textAlign: 'center',
                              fontSize: 14, fontWeight: 600, transition: 'all 0.15s',
                              backgroundColor: selected ? C.navy : booked ? '#FEE2E2' : isToday ? C.goldLight : 'transparent',
                              color: selected ? C.white : booked ? C.red : past ? '#CBD5E1' : isToday ? C.gold : C.text,
                              opacity: past && !isToday ? 0.4 : 1,
                            }}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: C.navy }} /><span style={{ fontSize: 11, color: C.muted }}>Selected</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FCA5A5' }} /><span style={{ fontSize: 11, color: C.muted }}>Booked</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold }} /><span style={{ fontSize: 11, color: C.muted }}>Today</span></div>
                    </div>
                  </div>

                  {/* Selected date + continue */}
                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    {selectedDate && (
                      <p style={{ fontSize: 15, color: C.green, fontWeight: 600, marginBottom: 16 }}>
                        <CheckCircle2 size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                    {formError && <p style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{formError}</p>}
                    <button
                      onClick={() => { if (!selectedDate) { setFormError('Please select a date first.'); return } setFormError(''); setBookingStep(2) }}
                      style={{ padding: '14px 40px', borderRadius: 10, backgroundColor: selectedDate ? C.navy : C.border, color: C.white, border: 'none', cursor: selectedDate ? 'pointer' : 'default', fontSize: 15, fontWeight: 700 }}
                    >
                      Continue <ArrowRight size={16} style={{ display: 'inline', marginLeft: 6, verticalAlign: 'middle' }} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Fill out details ── */}
              {bookingStep === 2 && (
                <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>Your Details</h3>
                <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>
                  <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {/* Row 1: Name, Email, Phone */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 20,
                marginBottom: 20,
              }}>
                <div>
                  <label style={labelStyle}>Full Name <span style={{ color: C.red }}>*</span></label>
                  <input
                    type="text"
                    value={form.client_name}
                    onChange={e => setF({ client_name: e.target.value })}
                    placeholder="Your full name"
                    style={inputBase}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email Address <span style={{ color: C.red }}>*</span></label>
                  <input
                    type="email"
                    value={form.client_email}
                    onChange={e => setF({ client_email: e.target.value })}
                    placeholder="you@email.com"
                    style={inputBase}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input
                    type="tel"
                    value={form.client_phone}
                    onChange={e => setF({ client_phone: e.target.value })}
                    placeholder="(919) 555-0123"
                    style={inputBase}
                  />
                </div>
              </div>

              {/* Row 2: Location, Event Type, Guest Count */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 20,
                marginBottom: 20,
              }}>
                <div>
                  <label style={labelStyle}>
                    <MapPin size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    Event Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setF({ location: e.target.value })}
                    placeholder="Venue name or address"
                    style={inputBase}
                  />
                </div>
                <div>
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
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%) rotate(90deg)',
                      color: C.muted,
                      pointerEvents: 'none',
                    }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>
                    <Users size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    Estimated Guest Count
                  </label>
                  <input
                    type="number"
                    value={form.guest_count}
                    onChange={e => setF({ guest_count: e.target.value })}
                    placeholder="e.g. 75"
                    min="1"
                    style={inputBase}
                  />
                </div>
              </div>

              {/* Budget */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Your Budget</label>
                <input
                  type="text"
                  value={form.custom_budget}
                  onChange={e => setF({ custom_budget: e.target.value })}
                  placeholder="e.g. $500, $300-$500, Flexible"
                  style={inputBase}
                />
              </div>

              {/* Row 3: Date, Start Time, End Time, Total Hours */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 20,
                marginBottom: 20,
              }}>
                <div>
                  <label style={labelStyle}>
                    <Calendar size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    Event Date <span style={{ color: C.red }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => {
                      const val = e.target.value
                      if (isDateBooked(val)) {
                        setFormError('That date is already booked. Please choose another date.')
                        return
                      }
                      setFormError('')
                      setSelectedDate(val)
                      setF({ date: val })
                    }}
                    min={today}
                    style={{
                      ...inputBase,
                      backgroundColor: form.date ? C.goldLight : C.white,
                      borderColor: form.date ? C.gold : C.border,
                    }}
                  />
                  {form.date && isDateBooked(form.date) && (
                    <div style={{ fontSize: 12, color: C.red, marginTop: 4, fontWeight: 600 }}>
                      This date is unavailable.
                    </div>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>
                    <Clock size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    Start Time
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={startHour} onChange={e => updateStartTime(e.target.value, startPeriod)} style={{ ...inputBase, flex: 1 }}>
                      <option value="">Hour</option>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => <option key={h} value={String(h)}>{h}</option>)}
                    </select>
                    <select value={startPeriod} onChange={e => updateStartTime(startHour, e.target.value)} style={{ ...inputBase, flex: 1 }}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>
                    <Clock size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    End Time
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={endHour} onChange={e => updateEndTime(e.target.value, endPeriod)} style={{ ...inputBase, flex: 1 }}>
                      <option value="">Hour</option>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(h => <option key={h} value={String(h)}>{h}</option>)}
                    </select>
                    <select value={endPeriod} onChange={e => updateEndTime(endHour, e.target.value)} style={{ ...inputBase, flex: 1 }}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Total Hours</label>
                  <div style={{
                    ...inputBase,
                    backgroundColor: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: 44,
                    color: totalHours ? C.navy : C.muted,
                    fontWeight: totalHours ? 700 : 400,
                    cursor: 'default',
                  }}>
                    {totalHours || 'Auto-calculated'}
                  </div>
                </div>
              </div>

              {/* Song Requests */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  <Music2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  Song Requests
                </label>
                <textarea
                  rows={3}
                  value={form.song_requests}
                  onChange={e => setF({ song_requests: e.target.value })}
                  placeholder="List any specific songs you'd like played"
                  style={{ ...inputBase, resize: 'vertical' as const, fontFamily: 'inherit' }}
                />
              </div>

              {/* Additional Details */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Additional Details</label>
                <textarea
                  rows={3}
                  value={form.special_requests}
                  onChange={e => setF({ special_requests: e.target.value })}
                  placeholder="Anything else we should know about your event..."
                  style={{ ...inputBase, resize: 'vertical' as const, fontFamily: 'inherit' }}
                />
              </div>

              {/* Navigation buttons */}
              {formError && <p style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{formError}</p>}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={() => setBookingStep(1)} style={{ flex: 1, padding: '14px', borderRadius: 10, backgroundColor: C.white, color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                  <ChevronLeft size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> Back
                </button>
                <button
                  onClick={() => {
                    if (!form.client_name || !form.client_email || !form.event_type) { setFormError('Please fill in Name, Email, and Event Type.'); return }
                    setFormError(''); setBookingStep(3)
                  }}
                  style={{ flex: 2, padding: '14px', borderRadius: 10, backgroundColor: C.navy, color: C.white, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700 }}
                >
                  Review & Submit <ArrowRight size={16} style={{ display: 'inline', marginLeft: 6, verticalAlign: 'middle' }} />
                </button>
              </div>
                </div>
              )}

              {/* ── STEP 3: Review & Submit ── */}
              {bookingStep === 3 && (
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: C.navy, margin: '0 0 20px' }}>Review Your Request</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 24 }}>
                    {[
                      ['Date', selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''],
                      ['Name', form.client_name],
                      ['Email', form.client_email],
                      ['Phone', form.client_phone || '—'],
                      ['Event Type', form.event_type],
                      ['Location', form.location || '—'],
                      ['Time', form.start_time && form.end_time ? `${form.start_time} – ${form.end_time}` : form.start_time || '—'],
                      ['Budget', form.custom_budget || '—'],
                      ['Guest Count', form.guest_count || '—'],
                    ].map(([label, val]) => (
                      <div key={label}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>{label}</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {(form.song_requests || form.special_requests) && (
                    <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 10, background: '#F1F5F9', border: `1px solid ${C.border}` }}>
                      {form.song_requests && <p style={{ fontSize: 13, color: C.text, margin: '0 0 4px' }}><strong>Songs:</strong> {form.song_requests}</p>}
                      {form.special_requests && <p style={{ fontSize: 13, color: C.text, margin: 0 }}><strong>Notes:</strong> {form.special_requests}</p>}
                    </div>
                  )}

                  {/* Policy */}
                  <div style={{ display: 'flex', gap: 14, padding: '16px 18px', borderRadius: 12, backgroundColor: C.goldLight, border: `1px solid ${C.gold}33`, marginBottom: 24 }}>
                    <Info size={20} color={C.gold} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>
                      <strong style={{ color: C.gold }}>Deposit &amp; Cancellation Policy:</strong>{' '}
                      A 25% non-refundable deposit is required to lock in your date. Cancellations less than 14 days before the event forfeit the deposit.
                    </div>
                  </div>

                  {submitError && <p style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: C.redBg }}>{submitError}</p>}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => setBookingStep(2)} style={{ flex: 1, padding: '14px', borderRadius: 10, backgroundColor: C.white, color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                      <ChevronLeft size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> Edit
                    </button>
                    <button
                      onClick={handleSubmitBooking}
                      disabled={submitting}
                      style={{ flex: 2, padding: '16px', borderRadius: 10, backgroundColor: C.navy, color: C.white, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.7 : 1 }}
                    >
                      {submitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <>Submit Request <ArrowRight size={18} /></>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      </div>{/* end booking order-1 wrapper */}
      </div>{/* end flex column container */}

      {/* ── 5. SERVICES SECTION ──────────────────────────────────────────────── */}
      <section id="services" style={{
        ...sectionPadding,
        backgroundColor: C.white,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.navy, margin: '0 0 12px' }}>
              Services
            </h2>
            <p style={{ fontSize: 16, color: C.muted, margin: 0 }}>
              Professional DJ services tailored to your event, your crowd, and your vision.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 24,
          }}>
            {[
              {
                icon: <PartyPopper size={28} color={C.gold} />,
                title: 'Private Parties',
                desc: 'From intimate gatherings to big milestone celebrations, I bring the energy that makes every private event unforgettable.',
              },
              {
                icon: <Building2 size={28} color={C.gold} />,
                title: 'Corporate Events',
                desc: 'Professional atmosphere with great music for company parties, team celebrations, product launches, and networking mixers.',
              },
              {
                icon: <Heart size={28} color={C.gold} />,
                title: 'Weddings & Receptions',
                desc: 'Set the perfect tone for your big day with curated music that keeps guests on the dance floor from first dance to last call.',
              },
              {
                icon: <Coffee size={28} color={C.gold} />,
                title: 'Lounges & Brunch Events',
                desc: 'Smooth, curated vibes for day parties, brunch events, and lounge atmospheres that set the right mood.',
              },
              {
                icon: <Globe size={28} color={C.gold} />,
                title: 'Community Events',
                desc: 'Block parties, festivals, fundraisers, and community gatherings with music that brings everyone together.',
              },
              {
                icon: <Sparkles size={28} color={C.gold} />,
                title: 'Special Occasions',
                desc: 'Graduations, anniversaries, holiday parties, and any celebration that deserves a great soundtrack and a packed dance floor.',
              },
            ].map(svc => (
              <div key={svc.title} style={{
                backgroundColor: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: 28,
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: C.goldLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  {svc.icon}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
                  {svc.title}
                </div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
                  {svc.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. ABOUT SECTION ─────────────────────────────────────────────────── */}
      <section id="about" style={{
        ...sectionPadding,
        backgroundColor: C.bg,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 48,
          flexWrap: 'wrap' as const,
        }}>
          {/* Left: Avatar / About Photo */}
          <div style={{
            flex: '0 0 220px',
            display: 'flex',
            justifyContent: 'center',
          }}>
            {(aboutPhoto || heroPhoto) ? (
              <img src={aboutPhoto || heroPhoto!} alt="DJ Maskoff" style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                objectFit: 'cover',
                border: `4px solid ${C.gold}`,
                display: 'block',
              }} />
            ) : (
              <div style={{
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.navy} 0%, #334155 100%)`,
                border: `4px solid ${C.gold}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 8,
              }}>
                <Mic2 size={48} color={C.gold} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em' }}>DJ MASKOFF</span>
              </div>
            )}
          </div>

          {/* Middle: Bio */}
          <div style={{ flex: '1 1 320px', minWidth: 280 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.navy, margin: '0 0 20px' }}>
              About DJ Maskoff
            </h2>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>
              {siteSettings.bio || `DJ Maskoff brings years of professional experience to every event across the Raleigh, Durham, Cary, and Morrisville area. Known for reading the room and crafting the perfect vibe, he seamlessly blends genres to keep the energy high and the dance floor packed.\n\nWhether it is a wedding reception in Durham, a corporate gala in Raleigh, a lounge brunch in Cary, or a private party in Morrisville, DJ Maskoff delivers a polished, high-quality experience that keeps guests talking long after the last song.\n\nBased in the Triangle and available for events throughout North Carolina and beyond, he is committed to making every event feel unique, personal, and unforgettable.`}
            </p>
          </div>

          {/* Right: Bullet points */}
          <div style={{
            flex: '0 1 300px',
            minWidth: 260,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            paddingTop: 8,
          }}>
            {[
              { icon: <Shield size={22} color={C.gold} />, title: 'Professional & Dependable', desc: 'Always on time, always prepared, always delivering.' },
              { icon: <Headphones size={22} color={C.gold} />, title: 'Reads the Room Every Time', desc: 'Adapts in real time to keep the energy exactly right.' },
              { icon: <Music2 size={22} color={C.gold} />, title: 'Versatile Across All Genres', desc: 'Hip-hop, R&B, pop, Afrobeats, Latin, throwbacks, and more.' },
              { icon: <Star size={22} color={C.gold} />, title: 'High-Quality Experience', desc: 'Premium sound, smooth transitions, and a professional presence.' },
            ].map(item => (
              <div key={item.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: C.goldLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. TESTIMONIALS SECTION ──────────────────────────────────────────── */}
      <section id="testimonials" style={{
        ...sectionPadding,
        backgroundColor: C.white,
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: C.navy, margin: '0 0 12px' }}>
              What Clients Say
            </h2>
            <p style={{ fontSize: 16, color: C.muted, margin: 0 }}>
              Hear from people who booked DJ Maskoff for their events.
            </p>
          </div>

          {/* Customer submission form */}
          <div style={{
            backgroundColor: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 28,
            marginBottom: 40,
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: '0 0 20px' }}>
              <MessageSquareQuote size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
              Leave a Review
            </h3>

            {testimSuccess && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 8,
                backgroundColor: C.greenBg,
                color: C.green,
                fontSize: 14,
                fontWeight: 600,
                border: `1px solid ${C.green}`,
                marginBottom: 16,
              }}>
                Thank you! Your review has been submitted.
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 16,
            }}>
              <div>
                <label style={labelStyle}>Your Name <span style={{ color: C.red }}>*</span></label>
                <input
                  type="text"
                  value={testimForm.name}
                  onChange={e => setTestimForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Your name"
                  style={inputBase}
                />
              </div>
              <div>
                <label style={labelStyle}>Event Type</label>
                <input
                  type="text"
                  value={testimForm.event_type}
                  onChange={e => setTestimForm(p => ({ ...p, event_type: e.target.value }))}
                  placeholder="e.g. Wedding, Birthday"
                  style={inputBase}
                />
              </div>
              <div>
                <label style={labelStyle}>Rating</label>
                <div style={{ display: 'flex', gap: 4, paddingTop: 6 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setTestimForm(p => ({ ...p, rating: n }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 2,
                      }}
                    >
                      <Star
                        size={24}
                        color={C.gold}
                        fill={n <= testimForm.rating ? C.gold : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Your Review <span style={{ color: C.red }}>*</span></label>
              <textarea
                rows={3}
                value={testimForm.review}
                onChange={e => setTestimForm(p => ({ ...p, review: e.target.value }))}
                placeholder="Tell us about your experience..."
                style={{ ...inputBase, resize: 'vertical' as const, fontFamily: 'inherit' }}
              />
            </div>

            <button
              onClick={handleSubmitTestimonial}
              disabled={testimSubmitting || !testimForm.name || !testimForm.review}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 28px',
                borderRadius: 8,
                backgroundColor: C.navy,
                color: C.white,
                border: 'none',
                cursor: (testimSubmitting || !testimForm.name || !testimForm.review) ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 700,
                opacity: (testimSubmitting || !testimForm.name || !testimForm.review) ? 0.5 : 1,
              }}
            >
              {testimSubmitting ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
              ) : (
                <><Send size={16} /> Submit Review</>
              )}
            </button>
          </div>

          {/* Testimonial cards — merge customer reviews + site settings fallback + defaults */}
          {(() => {
            const fallback = (siteSettings.testimonials || []).filter((t: any) => t.name && t.quote).map((t: any, i: number) => ({ id: `fb-${i}`, name: t.name, event_type: t.event, rating: 5, review: t.quote }))
            const realTestimonials = [...testimonials, ...fallback]
            const allTestimonials = (realTestimonials.length > 0 ? realTestimonials : DEFAULT_TESTIMONIALS).slice(0, 9)
            return allTestimonials.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 24,
            }}>
              {allTestimonials.map((t, i) => (
                <div key={t.id || i} style={{
                  backgroundColor: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: 24,
                }}>
                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star
                        key={n}
                        size={16}
                        color={C.gold}
                        fill={n <= (t.rating || 5) ? C.gold : 'none'}
                      />
                    ))}
                  </div>
                  {/* Quote */}
                  <p style={{
                    fontSize: 14,
                    color: C.text,
                    lineHeight: 1.7,
                    margin: '0 0 16px',
                    fontStyle: 'italic',
                  }}>
                    &ldquo;{t.review}&rdquo;
                  </p>
                  {/* Attribution */}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{t.name}</div>
                    {t.event_type && (
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t.event_type}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null
          })()}
        </div>
      </section>

      {/* ── 8. FOOTER ────────────────────────────────────────────────────────── */}
      <footer id="footer" style={{
        backgroundColor: '#020617',
        padding: '56px 24px 32px',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* Contact row */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap' as const,
            justifyContent: 'center',
            gap: 32,
            marginBottom: 36,
          }}>
            <a
              href="mailto:maskoffdadj@gmail.com"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#94A3B8',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
                transition: 'color 0.2s',
              }}
            >
              <Mail size={16} color={C.gold} />
              maskoffdadj@gmail.com
            </a>
            {(siteSettings.phone || '') && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', fontSize: 14, fontWeight: 600 }}>
                <Phone size={16} color={C.gold} />
                {siteSettings.phone}
              </span>
            )}
            <a href={`https://instagram.com/${(siteSettings.instagram || '@maskoffdadj').replace('@', '')}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              <Instagram size={16} color={C.gold} />
              {siteSettings.instagram || '@maskoffdadj'}
            </a>
            <a href={`https://tiktok.com/${(siteSettings.tiktok || '@maskoffdadj').replace('@', '@')}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94A3B8', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              <Music2 size={16} color={C.gold} />
              TikTok {siteSettings.tiktok || '@maskoffdadj'}
            </a>
          </div>

          {/* Book Now button */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <button
              onClick={() => scrollTo('booking')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 36px',
                borderRadius: 10,
                backgroundColor: C.gold,
                color: C.white,
                border: 'none',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Book Now <ArrowRight size={18} />
            </button>
          </div>

          {/* Divider */}
          <div style={{
            borderTop: '1px solid #1E293B',
            paddingTop: 24,
            textAlign: 'center',
          }}>
            <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>
              &copy; {new Date().getFullYear()} DJ Maskoff. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* ── GLOBAL STYLES ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        html {
          scroll-behavior: smooth;
        }

        /* Hide desktop nav links on mobile, show hamburger */
        @media (max-width: 768px) {
          .nav-link-desktop {
            display: none !important;
          }
          .mobile-nav-toggle {
            display: block !important;
          }
          /* Make the nav "Book Now" button hide on mobile (it's in the dropdown) */
          nav > div > div:last-child > button:last-child {
            display: none !important;
          }
        }

        @media (min-width: 769px) {
          .mobile-nav-toggle {
            display: none !important;
          }
          .mobile-nav-dropdown {
            display: none !important;
          }
        }

        /* Hover effects */
        a:hover {
          opacity: 0.85;
        }

        input:focus, select:focus, textarea:focus {
          border-color: ${C.gold} !important;
          box-shadow: 0 0 0 3px ${C.gold}22;
        }

        button:hover {
          opacity: 0.92;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${C.bg};
        }
        ::-webkit-scrollbar-thumb {
          background: ${C.border};
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}
