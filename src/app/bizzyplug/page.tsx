'use client'

import { useState, useEffect } from 'react'
import { Palette, Send, DollarSign, Instagram, Mail, ChevronDown, CheckCircle, Sparkles, ArrowRight } from 'lucide-react'

const C = {
  bg: '#0a0a0a',
  card: '#141414',
  border: '#27272a',
  purple: '#9333EA',
  purpleLight: '#A855F7',
  gold: '#F59E0B',
  white: '#FAFAFA',
  muted: '#A1A1AA',
  green: '#10B981',
}

interface Service {
  name: string
  price: number
  description?: string
  popular?: boolean
}

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

const PROJECT_TYPES = [
  'Pre-Made Artwork', 'Custom Artwork', 'Story Promo Ad', 'Streaming Ad',
  'Tracklist', 'Flyer', 'Cartoons', 'Logos', 'Album Cover', 'Branding', 'Social Media Kit', 'Other',
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  fontSize: 14,
  borderRadius: 12,
  border: `1.5px solid ${C.border}`,
  backgroundColor: C.card,
  color: C.white,
  outline: 'none',
}

export default function BizzyPlugPublicPage() {
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES)
  const [siteSettings, setSiteSettings] = useState<any>({})
  const [form, setForm] = useState({
    name: '', artistName: '', email: '', phone: '', instagram: '',
    projectType: '', songName: '', tracklist: '', details: '',
    deadline: '', notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  useEffect(() => {
    fetch('/api/bizzyplug/site-settings', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.settings) {
          setSiteSettings(d.settings)
          if (d.settings.services?.length > 0) setServices(d.settings.services)
        }
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (!form.artistName || !form.email) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/bizzyplug/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSubmitted(true)
        setForm({ name: '', artistName: '', email: '', phone: '', instagram: '', projectType: '', songName: '', tracklist: '', details: '', deadline: '', notes: '' })
      }
    } catch {}
    setSubmitting(false)
  }

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setActiveSection(id)
  }

  const cashAppLink = siteSettings.cashAppTag ? `https://cash.app/${siteSettings.cashAppTag}` : 'https://cash.app/$BizzyPlug'
  const paypalLink = siteSettings.paypalEmail ? `https://paypal.me/${siteSettings.paypalEmail}` : 'https://paypal.me/buzyplug'
  const venmoLink = siteSettings.venmoHandle ? `https://venmo.com/${siteSettings.venmoHandle.replace('@', '')}` : 'https://venmo.com/Buzyplug'

  return (
    <div style={{ backgroundColor: C.bg, color: C.white, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: `${C.bg}ee`, backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Palette size={22} style={{ color: C.purple }} />
          <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '0.08em', color: C.purple }}>BIZZYPLUG</span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 600 }}>
          <button onClick={() => scrollTo('services')} style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>Services</button>
          <button onClick={() => scrollTo('request')} style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>Request</button>
          <button onClick={() => scrollTo('pay')} style={{ color: C.muted, background: 'none', border: 'none', cursor: 'pointer' }}>Pay</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        padding: '80px 24px 60px',
        textAlign: 'center',
        background: `linear-gradient(180deg, ${C.purple}15 0%, ${C.bg} 100%)`,
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, backgroundColor: `${C.purple}20`, border: `1px solid ${C.purple}40`, fontSize: 12, fontWeight: 700, color: C.purpleLight, marginBottom: 20, letterSpacing: '0.06em' }}>
            GRAPHIC DESIGN SERVICES
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.05, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            <span style={{ color: C.purple }}>BIZZY</span><span style={{ color: C.white }}>PLUG</span>
          </h1>
          <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.6, margin: '0 0 36px' }}>
            {siteSettings.bio || 'Custom artwork, logos, album covers, flyers, and more. Professional designs delivered fast.'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => scrollTo('request')} style={{
              padding: '14px 32px', borderRadius: 12,
              backgroundColor: C.purple, color: C.white, border: 'none',
              cursor: 'pointer', fontSize: 15, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Start a Project <ArrowRight size={18} />
            </button>
            <button onClick={() => scrollTo('services')} style={{
              padding: '14px 32px', borderRadius: 12,
              backgroundColor: 'transparent', color: C.purple, border: `2px solid ${C.purple}`,
              cursor: 'pointer', fontSize: 15, fontWeight: 700,
            }}>
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* ── Services & Pricing ── */}
      <section id="services" style={{ padding: '60px 24px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
            <span style={{ color: C.purple }}>Services</span> & Pricing
          </h2>
          <p style={{ color: C.muted, fontSize: 15 }}>Professional designs at affordable prices</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {services.map((s, i) => (
            <div key={i} style={{
              backgroundColor: C.card,
              border: s.popular ? `2px solid ${C.purple}` : `1px solid ${C.border}`,
              borderRadius: 16, padding: 24,
              position: 'relative', overflow: 'hidden',
            }}>
              {s.popular && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  padding: '3px 10px', borderRadius: 100,
                  backgroundColor: C.purple, fontSize: 10, fontWeight: 700,
                  color: C.white, letterSpacing: '0.05em',
                }}>POPULAR</div>
              )}
              <p style={{ fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 8 }}>{s.name}</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: C.purple }}>${s.price}</p>
              {s.description && <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{s.description}</p>}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ fontSize: 13, color: C.muted }}>
            Payment: <strong style={{ color: C.gold }}>CashApp | $BizzyPlug</strong> or <strong style={{ color: C.gold }}>PayPal | buzyplug@gmail.com</strong>
          </p>
        </div>
      </section>

      {/* ── Project Request Form ── */}
      <section id="request" style={{
        padding: '60px 24px',
        background: `linear-gradient(180deg, ${C.bg} 0%, ${C.purple}08 50%, ${C.bg} 100%)`,
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
              Start Your <span style={{ color: C.purple }}>Project</span>
            </h2>
            <p style={{ color: C.muted, fontSize: 15 }}>Fill out the form below and I'll follow up within 24 hours</p>
          </div>

          {submitted ? (
            <div style={{
              backgroundColor: C.card, borderRadius: 20, padding: 48,
              textAlign: 'center', border: `1px solid ${C.green}40`,
            }}>
              <CheckCircle size={48} style={{ color: C.green, marginBottom: 16 }} />
              <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Request Submitted!</h3>
              <p style={{ color: C.muted, fontSize: 14 }}>
                I'll review your project details and follow up via email within 24 hours. Check your inbox!
              </p>
              <button onClick={() => setSubmitted(false)} style={{
                marginTop: 20, padding: '12px 28px', borderRadius: 10,
                backgroundColor: C.purple, color: C.white, border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: 14,
              }}>Submit Another Request</button>
            </div>
          ) : (
            <div style={{ backgroundColor: C.card, borderRadius: 20, padding: 28, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Artist / Brand Name *</label>
                  <input style={inputStyle} placeholder="Artist or brand name" value={form.artistName} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Instagram</label>
                  <input style={inputStyle} placeholder="@yourhandle" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Email *</label>
                  <input style={inputStyle} type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Service Needed</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.projectType} onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))}>
                    <option value="">Select a service...</option>
                    {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Deadline</label>
                  <input style={inputStyle} type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Song / Project Name</label>
                  <input style={inputStyle} placeholder="Song title or project name" value={form.songName} onChange={e => setForm(f => ({ ...f, songName: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Tracklist (if applicable)</label>
                  <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' as const }} placeholder="List your tracks..." value={form.tracklist} onChange={e => setForm(f => ({ ...f, tracklist: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Project Details & Instructions</label>
                  <textarea style={{ ...inputStyle, minHeight: 100, resize: 'vertical' as const }} placeholder="Describe your vision, style references, colors, text to include, etc." value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Notes / Special Requests</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' as const }} placeholder="Anything else I should know?" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !form.artistName || !form.email}
                style={{
                  width: '100%', marginTop: 20, padding: '16px 0', borderRadius: 12,
                  backgroundColor: (!form.artistName || !form.email) ? C.border : C.purple,
                  color: C.white, border: 'none', cursor: (!form.artistName || !form.email) ? 'default' : 'pointer',
                  fontSize: 16, fontWeight: 800,
                  opacity: submitting ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting ? 'Submitting...' : <><Send size={18} /> Submit Request</>}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Payment Options ── */}
      <section id="pay" style={{ padding: '60px 24px', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
            <span style={{ color: C.gold }}>Payment</span> Options
          </h2>
          <p style={{ color: C.muted, fontSize: 15 }}>Choose your preferred payment method</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'Cash App', handle: '$BizzyPlug', href: cashAppLink, color: '#00D632', icon: '💵' },
            { label: 'PayPal', handle: 'buzyplug@gmail.com', href: paypalLink, color: '#0070BA', icon: '💳' },
            { label: 'Venmo', handle: '@Buzyplug', href: venmoLink, color: '#008CFF', icon: '💸' },
          ].map((p, i) => (
            <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '18px 20px', borderRadius: 16,
              backgroundColor: C.card, border: `1px solid ${C.border}`,
              textDecoration: 'none', color: C.white,
              transition: 'border-color 0.2s',
            }}>
              <span style={{ fontSize: 28 }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{p.label}</p>
                <p style={{ fontSize: 13, color: C.muted, margin: '2px 0 0' }}>{p.handle}</p>
              </div>
              <div style={{
                padding: '8px 18px', borderRadius: 10,
                backgroundColor: p.color, color: '#fff',
                fontWeight: 700, fontSize: 13,
              }}>Pay Now</div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '40px 24px', textAlign: 'center',
        borderTop: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
          <a href="https://instagram.com/bizzyplug" target="_blank" rel="noopener noreferrer" style={{ color: C.muted }}>
            <Instagram size={20} />
          </a>
          <a href="mailto:buzyplug@gmail.com" style={{ color: C.muted }}>
            <Mail size={20} />
          </a>
        </div>
        <p style={{ fontSize: 12, color: C.muted }}>
          &copy; {new Date().getFullYear()} BizzyPlug. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
