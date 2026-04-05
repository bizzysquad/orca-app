'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Scissors, Receipt, Users, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'

const features = [
  {
    icon: Scissors,
    label: 'Check Spitter',
    desc: 'Smart income splitting that tells every dollar where to go.',
  },
  {
    icon: Receipt,
    label: 'Bill Boss',
    desc: 'Auto-track due dates and reserves. Never miss a payment.',
  },
  {
    icon: Users,
    label: 'Stack Circle',
    desc: 'Save with friends and family toward shared goals.',
  },
  {
    icon: TrendingUp,
    label: 'Credit Boost',
    desc: 'Track, understand, and actively grow your credit score.',
  },
]

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } },
}

const fadeUp = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-black flex flex-col hero-glow">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative z-10">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 relative"
        >
          <div className="absolute inset-0 bg-gold/8 rounded-2xl blur-3xl scale-[2]" />
          <Image
            src="/logo.png"
            alt="ORCA"
            width={88}
            height={88}
            className="rounded-xl relative"
            priority
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-display-lg gold-text mb-4 text-center"
        >
          ORCA
        </motion.h1>

        <motion.p
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm font-medium text-text-secondary text-center tracking-[0.2em] uppercase mb-3"
        >
          Financial Command Center
        </motion.p>

        <motion.p
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm text-text-muted text-center max-w-[280px] mb-16 leading-relaxed"
        >
          Split your income. Crush your bills.{'\n'}Build real savings. All powered by AI.
        </motion.p>

        {/* Feature Grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 max-w-sm w-full mb-16"
        >
          {features.map((feat) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={feat.label}
                variants={fadeUp}
                className="card-elevated p-5 group"
              >
                <div className="w-9 h-9 rounded-lg bg-gold/[0.07] flex items-center justify-center mb-3">
                  <Icon size={18} className="text-gold" strokeWidth={1.5} />
                </div>
                <div className="text-sm font-semibold text-text-primary mb-1">{feat.label}</div>
                <div className="text-xs text-text-muted leading-relaxed">{feat.desc}</div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-3 w-full max-w-sm"
        >
          {/* PRIMARY CTA */}
          <Link
            href="/auth/signup"
            className="group w-full py-4 rounded-xl gold-bg text-[#0A0A0A] font-bold text-center text-base shadow-gold transition-all duration-300 hover:shadow-gold-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Get Started Free
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>

          {/* SECONDARY CTA */}
          <Link
            href="/auth/login"
            className="w-full py-4 rounded-xl border border-gold/25 text-gold font-semibold text-center text-base transition-all duration-200 hover:bg-gold/[0.04] hover:border-gold/40 active:scale-[0.98]"
          >
            Sign In
          </Link>
        </motion.div>

        {/* Founding badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="mt-10"
        >
          <span className="gold-pill">
            <Sparkles size={12} className="mr-1.5" />
            First 500 users get 40 days premium free
          </span>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-8 text-center relative z-10">
        <div className="divider-gold max-w-[200px] mx-auto mb-6" />
        <p className="text-xs text-text-muted">&copy; 2026 ORCA. All rights reserved.</p>
      </div>
    </div>
  )
}
