'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'

const C = {
  bg: '#09090b',
  bgCard: '#131316',
  border: '#1f1f23',
  purple: '#9333EA',
  white: '#FAFAFA',
  muted: '#71717A',
  green: '#10B981',
}

export default function CheckoutSuccessPage() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!sessionId) {
      setStatus('error')
      setErrorMsg('No payment session found.')
      return
    }

    async function verify() {
      try {
        const res = await fetch(`/api/bizzyplug/checkout/verify?session_id=${sessionId}`)
        if (!res.ok) {
          setStatus('error')
          setErrorMsg('Payment could not be verified. Please contact support.')
          return
        }

        const data = await res.json()
        if (!data.paid) {
          setStatus('error')
          setErrorMsg('Payment was not completed.')
          return
        }

        const meta = data.metadata || {}
        await fetch('/api/bizzyplug/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistName: meta.artistName || '',
            email: meta.email || data.email || '',
            instagram: meta.instagram || '',
            songName: meta.songName || '',
            details: meta.details || '',
            deadline: meta.deadline || '',
            notes: `${meta.notes || ''}\n[Paid via Stripe — Session: ${sessionId}]`.trim(),
            projectType: meta.projectType || '',
            referenceUrls: [],
          }),
        })

        setStatus('success')
      } catch {
        setStatus('error')
        setErrorMsg('Something went wrong verifying your payment.')
      }
    }

    verify()
  }, [sessionId])

  return (
    <div style={{ backgroundColor: C.bg, color: C.white, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <span style={{ fontWeight: 900, fontSize: 22, color: C.white }}>BIZZY</span>
          <span style={{ fontWeight: 900, fontSize: 22, color: C.purple }}>PLUG</span>
        </div>

        {status === 'verifying' && (
          <div style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 48, border: `1px solid ${C.border}` }}>
            <Loader2 size={48} style={{ color: C.purple, marginBottom: 16, animation: 'spin 1s linear infinite' }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Verifying Payment...</h2>
            <p style={{ color: C.muted, fontSize: 14 }}>Please wait while we confirm your payment.</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {status === 'success' && (
          <div style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 48, border: `1px solid ${C.green}40` }}>
            <CheckCircle size={56} style={{ color: C.green, marginBottom: 16 }} />
            <h2 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 8px' }}>Payment Successful!</h2>
            <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Your project has been submitted and payment confirmed. We'll follow up within 24 hours with next steps.
            </p>
            <a href="/bizzyplug" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 10, backgroundColor: C.purple, color: C.white, textDecoration: 'none', fontSize: 14, fontWeight: 800 }}>
              Back to BizzyPlug <ArrowRight size={16} />
            </a>
          </div>
        )}

        {status === 'error' && (
          <div style={{ backgroundColor: C.bgCard, borderRadius: 16, padding: 48, border: `1px solid #EF444440` }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#EF444420', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span style={{ fontSize: 28 }}>!</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Payment Issue</h2>
            <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>{errorMsg}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/bizzyplug" style={{ padding: '12px 24px', borderRadius: 10, backgroundColor: C.purple, color: C.white, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                Try Again
              </a>
              <a href="mailto:buzyplug@gmail.com" style={{ padding: '12px 24px', borderRadius: 10, backgroundColor: 'transparent', color: C.white, textDecoration: 'none', fontSize: 13, fontWeight: 700, border: `1px solid ${C.border}` }}>
                Contact Support
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
