'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle, Send, Star, Instagram, Mail, Phone, Menu, X, Check, Disc3, PenTool, Image, Globe, Sparkles } from 'lucide-react'

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

interface Service { name: string; price: number; description?: string; popular?: boolean }

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

const SERVICE_CARDS = [
  { icon: Disc3, title: 'Album Covers', desc: 'Stand out in the music industry with custom album artwork that captures your sound and story.' },
  { icon: PenTool, title: 'Logos', desc: 'Bold, memorable logos that represent your brand and leave a lasting impression.' },
  { icon: Image, title: 'Flyers', desc: 'High-impact flyers designed to promote your events and fill the room every time.' },
  { icon: Globe, title: 'Websites', desc: 'Modern, responsive websites that elevate your brand and convert visitors to clients.' },
]

const PROJECT_TYPES = [
  'Pre-Made Artwork', 'Custom Artwork', 'Story Promo Ad', 'Streaming Ad',
  'Tracklist', 'Flyer', 'Cartoons', 'Logos', 'Album Cover', 'Branding', 'Social Media Kit', 'Website', 'Other',
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
  const [portfolioFilter, setPortfolioFilter] = useState('all')
  const [form, setForm] = useState({ artistName: '', email: '', instagram: '', projectType: '', songName: '', tracklist: '', details: '', deadline: '', notes: '' })
  const [refFiles, setRefFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [portfolioPhotos, setPortfolioPhotos] = useState<{ id: string; url: string; title: string; category: string }[]>([])
  const [portfolioCategories, setPortfolioCategories] = useState<{ label: string; val: string }[]>([
    { label: 'Album Covers', val: 'album-covers' }, { label: 'Logos', val: 'logos' }, { label: 'Flyers', val: 'flyers' }, { label: 'Websites', val: 'websites' },
  ])

  useEffect(() => {
    fetch('/api/bizzyplug/site-settings', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.settings) {
        setSiteSettings(d.settings)
        if (d.settings.services?.length > 0) setServices(d.settings.services)
        if (d.settings.portfolioCategories?.length > 0) {
          setPortfolioCategories(d.settings.portfolioCategories.map((c: string) => ({ label: c.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), val: c })))
        }
      }
    }).catch(() => {})
    fetch('/api/bizzyplug/photos', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.photos?.length > 0) setPortfolioPhotos(d.photos)
    }).catch(() => {})
  }, [])

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileNav(false) }

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
      const res = await fetch('/api/bizzyplug/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, referenceUrls }) })
      if (res.ok) { setSubmitted(true); setForm({ artistName: '', email: '', instagram: '', projectType: '', songName: '', tracklist: '', details: '', deadline: '', notes: '' }); setRefFiles([]) }
    } catch {}
    setSubmitting(false)
  }

  const cashAppLink = siteSettings.cashAppTag ? `https://cash.app/${siteSettings.cashAppTag}` : 'https://cash.app/$BizzyPlug'
  const paypalLink = siteSettings.paypalEmail ? `https://paypal.me/${siteSettings.paypalEmail}` : 'https://paypal.me/buzyplug'
  const venmoLink = siteSettings.venmoHandle ? `https://venmo.com/${siteSettings.venmoHandle.replace('@', '')}` : 'https://venmo.com/Buzyplug'

  const displayPortfolio = portfolioPhotos.length > 0 ? portfolioPhotos : PORTFOLIO_ITEMS.map((p, i) => ({ id: `default-${i}`, url: '', title: p.title, category: p.tag }))
  const filteredPortfolio = portfolioFilter === 'all' ? displayPortfolio : displayPortfolio.filter(p => p.category === portfolioFilter)
  const featuredPhotos = portfolioPhotos.length > 0 ? portfolioPhotos.slice(-5).reverse() : PORTFOLIO_ITEMS.map((p, i) => ({ id: `default-${i}`, url: '', title: p.title, category: p.tag }))

  const NAV_LINKS = [
    { label: 'Home', id: 'hero' }, { label: 'About', id: 'about' }, { label: 'Services', id: 'services' },
    { label: 'Portfolio', id: 'portfolio' }, { label: 'Testimonials', id: 'testimonials' }, { label: 'Contact', id: 'contact' },
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
          {/* Desktop nav */}
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="hidden-mobile">
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} style={{ background: 'none', border: 'none', color: C.mutedLight, fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.02em' }}>{l.label}</button>
            ))}
            <button onClick={() => scrollTo('contact')} style={{ padding: '10px 22px', borderRadius: 8, backgroundColor: C.purple, color: C.white, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>BOOK A DESIGN</button>
          </div>
          {/* Mobile hamburger */}
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
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.08, margin: '0 0 20px', letterSpacing: '-0.02em' }}>
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
              <button onClick={() => scrollTo('portfolio')} style={{ padding: '14px 28px', borderRadius: 8, backgroundColor: 'transparent', color: C.white, border: `1.5px solid ${C.border}`, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                VIEW PORTFOLIO <ArrowRight size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {['100% Custom Designs', 'Fast Turnaround', 'Unlimited Revisions', 'Satisfaction Guaranteed'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.mutedLight }}>
                  <Check size={14} style={{ color: C.purple }} /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PORTFOLIO ═══ */}
      <section id="portfolio" style={{ ...sectionPad, backgroundColor: C.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>FEATURED WORK</div>
              <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Our Latest Creations</h2>
            </div>
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

      {/* ═══ SERVICES ═══ */}
      <section id="services" style={{ ...sectionPad, backgroundColor: C.bgCard }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            {/* Services cards */}
            <div style={{ flex: '1 1 500px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>WHAT WE DO</div>
              <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 28px' }}>Premium Design Services</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {SERVICE_CARDS.map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={i} style={{ padding: 24, borderRadius: 14, backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${C.purple}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                        <Icon size={22} style={{ color: C.purple }} />
                      </div>
                      <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>{s.title}</p>
                      <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, margin: '0 0 12px' }}>{s.desc}</p>
                      <button onClick={() => scrollTo('contact')} style={{ background: 'none', border: 'none', color: C.purple, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                        LEARN MORE <ArrowRight size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* About section */}
            <div id="about" style={{ flex: '1 1 380px', minWidth: 300 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>ABOUT BIZZYPLUG</div>
              <h2 style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.15, margin: '0 0 16px' }}>{siteSettings.aboutHeadline || 'Creativity. Culture.\nBranding That Hits.'}</h2>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, margin: '0 0 24px' }}>
                {siteSettings.aboutText || 'Bizzyplug is more than a design studio — we\'re your creative partner. We blend urban culture, modern aesthetics, and strategic thinking to build powerful visual identities that connect, inspire, and drive real results.'}
              </p>
              {['Urban Inspired, Globally Respected', 'Creative Excellence', 'Professional & Reliable'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Check size={16} style={{ color: C.purple }} />
                  <span style={{ fontSize: 14, color: C.mutedLight }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Pricing grid */}
          <div style={{ marginTop: 48 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Pricing</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {services.map((s, i) => (
                <div key={i} style={{ padding: 20, borderRadius: 12, backgroundColor: C.bg, border: s.popular ? `1.5px solid ${C.purple}` : `1px solid ${C.border}`, position: 'relative' }}>
                  {s.popular && <div style={{ position: 'absolute', top: 8, right: 8, padding: '2px 8px', borderRadius: 100, backgroundColor: C.purple, fontSize: 9, fontWeight: 700, color: C.white }}>POPULAR</div>}
                  <p style={{ fontWeight: 600, fontSize: 13, color: C.mutedLight, margin: '0 0 4px' }}>{s.name}</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: C.purple, margin: 0 }}>${s.price}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="testimonials" style={{ ...sectionPad, backgroundColor: C.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>CLIENT RESULTS</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 32px' }}>What Our Clients Say</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
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
        </div>
      </section>

      {/* ═══ CONTACT / BOOK A DESIGN ═══ */}
      <section id="contact" style={{ ...sectionPad, background: `linear-gradient(180deg, ${C.bgCard} 0%, ${C.purple}10 50%, ${C.bgCard} 100%)` }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>READY TO LEVEL UP?</div>
            <h2 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 8px' }}>Let's Bring Your Vision To Life</h2>
            <p style={{ color: C.muted, fontSize: 15 }}>Whether you're an artist, entrepreneur, brand, or promoter — we're here to deliver designs that set you apart.</p>
          </div>

          {submitted ? (
            <div style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 48, textAlign: 'center', border: `1px solid ${C.green}40` }}>
              <CheckCircle size={48} style={{ color: C.green, marginBottom: 16 }} />
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Request Submitted!</h3>
              <p style={{ color: C.muted, fontSize: 14 }}>We'll review your project and follow up within 24 hours.</p>
              <button onClick={() => setSubmitted(false)} style={{ marginTop: 20, padding: '12px 28px', borderRadius: 8, backgroundColor: C.purple, color: C.white, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Submit Another</button>
            </div>
          ) : (
            <div style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 28, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Artist / Brand Name *</label><input style={inputStyle} placeholder="Your name or brand" value={form.artistName} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Instagram</label><input style={inputStyle} placeholder="@yourhandle" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Email *</label><input style={inputStyle} type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Service Needed</label><select style={{ ...inputStyle, cursor: 'pointer' }} value={form.projectType} onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))}><option value="">Select a service...</option>{PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Deadline</label><input style={inputStyle} type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Song / Project Name</label><input style={inputStyle} placeholder="Song title or project name" value={form.songName} onChange={e => setForm(f => ({ ...f, songName: e.target.value }))} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Project Details</label><textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' as const }} placeholder="Describe your vision, style references, colors, text to include..." value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Notes</label><textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' as const }} placeholder="Anything else?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Reference Photos (optional)</label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0', borderRadius: 10, border: `1.5px dashed ${C.border}`, backgroundColor: `${C.purple}08`, cursor: 'pointer', fontSize: 13, color: C.mutedLight }}>
                    <Image size={16} style={{ color: C.purple }} /> {refFiles.length > 0 ? `${refFiles.length} file${refFiles.length > 1 ? 's' : ''} selected` : 'Upload reference images, inspiration, or examples'}
                    <input type="file" accept="image/*" multiple className="hidden" style={{ display: 'none' }} onChange={e => { if (e.target.files) setRefFiles(Array.from(e.target.files)); }} />
                  </label>
                  {refFiles.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {refFiles.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, backgroundColor: C.bgCard, border: `1px solid ${C.border}`, fontSize: 11, color: C.mutedLight }}>
                          {f.name.length > 20 ? f.name.slice(0, 17) + '...' : f.name}
                          <button onClick={() => setRefFiles(refFiles.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={handleSubmit} disabled={submitting || !form.artistName || !form.email} style={{
                width: '100%', marginTop: 20, padding: '16px 0', borderRadius: 10,
                backgroundColor: (!form.artistName || !form.email) ? C.border : C.purple,
                color: C.white, border: 'none', cursor: (!form.artistName || !form.email) ? 'default' : 'pointer',
                fontSize: 15, fontWeight: 800, opacity: submitting ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {submitting ? 'Submitting...' : <>START YOUR PROJECT <ArrowRight size={16} /></>}
              </button>
            </div>
          )}

          {/* Payment + Talk to us */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Cash App', href: cashAppLink },
              { label: 'PayPal', href: paypalLink },
              { label: 'Venmo', href: venmoLink },
            ].map((p, i) => (
              <a key={i} href={p.href} target="_blank" rel="noopener noreferrer"
                style={{ padding: '8px 18px', borderRadius: 8, backgroundColor: C.bgCard, border: `1px solid ${C.border}`, color: C.mutedLight, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                {p.label}
              </a>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="mailto:buzyplug@gmail.com" style={{ color: C.muted, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} /> TALK TO US <ArrowRight size={12} />
            </a>
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
              {['Home', 'About', 'Services', 'Portfolio', 'Contact'].map(l => (
                <button key={l} onClick={() => scrollTo(l.toLowerCase())} style={{ display: 'block', background: 'none', border: 'none', color: C.mutedLight, fontSize: 12, cursor: 'pointer', padding: '3px 0' }}>{l}</button>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Connect</p>
              <a href={siteSettings.instagramUrl || 'https://instagram.com/bizzyplug'} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.mutedLight, fontSize: 12, textDecoration: 'none', padding: '3px 0' }}><Instagram size={13} /> Instagram</a>
              <a href="https://behance.net/bizzyplug" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.mutedLight, fontSize: 12, textDecoration: 'none', padding: '3px 0' }}><Globe size={13} /> Behance</a>
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
