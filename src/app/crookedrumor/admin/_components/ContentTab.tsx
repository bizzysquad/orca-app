'use client'

import { Plus } from 'lucide-react'
import type { SiteDoc, SiteSettings } from '@/lib/crooked/types'
import { formatMoney } from '@/lib/crooked/pricing'
import type { SetDoc } from './AdminApp'
import { Field, Money, Panel, RowActions, StringList, Text, UploadButton, move } from './ui'

export default function ContentTab({ doc, setDoc }: { doc: SiteDoc; setDoc: SetDoc }) {
  const s = doc.settings
  const set = (patch: Partial<SiteSettings>) => setDoc(d => ({ ...d, settings: { ...d.settings, ...patch } }))
  const t = (key: keyof SiteSettings, label: string, opts: { area?: boolean; hint?: string; className?: string; rows?: number } = {}) => (
    <Field label={label} hint={opts.hint} className={opts.className}>
      <Text area={opts.area} rows={opts.rows} value={String(s[key] ?? '')} onChange={v => set({ [key]: v } as Partial<SiteSettings>)} />
    </Field>
  )
  const pay = s.payment
  const example = 20000
  const exampleDeposit = Math.round((example * pay.depositPercent) / 100)

  return (
    <div className="space-y-6">
      <h2 className="cr-display text-3xl">Site content & payments</h2>

      <Panel title="Payments">
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="How clients pay">
            <select className="cr-input !text-[15px] !py-2.5" value={pay.mode} onChange={e => set({ payment: { ...pay, mode: e.target.value as SiteSettings['payment']['mode'] } })}>
              <option value="choice">Client chooses deposit or full</option>
              <option value="deposit">Deposit required, balance later</option>
              <option value="full">Always pay in full</option>
            </select>
          </Field>
          <Field label="Deposit percent">
            <input className="cr-input !text-[15px] !py-2.5" inputMode="numeric" value={pay.depositPercent} disabled={pay.mode === 'full'} onChange={e => set({ payment: { ...pay, depositPercent: Math.min(100, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1)) } })} />
          </Field>
          <Field label="Pay in full when under" hint="Small orders skip the deposit">
            <Money cents={pay.fullPaymentUnderCents} onChange={v => set({ payment: { ...pay, fullPaymentUnderCents: v ?? 0 } })} />
          </Field>
        </div>
        {pay.mode !== 'full' && (
          <p className="mt-3 text-sm text-[var(--cr-muted)]">
            Example: a {formatMoney(example)} booking takes a {formatMoney(exampleDeposit)} deposit. Orders under {formatMoney(pay.fullPaymentUnderCents)} are paid in full. Payments go to the same Stripe account as BizzyPlug and RSVP.
          </p>
        )}
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          {t('bookingTerms', 'Booking terms (client must agree)', { area: true, rows: 4 })}
          {t('bookingSuccessNote', 'After payment message', { area: true, rows: 4 })}
        </div>
      </Panel>

      <Panel title="Contact & notifications">
        <div className="grid md:grid-cols-2 gap-3">
          {t('notifyEmail', 'Send booking alerts to', { hint: 'Private. Where new bookings and payments get emailed.' })}
          {t('contactEmail', 'Public contact email', { hint: 'Shown on the site. Client replies go here.' })}
          {t('contactPhone', 'Phone')}
          {t('instagram', 'Instagram URL')}
          {t('tiktok', 'TikTok URL')}
          {t('youtube', 'YouTube URL')}
        </div>
      </Panel>

      <Panel title="Top of page">
        <div className="grid md:grid-cols-2 gap-3">
          {t('announcement', 'Announcement bar', { hint: 'Red bar above the menu. Leave empty to hide.', className: 'md:col-span-2' })}
          {t('heroEyebrow', 'Stamp above headline')}
          {t('startingAtText', 'Price sticker', { hint: 'e.g. Reels from $50. Empty = lowest package price.' })}
          {t('heroHeadline', 'Headline')}
          {t('heroHighlight', 'Headline in red')}
          {t('heroSub', 'Intro paragraph', { area: true, className: 'md:col-span-2' })}
          <Field label="Scrolling ticker words" className="md:col-span-2">
            <StringList items={s.tickerItems} onChange={v => set({ tickerItems: v })} addLabel="Add word" />
          </Field>
        </div>
      </Panel>

      <Panel title="Logos">
        <div className="grid sm:grid-cols-2 gap-5">
          {([['logoWordmarkUrl', 'Menu wordmark'], ['logoBadgeUrl', 'Round badge']] as const).map(([key, label]) => (
            <div key={key}>
              <div className="text-[11px] font-black uppercase tracking-[0.1em] mb-2">{label}</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s[key]} alt="" className={`border-2 border-[var(--cr-ink)] bg-[var(--cr-cream)] ${key === 'logoBadgeUrl' ? 'w-28 h-28 rounded-full object-cover' : 'h-12 w-auto rounded'}`} />
              <div className="mt-2 flex gap-3 items-center">
                <UploadButton accept="image/*" folder="brand" label="Replace" onUploaded={url => set({ [key]: url } as Partial<SiteSettings>)} />
                <button onClick={() => set({ [key]: key === 'logoBadgeUrl' ? '/crookedrumors/badge.webp' : '/crookedrumors/wordmark.webp' } as Partial<SiteSettings>)} className="text-xs font-bold underline">Reset</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Sections">
        <div className="grid md:grid-cols-2 gap-3">
          {t('workTitle', 'Work title')}
          {t('workSub', 'Work subtitle')}
          {t('pricingTitle', 'Pricing title')}
          {t('pricingSub', 'Pricing subtitle')}
          {t('angleVsSceneTitle', 'Angles vs scenes title', { hint: 'Shown on the Reels & Short Form tab' })}
          {t('angleVsSceneBody', 'Angles vs scenes explanation', { area: true })}
          {t('customQuoteTitle', 'Custom quote title')}
          {t('customQuoteBody', 'Custom quote text', { area: true })}
          {t('aboutTitle', 'About title')}
          {t('serviceArea', 'Service area note')}
          {t('aboutBody', 'About text', { area: true, rows: 5, className: 'md:col-span-2' })}
        </div>
      </Panel>

      <Panel title="How it works steps" actions={<AddBtn onClick={() => set({ processSteps: [...s.processSteps, { title: '', body: '' }] })} />}>
        <div className="space-y-3">
          {s.processSteps.map((st, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="cr-display text-2xl text-[var(--cr-red)] w-8 pt-2">{i + 1}</span>
              <div className="flex-1 grid md:grid-cols-[1fr_2fr] gap-2">
                <Text value={st.title} placeholder="Title" onChange={v => set({ processSteps: s.processSteps.map((x, j) => (j === i ? { ...x, title: v } : x)) })} />
                <Text value={st.body} placeholder="Description" onChange={v => set({ processSteps: s.processSteps.map((x, j) => (j === i ? { ...x, body: v } : x)) })} />
              </div>
              <RowActions index={i} count={s.processSteps.length} onMove={dir => set({ processSteps: move(s.processSteps, i, dir) })} onDelete={() => set({ processSteps: s.processSteps.filter((_, j) => j !== i) })} />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="FAQ" actions={<AddBtn onClick={() => set({ faqs: [...s.faqs, { q: '', a: '' }] })} />}>
        <div className="space-y-4">
          {s.faqs.map((f, i) => (
            <div key={i} className="flex gap-3 items-start border-b-2 border-[var(--cr-tan)] pb-4 last:border-0">
              <div className="flex-1 space-y-2">
                <Text value={f.q} placeholder="Question" onChange={v => set({ faqs: s.faqs.map((x, j) => (j === i ? { ...x, q: v } : x)) })} />
                <Text area rows={2} value={f.a} placeholder="Answer" onChange={v => set({ faqs: s.faqs.map((x, j) => (j === i ? { ...x, a: v } : x)) })} />
              </div>
              <RowActions index={i} count={s.faqs.length} onMove={dir => set({ faqs: move(s.faqs, i, dir) })} onDelete={() => set({ faqs: s.faqs.filter((_, j) => j !== i) })} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function AddBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-sm font-black uppercase text-[var(--cr-red)]">
      <Plus size={16} strokeWidth={3} /> Add
    </button>
  )
}
