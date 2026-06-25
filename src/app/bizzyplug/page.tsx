'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowRight, CheckCircle, Star, Instagram, Mail, Menu, X, Check, PenTool, Image, Globe, Sparkles, MessageSquare } from 'lucide-react'

const C = {
  bg: '#09090b',
  bgCard: '#131316',
  bgCardHover: '#1a1a1f',
  border: '#1f1f23',
  purple: '#9333EA',
  purpleGlow: '#7C3AED',
  purpleLight: '#C084FC',
  purpleDim: '#6D28D9',
  white: '#FAFAFA',
  muted: '#71717A',
  mutedLight: '#A1A1AA',
  green: '#10B981',
}

interface Service { name: string; price: number; description?: string; popular?: boolean; tag?: string; salePrice?: number }

const DEFAULT_SERVICES: Service[] = [
  { name: 'Pre-Made Artwork', price: 25 },
  { name: 'Custom Artwork', price: 50, popular: true },
  { name: 'Story Promo Ad', price: 10 },
  { name: 'Streaming Ad', price: 20 },
  { name: 'Tracklist', price: 30 },
  { name: 'Flyer', price: 30 },
  { name: 'Cartoons', price: 120 },
  { name: 'Logos', price: 150, popular: true },
]

const PORTFOLIO_ITEMS = [
  { title: 'Album Cover Design', category: 'Album Covers', client: 'Music Artist', tag: 'album-covers' },
  { title: 'Brand Identity', category: 'Logos', client: 'Brand Identity', tag: 'logos' },
  { title: 'Event Flyer Design', category: 'Flyers', client: 'Nightlife Events', tag: 'flyers' },
  { title: 'Business Website', category: 'Websites', client: 'Web Development', tag: 'websites' },
]

const TESTIMONIALS = [
  { name: 'Kidd Raze', role: 'Recording Artist', text: 'Bizzyplug took my vision and brought it to life. The album cover went crazy and helped my project get noticed everywhere.', rating: 5 },
  { name: 'Jessica Monroe', role: 'Entrepreneur', text: 'Professional, fast, and the quality is top tier. My logo stands out and represents my brand perfectly.', rating: 5 },
  { name: 'DJ Supreme', role: 'Event Promoter', text: 'The flyers Bizzyplug designed for our event had the club packed out. Real results!', rating: 5 },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px', fontSize: 14, borderRadius: 10,
  border: `1.5px solid ${C.border}`, backgroundColor: C.bgCard, color: C.white, outline: 'none',
}

const sectionPad = { padding: '80px 24px' }

