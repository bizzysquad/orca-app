'use client'

import { ArrowRight, X } from 'lucide-react'

const C = {
  bg: '#09090b',
  bgCard: '#131316',
  border: '#1f1f23',
  purple: '#9333EA',
  white: '#FAFAFA',
  muted: '#71717A',
}

export default function CheckoutCancelPage() {
  return (
    <div style={{ backgroundColor: C.bg, color: C.white, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontWeight: 900, fontSize: 22, color: C.white }}>BIZZY</span>
          <span style={{ fontWeight: 900, fontSize: 22, color: C.purple }}>PLUG</span>
        </div>

        <div style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 48, border: `1px solid ${C.border}` }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: `${C.purple}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <X size={28} style={{ color: C.purple }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Payment Cancelled</h2>
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            No worries — your payment was not processed. You can go back and try again, or use an alternative payment method.
          </p>
          <a href="/bizzyplug#contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 10, backgroundColor: C.purple, color: C.white, textDecoration: 'none', fontSize: 14, fontWeight: 800 }}>
            Back to Checkout <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </div>
  )
}
