'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, PenTool, Sparkles } from 'lucide-react'

const C = {
  bg: '#09090b',
  bgCard: '#131316',
  border: '#1f1f23',
  purple: '#9333EA',
  purpleDim: '#6D28D9',
  white: '#FAFAFA',
  muted: '#71717A',
  mutedLight: '#A1A1AA',
}

export default function PortfolioPage() {
  const [photos, setPhotos] = useState<{ id: string; url: string; title: string; category: string }[]>([])
  const [categories, setCategories] = useState<{ label: string; val: string }[]>([
    { label: 'Album Covers', val: 'album-covers' }, { label: 'Logos', val: 'logos' }, { label: 'Flyers', val: 'flyers' }, { label: 'Websites', val: 'websites' },
  ])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/bizzyplug/site-settings', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.settings?.portfolioCategories?.length > 0) {
        setCategories(d.settings.portfolioCategories.map((c: string) => ({
          label: c.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), val: c,
        })))
      }
    }).catch(() => {})
    fetch('/api/bizzyplug/photos', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.photos?.length > 0) setPhotos(d.photos)
    }).catch(() => {})
  }, [])

  const filtered = filter === 'all' ? photos : photos.filter(p => p.category === filter)

  return (
    <div style={{ backgroundColor: C.bg, color: C.white, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: `${C.bg}f0`, backdropFilter: 'blur(24px)', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/bizzyplug" style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.mutedLight, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Back to BizzyPlug
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ fontWeight: 900, fontSize: 18, color: C.white }}>BIZZY</span>
            <span style={{ fontWeight: 900, fontSize: 18, color: C.purple }}>PLUG</span>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div style={{ padding: '60px 24px 0', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>OUR WORK</div>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Full Portfolio</h1>
        <p style={{ fontSize: 15, color: C.muted, margin: '0 0 32px', maxWidth: 500 }}>
          Browse our complete collection of designs across all categories.
        </p>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          {[{ label: 'All', val: 'all' }, ...categories].map(f => (
            <button key={f.val} onClick={() => setFilter(f.val)}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: filter === f.val ? 'none' : `1px solid ${C.border}`,
                backgroundColor: filter === f.val ? C.purple : 'transparent',
                color: filter === f.val ? C.white : C.mutedLight,
              }}>
              {f.label}
              {f.val !== 'all' && <span style={{ marginLeft: 6, opacity: 0.6 }}>({photos.filter(p => p.category === f.val).length})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Photo Grid */}
      <div style={{ padding: '0 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Sparkles size={48} style={{ color: C.purpleDim, opacity: 0.3, marginBottom: 16 }} />
            <p style={{ color: C.muted, fontSize: 15 }}>
              {photos.length === 0 ? 'Portfolio coming soon.' : 'No photos in this category yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {filtered.map((item, i) => (
              <div key={item.id || i} style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: C.bgCard, border: `1px solid ${C.border}`, transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${C.purple}15` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                {item.url ? (
                  <img src={item.url} alt={item.title} style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ height: 220, backgroundColor: `${C.purpleDim}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        )}
      </div>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', borderTop: `1px solid ${C.border}`, backgroundColor: C.bg, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginBottom: 8 }}>
          <span style={{ fontWeight: 900, fontSize: 16, color: C.white }}>BIZZY</span>
          <span style={{ fontWeight: 900, fontSize: 16, color: C.purple }}>PLUG</span>
        </div>
        <p style={{ fontSize: 12, color: C.muted }}>&copy; {new Date().getFullYear()} Bizzyplug. All Rights Reserved.</p>
      </footer>
    </div>
  )
}
