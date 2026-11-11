'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, Loader2, Lock, AlertTriangle, Timer } from 'lucide-react'
import type { Booking } from '@/lib/crooked/types'
import { STATUS_LABELS } from '@/lib/crooked/types'
import { formatMoney } from '@/lib/crooked/pricing'

type PublicBooking = Omit<Booking, 'admin_notes' | 'id'>

const TIMELINE: { key: Booking['status'][]; label: string }[] = [
  { key: ['quote_requested', 'quoted', 'pending_payment'], label: 'Booked' },
  { key: ['deposit_paid', 'paid', 'scheduled'], label: 'Date locked' },
  { key: ['in_production'], label: 'In production' },
  { key: ['delivered', 'completed'], label: 'Delivered' },
]

export default function BookingStatus({ token, successNote, contactEmail }: { token: string; successNote: string; contactEmail: string }) {
  const [b, setB] = useState<PublicBooking | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [paying, setPaying] = useState<string | null>(null)
  const [payError, setPayError] = useState('')
  const [justPaid, setJustPaid] = useState(false)
  const [canceled, setCanceled] = useState(false)

  const load = useCallback(async (sessionId?: string | null) => {
    const qs = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
    const res = await fetch(`/api/crookedrumors/booking/${token}${qs}`, { cache: 'no-store' })
    if (res.status === 404) { setNotFound(true); return null }
    const data = await res.json()
    setB(data.booking)
    return data.booking as PublicBooking
  }, [token])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    setCanceled(params.get('canceled') === '1')
    if (sessionId) setJustPaid(true)
    load(sessionId).then(() => {
      // Clean the URL so a refresh doesn't re-verify or re-show banners.
      if (sessionId || params.get('canceled')) window.history.replaceState(null, '', window.location.pathname)
    })
  }, [load])

  async function pay(kind: 'deposit' | 'full' | 'balance') {
    setPaying(kind)
    setPayError('')
    try {
      const res = await fetch(`/api/crookedrumors/booking/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start payment')
      window.location.href = data.url
    } catch (err: any) {
      setPayError(err.message)
      setPaying(null)
    }
  }

  if (notFound) {
    return (
      <main className="cr-grain min-h-[70vh] flex items-center justify-center px-4">
        <div className="cr-card p-8 max-w-md text-center">
          <h1 className="cr-display text-4xl">Booking not found</h1>
          <p className="mt-3">Double check the link from your email.</p>
          <Link href="/crookedrumor" className="cr-btn cr-btn-ink mt-6">Back home</Link>
        </div>
      </main>
    )
  }
  if (!b) {
    return <main className="cr-grain min-h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin" size={36} /></main>
  }

  const balance = Math.max(0, b.total_cents - b.amount_paid_cents)
  const isQuote = b.kind === 'custom'
  const awaitingQuote = b.status === 'quote_requested'
  const cancelled = b.status === 'cancelled'
  const canPay = !cancelled && !awaitingQuote && balance > 0
  const firstPayment = b.amount_paid_cents === 0
  const depositOption = firstPayment && b.deposit_cents > 0 && b.deposit_cents < b.total_cents
  const stage = TIMELINE.findIndex(t => t.key.includes(b.status))

  let headline = 'Your booking'
  if (cancelled) headline = 'Booking cancelled'
  else if (awaitingQuote) headline = 'Quote request received'
  else if (b.status === 'quoted' && firstPayment) headline = 'Your quote is ready'
  else if (justPaid && b.amount_paid_cents > 0) headline = "You're locked in"
  else if (firstPayment && balance > 0) headline = 'Almost done'

  return (
    <main className="cr-grain min-h-screen pb-16">
      <div className="mx-auto max-w-3xl px-4 pt-8 md:pt-14">
        {justPaid && b.amount_paid_cents > 0 && (
          <div className="mb-6 rounded-xl bg-[var(--cr-ink)] text-[var(--cr-paper)] p-4 flex gap-3 items-start border-[3px] border-[var(--cr-ink)] shadow-[4px_4px_0_var(--cr-red)]">
            <CheckCircle2 className="text-[#7BE08A] shrink-0" />
            <div><div className="font-black uppercase">Payment received</div><div className="text-sm opacity-80">{successNote}</div></div>
          </div>
        )}
        {justPaid && b.amount_paid_cents === 0 && (
          <div className="mb-6 rounded-xl bg-[var(--cr-paper)] p-4 flex gap-3 items-center border-[3px] border-[var(--cr-ink)]">
            <Loader2 className="animate-spin shrink-0" /> <div className="font-bold">Confirming your payment. Refresh in a moment if this doesn&apos;t update.</div>
          </div>
        )}
        {canceled && canPay && (
          <div className="mb-6 rounded-xl bg-[#fff1dc] p-4 flex gap-3 items-start border-[3px] border-[var(--cr-red)]">
            <AlertTriangle className="text-[var(--cr-red)] shrink-0" />
            <div className="font-bold">Payment wasn&apos;t completed. Your booking is saved, so you can pay below whenever you&apos;re ready.</div>
          </div>
        )}

        <div className="cr-label text-[var(--cr-red)]">Booking {b.ref}</div>
        <h1 className="cr-display text-[clamp(40px,8vw,72px)] mt-2">{headline}</h1>
        {awaitingQuote && <p className="mt-3 text-lg text-[var(--cr-ink-soft)]">We&apos;re reviewing your project and will send a custom price, usually within 24 hours. You&apos;ll get an email, and this page will show your quote.</p>}

        {!isQuote || !awaitingQuote ? (
          !cancelled && (
            <ol className="mt-8 grid grid-cols-4 gap-1.5">
              {TIMELINE.map((t, i) => (
                <li key={t.label} className="text-center">
                  <div className={`h-2.5 rounded-full border-2 border-[var(--cr-ink)] ${i <= stage ? 'bg-[var(--cr-red)]' : 'bg-[var(--cr-paper)]'}`} />
                  <div className={`mt-2 text-[11px] md:text-xs font-black uppercase tracking-wide ${i <= stage ? '' : 'opacity-40'}`}>{t.label}</div>
                </li>
              ))}
            </ol>
          )
        ) : null}

        <div className="mt-8 cr-card p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="cr-display text-2xl md:text-3xl">{b.package_name || b.category_name || 'Custom project'}</div>
            <span className="rounded-full bg-[var(--cr-ink)] text-[var(--cr-paper)] px-3 py-1 text-xs font-black uppercase tracking-wider">{STATUS_LABELS[b.status]}</span>
          </div>

          {b.items.length > 0 && (
            <ul className="mt-5 space-y-2 text-[15px]">
              {b.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-3"><span>{i.label}{i.qty > 1 ? ` × ${i.qty}` : ''}</span><span className="font-bold">{formatMoney(i.totalCents)}</span></li>
              ))}
              {b.custom_requests.map(r => (
                <li key={r} className="flex justify-between gap-3 text-[var(--cr-muted)]"><span>{r}</span><span className="text-xs font-bold">Quoted separately</span></li>
              ))}
              {b.discount_cents > 0 && (
                <li className="flex justify-between gap-3 text-[var(--cr-red)] font-bold"><span>Promo {b.promo_code}</span><span>-{formatMoney(b.discount_cents)}</span></li>
              )}
            </ul>
          )}

          {b.total_cents > 0 && (
            <div className="mt-5 pt-4 border-t-2 border-[var(--cr-ink)] space-y-1.5">
              <div className="flex justify-between font-black uppercase"><span>Total</span><span className="cr-display text-2xl normal-case">{formatMoney(b.total_cents)}</span></div>
              <div className="flex justify-between text-sm font-bold"><span>Paid</span><span>{formatMoney(b.amount_paid_cents)}</span></div>
              {balance > 0 && <div className="flex justify-between text-sm font-black text-[var(--cr-red)]"><span>Balance</span><span>{formatMoney(balance)}</span></div>}
            </div>
          )}

          <dl className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
            {b.project_date && <Info k="Shoot date" v={new Date(b.project_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + (b.project_time ? ` · ${b.project_time}` : '')} />}
            {b.location && <Info k="Location" v={b.location} />}
            <Info k="Name" v={b.client_name} />
            <Info k="Email" v={b.client_email} />
          </dl>

          {b.turnaround && (
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-[var(--cr-ink)] text-[var(--cr-paper)] px-3 py-2 text-sm font-bold">
              <Timer size={16} className="text-[var(--cr-red)]" /> Turnaround: {b.turnaround} after your shoot
            </div>
          )}
        </div>

        {canPay && (
          <div className="mt-8 cr-card p-5 md:p-6 !shadow-[6px_6px_0_var(--cr-red)]">
            <div className="cr-display text-2xl">{firstPayment ? 'Lock in your date' : 'Pay your balance'}</div>
            <p className="mt-2 text-sm text-[var(--cr-ink-soft)]">
              {firstPayment ? 'Your date is not reserved until payment is made.' : 'Your remaining balance is due before final delivery.'}
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              {depositOption && (
                <button onClick={() => pay('deposit')} disabled={!!paying} className="cr-btn cr-btn-red flex-1">
                  {paying === 'deposit' ? <Loader2 className="animate-spin" size={18} /> : <Lock size={16} strokeWidth={3} />} Pay deposit {formatMoney(b.deposit_cents)}
                </button>
              )}
              <button onClick={() => pay(firstPayment ? 'full' : 'balance')} disabled={!!paying} className={`cr-btn flex-1 ${depositOption ? 'cr-btn-paper' : 'cr-btn-red'}`}>
                {paying && paying !== 'deposit' ? <Loader2 className="animate-spin" size={18} /> : <Lock size={16} strokeWidth={3} />} {firstPayment ? 'Pay in full' : 'Pay balance'} {formatMoney(balance)}
              </button>
            </div>
            {payError && <p className="mt-3 font-bold text-[var(--cr-red)]">{payError}</p>}
            <p className="mt-3 text-xs text-[var(--cr-muted)] flex items-center gap-1.5"><Lock size={12} /> Secure checkout by Stripe</p>
          </div>
        )}

        {!canPay && !cancelled && !awaitingQuote && balance === 0 && b.total_cents > 0 && (
          <div className="mt-8 flex items-center gap-3 font-bold"><CheckCircle2 className="text-green-700" /> Paid in full. Nothing else is due.</div>
        )}
        {awaitingQuote && (
          <div className="mt-8 flex items-center gap-3 font-bold"><Clock /> Waiting on your quote</div>
        )}

        <p className="mt-10 text-sm text-[var(--cr-muted)]">
          Save this page. It&apos;s your link to check status and pay.{contactEmail ? <> Questions? <a href={`mailto:${contactEmail}?subject=Booking ${b.ref}`} className="underline font-bold">{contactEmail}</a></> : null}
        </p>
      </div>
    </main>
  )
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--cr-muted)]">{k}</dt>
      <dd className="font-semibold break-words">{v}</dd>
    </div>
  )
}
