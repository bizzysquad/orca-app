'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Lock, Minus, Plus, Tag, Timer, X, Loader2 } from 'lucide-react'
import type { Promo, PublicSiteDoc } from '@/lib/crooked/types'
import { addonPriceLabel, addonsFor, computeQuote, formatMoney } from '@/lib/crooked/pricing'

type Mode = 'package' | 'custom'
const STEPS = ['Package', 'Add ons', 'Details', 'Review & pay'] as const

const emptyClient = { name: '', email: '', phone: '', instagram: '', company: '' }
const emptyProject = { date: '', time: '', location: '', details: '', budget: '', referral: '', service: '' }

export default function BookingFlow({
  site,
  bookingOpen,
  initialPackageId,
  initialMode,
}: {
  site: PublicSiteDoc
  bookingOpen: boolean
  initialPackageId: string
  initialMode: Mode
}) {
  const validInitial = site.packages.some(p => p.id === initialPackageId)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [step, setStep] = useState(validInitial ? 1 : 0)
  const [packageId, setPackageId] = useState(validInitial ? initialPackageId : '')
  const [picked, setPicked] = useState<Record<string, number>>({})
  const [client, setClient] = useState(emptyClient)
  const [project, setProject] = useState(emptyProject)
  const [paymentChoice, setPaymentChoice] = useState<'deposit' | 'full'>('deposit')
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState<Promo | null>(null)
  const [promoMsg, setPromoMsg] = useState('')
  const [agree, setAgree] = useState(false)
  const [honey, setHoney] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selection = useMemo(
    () => ({ packageId, addons: Object.entries(picked).map(([id, qty]) => ({ id, qty })), paymentChoice }),
    [packageId, picked, paymentChoice]
  )
  const quote = useMemo(() => computeQuote(site, selection, promo), [site, selection, promo])
  const pkg = quote?.pkg
  const addons = pkg ? addonsFor(site, pkg.categoryId) : []

  const choosePackage = (id: string) => {
    if (id !== packageId) {
      setPicked({})
      setPromo(null)
      setPromoMsg('')
    }
    setPackageId(id)
    setStep(1)
    scrollTop()
  }

  const toggleAddon = (id: string) =>
    setPicked(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = 1
      return next
    })
  const setQty = (id: string, qty: number) => setPicked(prev => ({ ...prev, [id]: Math.max(1, Math.min(20, qty)) }))

  const detailsValid = client.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email.trim()) && project.date
  const go = (n: number) => {
    setError('')
    setStep(n)
    scrollTop()
  }

  async function applyPromo() {
    setPromoMsg('')
    if (!promoInput.trim()) return
    const res = await fetch('/api/crookedrumors/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoInput.trim(), packageId, addons: selection.addons }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPromo(null)
      setPromoMsg(data.error || 'That code is not valid')
      return
    }
    setPromo(data.promo)
    setPromoMsg('')
  }

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/crookedrumors/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: mode,
          selection: mode === 'package' ? { ...selection, paymentChoice: quote?.paymentChoice } : undefined,
          promoCode: mode === 'package' ? promo?.code || '' : '',
          client,
          project,
          website: honey,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      if (data.checkoutUrl) window.location.href = data.checkoutUrl
      else window.location.href = `/crookedrumor/booking/${data.token}${data.paymentError ? '?canceled=1' : ''}`
    } catch (err: any) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!bookingOpen) {
    return (
      <main className="cr-grain min-h-[70vh] flex items-center justify-center px-4">
        <div className="cr-card p-8 max-w-md text-center">
          <h1 className="cr-display text-4xl">Booking opens soon</h1>
          <p className="mt-3 text-[var(--cr-ink-soft)]">Online booking is getting set up. {site.settings.contactEmail ? <>Email <a className="underline font-bold" href={`mailto:${site.settings.contactEmail}`}>{site.settings.contactEmail}</a> to book now.</> : 'Check back shortly.'}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="cr-grain min-h-screen pb-32 lg:pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-8 md:pt-12">
        <h1 className="cr-display text-[clamp(44px,9vw,88px)]">{mode === 'custom' ? 'Custom quote' : 'Book a shoot'}</h1>

        <div className="mt-5 inline-flex rounded-xl border-[3px] border-[var(--cr-ink)] bg-[var(--cr-paper)] p-1">
          {(['package', 'custom'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wide transition-colors ${mode === m ? 'bg-[var(--cr-ink)] text-[var(--cr-paper)]' : ''}`}
            >
              {m === 'package' ? 'Pick a package' : 'Custom quote'}
            </button>
          ))}
        </div>

        {mode === 'custom' ? (
          <CustomQuoteForm
            site={site}
            client={client}
            setClient={setClient}
            project={project}
            setProject={setProject}
            honey={honey}
            setHoney={setHoney}
            busy={busy}
            error={error}
            onSubmit={submit}
          />
        ) : (
          <>
            {/* stepper */}
            <ol className="mt-8 flex gap-1.5 md:gap-3">
              {STEPS.map((label, i) => {
                const reachable = i === 0 || (!!pkg && (i < 3 || detailsValid))
                return (
                  <li key={label} className="flex-1">
                    <button
                      disabled={!reachable || busy}
                      onClick={() => go(i)}
                      className={`w-full text-left rounded-lg border-2 px-2.5 py-2 md:px-3 transition-colors disabled:cursor-not-allowed ${
                        step === i ? 'bg-[var(--cr-ink)] border-[var(--cr-ink)] text-[var(--cr-paper)]' : step > i ? 'bg-[var(--cr-paper)] border-[var(--cr-ink)]' : 'border-[var(--cr-ink)]/25 text-[var(--cr-ink)]/50'
                      }`}
                    >
                      <span className="block text-[10px] font-black tracking-[0.15em] opacity-70">STEP {i + 1}</span>
                      <span className="block text-xs md:text-sm font-extrabold truncate">{label}</span>
                    </button>
                  </li>
                )
              })}
            </ol>

            <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
              <div>
                {step === 0 && (
                  <div className="space-y-10">
                    {site.categories.map(cat => {
                      const list = site.packages.filter(p => p.categoryId === cat.id)
                      if (!list.length) return null
                      return (
                        <div key={cat.id}>
                          <h2 className="cr-display text-2xl md:text-3xl mb-4">{cat.name}</h2>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {list.map(p => (
                              <button
                                key={p.id}
                                onClick={() => choosePackage(p.id)}
                                className={`text-left cr-card-flat !border-[3px] p-4 transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--cr-ink)] ${
                                  p.id === packageId ? '!bg-[var(--cr-ink)] text-[var(--cr-paper)] shadow-[4px_4px_0_var(--cr-red)]' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="font-black text-lg uppercase leading-tight">{p.name}</div>
                                    <div className={`text-xs font-bold mt-1 ${p.id === packageId ? 'opacity-70' : 'text-[var(--cr-red)]'}`}>{p.tagline}</div>
                                  </div>
                                  <div className="cr-display text-3xl">{formatMoney(p.priceCents)}</div>
                                </div>
                                <div className={`mt-3 text-[13px] leading-snug ${p.id === packageId ? 'opacity-80' : 'text-[var(--cr-muted)]'}`}>
                                  {[p.specs.deliverables, p.specs.filmingTime, p.specs.turnaround && `Ready in ${p.specs.turnaround}`].filter(Boolean).join(' · ')}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {step === 1 && pkg && (
                  <div>
                    <h2 className="cr-display text-3xl">Add ons for {pkg.name}</h2>
                    <p className="mt-2 text-[var(--cr-ink-soft)]">Optional. Custom priced extras are quoted after you book and are not charged now.</p>
                    {addons.length === 0 ? (
                      <p className="mt-6 font-semibold">No add ons for this package.</p>
                    ) : (
                      <ul className="mt-6 space-y-3">
                        {addons.map(a => {
                          const on = !!picked[a.id]
                          return (
                            <li key={a.id} className={`cr-card-flat !border-[3px] p-4 transition-colors ${on ? '!bg-[#fff1dc] !border-[var(--cr-red)]' : ''}`}>
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => toggleAddon(a.id)}
                                  aria-pressed={on}
                                  aria-label={`${on ? 'Remove' : 'Add'} ${a.name}`}
                                  className={`shrink-0 w-7 h-7 rounded-md border-[3px] border-[var(--cr-ink)] flex items-center justify-center mt-0.5 ${on ? 'bg-[var(--cr-red)] text-[var(--cr-paper)]' : 'bg-[var(--cr-paper)]'}`}
                                >
                                  {on && <Check size={16} strokeWidth={4} />}
                                </button>
                                <button onClick={() => toggleAddon(a.id)} className="flex-1 text-left">
                                  <div className="font-extrabold">{a.name}</div>
                                  {a.description ? <div className="text-[13px] text-[var(--cr-muted)] mt-0.5">{a.description}</div> : null}
                                </button>
                                <div className={`shrink-0 text-right text-sm font-black ${a.priceCents == null ? 'text-[var(--cr-muted)]' : 'text-[var(--cr-red)]'}`}>{addonPriceLabel(a)}</div>
                              </div>
                              {on && a.allowQty && (
                                <div className="mt-3 ml-10 flex items-center gap-3">
                                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--cr-muted)]">Qty</span>
                                  <div className="flex items-center border-2 border-[var(--cr-ink)] rounded-lg bg-[var(--cr-paper)]">
                                    <button onClick={() => setQty(a.id, picked[a.id] - 1)} className="p-2" aria-label="Less"><Minus size={14} strokeWidth={3} /></button>
                                    <span className="w-8 text-center font-black">{picked[a.id]}</span>
                                    <button onClick={() => setQty(a.id, picked[a.id] + 1)} className="p-2" aria-label="More"><Plus size={14} strokeWidth={3} /></button>
                                  </div>
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <StepNav onBack={() => go(0)} onNext={() => go(2)} nextLabel="Your details" />
                  </div>
                )}

                {step === 2 && pkg && (
                  <div>
                    <h2 className="cr-display text-3xl">Your details</h2>
                    <div className="mt-6 grid sm:grid-cols-2 gap-4">
                      <Field label="Your name *"><input className="cr-input" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} autoComplete="name" /></Field>
                      <Field label="Email *"><input className="cr-input" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} autoComplete="email" /></Field>
                      <Field label="Phone"><input className="cr-input" type="tel" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} autoComplete="tel" /></Field>
                      <Field label="Instagram"><input className="cr-input" value={client.instagram} placeholder="@yourhandle" onChange={e => setClient({ ...client, instagram: e.target.value })} /></Field>
                      <Field label="Preferred shoot date *"><input className="cr-input" type="date" min={todayStr()} value={project.date} onChange={e => setProject({ ...project, date: e.target.value })} /></Field>
                      <Field label="Preferred time"><input className="cr-input" value={project.time} placeholder="e.g. 2pm, evening, flexible" onChange={e => setProject({ ...project, time: e.target.value })} /></Field>
                      <Field label="Location / address" className="sm:col-span-2"><input className="cr-input" value={project.location} placeholder="Where are we filming?" onChange={e => setProject({ ...project, location: e.target.value })} /></Field>
                      <Field label="Project details" className="sm:col-span-2">
                        <textarea className="cr-input min-h-[120px]" value={project.details} placeholder="What are we making? Vibe, references, links, anything we should know." onChange={e => setProject({ ...project, details: e.target.value })} />
                      </Field>
                      <Field label="Business / brand name"><input className="cr-input" value={client.company} onChange={e => setClient({ ...client, company: e.target.value })} /></Field>
                      <Field label="How did you hear about us?"><input className="cr-input" value={project.referral} onChange={e => setProject({ ...project, referral: e.target.value })} /></Field>
                    </div>
                    <input tabIndex={-1} autoComplete="off" className="hidden" value={honey} onChange={e => setHoney(e.target.value)} aria-hidden />
                    <StepNav onBack={() => go(1)} onNext={() => go(3)} nextLabel="Review" nextDisabled={!detailsValid} hint={!detailsValid ? 'Name, email, and date are required' : ''} />
                  </div>
                )}

                {step === 3 && quote && (
                  <div>
                    <h2 className="cr-display text-3xl">Review & pay</h2>

                    <div className="mt-6 cr-card-flat !border-[3px] p-5 space-y-1 text-[15px]">
                      <Row k="Name" v={client.name} />
                      <Row k="Email" v={client.email} />
                      {client.phone && <Row k="Phone" v={client.phone} />}
                      <Row k="Shoot date" v={`${fmtDate(project.date)}${project.time ? ` · ${project.time}` : ''}`} />
                      {project.location && <Row k="Location" v={project.location} />}
                      <button onClick={() => go(2)} className="text-sm font-bold underline mt-2">Edit details</button>
                    </div>

                    {quote.canPayDeposit && site.settings.payment.mode === 'choice' && (
                      <div className="mt-6">
                        <div className="cr-label mb-3">How do you want to pay?</div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <PayOption
                            active={quote.paymentChoice === 'deposit'}
                            onClick={() => setPaymentChoice('deposit')}
                            title={`Deposit ${formatMoney(quote.depositCents, { always2: !Number.isInteger(quote.depositCents / 100) })}`}
                            sub={`Locks your date. ${formatMoney(quote.totalCents - quote.depositCents)} due before delivery.`}
                          />
                          <PayOption active={quote.paymentChoice === 'full'} onClick={() => setPaymentChoice('full')} title={`Pay in full ${formatMoney(quote.totalCents)}`} sub="All set. Nothing due later." />
                        </div>
                      </div>
                    )}
                    {quote.canPayDeposit && site.settings.payment.mode === 'deposit' && (
                      <p className="mt-6 font-semibold">A {site.settings.payment.depositPercent}% deposit locks your date. The rest is due before delivery.</p>
                    )}

                    {site.hasPromos && (
                      <div className="mt-6">
                        <div className="cr-label mb-2">Promo code</div>
                        {promo ? (
                          <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--cr-ink)] text-[var(--cr-paper)] px-3 py-2 font-bold text-sm">
                            <Tag size={14} /> {promo.code}{promo.label ? ` · ${promo.label}` : ''}
                            <button onClick={() => { setPromo(null); setPromoInput('') }} aria-label="Remove code" className="ml-1"><X size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex gap-2 max-w-sm">
                            <input className="cr-input uppercase" value={promoInput} onChange={e => setPromoInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyPromo()} placeholder="Enter code" />
                            <button onClick={applyPromo} className="cr-btn cr-btn-ink cr-btn-sm shrink-0">Apply</button>
                          </div>
                        )}
                        {promoMsg && <p className="mt-2 text-sm font-bold text-[var(--cr-red)]">{promoMsg}</p>}
                        {promo && quote.promoError && <p className="mt-2 text-sm font-bold text-[var(--cr-red)]">{quote.promoError}</p>}
                      </div>
                    )}

                    {site.settings.bookingTerms && (
                      <label className="mt-6 flex gap-3 items-start cursor-pointer">
                        <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-1 w-5 h-5 accent-[var(--cr-red)] shrink-0" />
                        <span className="text-sm leading-relaxed text-[var(--cr-ink-soft)]">I agree to the booking terms: {site.settings.bookingTerms}</span>
                      </label>
                    )}

                    {error && <p className="mt-5 font-bold text-[var(--cr-red)]">{error}</p>}

                    <div className="mt-8 flex flex-col-reverse sm:flex-row gap-3 sm:items-center">
                      <button onClick={() => go(2)} className="cr-btn cr-btn-paper" disabled={busy}><ArrowLeft size={18} strokeWidth={3} /> Back</button>
                      <button onClick={submit} disabled={busy || (!!site.settings.bookingTerms && !agree)} className="cr-btn cr-btn-red flex-1 text-base">
                        {busy ? <Loader2 className="animate-spin" size={18} /> : <Lock size={16} strokeWidth={3} />}
                        {quote.dueNowCents > 0 ? `Pay ${formatMoney(quote.dueNowCents, { always2: !Number.isInteger(quote.dueNowCents / 100) })} securely` : 'Confirm booking'}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-[var(--cr-muted)] flex items-center gap-1.5"><Lock size={12} /> Checkout handled by Stripe. We never see your card number.</p>
                  </div>
                )}
              </div>

              {/* summary */}
              <aside className="hidden lg:block sticky top-24">
                <Summary quote={quote} />
              </aside>
            </div>

            {/* mobile bottom bar */}
            {pkg && step < 3 && (
              <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--cr-paper)] border-t-[3px] border-[var(--cr-ink)] px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate text-[var(--cr-muted)]">{pkg.name}{quote && quote.items.length > 1 ? ` + ${quote.items.length - 1} add on${quote.items.length > 2 ? 's' : ''}` : ''}</div>
                  <div className="cr-display text-2xl">{formatMoney(quote?.totalCents)}</div>
                </div>
                {step === 0 && <button onClick={() => go(1)} className="cr-btn cr-btn-red cr-btn-sm">Continue</button>}
              </div>
            )}
            {step === 3 && quote && (
              <div className="lg:hidden mt-8 px-4">
                <Summary quote={quote} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )

  function Summary({ quote }: { quote: ReturnType<typeof computeQuote> }) {
    if (!quote) {
      return (
        <div className="cr-card p-5">
          <div className="cr-display text-2xl">Your booking</div>
          <p className="mt-2 text-sm text-[var(--cr-muted)]">Pick a package to see your total.</p>
        </div>
      )
    }
    return (
      <div className="cr-card p-5">
        <div className="cr-display text-2xl">Your booking</div>
        <ul className="mt-4 space-y-2 text-sm">
          {quote.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-3">
              <span className={idx === 0 ? 'font-extrabold' : ''}>{i.label}{i.qty > 1 ? ` × ${i.qty}` : ''}</span>
              <span className="font-bold shrink-0">{formatMoney(i.totalCents)}</span>
            </li>
          ))}
          {quote.customRequests.map(r => (
            <li key={r} className="flex justify-between gap-3 text-[var(--cr-muted)]">
              <span>{r}</span><span className="shrink-0 text-xs font-bold">Quoted later</span>
            </li>
          ))}
          {quote.discountCents > 0 && (
            <li className="flex justify-between gap-3 text-[var(--cr-red)] font-bold">
              <span>Promo {quote.promo?.code}</span><span>-{formatMoney(quote.discountCents, { always2: !Number.isInteger(quote.discountCents / 100) })}</span>
            </li>
          )}
        </ul>
        <div className="mt-4 pt-4 border-t-2 border-[var(--cr-ink)] flex justify-between items-baseline">
          <span className="font-black uppercase">Total</span>
          <span className="cr-display text-3xl">{formatMoney(quote.totalCents, { always2: !Number.isInteger(quote.totalCents / 100) })}</span>
        </div>
        {step === 3 && quote.dueNowCents !== quote.totalCents && (
          <div className="mt-2 flex justify-between text-sm font-bold">
            <span>Due today</span><span className="text-[var(--cr-red)]">{formatMoney(quote.dueNowCents, { always2: !Number.isInteger(quote.dueNowCents / 100) })}</span>
          </div>
        )}
        {quote.pkg.specs.turnaround && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--cr-ink)] text-[var(--cr-paper)] px-3 py-2 text-sm font-bold">
            <Timer size={16} className="text-[var(--cr-red)]" />
            {picked['rush'] ? '24 hour rush delivery' : `Ready in ${quote.pkg.specs.turnaround}`}
          </div>
        )}
        {step === 0 && (
          <button onClick={() => go(1)} className="cr-btn cr-btn-red w-full mt-5">Continue <ArrowRight size={18} strokeWidth={3} /></button>
        )}
      </div>
    )
  }
}

