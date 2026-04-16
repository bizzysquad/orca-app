'use client'

import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  Scissors,
  Receipt,
  Users,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'

// ── Data ──────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Scissors,
    label: 'Smart Split',
    desc: 'Instantly divide each paycheck — bills, savings, and spending all get their cut automatically.',
    color: 'rgba(99,102,241,0.9)',
    colorBg: 'rgba(99,102,241,0.1)',
  },
  {
    icon: Receipt,
    label: 'Bill Boss',
    desc: 'See every bill, due date, and reserve in one place. Late payments become impossible.',
    color: 'rgba(239,68,68,0.9)',
    colorBg: 'rgba(239,68,68,0.1)',
  },
  {
    icon: Users,
    label: 'Stack Circle',
    desc: 'Pool funds with friends or family toward a shared goal — a trip, a down payment, anything.',
    color: 'rgba(245,158,11,0.9)',
    colorBg: 'rgba(245,158,11,0.1)',
  },
  {
    icon: TrendingUp,
    label: 'Credit Boost',
    desc: 'Track your score across all three bureaus and act on personalized tips to grow it.',
    color: 'rgba(16,185,129,0.9)',
    colorBg: 'rgba(16,185,129,0.1)',
  },
]

const steps = [
  { num: '01', title: 'Create your account', body: 'Sign up in under 60 seconds — no card needed.' },
  { num: '02', title: 'Add income & bills', body: 'Tell ORCA what you earn and owe each month.' },
  { num: '03', title: 'See Safe to Spend', body: 'One number shows exactly what you can spend today.' },
  { num: '04', title: 'Take control', body: 'Pay bills, hit goals, and build real wealth — here.' },
]

const proof = [
  '"Finally know where my paycheck goes each week."',
  '"Missed zero bills in 3 months since switching."',
  '"Our group saved for a vacation in 8 weeks."',
]

// ── Animation helpers ─────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] },
})

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.4 } },
}

const staggerChild = {
  hidden: { y: 18, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const reduced = useReducedMotion()

  return (
    <div className="min-h-screen bg-brand-black flex flex-col hero-glow select-none">

      {/* ── Ambient Background ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(212,175,55,0.08) 0%, transparent 60%)',
        }}
      />

      {/* ── Main content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-5 pt-16 pb-10">

        {/* Logo mark */}
        <motion.div
          initial={reduced ? {} : { scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 relative"
        >
          {/* Glow ring behind logo */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-2xl blur-2xl scale-[2.2]"
            style={{ background: 'rgba(212,175,55,0.12)' }}
          />
          <Image
            src="/logo.png"
            alt="ORCA logo"
            width={72}
            height={72}
            className="rounded-2xl relative"
            priority
          />
        </motion.div>

        {/* Eyebrow badge */}
        <motion.div {...fadeUp(0.05)}>
          <span className="gold-pill mb-5 inline-flex">
            <Sparkles size={11} className="mr-1.5 opacity-80" />
            First 500 members — 40 days premium free
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.12)}
          className="text-display-lg gold-text text-center mb-2"
          style={{ lineHeight: 1.05 }}
        >
          ORCA
        </motion.h1>

        <motion.p
          {...fadeUp(0.2)}
          className="text-xs font-semibold tracking-[0.22em] uppercase mb-4 text-center"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Financial Command Center
        </motion.p>

        {/* Value proposition */}
        <motion.p
          {...fadeUp(0.28)}
          className="text-base text-center max-w-[300px] mb-3 leading-[1.65]"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          One number. Every dollar tracked. Know exactly what's{' '}
          <span className="gold-text font-semibold">safe to spend</span> — after bills and savings.
        </motion.p>

        {/* ── Social proof strip ── */}
        <motion.div
          {...fadeUp(0.34)}
          className="w-full max-w-sm mb-10 overflow-hidden"
        >
          <div
            className="rounded-xl px-4 py-3 text-xs text-center leading-relaxed"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {proof[Math.floor(Date.now() / 10000) % proof.length]}
          </div>
        </motion.div>

        {/* ── Feature grid ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 w-full max-w-sm mb-10"
        >
          {features.map((feat) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={feat.label}
                variants={staggerChild}
                className="card-elevated p-4 group cursor-default glass-hover-gold"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110"
                  style={{ background: feat.colorBg }}
                >
                  <Icon size={16} style={{ color: feat.color }} strokeWidth={1.75} />
                </div>
                {/* Label */}
                <p className="text-sm font-bold mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {feat.label}
                </p>
                {/* Description */}
                <p className="text-[11px] leading-[1.5]" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  {feat.desc}
                </p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* ── How it works (step trail) ── */}
        <motion.div
          {...fadeUp(0.65)}
          className="w-full max-w-sm mb-10"
        >
          <p
            className="text-[10px] font-bold tracking-[0.16em] uppercase mb-4 text-center"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            How it works
          </p>

          <div className="space-y-0">
            {steps.map((s, i) => (
              <div key={s.num} className="flex gap-4 items-start">
                {/* Step line */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{
                      background: 'rgba(212,175,55,0.12)',
                      border: '1px solid rgba(212,175,55,0.3)',
                      color: '#D4AF37',
                    }}
                  >
                    {s.num}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className="w-px flex-1 my-1"
                      style={{ background: 'rgba(212,175,55,0.12)', minHeight: 20 }}
                    />
                  )}
                </div>
                {/* Step content */}
                <div className="pb-4">
                  <p className="text-sm font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {s.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {s.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── CTAs ── */}
        <motion.div
          {...fadeUp(0.78)}
          className="flex flex-col gap-3 w-full max-w-sm"
        >
          {/* Primary */}
          <Link
            href="/auth/login?tab=signup"
            className="group w-full py-4 rounded-xl font-bold text-center text-[15px] flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #F5D76E 50%, #D4AF37 100%)',
              backgroundSize: '200% 100%',
              color: '#0A0A0A',
              boxShadow: '0 0 28px rgba(212,175,55,0.22), 0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            Get Started Free
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>

          {/* Secondary */}
          <Link
            href="/auth/login"
            className="w-full py-3.5 rounded-xl font-semibold text-center text-[15px] transition-all duration-200 active:scale-[0.97]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(212,175,55,0.22)',
              color: 'rgba(212,175,55,0.85)',
            }}
          >
            Sign In
          </Link>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-4 mt-1">
            <div className="flex items-center gap-1">
              <ShieldCheck size={11} style={{ color: 'rgba(255,255,255,0.25)' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                End-to-end encrypted
              </span>
            </div>
            <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="flex items-center gap-1">
              <Zap size={11} style={{ color: 'rgba(255,255,255,0.25)' }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                No card required
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Footer ── */}
      <motion.div
        {...fadeUp(1.0)}
        className="relative z-10 py-7 text-center"
      >
        <div className="divider-gold max-w-[160px] mx-auto mb-5" />
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.18)' }}>
          &copy; 2026 ORCA. All rights reserved.
        </p>
      </motion.div>
    </div>
  )
}
