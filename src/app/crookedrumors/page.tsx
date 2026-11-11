import Link from 'next/link'
import { ArrowRight, Plus, Instagram, Youtube, Mail, Phone } from 'lucide-react'
import { loadSite, toPublicSite } from '@/lib/crooked/db'
import { formatMoney } from '@/lib/crooked/pricing'
import SiteHeader from './_components/SiteHeader'
import Portfolio from './_components/Portfolio'
import Pricing from './_components/Pricing'

export const dynamic = 'force-dynamic'

export default async function CrookedRumorsHome() {
  const { site: full } = await loadSite()
  const site = toPublicSite(full)
  const s = site.settings
  const lowest = site.packages.length ? Math.min(...site.packages.map(p => p.priceCents)) : 0
  const ticker = s.tickerItems.length ? s.tickerItems : ['Video Production']

  return (
    <>
      <SiteHeader wordmarkUrl={s.logoWordmarkUrl} announcement={s.announcement} />

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="cr-grain overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-16 md:pt-16 md:pb-24 grid md:grid-cols-[1.25fr_0.75fr] gap-10 md:gap-6 items-center">
          <div>
            <span className="cr-stamp text-[var(--cr-red)] text-xs md:text-sm">{s.heroEyebrow}</span>
            <h1 className="cr-display mt-6 text-[clamp(48px,10vw,112px)]">
              {s.heroHeadline}{' '}
              <span className="cr-serif italic normal-case font-extrabold text-[var(--cr-red)] tracking-tight block mt-1 text-[clamp(52px,11vw,124px)] leading-[0.9]">
                {s.heroHighlight}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg md:text-xl leading-relaxed text-[var(--cr-ink-soft)]">{s.heroSub}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link href="/crookedrumors/book" className="cr-btn cr-btn-red text-base">
                Book a shoot <ArrowRight size={18} strokeWidth={3} />
              </Link>
              <a href="#pricing" className="cr-btn cr-btn-paper text-base">See pricing</a>
            </div>
          </div>

          <div className="relative mx-auto w-[min(78vw,400px)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.logoBadgeUrl}
              alt="Crooked Rumors Media"
              className="w-full aspect-square object-cover rounded-full border-[3px] border-[var(--cr-ink)] shadow-[10px_10px_0_var(--cr-ink)] mix-blend-multiply"
            />
            {s.startingAtText || lowest ? (
              <div className="cr-wobble absolute -bottom-3 -left-3 md:-left-8 w-32 h-32 md:w-36 md:h-36 rounded-full bg-[var(--cr-ink)] text-[var(--cr-paper)] border-[3px] border-[var(--cr-paper)] outline outline-[3px] outline-[var(--cr-ink)] flex flex-col items-center justify-center text-center p-3">
                <span className="cr-display text-[22px] md:text-2xl leading-none">{s.startingAtText || `From ${formatMoney(lowest)}`}</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── TICKER ─────────────────────────────────────────── */}
      <div className="bg-[var(--cr-ink)] text-[var(--cr-paper)] border-y-[3px] border-[var(--cr-ink)] overflow-hidden -rotate-1 scale-105 relative z-10" aria-hidden>
        <div className="cr-marquee py-4">
          {[0, 1].map(k => (
            <div key={k} className="flex shrink-0">
              {[...ticker, ...ticker].map((t, i) => (
                <span key={`${k}-${i}`} className="cr-display text-2xl md:text-3xl px-5 flex items-center gap-10 whitespace-nowrap">
                  {t} <span className="text-[var(--cr-red)]">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── WORK ───────────────────────────────────────────── */}
      <section id="work" className="cr-grain cr-dark bg-[var(--cr-ink)] text-[var(--cr-paper)] scroll-mt-16 -mt-3">
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-20 md:pt-28 md:pb-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <h2 className="cr-display text-[clamp(56px,12vw,128px)]">{s.workTitle}</h2>
            <p className="max-w-sm text-[var(--cr-paper)]/70 text-lg md:text-right">{s.workSub}</p>
          </div>
          <Portfolio items={site.portfolio} categories={s.portfolioCategories} instagram={s.instagram} />
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────── */}
      <section id="pricing" className="cr-grain scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <div className="text-center mb-10">
            <span className="cr-stamp text-[var(--cr-red)] text-xs">No hidden fees</span>
            <h2 className="cr-display text-[clamp(56px,12vw,128px)] mt-4">{s.pricingTitle}</h2>
            <p className="max-w-xl mx-auto mt-4 text-lg text-[var(--cr-ink-soft)]">{s.pricingSub}</p>
          </div>
          <Pricing site={site} />
        </div>
      </section>

      {/* ── CUSTOM QUOTE ───────────────────────────────────── */}
      <section className="bg-[var(--cr-red)] text-[var(--cr-paper)] border-y-[3px] border-[var(--cr-ink)]">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-16 flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
          <div className="flex-1">
            <h2 className="cr-display text-4xl md:text-6xl">{s.customQuoteTitle}</h2>
            <p className="mt-3 text-lg max-w-2xl text-[var(--cr-paper)]/90">{s.customQuoteBody}</p>
          </div>
          <Link href="/crookedrumors/book?custom=1" className="cr-btn cr-btn-ink shrink-0 !border-[var(--cr-ink)] text-base">
            Get a custom quote <ArrowRight size={18} strokeWidth={3} />
          </Link>
        </div>
      </section>

      {/* ── PROCESS ────────────────────────────────────────── */}
      <section id="process" className="cr-grain scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <h2 className="cr-display text-[clamp(44px,9vw,96px)] text-center">How it works</h2>
          <ol className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {s.processSteps.map((step, i) => (
              <li key={i} className="cr-card p-6 relative">
                <div className="cr-display text-7xl text-transparent [-webkit-text-stroke:3px_var(--cr-red)]">{String(i + 1).padStart(2, '0')}</div>
                <div className="cr-display text-2xl mt-3">{step.title}</div>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--cr-ink-soft)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── ABOUT ──────────────────────────────────────────── */}
      <section className="cr-grain cr-dark bg-[var(--cr-ink)] text-[var(--cr-paper)]">
        <div className="mx-auto max-w-6xl px-4 py-20 md:py-24 grid md:grid-cols-[0.8fr_1.2fr] gap-10 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.logoBadgeUrl} alt="" className="w-[min(70vw,320px)] mx-auto aspect-square object-cover rounded-full border-[3px] border-[var(--cr-paper)] rotate-[-6deg]" />
          <div>
            <h2 className="cr-display text-5xl md:text-7xl">{s.aboutTitle}</h2>
            <p className="mt-5 text-lg leading-relaxed text-[var(--cr-paper)]/80 whitespace-pre-line">{s.aboutBody}</p>
            {s.serviceArea ? (
              <p className="mt-5 inline-block rounded-lg border-2 border-[var(--cr-paper)]/30 px-4 py-3 text-sm font-semibold">{s.serviceArea}</p>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      {s.faqs.length > 0 && (
        <section id="faq" className="cr-grain scroll-mt-16">
          <div className="mx-auto max-w-3xl px-4 py-20 md:py-28">
            <h2 className="cr-display text-[clamp(44px,9vw,96px)] text-center mb-10">Questions</h2>
            <div className="space-y-4">
              {s.faqs.map((f, i) => (
                <details key={i} className="group cr-card-flat !border-[3px] overflow-hidden">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 font-extrabold text-lg [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus className="shrink-0 transition-transform group-open:rotate-45 text-[var(--cr-red)]" size={24} strokeWidth={3} />
                  </summary>
                  <p className="px-5 pb-5 text-[15px] leading-relaxed text-[var(--cr-ink-soft)] whitespace-pre-line">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-[var(--cr-ink)] text-[var(--cr-paper)] border-t-[6px] border-[var(--cr-red)]">
        <div className="mx-auto max-w-6xl px-4 py-14 grid md:grid-cols-[1fr_auto] gap-10 items-center">
          <div>
            <div className="cr-display text-4xl md:text-6xl">Got a project?</div>
            <p className="mt-3 text-[var(--cr-paper)]/70 text-lg">Lock in your date in a couple minutes.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/crookedrumors/book" className="cr-btn cr-btn-red">Book a shoot</Link>
              <Link href="/crookedrumors/book?custom=1" className="cr-btn cr-btn-paper !text-[var(--cr-ink)]">Custom quote</Link>
            </div>
          </div>
          <div className="flex flex-col gap-3 text-sm font-semibold">
            {s.contactEmail ? <a href={`mailto:${s.contactEmail}`} className="flex items-center gap-2 hover:text-[var(--cr-red)]"><Mail size={18} /> {s.contactEmail}</a> : null}
            {s.contactPhone ? <a href={`tel:${s.contactPhone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2 hover:text-[var(--cr-red)]"><Phone size={18} /> {s.contactPhone}</a> : null}
            <div className="flex gap-3 mt-1">
              {s.instagram ? <a href={s.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="w-11 h-11 rounded-full border-2 border-[var(--cr-paper)] flex items-center justify-center hover:bg-[var(--cr-red)] hover:border-[var(--cr-red)]"><Instagram size={20} /></a> : null}
              {s.tiktok ? <a href={s.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok" className="w-11 h-11 rounded-full border-2 border-[var(--cr-paper)] flex items-center justify-center font-black text-xs hover:bg-[var(--cr-red)] hover:border-[var(--cr-red)]">TT</a> : null}
              {s.youtube ? <a href={s.youtube} target="_blank" rel="noreferrer" aria-label="YouTube" className="w-11 h-11 rounded-full border-2 border-[var(--cr-paper)] flex items-center justify-center hover:bg-[var(--cr-red)] hover:border-[var(--cr-red)]"><Youtube size={20} /></a> : null}
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--cr-paper)]/15">
          <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-[var(--cr-paper)]/50 flex justify-between gap-4">
            <span>© {new Date().getFullYear()} {s.brandName}</span>
            <span>Payments secured by Stripe</span>
          </div>
        </div>
      </footer>
    </>
  )
}