function CustomQuoteForm({
  site, client, setClient, project, setProject, honey, setHoney, busy, error, onSubmit,
}: {
  site: PublicSiteDoc
  client: typeof emptyClient
  setClient: (c: typeof emptyClient) => void
  project: typeof emptyProject
  setProject: (p: typeof emptyProject) => void
  honey: string
  setHoney: (v: string) => void
  busy: boolean
  error: string
  onSubmit: () => void
}) {
  const valid = client.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email.trim()) && project.details.trim().length >= 10
  return (
    <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
      <div className="cr-card p-5 md:p-7">
        <p className="text-[var(--cr-ink-soft)]">{site.settings.customQuoteBody}</p>
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <Field label="What do you need?" className="sm:col-span-2">
            <select className="cr-input" value={project.service} onChange={e => setProject({ ...project, service: e.target.value })}>
              <option value="">Choose one</option>
              {site.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="Music video">Music video</option>
              <option value="Brand campaign">Brand campaign</option>
              <option value="Something else">Something else</option>
            </select>
          </Field>
          <Field label="Your name *"><input className="cr-input" value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} autoComplete="name" /></Field>
          <Field label="Email *"><input className="cr-input" type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} autoComplete="email" /></Field>
          <Field label="Phone"><input className="cr-input" type="tel" value={client.phone} onChange={e => setClient({ ...client, phone: e.target.value })} autoComplete="tel" /></Field>
          <Field label="Instagram"><input className="cr-input" value={client.instagram} placeholder="@yourhandle" onChange={e => setClient({ ...client, instagram: e.target.value })} /></Field>
          <Field label="Target date"><input className="cr-input" type="date" min={todayStr()} value={project.date} onChange={e => setProject({ ...project, date: e.target.value })} /></Field>
          <Field label="Budget">
            <select className="cr-input" value={project.budget} onChange={e => setProject({ ...project, budget: e.target.value })}>
              <option value="">Not sure yet</option>
              <option>Under $150</option>
              <option>$150 to $300</option>
              <option>$300 to $600</option>
              <option>$600 to $1,000</option>
              <option>$1,000+</option>
            </select>
          </Field>
          <Field label="Location" className="sm:col-span-2"><input className="cr-input" value={project.location} onChange={e => setProject({ ...project, location: e.target.value })} /></Field>
          <Field label="Tell us about the project *" className="sm:col-span-2">
            <textarea className="cr-input min-h-[160px]" value={project.details} placeholder="What are you making, how long is the shoot, how many locations, what do you want delivered, any links or references." onChange={e => setProject({ ...project, details: e.target.value })} />
          </Field>
        </div>
        <input tabIndex={-1} autoComplete="off" className="hidden" value={honey} onChange={e => setHoney(e.target.value)} aria-hidden />
        {error && <p className="mt-5 font-bold text-[var(--cr-red)]">{error}</p>}
        <button onClick={onSubmit} disabled={!valid || busy} className="cr-btn cr-btn-red w-full mt-6 text-base">
          {busy ? <Loader2 className="animate-spin" size={18} /> : null} Send quote request
        </button>
        <p className="mt-3 text-xs text-[var(--cr-muted)]">No payment now. We will send your quote, and you can pay online once you approve it.</p>
      </div>
      <aside className="cr-card p-5 lg:sticky lg:top-24 !shadow-[6px_6px_0_var(--cr-red)]">
        <div className="cr-display text-2xl">How quotes work</div>
        <ol className="mt-4 space-y-3 text-sm">
          {['Send us the details.', 'We reply with a custom price, usually within 24 hours.', 'Approve and pay online from your booking page to lock it in.'].map((t, i) => (
            <li key={i} className="flex gap-3"><span className="cr-display text-xl text-[var(--cr-red)]">{i + 1}</span><span className="pt-1">{t}</span></li>
          ))}
        </ol>
      </aside>
    </div>
  )
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-black uppercase tracking-[0.1em] mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-24 shrink-0 text-xs font-black uppercase tracking-wider text-[var(--cr-muted)] pt-0.5">{k}</span>
      <span className="font-semibold break-words min-w-0">{v}</span>
    </div>
  )
}