export default function BizzyPlugPublicPage() {
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES)
  const [siteSettings, setSiteSettings] = useState<any>({})
  const [mobileNav, setMobileNav] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [form, setForm] = useState({ artistName: '', email: '', instagram: '', songName: '', tracklist: '', details: '', deadline: '', notes: '' })
  const [refFiles, setRefFiles] = useState<File[]>([])
  const [bookingStep, setBookingStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [portfolioPhotos, setPortfolioPhotos] = useState<{ id: string; url: string; title: string; category: string }[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewForm, setReviewForm] = useState({ name: '', role: '', text: '', rating: 5 })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const contactRef = useRef<HTMLElement>(null)

  useEffect(() => {
    fetch('/api/bizzyplug/site-settings', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.settings) {
        setSiteSettings(d.settings)
        if (d.settings.services?.length > 0) setServices(d.settings.services)
      }
    }).catch(() => {})
    fetch('/api/bizzyplug/photos', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.photos?.length > 0) setPortfolioPhotos(d.photos)
    }).catch(() => {})
    fetch('/api/bizzyplug/reviews', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.reviews?.length > 0) setReviews(d.reviews)
    }).catch(() => {})
  }, [])

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileNav(false) }

  const selectService = (name: string) => {
    setSelectedServices(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
    setTimeout(() => contactRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const handleSubmit = async () => {
    if (!form.artistName || !form.email) return
    setSubmitting(true)
    try {
      let referenceUrls: string[] = []
      if (refFiles.length > 0) {
        const fd = new FormData()
        refFiles.forEach(f => fd.append('files', f))
        const upRes = await fetch('/api/bizzyplug/reference-upload', { method: 'POST', body: fd })
        if (upRes.ok) { const d = await upRes.json(); referenceUrls = d.urls || [] }
      }
      const res = await fetch('/api/bizzyplug/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, projectType: selectedServices.join(', '), referenceUrls }) })
      if (res.ok) { setSubmitted(true); setForm({ artistName: '', email: '', instagram: '', songName: '', tracklist: '', details: '', deadline: '', notes: '' }); setSelectedServices([]); setRefFiles([]) }
    } catch {}
    setSubmitting(false)
  }

  const handleReviewSubmit = async () => {
    if (!reviewForm.name || !reviewForm.text) return
    setReviewSubmitting(true)
    try {
      const res = await fetch('/api/bizzyplug/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reviewForm) })
      if (res.ok) { setReviewSubmitted(true); setReviewForm({ name: '', role: '', text: '', rating: 5 }) }
    } catch {}
    setReviewSubmitting(false)
  }

  const cashAppLink = siteSettings.cashAppTag ? `https://cash.app/${siteSettings.cashAppTag}` : 'https://cash.app/$BizzyPlug'
  const paypalLink = siteSettings.paypalEmail ? `https://paypal.me/${siteSettings.paypalEmail}` : 'https://paypal.me/buzyplug'
  const venmoLink = siteSettings.venmoHandle ? `https://venmo.com/${siteSettings.venmoHandle.replace('@', '')}` : 'https://venmo.com/Buzyplug'

  const bookingTotal = selectedServices.reduce((sum, name) => {
    const svc = services.find(s => s.name === name)
    if (!svc) return sum
    return sum + ((svc as any).salePrice !== undefined && (svc as any).salePrice !== null && (svc as any).salePrice < svc.price ? (svc as any).salePrice : svc.price)
  }, 0)

  const validPhotos = portfolioPhotos.filter(p => p.url && p.url.startsWith('http'))
  const featuredPhotos = validPhotos.length > 0 ? validPhotos.slice(-5).reverse() : PORTFOLIO_ITEMS.map((p, i) => ({ id: `default-${i}`, url: '', title: p.title, category: p.tag }))

  const allTestimonials = [...TESTIMONIALS, ...reviews.map((r: any) => ({ name: r.name, role: r.role || 'Client', text: r.text, rating: r.rating || 5 }))]

  const NAV_LINKS = [
    { label: 'Home', id: 'hero' }, { label: 'Book', id: 'contact' },
    { label: 'Portfolio', id: 'portfolio' }, { label: 'Reviews', id: 'testimonials' },
  ]

  return (
    <div style={{ backgroundColor: C.bg, color: C.white, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ═══ NAV ═══ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: `${C.bg}f0`, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ fontWeight: 900, fontSize: 20, color: C.white, letterSpacing: '0.04em' }}>BIZZY</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: C.purple, letterSpacing: '0.04em' }}>PLUG</span>
          </div>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="hidden-mobile">
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} style={{ background: 'none', border: 'none', color: C.mutedLight, fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.02em' }}>{l.label}</button>
            ))}
            <button onClick={() => scrollTo('contact')} style={{ padding: '10px 22px', borderRadius: 8, backgroundColor: C.purple, color: C.white, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>BOOK A DESIGN</button>
          </div>
          <button onClick={() => setMobileNav(!mobileNav)} className="show-mobile" style={{ background: 'none', border: 'none', color: C.white, cursor: 'pointer', padding: 4 }}>
            {mobileNav ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {mobileNav && (
          <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} style={{ background: 'none', border: 'none', color: C.mutedLight, fontSize: 15, fontWeight: 500, cursor: 'pointer', textAlign: 'left', padding: '8px 0' }}>{l.label}</button>
            ))}
            <button onClick={() => scrollTo('contact')} style={{ padding: '12px 0', borderRadius: 8, backgroundColor: C.purple, color: C.white, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, marginTop: 4 }}>BOOK A DESIGN</button>
          </div>
        )}
      </nav>

      <style>{`
        @font-face {
          font-family: 'Akira Expanded';
          src: url('/fonts/Akira-Expanded.otf') format('opentype');
          font-weight: 800;
          font-style: normal;
          font-display: swap;
        }
        .hidden-mobile { display: flex !important; }
        .show-mobile { display: none !important; }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>

      {/* ═══ HERO ═══ */}
      <section id="hero" style={{ ...sectionPad, paddingTop: 60, paddingBottom: 60, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${C.purple}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px', minWidth: 300 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>PREMIUM DESIGN. REAL IMPACT.</div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, lineHeight: 1.12, margin: '0 0 20px', letterSpacing: '0.02em', fontFamily: "'Akira Expanded', 'Inter', sans-serif" }}>
              {siteSettings.heroHeadline ? (
                <>{siteSettings.heroHeadline.split(/\b(Authentic|authentic)\b/).map((part: string, i: number) =>
                  /authentic/i.test(part) ? <span key={i} style={{ color: C.purple }}>{part}</span> : part
                )}</>
              ) : (
                <>Tired Of The AI Covers,<br />Lets Get You Something<br /><span style={{ color: C.purple }}>Authentic</span></>
              )}
            </h1>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, margin: '0 0 32px', maxWidth: 480 }}>
              {siteSettings.bio || 'Stand out with custom album covers, logos, flyers, and websites designed to elevate artists, entrepreneurs, brands, and nightlife & event experiences.'}
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 36 }}>
              <button onClick={() => scrollTo('contact')} style={{ padding: '14px 28px', borderRadius: 8, backgroundColor: C.purple, color: C.white, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                BOOK A DESIGN <ArrowRight size={16} />
              </button>
              <a href="/bizzyplug/portfolio" style={{ padding: '14px 28px', borderRadius: 8, backgroundColor: 'transparent', color: C.white, border: `1.5px solid ${C.border}`, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                VIEW PORTFOLIO <ArrowRight size={16} />
              </a>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {['100% Custom Designs', 'Fast Turnaround', 'Satisfaction Guaranteed'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.mutedLight }}>
                  <Check size={14} style={{ color: C.purple }} /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BOOKING FLOW ═══ */}
      <section id="contact" ref={contactRef} style={{ ...sectionPad, background: `linear-gradient(180deg, ${C.bgCard} 0%, ${C.purple}10 50%, ${C.bgCard} 100%)` }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>READY TO LEVEL UP?</div>
            <h2 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 8px' }}>Book Your Design</h2>
          </div>

          {/* Step Indicator */}
          {!submitted && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 28 }}>
              {[{ n: 1, label: 'Services' }, { n: 2, label: 'Details' }, { n: 3, label: 'Payment' }].map(({ n, label }) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                    backgroundColor: bookingStep >= n ? C.purple : C.border, color: bookingStep >= n ? C.white : C.muted }}>
                    {bookingStep > n ? <Check size={14} /> : n}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: bookingStep >= n ? C.white : C.muted, marginRight: 8 }}>{label}</span>
                  {n < 3 && <div style={{ width: 24, height: 2, backgroundColor: bookingStep > n ? C.purple : C.border, marginRight: 4 }} />}
                </div>
              ))}
            </div>
          )}

          {submitted ? (
            <div style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 48, textAlign: 'center', border: `1px solid ${C.green}40` }}>
              <CheckCircle size={48} style={{ color: C.green, marginBottom: 16 }} />
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>You're All Set!</h3>
              <p style={{ color: C.muted, fontSize: 14 }}>Your project has been submitted and added to our system. We'll follow up within 24 hours.</p>
              <button onClick={() => { setSubmitted(false); setBookingStep(1) }} style={{ marginTop: 20, padding: '12px 28px', borderRadius: 8, backgroundColor: C.purple, color: C.white, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Start New Project</button>
            </div>
          ) : (
            <div style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 28, border: `1px solid ${C.border}` }}>

              {/* Step 1: Services */}
              {bookingStep === 1 && (
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 12 }}>Select the services you need:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
                    {services.map((s, i) => {
                      const sel = selectedServices.includes(s.name)
                      const hasSale = (s as any).salePrice !== undefined && (s as any).salePrice < s.price
                      return (
                        <div key={i} onClick={() => setSelectedServices(prev => prev.includes(s.name) ? prev.filter(x => x !== s.name) : [...prev, s.name])}
                          style={{ padding: 14, borderRadius: 10, cursor: 'pointer', textAlign: 'center', border: sel ? `2px solid ${C.purple}` : `1px solid ${C.border}`, backgroundColor: sel ? `${C.purple}15` : C.bg }}>
                          {sel && <Check size={12} style={{ color: C.purple, marginBottom: 4 }} />}
                          <p style={{ fontSize: 12, fontWeight: 600, color: C.mutedLight, margin: '0 0 2px' }}>{s.name}</p>
                          {hasSale ? (
                            <div><span style={{ fontSize: 16, fontWeight: 900, color: C.green }}>${(s as any).salePrice}</span> <span style={{ fontSize: 11, color: C.muted, textDecoration: 'line-through' }}>${s.price}</span></div>
                          ) : (
                            <p style={{ fontSize: 16, fontWeight: 900, color: C.purple, margin: 0 }}>${s.price}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {selectedServices.length > 0 && (
                    <div style={{ padding: 12, borderRadius: 10, backgroundColor: C.bg, border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <span style={{ fontSize: 13, color: C.mutedLight }}>{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: C.purple }}>Total: ${bookingTotal}</span>
                    </div>
                  )}
                  <button onClick={() => setBookingStep(2)} disabled={selectedServices.length === 0}
                    style={{ width: '100%', padding: '14px 0', borderRadius: 10, fontSize: 14, fontWeight: 800, backgroundColor: selectedServices.length === 0 ? C.border : C.purple, color: C.white, border: 'none', cursor: selectedServices.length === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    CONTINUE <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* Step 2: Details */}
              {bookingStep === 2 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Artist / Brand Name *</label><input style={inputStyle} placeholder="Your name or brand" value={form.artistName} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Instagram</label><input style={inputStyle} placeholder="@yourhandle" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email *</label><input style={inputStyle} type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Deadline</label><input style={inputStyle} type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Song / Project Name</label><input style={inputStyle} placeholder="Song title or project name" value={form.songName} onChange={e => setForm(f => ({ ...f, songName: e.target.value }))} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Project Details</label><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const }} placeholder="Describe your vision, style references, colors..." value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} /></div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Reference Photos (optional)</label>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 10, border: `1.5px dashed ${C.border}`, backgroundColor: `${C.purple}08`, cursor: 'pointer', fontSize: 13, color: C.mutedLight }}>
                        <Image size={16} style={{ color: C.purple }} /> {refFiles.length > 0 ? `${refFiles.length} file${refFiles.length > 1 ? 's' : ''} selected` : 'Upload reference images'}
                        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) setRefFiles(Array.from(e.target.files)); }} />
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button onClick={() => setBookingStep(1)} style={{ flex: 1, padding: '14px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, backgroundColor: C.bg, color: C.mutedLight, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Back</button>
                    <button onClick={() => setBookingStep(3)} disabled={!form.artistName || !form.email}
                      style={{ flex: 2, padding: '14px 0', borderRadius: 10, fontSize: 14, fontWeight: 800, backgroundColor: (!form.artistName || !form.email) ? C.border : C.purple, color: C.white, border: 'none', cursor: (!form.artistName || !form.email) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      CONTINUE TO PAYMENT <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {bookingStep === 3 && (
                <div>
                  <div style={{ padding: 16, borderRadius: 12, backgroundColor: C.bg, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 8 }}>Order Summary</p>
                    {selectedServices.map(s => {
                      const svc = services.find(x => x.name === s)
                      const hasSale = svc && (svc as any).salePrice !== undefined && (svc as any).salePrice < svc.price
                      return (
                        <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 13, color: C.mutedLight }}>{s}</span>
                          {hasSale ? (
                            <span><span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>${(svc as any).salePrice}</span> <span style={{ fontSize: 11, textDecoration: 'line-through', color: C.muted }}>${svc!.price}</span></span>
                          ) : (
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>${svc?.price || 0}</span>
                          )}
                        </div>
                      )
                    })}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: C.white }}>Total</span>
                      <span style={{ fontSize: 22, fontWeight: 900, color: C.purple }}>${bookingTotal}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 10 }}>Select payment method:</p>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    {[
                      { label: 'Cash App', href: cashAppLink },
                      { label: 'PayPal', href: paypalLink },
                      { label: 'Venmo', href: venmoLink },
                    ].map((p, i) => (
                      <a key={i} href={p.href} target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, padding: '14px 0', borderRadius: 10, backgroundColor: C.bg, border: `1px solid ${C.border}`, color: C.white, fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center', display: 'block' }}>
                        {p.label}
                      </a>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginBottom: 16 }}>Complete payment using one of the methods above, then submit your project below.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setBookingStep(2)} style={{ flex: 1, padding: '14px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, backgroundColor: C.bg, color: C.mutedLight, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Back</button>
                    <button onClick={handleSubmit} disabled={submitting}
                      style={{ flex: 2, padding: '14px 0', borderRadius: 10, fontSize: 14, fontWeight: 800, backgroundColor: C.purple, color: C.white, border: 'none', cursor: 'pointer', opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {submitting ? 'Submitting...' : <>SUBMIT PROJECT <CheckCircle size={16} /></>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <a href={`mailto:${siteSettings.contactEmail || 'buzyplug@gmail.com'}`} style={{ color: C.muted, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} /> Questions? TALK TO US <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </section>

      {/* ═══ PORTFOLIO ═══ */}
      <section id="portfolio" style={{ ...sectionPad, backgroundColor: C.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>FEATURED WORK</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Our Latest Creations</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {featuredPhotos.map((item, i) => (
              <div key={item.id || i} style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: C.bgCard, border: `1px solid ${C.border}` }}>
                {item.url ? (
                  <img src={item.url} alt={item.title} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ height: 200, backgroundColor: `${C.purpleDim}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={40} style={{ color: C.purpleDim, opacity: 0.4 }} />
                  </div>
                )}
                <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 2px' }}>{item.title}</p>
                    <p style={{ fontSize: 12, color: C.muted, margin: 0, textTransform: 'capitalize' }}>{item.category.replace('-', ' ')}</p>
                  </div>
                  <PenTool size={14} style={{ color: C.muted }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <a href="/bizzyplug/portfolio" style={{ background: 'none', border: 'none', color: C.purple, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              VIEW FULL PORTFOLIO <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS + REVIEWS ═══ */}
      <section id="testimonials" style={{ ...sectionPad, backgroundColor: C.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>CLIENT RESULTS</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 32px' }}>What Our Clients Say</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {allTestimonials.map((t, i) => (
              <div key={i} style={{ padding: 28, borderRadius: 14, backgroundColor: C.bgCard, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
                  {Array.from({ length: t.rating }).map((_, j) => <Star key={j} size={14} fill={C.purple} style={{ color: C.purple }} />)}
                </div>
                <p style={{ fontSize: 14, color: C.mutedLight, lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: `${C.purple}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: C.purple }}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{t.name}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Review Submission */}
          <div style={{ marginTop: 48, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <MessageSquare size={18} style={{ color: C.purple }} />
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Leave a Review</h3>
            </div>
            {reviewSubmitted ? (
              <div style={{ backgroundColor: C.bgCard, borderRadius: 14, padding: 32, textAlign: 'center', border: `1px solid ${C.green}40` }}>
                <CheckCircle size={32} style={{ color: C.green, marginBottom: 8 }} />
                <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>Thank you!</p>
                <p style={{ color: C.muted, fontSize: 13 }}>Your review has been submitted.</p>
              </div>
            ) : (
              <div style={{ backgroundColor: C.bgCard, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Your Name *</label><input style={{ ...inputStyle, padding: '10px 14px', fontSize: 13 }} placeholder="Your name" value={reviewForm.name} onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Title / Role</label><input style={{ ...inputStyle, padding: '10px 14px', fontSize: 13 }} placeholder="e.g. Recording Artist" value={reviewForm.role} onChange={e => setReviewForm(f => ({ ...f, role: e.target.value }))} /></div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Rating</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        <Star size={20} fill={n <= reviewForm.rating ? C.purple : 'none'} style={{ color: n <= reviewForm.rating ? C.purple : C.border }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Your Review *</label>
                  <textarea style={{ ...inputStyle, padding: '10px 14px', fontSize: 13, minHeight: 80, resize: 'vertical' as const }} placeholder="Tell us about your experience..." value={reviewForm.text} onChange={e => setReviewForm(f => ({ ...f, text: e.target.value }))} />
                </div>
                <button onClick={handleReviewSubmit} disabled={reviewSubmitting || !reviewForm.name || !reviewForm.text} style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  backgroundColor: (!reviewForm.name || !reviewForm.text) ? C.border : C.purple,
                  color: C.white, border: 'none', cursor: (!reviewForm.name || !reviewForm.text) ? 'default' : 'pointer',
                  opacity: reviewSubmitting ? 0.6 : 1,
                }}>
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: '48px 24px 32px', borderTop: `1px solid ${C.border}`, backgroundColor: C.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 8 }}>
              <span style={{ fontWeight: 900, fontSize: 18, color: C.white }}>BIZZY</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: C.purple }}>PLUG</span>
            </div>
            <p style={{ fontSize: 12, color: C.muted }}>&copy; {new Date().getFullYear()} Bizzyplug. All Rights Reserved.</p>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Quick Links</p>
              {['Home', 'Book', 'Portfolio', 'Reviews'].map(l => (
                <button key={l} onClick={() => scrollTo(l === 'Book' ? 'contact' : l === 'Reviews' ? 'testimonials' : l.toLowerCase())} style={{ display: 'block', background: 'none', border: 'none', color: C.mutedLight, fontSize: 12, cursor: 'pointer', padding: '3px 0' }}>{l}</button>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Connect</p>
              <a href={siteSettings.instagramUrl || 'https://instagram.com/bizzyplug'} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.mutedLight, fontSize: 12, textDecoration: 'none', padding: '3px 0' }}><Instagram size={13} /> Instagram</a>
              <a href={`mailto:${siteSettings.contactEmail || 'buzyplug@gmail.com'}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.mutedLight, fontSize: 12, textDecoration: 'none', padding: '3px 0' }}><Mail size={13} /> Email</a>
            </div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: C.bgCard, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontWeight: 900, fontSize: 18, color: C.purple }}>BP</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
