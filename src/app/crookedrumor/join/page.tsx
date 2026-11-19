import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowDown, Camera, Video, Mic, Scissors, Palette, Megaphone, Music, Sparkles } from 'lucide-react'
import { loadSite, toPublicSite } from '@/lib/crooked/db'
import SiteHeader from '../_components/SiteHeader'
import JoinForm from './JoinForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Join the Team | Crooked Rumor',
  description: 'Photographers, interviewers, videographers, editors, and creative minds: help build Crooked Rumor from the ground up.',
  openGraph: {
    title: 'Join the Crooked Rumor Team',
    description: 'Got talent? Let’s build something together.',
    images: ['/crookedrumors/badge.webp'],
  },
}

const ROLES = [
  { icon: Camera, label: 'Photographers' },
  { icon: Mic, label: 'Interviewers' },
  { icon: Video, label: 'Videographers' },
  { icon: Scissors, label: 'Editors' },
  { icon: Palette, label: 'Designers' },
  { icon: Megaphone, label: 'Marketers' },
  { icon: Music, label: 'Music people' },
  { icon: Sparkles, label: 'Creative minds' },
]

const TERMS = [
  { title: 'We are an emerging platform', body: 'Crooked Rumor is new and growing. We would rather tell you that up front than oversell where we are today.' },
  { title: 'Paid work may be limited at first', body: 'During this early growth stage, paid opportunities may be limited. We will always be clear about which projects are paid and which are not.' },
  { title: 'You choose what you are open to', body: 'On the form you can tell us if you are interested in unpaid collaborations, paid projects only, or a mix depending on the opportunity.' },
  { title: 'Compensation is set per project', body: 'Every project is different, so pay is discussed and agreed on individually for each one, based on your role and responsibilities.' },
  { title: 'Shared revenue is agreed before work starts', body: 'When a project involves shared revenue, how it gets split is discussed and agreed on by everyone before any work begins.' },
  { title: 'Everything gets written down', body: 'Contributions, responsibilities, expenses, and compensation terms are documented so everyone knows exactly what the arrangement is.' },
  { title: 'No guarantees, just honesty', body: 'Joining the creative network does not guarantee employment or future paid assignments. It means we know who you are when the right opportunity comes up.' },
]

export default async function JoinPage() {
  const { site: full, dbReady } = await loadSite()
  const s = toPublicSite(full).settings

  return (
    <>
      <SiteHeader wordmarkUrl={s.logoWordmarkUrl} announcement={s.announcement} />

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="cr-grain overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-14 md:pt-16 md:pb-20">
          <span className="cr-stamp text-[var(--cr-red)] text-xs md:text-sm">Now recruiting</span>
          <h1 className="cr-display mt-6 text-[clamp(44px,9.5vw,108px)]">Join the Crooked Rumor Team</h1>
          <p className="cr-serif italic font-extrabold text-[var(--cr-red)] mt-4 text-[clamp(26px,5vw,48px)] leading-[1.05]">
            Got Talent? Let&apos;s Build Something Together!
          </p>
          <div className="mt-6 max-w-2xl space-y-4 text-lg md:text-xl leading-relaxed text-[var(--cr-ink-soft)]">
            <p>
              Crooked Rumor is growing, and we&apos;re looking for photographers, interviewers, videographers, editors, and creative minds who know how to bring a vision to life.
            </p>
            <p>Whether you&apos;re experienced or just getting started, we want to hear what you do and how you can contribute.</p>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <a href="#apply" className="cr-btn cr-btn-red text-base">
              Let&apos;s work! <ArrowDown size={18} strokeWidth={3} />
            </a>
            <a href="#how-it-works" className="cr-btn cr-btn-paper text-base">How pay works</a>
          </div>

          <ul className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ROLES.map(r => (
              <li key={r.label} className="cr-card-flat !border-[3px] px-3 py-3 flex items-center gap-2.5 font-extrabold text-sm uppercase tracking-wide">
                <r.icon size={20} strokeWidth={2.5} className="text-[var(--cr-red)] shrink-0" /> {r.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── GROUND UP ──────────────────────────────────────── */}
      <section className="cr-grain cr-dark bg-[var(--cr-ink)] text-[var(--cr-paper)]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24 grid md:grid-cols-[0.8fr_1.2fr] gap-8 md:gap-14 items-start">
          <h2 className="cr-display text-[clamp(40px,8vw,84px)]">We&apos;re Building From the Ground Up</h2>
          <div className="space-y-5 text-lg leading-relaxed text-[var(--cr-paper)]/80">
            <p>Crooked Rumor is still in its early stages, and we believe in being upfront about that.</p>
            <p>
              While paid opportunities may be limited initially, our goal is to build a team where everyone&apos;s contributions are valued, opportunities are communicated transparently, and compensation is discussed fairly.
            </p>
            <p>
              As projects generate revenue, we&apos;ll establish clear compensation arrangements based on each team member&apos;s responsibilities, contributions, and agreed upon terms.
            </p>
            <p className="text-[var(--cr-paper)] font-semibold">
              We&apos;re looking for people who see the vision, bring their own creativity, and want to grow alongside the platform.
            </p>
          </div>
        </div>
      </section>

      {/* ── COMPENSATION & COLLABORATION ───────────────────── */}
      <section id="how-it-works" className="cr-grain scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="text-center mb-10">
            <span className="cr-stamp text-[var(--cr-red)] text-xs">Straight up</span>
            <h2 className="cr-display text-[clamp(40px,8vw,88px)] mt-4">How Collaboration &amp; Pay Work</h2>
            <p className="max-w-xl mx-auto mt-4 text-lg text-[var(--cr-ink-soft)]">
              No fine print. Here is exactly how we handle compensation while we grow, so you can decide what works for you.
            </p>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TERMS.map((t, i) => (
              <li key={t.title} className={`cr-card p-5 md:p-6 ${i === TERMS.length - 1 ? 'sm:col-span-2 lg:col-span-3 !bg-[var(--cr-tan)]' : ''}`}>
                <div className="cr-display text-5xl text-transparent [-webkit-text-stroke:2.5px_var(--cr-red)]">{String(i + 1).padStart(2, '0')}</div>
                <div className="cr-display text-xl mt-3">{t.title}</div>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--cr-ink-soft)]">{t.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── APPLY ──────────────────────────────────────────── */}
      <section id="apply" className="bg-[var(--cr-red)] border-y-[3px] border-[var(--cr-ink)] scroll-mt-16">
        <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
          <div className="text-center text-[var(--cr-paper)] mb-8">
            <h2 className="cr-display text-[clamp(44px,9vw,88px)]">Let&apos;s Work!</h2>
            <p className="mt-3 text-lg text-[var(--cr-paper)]/90">Takes about five minutes. Tell us who you are and what you bring.</p>
          </div>
          <JoinForm open={dbReady} />
        </div>
      </section>

      <footer className="bg-[var(--cr-ink)] text-[var(--cr-paper)] border-t-[6px] border-[var(--cr-red)]">
        <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="cr-display text-2xl md:text-3xl">Stay creative. Stay connected.</div>
          <Link href="/crookedrumor" className="cr-btn cr-btn-paper cr-btn-sm !text-[var(--cr-ink)] self-start">Back to Crooked Rumor</Link>
        </div>
      </footer>
    </>
  )
}
