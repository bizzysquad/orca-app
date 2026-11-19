'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, ArrowRight } from 'lucide-react'
import { LIMITS, MIN_CONTRIBUTION, TEAM_SKILLS, UNPAID_OPTIONS, validateApplication } from '@/lib/crooked/team'
import type { ApplicationErrors, ApplicationInput } from '@/lib/crooked/team'

const empty: ApplicationInput = {
  full_name: '',
  email: '',
  social_handle: '',
  location: '',
  skills: [],
  skills_other: '',
  about: '',
  contribution: '',
  portfolio_url: '',
  unpaid_openness: '',
  acknowledged: false,
}

// Field order for scrolling to the first error.
const ORDER: (keyof ApplicationInput)[] = ['full_name', 'email', 'location', 'skills', 'skills_other', 'contribution', 'portfolio_url', 'unpaid_openness', 'acknowledged']

export default function JoinForm({ open }: { open: boolean }) {
  const [form, setForm] = useState<ApplicationInput>(empty)
  const [errors, setErrors] = useState<ApplicationErrors>({})
  const [tried, setTried] = useState(false)
  const [honey, setHoney] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const startedAt = useRef(0)
  const doneRef = useRef<HTMLDivElement>(null)

  useEffect(() => { startedAt.current = Date.now() }, [])
  useEffect(() => { if (done) doneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [done])

  const set = <K extends keyof ApplicationInput>(k: K, v: ApplicationInput[K]) => {
    const next = { ...form, [k]: v }
    setForm(next)
    if (tried) setErrors(validateApplication(next).errors)
  }
  const toggleSkill = (id: string) => set('skills', form.skills.includes(id) ? form.skills.filter(s => s !== id) : [...form.skills, id])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    setError('')
    const { errors: errs } = validateApplication(form)
    setErrors(errs)
    if (Object.keys(errs).length) {
      const first = ORDER.find(k => errs[k])
      document.getElementById(`f-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/crookedrumors/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, website: honey, startedAt: startedAt.current }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors)
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setDone(true)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div ref={doneRef} className="cr-card p-7 md:p-10 text-center" role="status">
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--cr-red)] text-[var(--cr-paper)] border-[3px] border-[var(--cr-ink)] flex items-center justify-center">
          <Check size={34} strokeWidth={3.5} />
        </div>
        <h3 className="cr-display text-[clamp(32px,7vw,56px)] mt-6">Thank You for Reaching Out!</h3>
        <p className="mt-4 text-lg leading-relaxed text-[var(--cr-ink-soft)] max-w-xl mx-auto">
          We appreciate your interest in joining the Crooked Rumor creative team. We&apos;ll review your information and reach out if an opportunity aligns with your skills and interests.
        </p>
        <p className="cr-stamp text-[var(--cr-red)] text-sm md:text-base mt-8">Stay creative. Stay connected.</p>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="cr-card p-7 text-center">
        <h3 className="cr-display text-3xl">Applications open soon</h3>
        <p className="mt-3 text-[var(--cr-ink-soft)]">We&apos;re getting things set up. Check back shortly.</p>
      </div>
    )
  }

  const err = (k: keyof ApplicationInput) =>
    errors[k] ? <p className="mt-1.5 text-sm font-bold text-[var(--cr-red)]" role="alert">{errors[k]}</p> : null
  const bad = (k: keyof ApplicationInput) => (errors[k] ? '!border-[var(--cr-red)] !bg-[#fff1ec]' : '')

  return (
    <form onSubmit={submit} noValidate className="cr-card p-5 md:p-8 space-y-6">
      {/* honeypot: off screen, skipped by keyboard and screen readers */}
      <div aria-hidden className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={honey} onChange={e => setHoney(e.target.value)} name="website" /></label>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Q id="full_name" label="Full Name" required>
          <input id="f-full_name" className={`cr-input ${bad('full_name')}`} autoComplete="name" maxLength={LIMITS.full_name} value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          {err('full_name')}
        </Q>
        <Q id="email" label="Email Address" required>
          <input id="f-email" type="email" inputMode="email" autoComplete="email" className={`cr-input ${bad('email')}`} maxLength={LIMITS.email} value={form.email} onChange={e => set('email', e.target.value)} />
          {err('email')}
        </Q>
        <Q id="social_handle" label="Instagram / Social Media Handle">
          <input id="f-social_handle" className="cr-input" placeholder="@yourhandle" autoCapitalize="none" maxLength={LIMITS.social_handle} value={form.social_handle} onChange={e => set('social_handle', e.target.value)} />
        </Q>
        <Q id="location" label="Location / City" required>
          <input id="f-location" className={`cr-input ${bad('location')}`} autoComplete="address-level2" maxLength={LIMITS.location} value={form.location} onChange={e => set('location', e.target.value)} />
          {err('location')}
        </Q>
      </div>

      <fieldset id="f-skills">
        <legend className="cr-label !text-[12px] mb-1">What Do You Do? <Req /></legend>
        <p className="text-sm text-[var(--cr-muted)] mb-3">Pick everything that applies.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TEAM_SKILLS.map(s => {
            const on = form.skills.includes(s.id)
            return (
              <label
                key={s.id}
                className={`flex items-center gap-3 rounded-[10px] border-2 px-3.5 py-3 cursor-pointer font-bold text-[15px] transition-colors select-none ${
                  on ? 'bg-[var(--cr-ink)] text-[var(--cr-paper)] border-[var(--cr-ink)]' : `bg-[var(--cr-paper)] border-[var(--cr-ink)] hover:bg-[var(--cr-tan)]/50 ${errors.skills ? '!border-[var(--cr-red)]' : ''}`
                }`}
              >
                <input type="checkbox" className="sr-only peer" checked={on} onChange={() => toggleSkill(s.id)} />
                <span className={`w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-[var(--cr-red)] ${on ? 'bg-[var(--cr-red)] border-[var(--cr-paper)]' : 'border-[var(--cr-ink)]'}`}>
                  {on && <Check size={14} strokeWidth={4} />}
                </span>
                {s.label}
              </label>
            )
          })}
        </div>
        {err('skills')}
        {form.skills.includes('other') && (
          <div className="mt-3">
            <input id="f-skills_other" className={`cr-input ${bad('skills_other')}`} placeholder="What else do you do?" maxLength={LIMITS.skills_other} value={form.skills_other} onChange={e => set('skills_other', e.target.value)} aria-label="Other skill" />
            {err('skills_other')}
          </div>
        )}
      </fieldset>

      <Q id="about" label="Tell Us About Yourself" hint="A few lines about you, your style, and your experience.">
        <textarea id="f-about" className="cr-input" rows={3} maxLength={LIMITS.about} value={form.about} onChange={e => set('about', e.target.value)} />
      </Q>

      <Q id="contribution" label="How Could You Contribute to Crooked Rumor?" required>
        <textarea
          id="f-contribution"
          className={`cr-input ${bad('contribution')}`}
          rows={5}
          maxLength={LIMITS.contribution}
          placeholder="Ideas you would bring, content you want to make, how you would help us grow..."
          value={form.contribution}
          onChange={e => set('contribution', e.target.value)}
        />
        <div className="flex justify-between gap-3">
          <div>{err('contribution')}</div>
          <span className={`mt-1.5 text-xs font-bold shrink-0 ${form.contribution.trim().length < MIN_CONTRIBUTION ? 'text-[var(--cr-muted)]' : 'text-green-800'}`}>
            {form.contribution.trim().length}/{LIMITS.contribution}
          </span>
        </div>
      </Q>

      <Q id="portfolio_url" label="Portfolio / Website / Work Samples" hint="A link to your site, reel, Drive folder, or anywhere we can see your work.">
        <input id="f-portfolio_url" type="url" inputMode="url" autoCapitalize="none" className={`cr-input ${bad('portfolio_url')}`} placeholder="yourportfolio.com" maxLength={LIMITS.portfolio_url} value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} />
        {err('portfolio_url')}
      </Q>

      <fieldset id="f-unpaid_openness">
        <legend className="cr-label !text-[12px] mb-3">Are You Open to Collaborations That May Not Initially Be Paid? <Req /></legend>
        <div className="grid sm:grid-cols-3 gap-2.5">
          {UNPAID_OPTIONS.map(o => {
            const on = form.unpaid_openness === o.id
            return (
              <label
                key={o.id}
                className={`flex items-center gap-3 rounded-[10px] border-2 px-3.5 py-3 cursor-pointer font-bold text-[15px] select-none ${
                  on ? 'bg-[var(--cr-ink)] text-[var(--cr-paper)] border-[var(--cr-ink)]' : `bg-[var(--cr-paper)] border-[var(--cr-ink)] hover:bg-[var(--cr-tan)]/50 ${errors.unpaid_openness ? '!border-[var(--cr-red)]' : ''}`
                }`}
              >
                <input type="radio" name="unpaid_openness" className="sr-only peer" checked={on} onChange={() => set('unpaid_openness', o.id)} />
                <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-[var(--cr-red)] ${on ? 'border-[var(--cr-paper)]' : 'border-[var(--cr-ink)]'}`}>
                  {on && <span className="w-2.5 h-2.5 rounded-full bg-[var(--cr-red)]" />}
                </span>
                {o.label}
              </label>
            )
          })}
        </div>
        {err('unpaid_openness')}
      </fieldset>

      <div id="f-acknowledged">
        <label className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer ${errors.acknowledged ? 'border-[var(--cr-red)] bg-[#fff1ec]' : 'border-[var(--cr-ink)] bg-[var(--cr-tan)]/40'}`}>
          <input type="checkbox" className="mt-1 w-5 h-5 shrink-0 accent-[var(--cr-red)]" checked={form.acknowledged} onChange={e => set('acknowledged', e.target.checked)} />
          <span className="text-[15px] leading-relaxed">
            I understand that submitting this form does not guarantee employment, compensation, or project assignments with Crooked Rumor. <Req />
          </span>
        </label>
        {err('acknowledged')}
      </div>

      {error && (
        <p className="rounded-lg border-2 border-[var(--cr-red)] bg-[#fff1ec] p-3 text-sm font-bold text-[var(--cr-red)]" role="alert">{error}</p>
      )}

      <button type="submit" disabled={busy} className="cr-btn cr-btn-red w-full text-lg !py-4">
        {busy ? <Loader2 className="animate-spin" size={20} /> : null}
        {busy ? 'Sending...' : <>Let&apos;s connect! <ArrowRight size={20} strokeWidth={3} /></>}
      </button>
      <p className="text-xs text-center text-[var(--cr-muted)]">Your info is private and only seen by the Crooked Rumor team.</p>
    </form>
  )
}

function Req() {
  return <span className="text-[var(--cr-red)]" aria-label="required">*</span>
}

function Q({ id, label, required, hint, children }: { id: string; label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className="block cr-label !text-[12px] mb-1.5">
        {label} {required ? <Req /> : <span className="normal-case tracking-normal font-semibold text-[var(--cr-muted)]">(optional)</span>}
      </label>
      {hint ? <p className="text-sm text-[var(--cr-muted)] mb-2 -mt-0.5">{hint}</p> : null}
      {children}
    </div>
  )
}