function PayOption({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button onClick={onClick} className={`text-left rounded-xl border-[3px] p-4 transition-all ${active ? 'border-[var(--cr-red)] bg-[#fff1dc] shadow-[4px_4px_0_var(--cr-red)]' : 'border-[var(--cr-ink)] bg-[var(--cr-paper)]'}`}>
      <div className="flex items-center gap-2 font-black uppercase">
        <span className={`w-4 h-4 rounded-full border-[3px] ${active ? 'border-[var(--cr-red)] bg-[var(--cr-red)]' : 'border-[var(--cr-ink)]'}`} />
        {title}
      </div>
      <div className="text-sm mt-1 text-[var(--cr-ink-soft)]">{sub}</div>
    </button>
  )
}

function StepNav({ onBack, onNext, nextLabel, nextDisabled, hint }: { onBack: () => void; onNext: () => void; nextLabel: string; nextDisabled?: boolean; hint?: string }) {
  return (
    <div className="mt-8">
      <div className="flex gap-3">
        <button onClick={onBack} className="cr-btn cr-btn-paper"><ArrowLeft size={18} strokeWidth={3} /></button>
        <button onClick={onNext} disabled={nextDisabled} className="cr-btn cr-btn-red flex-1">{nextLabel} <ArrowRight size={18} strokeWidth={3} /></button>
      </div>
      {hint ? <p className="mt-2 text-sm font-semibold text-[var(--cr-muted)]">{hint}</p> : null}
    </div>
  )
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(s: string) {
  if (!s) return ''
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function scrollTop() {
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}
