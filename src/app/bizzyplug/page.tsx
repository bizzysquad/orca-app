'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { ArrowRight, CheckCircle, Star, Instagram, Mail, Menu, X, Check, PenTool, Image, Globe, Sparkles, MessageSquare, Upload, Camera } from 'lucide-react'

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

const THEME_PRESETS = [
  {
    id: 'dark-modern',
    name: 'Dark Modern',
    colors: {
      bg: '#09090b', bgCard: '#131316', bgCardHover: '#1a1a1f', border: '#27272a',
      purple: '#8B5CF6', purpleGlow: '#7C3AED', purpleLight: '#A78BFA', purpleDim: '#6D28D9',
      white: '#F4F4F5', muted: '#71717A', mutedLight: '#A1A1AA', green: '#10B981',
    },
    glowEnabled: false,
    gradientStyle: 'radial' as const,
  },
  {
    id: 'light-clean',
    name: 'Light Clean',
    colors: {
      bg: '#FFFFFF', bgCard: '#F9FAFB', bgCardHover: '#F3F4F6', border: '#E5E7EB',
      purple: '#7C3AED', purpleGlow: '#6D28D9', purpleLight: '#8B5CF6', purpleDim: '#5B21B6',
      white: '#111827', muted: '#6B7280', mutedLight: '#4B5563', green: '#059669',
    },
    glowEnabled: false,
    gradientStyle: 'none' as const,
  },
  {
    id: 'dark-slate',
    name: 'Dark Slate',
    colors: {
      bg: '#0F172A', bgCard: '#1E293B', bgCardHover: '#253348', border: '#334155',
      purple: '#6366F1', purpleGlow: '#4F46E5', purpleLight: '#818CF8', purpleDim: '#4338CA',
      white: '#F1F5F9', muted: '#94A3B8', mutedLight: '#CBD5E1', green: '#10B981',
    },
    glowEnabled: false,
    gradientStyle: 'radial' as const,
  },
  {
    id: 'light-warm',
    name: 'Light Warm',
    colors: {
      bg: '#FFFBF5', bgCard: '#FFF7ED', bgCardHover: '#FFF1E0', border: '#E7DDD0',
      purple: '#9333EA', purpleGlow: '#7C3AED', purpleLight: '#A855F7', purpleDim: '#7E22CE',
      white: '#1C1917', muted: '#78716C', mutedLight: '#57534E', green: '#059669',
    },
    glowEnabled: false,
    gradientStyle: 'none' as const,
  },
  {
    id: 'dark-charcoal',
    name: 'Dark Charcoal',
    colors: {
      bg: '#171717', bgCard: '#1F1F1F', bgCardHover: '#262626', border: '#2E2E2E',
      purple: '#A855F7', purpleGlow: '#9333EA', purpleLight: '#C084FC', purpleDim: '#7E22CE',
      white: '#FAFAFA', muted: '#737373', mutedLight: '#A3A3A3', green: '#10B981',
    },
    glowEnabled: false,
    gradientStyle: 'radial' as const,
  },
]

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
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES)
  const [siteSettings, setSiteSettings] = useState<any>({})
  const [mobileNav, setMobileNav] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [serviceDescriptions, setServiceDescriptions] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ artistName: '', email: '', instagram: '', songName: '', tracklist: '', details: '', deadline: '', notes: '' })
  const [refFiles, setRefFiles] = useState<File[]>([])
  const [mp3Files, setMp3Files] = useState<File[]>([])
  const [mp3Error, setMp3Error] = useState('')
  const [bookingStep, setBookingStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [portfolioPhotos, setPortfolioPhotos] = useState<{ id: string; url: string; title: string; category: string }[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [rolloutPackages, setRolloutPackages] = useState<any[]>([])
  const [activePackage, setActivePackage] = useState(0)
  const [sectionOrder, setSectionOrder] = useState<string[]>(['booking', 'portfolio', 'rollout', 'testimonials'])
  const [hiddenSections, setHiddenSections] = useState<string[]>([])
  const [reviewForm, setReviewForm] = useState({ name: '', role: '', text: '', rating: 5 })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeError, setStripeError] = useState('')
  const [altPayMethod, setAltPayMethod] = useState<'cashapp' | 'venmo' | null>(null)
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const contactRef = useRef<HTMLElement>(null)

  const activeTheme = useMemo(() => {
    const themeId = siteSettings.activeTheme || 'dark-modern'
    const preset = THEME_PRESETS.find(t => t.id === themeId) || THEME_PRESETS[1]
    const overrides = siteSettings.themeOverrides || {}
    return {
      colors: { ...preset.colors, ...overrides },
      glowEnabled: siteSettings.glowEnabled !== undefined ? siteSettings.glowEnabled : preset.glowEnabled,
      gradientStyle: siteSettings.gradientStyle || preset.gradientStyle,
    }
  }, [siteSettings])

  const T = activeTheme.colors

  useEffect(() => {
    Promise.all([
      fetch('/api/bizzyplug/site-settings', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
        if (d?.settings) {
          setSiteSettings(d.settings)
          if (d.settings.services?.length > 0) setServices(d.settings.services)
          if (d.settings.rolloutPackages?.length > 0) setRolloutPackages(d.settings.rolloutPackages)
          if (d.settings.sectionOrder?.length > 0) setSectionOrder(d.settings.sectionOrder)
          if (d.settings.hiddenSections) setHiddenSections(d.settings.hiddenSections)
        }
      }).catch(() => {}),
      fetch('/api/bizzyplug/photos', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
        if (d?.photos?.length > 0) setPortfolioPhotos(d.photos)
      }).catch(() => {}),
    ]).finally(() => setSettingsLoaded(true))
    fetch('/api/bizzyplug/reviews', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.reviews?.length > 0) setReviews(d.reviews)
    }).catch(() => {})
  }, [])

  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileNav(false) }

  const compressFile = (file: File, maxDim = 1200, quality = 0.75): Promise<File> =>
    new Promise(resolve => {
      if (file.size < 300_000 || !file.type.startsWith('image/')) { resolve(file); return }
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img
        if (width > maxDim || height > maxDim) { const s = maxDim / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s) }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => {
          if (blob && blob.size < file.size) resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
          else resolve(file)
        }, 'image/jpeg', quality)
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })

  const uploadSingleFile = async (file: File): Promise<string | null> => {
    try {
      const compressed = await compressFile(file)
      const fd = new FormData()
      fd.append('files', compressed)
      const res = await fetch('/api/bizzyplug/reference-upload', { method: 'POST', body: fd })
      if (res.ok) { const d = await res.json(); return d.urls?.[0] || null }
    } catch {}
    return null
  }

  const handleMp3Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const incoming = Array.from(e.target.files)
    const invalid = incoming.filter(f => f.type !== 'audio/mpeg' && !f.name.toLowerCase().endsWith('.mp3'))
    if (invalid.length > 0) { setMp3Error(`Only MP3 files are accepted. "${invalid[0].name}" is not an MP3.`); e.target.value = ''; return }
    const combined = [...mp3Files, ...incoming]
    if (combined.length > 4) { setMp3Error(`Maximum 4 MP3 files. You have ${mp3Files.length} already — only ${4 - mp3Files.length} more slot${4 - mp3Files.length !== 1 ? 's' : ''} available.`); e.target.value = ''; return }
    setMp3Error('')
    setMp3Files(combined)
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!form.artistName || !form.email) return
    if (!altPayMethod || !paymentScreenshot) return
    setSubmitting(true)
    try {
      // Upload reference photos individually in parallel (no giant single request)
      const refUrls: (string | null)[] = refFiles.length > 0
        ? await Promise.all(refFiles.map(f => uploadSingleFile(f)))
        : []
      // Upload MP3 files
      const mp3Urls: (string | null)[] = mp3Files.length > 0
        ? await Promise.all(mp3Files.map(f => uploadSingleFile(f)))
        : []
      // Upload payment screenshot separately
      const screenshotUrl = await uploadSingleFile(paymentScreenshot)
      const referenceUrls = [...refUrls.filter(Boolean), ...mp3Urls.filter(Boolean), screenshotUrl].filter(Boolean) as string[]

      const payNote = `[Paid via ${altPayMethod === 'cashapp' ? 'Cash App' : 'Venmo'} — screenshot attached]`
      const mp3Note = mp3Files.length > 0 ? `\n[${mp3Files.length} MP3 file${mp3Files.length !== 1 ? 's' : ''} attached: ${mp3Files.map(f => f.name).join(', ')}]` : ''
      const svcDescs = selectedServices.reduce<Record<string, string>>((acc, name) => { const v = serviceDescriptions[name]; if (v) acc[name] = v; Object.keys(serviceDescriptions).filter(k => k.startsWith(`${name}::`)).forEach(k => { if (serviceDescriptions[k]) acc[k] = serviceDescriptions[k] }); return acc }, {})
      const res = await fetch('/api/bizzyplug/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, notes: `${form.notes}\n${payNote}${mp3Note}`.trim(), projectType: selectedServices.join(', '), referenceUrls, serviceDescriptions: svcDescs, paidAmount: bookingTotal }) })
      if (res.ok) { setSubmitted(true); setForm({ artistName: '', email: '', instagram: '', songName: '', tracklist: '', details: '', deadline: '', notes: '' }); setSelectedServices([]); setServiceDescriptions({}); setRefFiles([]); setMp3Files([]); setMp3Error(''); setPaymentScreenshot(null); setAltPayMethod(null) }
      else { const err = await res.json().catch(() => ({})); console.error('Intake failed:', err) }
    } catch (e) { console.error('Submit error:', e) }
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

  const handleStripeCheckout = async () => {
    setStripeLoading(true)
    setStripeError('')
    try {
      const serviceItems = selectedServices.map(name => {
        const svc = services.find(s => s.name === name)
        const price = svc && (svc as any).salePrice !== undefined && (svc as any).salePrice < svc.price
          ? (svc as any).salePrice : svc?.price || 0
        return { name, price }
      })
      const svcDescs = selectedServices.reduce<Record<string, string>>((acc, name) => { const v = serviceDescriptions[name]; if (v) acc[name] = v; Object.keys(serviceDescriptions).filter(k => k.startsWith(`${name}::`)).forEach(k => { if (serviceDescriptions[k]) acc[k] = serviceDescriptions[k] }); return acc }, {})
      const res = await fetch('/api/bizzyplug/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: serviceItems, form, serviceDescriptions: svcDescs }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')
      if (data.url) window.location.href = data.url
    } catch (err: any) {
      setStripeError(err.message || 'Payment failed. Please try another method.')
    }
    setStripeLoading(false)
  }

  const cashAppLink = siteSettings.cashAppTag ? `https://cash.app/${siteSettings.cashAppTag}` : 'https://cash.app/$BizzyPlug'
  const venmoLink = siteSettings.venmoHandle ? `https://venmo.com/${siteSettings.venmoHandle.replace('@', '')}` : 'https://venmo.com/Buzyplug'

  const bookingTotal = selectedServices.reduce((sum, name) => {
    const svc = services.find(s => s.name === name)
    if (!svc) return sum
    return sum + ((svc as any).salePrice !== undefined && (svc as any).salePrice !== null && (svc as any).salePrice < svc.price ? (svc as any).salePrice : svc.price)
  }, 0)

  const validPhotos = portfolioPhotos.filter(p => p.url && p.url.startsWith('http'))
  const featuredPhotos = validPhotos.slice(-5).reverse()

  const allTestimonials = [...TESTIMONIALS, ...reviews.map((r: any) => ({ name: r.name, role: r.role || 'Client', text: r.text, rating: r.rating || 5 }))]

  const NAV_LINKS = [
    { label: 'Home', id: 'hero' }, { label: 'Book', id: 'contact' },
    { label: 'Portfolio', id: 'portfolio' }, { label: 'Reviews', id: 'testimonials' },
  ]

  // ═══ Section renderers (keyed by sectionOrder slug) ═══

  const renderBooking = () => (
    <section key="booking" id="contact" ref={contactRef as any} style={{ ...sectionPad, background: `linear-gradient(180deg, ${T.bgCard} 0%, ${T.purple}10 50%, ${T.bgCard} 100%)` }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.purple, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>READY TO LEVEL UP?</div>
          <h2 style={{ fontSize: 32, fontWeight: 900, margin: '0 0 8px' }}>Book Your Design</h2>
        </div>

        {!submitted && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 28 }}>
            {[{ n: 1, label: 'Services' }, { n: 2, label: 'Details' }, { n: 3, label: 'Payment' }].map(({ n, label }) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                  backgroundColor: bookingStep >= n ? T.purple : T.border, color: bookingStep >= n ? T.white : T.muted }}>
                  {bookingStep > n ? <Check size={14} /> : n}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: bookingStep >= n ? T.white : T.muted, marginRight: 8 }}>{label}</span>
                {n < 3 && <div style={{ width: 24, height: 2, backgroundColor: bookingStep > n ? T.purple : T.border, marginRight: 4 }} />}
              </div>
            ))}
          </div>
        )}

        {submitted ? (
          <div style={{ backgroundColor: T.bgCard, borderRadius: 16, padding: 48, textAlign: 'center', border: `1px solid ${T.green}40` }}>
            <CheckCircle size={48} style={{ color: T.green, marginBottom: 16 }} />
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>You're All Set!</h3>
            <p style={{ color: T.muted, fontSize: 14 }}>Your project has been submitted and added to our system. We'll follow up within 24 hours.</p>
            <button onClick={() => { setSubmitted(false); setBookingStep(1) }} style={{ marginTop: 20, padding: '12px 28px', borderRadius: 8, backgroundColor: T.purple, color: T.white, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>Start New Project</button>
          </div>
        ) : (
          <div style={{ backgroundColor: T.bgCard, borderRadius: 16, padding: 28, border: `1px solid ${T.border}` }}>

            {/* Step 1: Services */}
            {bookingStep === 1 && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: T.white, marginBottom: 12 }}>Select the services you need:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
                  {services.map((s, i) => {
                    const sel = selectedServices.includes(s.name)
                    const hasSale = (s as any).salePrice !== undefined && (s as any).salePrice < s.price
                    return (
                      <div key={i} className="bz-service-card" onClick={() => setSelectedServices(prev => prev.includes(s.name) ? prev.filter(x => x !== s.name) : [...prev, s.name])}
                        style={{ padding: 14, borderRadius: 10, cursor: 'pointer', textAlign: 'center', border: sel ? `2px solid ${T.purple}` : `1px solid ${T.border}`, backgroundColor: sel ? `${T.purple}15` : T.bg, transition: 'box-shadow 0.2s' }}>
                        {sel && <Check size={12} style={{ color: T.purple, marginBottom: 4 }} />}
                        <p style={{ fontSize: 12, fontWeight: 600, color: T.mutedLight, margin: '0 0 2px' }}>{s.name}</p>
                        {hasSale ? (
                          <div><span style={{ fontSize: 16, fontWeight: 900, color: T.green }}>${(s as any).salePrice}</span> <span style={{ fontSize: 11, color: T.muted, textDecoration: 'line-through' }}>${s.price}</span></div>
                        ) : (
                          <p style={{ fontSize: 16, fontWeight: 900, color: T.purple, margin: 0 }}>${s.price}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
                {selectedServices.length > 0 && (
                  <div style={{ padding: 12, borderRadius: 10, backgroundColor: T.bg, border: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, color: T.mutedLight }}>{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: T.purple }}>Total: ${bookingTotal}</span>
                  </div>
                )}
                <button onClick={() => setBookingStep(2)} disabled={selectedServices.length === 0}
                  style={{ width: '100%', padding: '14px 0', borderRadius: 10, fontSize: 14, fontWeight: 800, backgroundColor: selectedServices.length === 0 ? T.border : T.purple, color: T.white, border: 'none', cursor: selectedServices.length === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  CONTINUE <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* Step 2: Details */}
            {bookingStep === 2 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Artist / Brand Name *</label><input style={inputStyle} placeholder="Your name or brand" value={form.artistName} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Instagram</label><input style={inputStyle} placeholder="@yourhandle" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} /></div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '#EF4444' : T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email *</label>
                    <input style={{ ...inputStyle, borderColor: form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '#EF4444' : T.border, boxShadow: form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? '0 0 0 2px #EF444440' : 'none' }} type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    {form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && (
                      <p style={{ fontSize: 11, color: '#EF4444', marginTop: 5 }}>Please enter a valid email (e.g. name@domain.com)</p>
                    )}
                  </div>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Deadline</label><input style={inputStyle} type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Song / Project Name</label><input style={inputStyle} placeholder="Song title or project name" value={form.songName} onChange={e => setForm(f => ({ ...f, songName: e.target.value }))} /></div>
                  {selectedServices.length > 0 && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: T.purple, textTransform: 'uppercase', display: 'block', marginBottom: 10, letterSpacing: '0.12em' }}>Tell Us What You Need</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {selectedServices.map(name => {
                          const svc = services.find(s => s.name === name) as any
                          const fields = svc?.customFields?.length > 0 ? svc.customFields : null
                          return (
                            <div key={name} style={{ padding: 14, borderRadius: 10, backgroundColor: `${T.purple}06`, border: `1px solid ${T.purple}15` }}>
                              <label style={{ fontSize: 12, fontWeight: 700, color: T.purpleLight, display: 'block', marginBottom: 8 }}>{name}</label>
                              {fields ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {fields.map((f: any, fi: number) => {
                                    const key = `${name}::${f.label}`
                                    if (f.type === 'select') {
                                      const opts = (f.options || '').split(',').map((o: string) => o.trim()).filter(Boolean)
                                      return (
                                        <div key={fi}>
                                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 4 }}>{f.label}</label>
                                          <select style={inputStyle} value={serviceDescriptions[key] || ''} onChange={e => setServiceDescriptions(prev => ({ ...prev, [key]: e.target.value }))}>
                                            <option value="">Select...</option>
                                            {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
                                          </select>
                                        </div>
                                      )
                                    }
                                    if (f.type === 'textarea') {
                                      return (
                                        <div key={fi}>
                                          <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 4 }}>{f.label}</label>
                                          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' as const }} placeholder={f.label} value={serviceDescriptions[key] || ''} onChange={e => setServiceDescriptions(prev => ({ ...prev, [key]: e.target.value }))} />
                                        </div>
                                      )
                                    }
                                    return (
                                      <div key={fi}>
                                        <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, display: 'block', marginBottom: 4 }}>{f.label}</label>
                                        <input style={inputStyle} placeholder={f.label} value={serviceDescriptions[key] || ''} onChange={e => setServiceDescriptions(prev => ({ ...prev, [key]: e.target.value }))} />
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <textarea
                                  style={{ ...inputStyle, minHeight: 60, resize: 'vertical' as const }}
                                  placeholder={`Describe what you need for ${name}...`}
                                  value={serviceDescriptions[name] || ''}
                                  onChange={e => setServiceDescriptions(prev => ({ ...prev, [name]: e.target.value }))}
                                />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Reference Photos — up to 10 (optional)</label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 10, border: `1.5px dashed ${T.border}`, backgroundColor: `${T.purple}08`, cursor: refFiles.length >= 10 ? 'default' : 'pointer', fontSize: 13, color: T.mutedLight, opacity: refFiles.length >= 10 ? 0.5 : 1 }}>
                      <Image size={16} style={{ color: T.purple }} /> {refFiles.length > 0 ? `${refFiles.length}/10 photo${refFiles.length !== 1 ? 's' : ''} selected` : 'Upload reference images'}
                      <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={refFiles.length >= 10} onChange={e => { if (e.target.files) { const newFiles = Array.from(e.target.files); setRefFiles(prev => [...prev, ...newFiles].slice(0, 10)) } }} />
                    </label>
                    {refFiles.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 8 }}>
                        {refFiles.map((f, i) => (
                          <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                            <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: '100%', height: 56, objectFit: 'cover', display: 'block' }} />
                            <button type="button" onClick={() => setRefFiles(prev => prev.filter((_, j) => j !== i))}
                              style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', backgroundColor: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>&times;</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MP3 Upload */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      MP3 Files — up to 4 (optional)
                    </label>
                    <label style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '14px 0', borderRadius: 10,
                      border: mp3Error ? '1.5px dashed #EF4444' : `1.5px dashed ${T.purple}60`,
                      backgroundColor: `${T.purple}08`,
                      cursor: mp3Files.length >= 4 ? 'default' : 'pointer',
                      fontSize: 13, color: T.mutedLight,
                      opacity: mp3Files.length >= 4 ? 0.5 : 1,
                    }}>
                      <Upload size={16} style={{ color: T.purple }} />
                      {mp3Files.length > 0 ? `${mp3Files.length}/4 MP3${mp3Files.length !== 1 ? 's' : ''} selected` : 'Upload MP3 files'}
                      <input
                        type="file"
                        accept=".mp3,audio/mpeg"
                        multiple
                        style={{ display: 'none' }}
                        disabled={mp3Files.length >= 4}
                        onChange={handleMp3Change}
                      />
                    </label>
                    {mp3Error && (
                      <p style={{ fontSize: 11, color: '#EF4444', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        ⚠ {mp3Error}
                      </p>
                    )}
                    {mp3Files.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {mp3Files.map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, backgroundColor: `${T.purple}08`, border: `1px solid ${T.purple}20` }}>
                            <span style={{ fontSize: 16 }}>🎵</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, fontWeight: 600, color: T.white, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                              <p style={{ fontSize: 10, color: T.muted, margin: 0 }}>{(f.size / (1024 * 1024)).toFixed(1)} MB</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => { setMp3Files(prev => prev.filter((_, j) => j !== i)); setMp3Error('') }}
                              style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#EF444420', color: '#EF4444', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setBookingStep(1)} style={{ flex: 1, padding: '14px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, backgroundColor: T.bg, color: T.mutedLight, border: `1px solid ${T.border}`, cursor: 'pointer' }}>Back</button>
                  <button onClick={() => setBookingStep(3)} disabled={!form.artistName || !form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)}
                    style={{ flex: 2, padding: '14px 0', borderRadius: 10, fontSize: 14, fontWeight: 800, backgroundColor: (!form.artistName || !form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) ? T.border : T.purple, color: T.white, border: 'none', cursor: (!form.artistName || !form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    CONTINUE TO PAYMENT <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {bookingStep === 3 && (
              <div>
                <div style={{ padding: 16, borderRadius: 12, backgroundColor: T.bg, border: `1px solid ${T.border}`, marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 8 }}>Order Summary</p>
                  {selectedServices.map(s => {
                    const svc = services.find(x => x.name === s)
                    const hasSale = svc && (svc as any).salePrice !== undefined && (svc as any).salePrice < svc.price
                    return (
                      <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 13, color: T.mutedLight }}>{s}</span>
                        {hasSale ? (
                          <span><span style={{ fontSize: 13, fontWeight: 700, color: T.green }}>${(svc as any).salePrice}</span> <span style={{ fontSize: 11, textDecoration: 'line-through', color: T.muted }}>${svc!.price}</span></span>
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 700, color: T.purple }}>${svc?.price || 0}</span>
                        )}
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: T.white }}>Total</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: T.purple }}>${bookingTotal}</span>
                  </div>
                </div>

                {/* Stripe card payment */}
                <p style={{ fontSize: 13, fontWeight: 700, color: T.white, marginBottom: 10 }}>Pay with card:</p>
                <button onClick={handleStripeCheckout} disabled={stripeLoading}
                  style={{ width: '100%', padding: '16px 0', borderRadius: 10, fontSize: 14, fontWeight: 800, backgroundColor: T.purple, color: T.white, border: 'none', cursor: stripeLoading ? 'default' : 'pointer', opacity: stripeLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                  {stripeLoading ? 'Redirecting to checkout...' : <>PAY ${bookingTotal} WITH CARD <ArrowRight size={16} /></>}
                </button>
                {stripeError && <p style={{ fontSize: 12, color: '#EF4444', textAlign: 'center', margin: '4px 0 8px' }}>{stripeError}</p>}

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: T.border }} />
                  <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>OR PAY WITH</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: T.border }} />
                </div>

                {/* Cash App / Venmo selection */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <button onClick={() => setAltPayMethod(altPayMethod === 'cashapp' ? null : 'cashapp')}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 10, backgroundColor: altPayMethod === 'cashapp' ? `${T.purple}15` : T.bg, border: altPayMethod === 'cashapp' ? `2px solid ${T.purple}` : `1px solid ${T.border}`, color: altPayMethod === 'cashapp' ? T.white : T.mutedLight, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Cash App
                  </button>
                  <button onClick={() => { setAltPayMethod(altPayMethod === 'venmo' ? null : 'venmo'); if (altPayMethod !== 'venmo') window.open(venmoLink, '_blank') }}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 10, backgroundColor: altPayMethod === 'venmo' ? `${T.purple}15` : T.bg, border: altPayMethod === 'venmo' ? `2px solid ${T.purple}` : `1px solid ${T.border}`, color: altPayMethod === 'venmo' ? T.white : T.mutedLight, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Venmo
                  </button>
                </div>

                {/* Cash App inline payment instructions */}
                {altPayMethod === 'cashapp' && (
                  <div style={{ marginBottom: 16, padding: 16, borderRadius: 10, backgroundColor: '#00D632' + '10', border: '1.5px solid #00D63240' }}>
                    <p style={{ fontSize: 12, color: T.mutedLight, marginBottom: 10 }}>Send <strong style={{ color: T.white }}>${bookingTotal}</strong> to:</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, backgroundColor: '#00D632' + '15', border: '1px solid #00D63230', marginBottom: 12 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: '#00D632', letterSpacing: '0.02em' }}>{siteSettings.cashAppTag || '$bizzyplug'}</span>
                      <button onClick={() => { navigator.clipboard.writeText(siteSettings.cashAppTag || '$bizzyplug').catch(() => {}); }} style={{ padding: '6px 14px', borderRadius: 6, backgroundColor: '#00D632', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                        COPY
                      </button>
                    </div>
                    <p style={{ fontSize: 11, color: T.muted, marginBottom: 0 }}>Open your Cash App, send the payment, then come back and upload your confirmation screenshot below.</p>
                  </div>
                )}

                {/* Venmo inline */}
                {altPayMethod === 'venmo' && (
                  <div style={{ marginBottom: 16, padding: 16, borderRadius: 10, backgroundColor: '#008CFF' + '10', border: '1.5px solid #008CFF40' }}>
                    <p style={{ fontSize: 12, color: T.mutedLight, marginBottom: 10 }}>Send <strong style={{ color: T.white }}>${bookingTotal}</strong> on Venmo to <strong style={{ color: '#008CFF' }}>{siteSettings.venmoHandle || '@Buzyplug'}</strong></p>
                    <a href={venmoLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '10px 0', textAlign: 'center', borderRadius: 8, backgroundColor: '#008CFF', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginBottom: 10 }}>Open Venmo →</a>
                    <p style={{ fontSize: 11, color: T.muted, marginBottom: 0 }}>Complete your payment in Venmo, then come back and upload your screenshot below.</p>
                  </div>
                )}

                {/* Screenshot upload */}
                {altPayMethod && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, color: T.mutedLight, marginBottom: 8, fontWeight: 600 }}>
                      Upload your payment confirmation screenshot:
                    </p>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0', borderRadius: 10, border: paymentScreenshot ? `2px solid ${T.green}` : `1.5px dashed ${T.purple}60`, backgroundColor: paymentScreenshot ? `${T.green}10` : `${T.purple}08`, cursor: 'pointer', fontSize: 13, color: paymentScreenshot ? T.green : T.mutedLight }}>
                      {paymentScreenshot ? (
                        <><CheckCircle size={16} /> {paymentScreenshot.name}</>
                      ) : (
                        <><Camera size={16} style={{ color: T.purple }} /> Upload Payment Screenshot *</>
                      )}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) setPaymentScreenshot(e.target.files[0]) }} />
                    </label>
                    {!paymentScreenshot && <p style={{ fontSize: 11, color: '#EF4444', marginTop: 6 }}>Screenshot required to submit order</p>}
                  </div>
                )}

                {/* Bottom buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setBookingStep(2); setAltPayMethod(null); setPaymentScreenshot(null) }} style={{ flex: 1, padding: '14px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, backgroundColor: T.bg, color: T.mutedLight, border: `1px solid ${T.border}`, cursor: 'pointer' }}>Back</button>
                  {altPayMethod && (
                    <button onClick={handleSubmit} disabled={submitting || !paymentScreenshot}
                      style={{ flex: 2, padding: '14px 0', borderRadius: 10, fontSize: 14, fontWeight: 800, backgroundColor: !paymentScreenshot ? T.border : T.purple, color: T.white, border: 'none', cursor: !paymentScreenshot ? 'default' : 'pointer', opacity: submitting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {submitting ? 'Submitting...' : <>SUBMIT ORDER <CheckCircle size={16} /></>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href={`mailto:${siteSettings.contactEmail || 'buzyplug@gmail.com'}`} style={{ color: T.muted, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Mail size={14} /> Questions? TALK TO US <ArrowRight size={12} />
          </a>
        </div>
      </div>
    </section>
  )

  const renderPortfolio = () => {
    if (featuredPhotos.length === 0) return null
    return (
      <section key="portfolio" id="portfolio" style={{ ...sectionPad, backgroundColor: T.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>FEATURED WORK</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: T.white }}>Our Latest Creations</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {featuredPhotos.map((item, i) => (
              <div key={item.id || i} style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: T.bgCard, border: `1px solid ${T.border}` }}>
                <img src={item.url} alt={item.title} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 2px', color: T.white }}>{item.title}</p>
                    <p style={{ fontSize: 12, color: T.muted, margin: 0, textTransform: 'capitalize' }}>{item.category.replace('-', ' ')}</p>
                  </div>
                  <PenTool size={14} style={{ color: T.muted }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <a href="/bizzyplug/portfolio" style={{ background: 'none', border: 'none', color: T.purple, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              VIEW FULL PORTFOLIO <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>
    )
  }

  const renderRollout = () => {
    if (rolloutPackages.length === 0) return null
    return (
      <section key="rollout" id="rollout" style={{ ...sectionPad, backgroundColor: T.bgCard, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 800, height: 800, borderRadius: '50%', background: `radial-gradient(circle, ${T.purple}10 0%, transparent 60%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.purple, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>MONTHLY ROLLOUT PLANS</div>
            {rolloutPackages.length > 1 && (
              <div style={{ display: 'inline-flex', borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}`, marginBottom: 16 }}>
                {rolloutPackages.map((pkg: any, pi: number) => (
                  <button key={pkg.id} onClick={() => setActivePackage(pi)} style={{
                    padding: '10px 28px', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                    backgroundColor: activePackage === pi ? T.purple : 'transparent',
                    color: activePackage === pi ? T.white : T.mutedLight,
                  }}>
                    {pkg.label}
                  </button>
                ))}
              </div>
            )}
            {rolloutPackages.length <= 1 && <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, margin: '0 0 6px' }}>{rolloutPackages[0]?.label}</h2>}
            <p style={{ fontSize: 15, color: T.muted, lineHeight: 1.7, maxWidth: 640, margin: '12px auto 0' }}>
              Stop dropping music and events with no plan. BizzyPlug monthly rollout plans give artists and promoters the visuals, promo content, motion graphics, merch design, and posting blueprint needed to stay consistent and look professional every month.
            </p>
          </div>

          {rolloutPackages[activePackage] && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'stretch' }}>
              {rolloutPackages[activePackage].tiers.filter((t: any) => t.active !== false).map((tier: any, i: number, arr: any[]) => {
                const isTop = i === arr.length - 1
                const allServices = [...(tier.services || []), ...(tier.extras || [])]
                const hasSale = tier.salePrice !== null && tier.salePrice !== undefined && tier.salePrice < tier.price
                return (
                  <div key={tier.id || i} style={{
                    borderRadius: 20, padding: 2, position: 'relative',
                    background: isTop ? `linear-gradient(135deg, ${T.purple}, ${T.purpleGlow}, ${T.purpleDim})` : 'transparent',
                  }}>
                    {tier.badge && (
                      <div style={{
                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', zIndex: 2,
                        padding: '5px 16px', borderRadius: 100, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                        backgroundColor: isTop ? T.purple : T.purpleDim, color: T.white,
                        boxShadow: `0 4px 20px ${T.purple}40`,
                      }}>
                        {tier.badge}
                      </div>
                    )}
                    <div style={{
                      borderRadius: 18, padding: '36px 28px 28px', height: '100%', display: 'flex', flexDirection: 'column',
                      backgroundColor: isTop ? '#0d0d12' : T.bg,
                      border: isTop ? 'none' : `1px solid ${T.border}`,
                      boxShadow: isTop ? `0 0 60px ${T.purple}15, 0 0 120px ${T.purple}08` : 'none',
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: isTop ? T.purpleLight : T.mutedLight, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{tier.name}</p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                        {hasSale ? (
                          <><span style={{ fontSize: 44, fontWeight: 900, color: T.green, letterSpacing: '-0.03em' }}>${tier.salePrice}</span><span style={{ fontSize: 18, fontWeight: 600, color: T.muted, textDecoration: 'line-through' }}>${tier.price}</span></>
                        ) : (
                          <span style={{ fontSize: 44, fontWeight: 900, color: isTop ? T.white : T.purple, letterSpacing: '-0.03em' }}>${tier.price}</span>
                        )}
                        <span style={{ fontSize: 15, fontWeight: 600, color: T.muted }}>{tier.period || '/mo'}</span>
                      </div>
                      <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, margin: '0 0 4px' }}>{tier.description}</p>
                      <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: `${T.purple}10`, margin: '12px 0 20px', display: 'inline-flex', alignSelf: 'flex-start' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.purpleLight }}>{tier.campaigns} {tier.campaigns === 1 ? 'song/campaign' : 'songs/campaigns'} per month</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Included per release</p>
                        {allServices.map((s: string, j: number) => (
                          <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                            <Check size={14} style={{ color: (tier.extras || []).includes(s) ? T.green : T.purple, marginTop: 2, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: (tier.extras || []).includes(s) ? T.white : T.mutedLight, fontWeight: (tier.extras || []).includes(s) ? 700 : 400 }}>{s}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => scrollTo('contact')} style={{
                        width: '100%', marginTop: 24, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                        fontSize: 14, fontWeight: 800, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        backgroundColor: isTop ? T.purple : `${T.purple}18`, color: isTop ? T.white : T.purple,
                        boxShadow: isTop ? `0 4px 24px ${T.purple}30` : 'none',
                      }}>
                        GET STARTED <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    )
  }

  const renderTestimonials = () => (
    <section key="testimonials" id="testimonials" style={{ ...sectionPad, backgroundColor: T.bg }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>CLIENT RESULTS</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 32px' }}>What Our Clients Say</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {allTestimonials.map((t, i) => (
            <div key={i} style={{ padding: 28, borderRadius: 14, backgroundColor: T.bgCard, border: `1px solid ${T.border}` }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
                {Array.from({ length: t.rating }).map((_, j) => <Star key={j} size={14} fill={T.purple} style={{ color: T.purple }} />)}
              </div>
              <p style={{ fontSize: 14, color: T.mutedLight, lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>"{t.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: `${T.purple}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: T.purple }}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Review Submission */}
        <div id="leave-review" style={{ marginTop: 48, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <MessageSquare size={18} style={{ color: T.purple }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Leave a Review</h3>
          </div>
          {reviewSubmitted ? (
            <div style={{ backgroundColor: T.bgCard, borderRadius: 14, padding: 32, textAlign: 'center', border: `1px solid ${T.green}40` }}>
              <CheckCircle size={32} style={{ color: T.green, marginBottom: 8 }} />
              <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>Thank you!</p>
              <p style={{ color: T.muted, fontSize: 13 }}>Your review has been submitted.</p>
            </div>
          ) : (
            <div style={{ backgroundColor: T.bgCard, borderRadius: 14, padding: 20, border: `1px solid ${T.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Your Name *</label><input style={{ ...inputStyle, padding: '10px 14px', fontSize: 13 }} placeholder="Your name" value={reviewForm.name} onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Title / Role</label><input style={{ ...inputStyle, padding: '10px 14px', fontSize: 13 }} placeholder="e.g. Recording Artist" value={reviewForm.role} onChange={e => setReviewForm(f => ({ ...f, role: e.target.value }))} /></div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Rating</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setReviewForm(f => ({ ...f, rating: n }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                      <Star size={20} fill={n <= reviewForm.rating ? T.purple : 'none'} style={{ color: n <= reviewForm.rating ? T.purple : T.border }} />
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Your Review *</label>
                <textarea style={{ ...inputStyle, padding: '10px 14px', fontSize: 13, minHeight: 80, resize: 'vertical' as const }} placeholder="Tell us about your experience..." value={reviewForm.text} onChange={e => setReviewForm(f => ({ ...f, text: e.target.value }))} />
              </div>
              <button onClick={handleReviewSubmit} disabled={reviewSubmitting || !reviewForm.name || !reviewForm.text} style={{
                width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                backgroundColor: (!reviewForm.name || !reviewForm.text) ? T.border : T.purple,
                color: T.white, border: 'none', cursor: (!reviewForm.name || !reviewForm.text) ? 'default' : 'pointer',
                opacity: reviewSubmitting ? 0.6 : 1,
              }}>
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    booking: renderBooking,
    portfolio: renderPortfolio,
    rollout: renderRollout,
    testimonials: renderTestimonials,
  }

  if (!settingsLoaded) {
    return (
      <div style={{ backgroundColor: C.bg, color: C.white, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}><span style={{ color: C.white }}>BIZZY</span><span style={{ color: C.purple }}>PLUG</span></div>
          <div style={{ width: 32, height: 32, border: `3px solid ${C.purple}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: T.bg, color: T.white, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ═══ NAV ═══ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: `${T.bg}f0`, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {siteSettings.logoUrl ? (
              <img src={siteSettings.logoUrl} alt="BizzyPlug" style={{ height: 36, objectFit: 'contain' }} />
            ) : (
              <><span style={{ fontWeight: 900, fontSize: 20, color: T.white, letterSpacing: '0.04em' }}>BIZZY</span>
              <span style={{ fontWeight: 900, fontSize: 20, color: T.purple, letterSpacing: '0.04em' }}>PLUG</span></>
            )}
          </div>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="hidden-mobile">
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} style={{ background: 'none', border: 'none', color: T.mutedLight, fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.02em' }}>{l.label}</button>
            ))}
            <button onClick={() => scrollTo('contact')} style={{ padding: '10px 22px', borderRadius: 8, backgroundColor: T.purple, color: T.white, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, ...(activeTheme.glowEnabled ? { boxShadow: `0 0 15px ${T.purple}50` } : {}) }}>{siteSettings.ctaText || 'BOOK A DESIGN'}</button>
          </div>
          <button onClick={() => setMobileNav(!mobileNav)} className="show-mobile" style={{ background: 'none', border: 'none', color: T.white, cursor: 'pointer', padding: 4 }}>
            {mobileNav ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {mobileNav && (
          <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {NAV_LINKS.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} style={{ background: 'none', border: 'none', color: T.mutedLight, fontSize: 15, fontWeight: 500, cursor: 'pointer', textAlign: 'left', padding: '8px 0' }}>{l.label}</button>
            ))}
            <button onClick={() => scrollTo('contact')} style={{ padding: '12px 0', borderRadius: 8, backgroundColor: T.purple, color: T.white, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, marginTop: 4 }}>{siteSettings.ctaText || 'BOOK A DESIGN'}</button>
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
        ${activeTheme.glowEnabled ? `.bz-service-card:hover { box-shadow: 0 0 20px ${T.purple}40 !important; }` : ''}
        .hidden-mobile { display: flex !important; }
        .show-mobile { display: none !important; }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>

      {/* ═══ HERO ═══ */}
      <section id="hero" style={{ ...sectionPad, paddingTop: 60, paddingBottom: 60, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${T.purple}${activeTheme.glowEnabled ? '30' : '18'} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px', minWidth: 300 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.purple, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>{siteSettings.heroSubheadline || 'PREMIUM DESIGN. REAL IMPACT.'}</div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, lineHeight: 1.12, margin: '0 0 20px', letterSpacing: '0.02em', fontFamily: "'Akira Expanded', 'Inter', sans-serif" }}>
              {siteSettings.heroHeadline ? (
                <>{siteSettings.heroHeadline.split(/\b(Authentic|authentic)\b/).map((part: string, i: number) =>
                  /authentic/i.test(part) ? <span key={i} style={{ color: T.purple }}>{part}</span> : part
                )}</>
              ) : (
                <>Tired Of The AI Covers,<br />Lets Get You Something<br /><span style={{ color: T.purple }}>Authentic</span></>
              )}
            </h1>
            <p style={{ fontSize: 16, color: T.muted, lineHeight: 1.7, margin: '0 0 32px', maxWidth: 480 }}>
              {siteSettings.bio || 'Stand out with custom album covers, logos, flyers, and websites designed to elevate artists, entrepreneurs, brands, and nightlife & event experiences.'}
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 36 }}>
              <button onClick={() => scrollTo('contact')} style={{ padding: '14px 28px', borderRadius: 8, backgroundColor: T.purple, color: T.white, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, ...(activeTheme.glowEnabled ? { boxShadow: `0 0 15px ${T.purple}50` } : {}) }}>
                {siteSettings.ctaText || 'BOOK A DESIGN'} <ArrowRight size={16} />
              </button>
              <a href="/bizzyplug/portfolio" style={{ padding: '14px 28px', borderRadius: 8, backgroundColor: 'transparent', color: T.white, border: `1.5px solid ${T.border}`, cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                {siteSettings.ctaSecondaryText || 'VIEW PORTFOLIO'} <ArrowRight size={16} />
              </a>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {['100% Custom Designs', 'Fast Turnaround', 'Satisfaction Guaranteed'].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.mutedLight }}>
                  <Check size={14} style={{ color: T.purple }} /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ DYNAMIC SECTIONS (ordered by sectionOrder) ═══ */}
      {sectionOrder.filter(key => !hiddenSections.includes(key)).map(key => sectionRenderers[key]?.()).filter(Boolean)}

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: '48px 24px 32px', borderTop: `1px solid ${T.border}`, backgroundColor: T.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 8 }}>
              {siteSettings.logoUrl ? (
                <img src={siteSettings.logoUrl} alt="BizzyPlug" style={{ height: 32, objectFit: 'contain' }} />
              ) : (
                <><span style={{ fontWeight: 900, fontSize: 18, color: T.white }}>BIZZY</span>
                <span style={{ fontWeight: 900, fontSize: 18, color: T.purple }}>PLUG</span></>
              )}
            </div>
            <p style={{ fontSize: 12, color: T.muted }}>&copy; {new Date().getFullYear()} Bizzyplug. All Rights Reserved.</p>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Quick Links</p>
              {['Home', 'Book', 'Portfolio', 'Reviews'].map(l => (
                <button key={l} onClick={() => scrollTo(l === 'Book' ? 'contact' : l === 'Reviews' ? 'testimonials' : l.toLowerCase())} style={{ display: 'block', background: 'none', border: 'none', color: T.mutedLight, fontSize: 12, cursor: 'pointer', padding: '3px 0' }}>{l}</button>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Connect</p>
              <a href={siteSettings.instagramUrl || 'https://instagram.com/bizzyplug'} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.mutedLight, fontSize: 12, textDecoration: 'none', padding: '3px 0' }}><Instagram size={13} /> Instagram</a>
              <a href={`mailto:${siteSettings.contactEmail || 'buzyplug@gmail.com'}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.mutedLight, fontSize: 12, textDecoration: 'none', padding: '3px 0' }}><Mail size={13} /> Email</a>
            </div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: T.bgCard, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontWeight: 900, fontSize: 18, color: T.purple }}>BP</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
