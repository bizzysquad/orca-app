'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Ticket, Minus, Plus, CheckCircle2, Tag, Clock } from 'lucide-react'

const inputCls =
  'w-full px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none focus:shadow-input-focus focus:border-gold/50 transition'

function fmtPrice(cents: number) {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}`
}

export default function RsvpTicketSection({ event, ticketTypes }: { event: any; ticketTypes: any[] }) {
  const params = useSearchParams()
  const checkoutStatus = params.get('checkout')

  const [selectedType, setSelectedType] = useState<string>(ticketTypes[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [guestNames, setGuestNames] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [agreed, setAgreed] = useState(!event.policies)
  const [marketingOptIn, setMarketingOptIn] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<any>(null)
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [waitlistDone, setWaitlistDone] = useState(false)

  const activeType = ticketTypes.find(t => t.id === selectedType)
  const isSoldOut = event.is_paid ? ticketTypes.length > 0 && ticketTypes.every(t => t.sold_out) : false
  const unitPrice = event.is_paid ? activeType?.price_cents ?? event.ticket_price_cents : 0

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Enter your name and email.')
      return
    }
    if (event.policies && !agreed) {
      setError('Please agree to the event policies.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/rsvp/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          ticket_type_id: event.is_paid ? selectedType : null,
          quantity,
          buyer_name: name.trim(),
          buyer_email: email.trim(),
          buyer_phone: phone.trim(),
          promo_code: promoCode || undefined,
          guest_names: guestNames,
          answers,
          marketing_opt_in: marketingOptIn,
          agreed_to_policies: agreed,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.soldOut) setShowWaitlist(true)
        setError(data.error || 'Something went wrong.')
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      setSuccess(data)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (checkoutStatus === 'success' && !success) {
    return (
      <div className="bg-surface-card border border-gold/40 rounded-2xl p-8 text-center mb-10">
        <CheckCircle2 className="mx-auto text-gold mb-3" size={32} />
        <h3 className="text-xl font-bold text-text-primary">Payment received!</h3>
        <p className="text-text-secondary text-sm mt-2">Check your email for your ticket and digital invitation.</p>
      </div>
    )
  }

  if (success) {
    const firstTicket = success.tickets?.[0]
    return (
      <div className="bg-surface-card border border-gold/40 rounded-2xl p-8 text-center mb-10">
        <CheckCircle2 className="mx-auto text-gold mb-3" size={32} />
        <h3 className="text-xl font-bold text-text-primary">You&apos;re on the list!</h3>
        <p className="text-text-secondary text-sm mt-2 mb-4">Check your email for your digital invitation.</p>
        {firstTicket && (
          <a href={`/RSVP/ticket/${firstTicket.qr_token}`} className="inline-block px-5 py-2.5 rounded-lg bg-gold-gradient text-brand-black text-xs font-bold">
            View My Pass
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="mb-12">
      <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
        <Ticket size={18} className="text-gold" /> {event.is_paid ? 'Get Your Tickets' : 'RSVP'}
      </h2>

      {isSoldOut || showWaitlist ? (
        <WaitlistForm event={event} done={waitlistDone} onDone={() => setWaitlistDone(true)} />
      ) : (
        <div className="bg-surface-card border border-surface-border rounded-2xl p-5 sm:p-6">
          {event.is_paid && ticketTypes.length > 0 && (
            <div className="space-y-2 mb-5">
              {ticketTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  disabled={t.sold_out}
                  className={`w-full text-left p-4 rounded-xl border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedType === t.id ? 'border-gold bg-gold/10' : 'border-surface-border hover:border-gold/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-text-primary text-sm">{t.name}</div>
                      {t.description && <div className="text-2xs text-text-muted">{t.description}</div>}
                      {t.remaining != null && <div className="text-2xs text-text-secondary mt-0.5">{t.sold_out ? 'Sold out' : `${t.remaining} left`}</div>}
                    </div>
                    <div className="font-bold text-gold">{fmtPrice(t.price_cents)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-semibold text-text-secondary">Quantity</span>
            <div className="flex items-center gap-3">
              <button onClick={() => { setQuantity(q => Math.max(1, q - 1)); setGuestNames(g => g.slice(0, quantity - 1)) }} className="w-8 h-8 rounded-full border border-surface-border flex items-center justify-center text-text-secondary">
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-bold text-text-primary">{quantity}</span>
              <button onClick={() => setQuantity(q => Math.min(10, q + 1))} className="w-8 h-8 rounded-full border border-surface-border flex items-center justify-center text-text-secondary">
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <input className={inputCls} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
            <input className={inputCls} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <input className={inputCls + ' mb-3'} placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />

          {quantity > 1 && (
            <div className="mb-3 space-y-2">
              <p className="text-2xs text-text-muted">Guest names (optional)</p>
              {Array.from({ length: quantity - 1 }).map((_, i) => (
                <input
                  key={i}
                  className={inputCls}
                  placeholder={`Guest ${i + 1} name`}
                  value={guestNames[i] || ''}
                  onChange={e => setGuestNames(g => { const next = [...g]; next[i] = e.target.value; return next })}
                />
              ))}
            </div>
          )}

          {(event.custom_rsvp_questions || []).map((q: any, i: number) => (
            <div key={i} className="mb-3">
              {q.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input type="checkbox" checked={answers[q.label] === 'yes'} onChange={e => setAnswers(a => ({ ...a, [q.label]: e.target.checked ? 'yes' : '' }))} />
                  {q.label} {q.required && <span className="text-danger">*</span>}
                </label>
              ) : (
                <input
                  className={inputCls}
                  placeholder={`${q.label}${q.required ? ' *' : ''}`}
                  value={answers[q.label] || ''}
                  onChange={e => setAnswers(a => ({ ...a, [q.label]: e.target.value }))}
                />
              )}
            </div>
          ))}

          {event.is_paid && (
            <div className="flex items-center gap-2 mb-4">
              <Tag size={14} className="text-text-muted" />
              <input className={inputCls} placeholder="Promo code (optional)" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} />
            </div>
          )}

          <label className="flex items-start gap-2 text-2xs text-text-secondary mb-2">
            <input type="checkbox" checked={marketingOptIn} onChange={e => setMarketingOptIn(e.target.checked)} className="mt-0.5" />
            Email me about future DJ Maskoff events
          </label>

          {event.policies && (
            <label className="flex items-start gap-2 text-2xs text-text-secondary mb-4">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5" />
              I agree to the event policies below
            </label>
          )}

          {event.refund_policy && (
            <p className="text-2xs text-text-muted mb-4 flex items-start gap-1.5"><Clock size={12} className="mt-0.5 shrink-0" /> {event.refund_policy}</p>
          )}

          {error && <p className="text-xs text-danger font-semibold mb-3">{error}</p>}

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-gold-gradient text-brand-black font-bold text-sm disabled:opacity-60 hover:shadow-gold transition"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : event.is_paid ? (
              `Pay ${fmtPrice(unitPrice * quantity)} — Checkout`
            ) : (
              'Confirm RSVP'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function WaitlistForm({ event, done, onDone }: { event: any; done: boolean; onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim() || !email.trim()) { setError('Enter your name and email.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/rsvp/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id, name, email, phone, party_size: partySize }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      onDone()
    } catch (e: any) {
      setError(e.message || 'Failed to join waitlist')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 text-center">
        <CheckCircle2 className="mx-auto text-gold mb-2" size={26} />
        <p className="text-sm font-bold text-text-primary">You&apos;re on the waitlist!</p>
        <p className="text-2xs text-text-muted mt-1">We&apos;ll email you if a spot opens up.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-card border border-surface-border rounded-2xl p-5 sm:p-6">
      <p className="text-sm font-bold text-text-primary mb-1">This event is sold out</p>
      <p className="text-2xs text-text-muted mb-4">Join the waitlist and we&apos;ll notify you if a spot opens up.</p>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <input className={inputCls} placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
        <input className={inputCls} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <input className={inputCls} placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
        <input className={inputCls} type="number" min={1} placeholder="Party size" value={partySize} onChange={e => setPartySize(Math.max(1, Number(e.target.value) || 1))} />
      </div>
      {error && <p className="text-xs text-danger font-semibold mb-3">{error}</p>}
      <button onClick={submit} disabled={submitting} className="px-5 py-2.5 rounded-lg bg-gold-gradient text-brand-black text-xs font-bold disabled:opacity-60">
        {submitting ? 'Joining…' : 'Join Waitlist'}
      </button>
    </div>
  )
}
