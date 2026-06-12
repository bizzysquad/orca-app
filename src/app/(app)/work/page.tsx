'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mic2, Car, Palette, ArrowRight, DollarSign, TrendingUp, Users, Calendar } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { fmt } from '@/lib/utils'
import type { DJGig, LyftSession } from '@/lib/types'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

export default function WorkHubPage() {
  const { theme } = useTheme()

  // Load DJ gig stats
  const [djStats, setDjStats] = useState({ total: 0, upcoming: 0, revenue: 0 })
  // Load Lyft session stats
  const [lyftStats, setLyftStats] = useState({ sessions: 0, weekEarnings: 0, totalTrips: 0 })
  // BizzyPlug clients
  const [bizStats, setBizStats] = useState({ clients: 0, active: 0, pending: 0 })

  useEffect(() => {
    try {
      const gigs: DJGig[] = JSON.parse(localStorage.getItem('orca-dj-gigs') || '[]')
      const today = new Date().toISOString().slice(0, 10)
      setDjStats({
        total: gigs.length,
        upcoming: gigs.filter(g => g.date >= today && g.status !== 'cancelled').length,
        revenue: gigs.filter(g => g.status === 'completed').reduce((s, g) => s + (g.fee || 0), 0),
      })
    } catch {}

    try {
      const sessions: LyftSession[] = JSON.parse(localStorage.getItem('orca-lyft-sessions') || '[]')
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
      const weekStr = weekAgo.toISOString().slice(0, 10)
      const weekSessions = sessions.filter(s => s.date >= weekStr)
      setLyftStats({
        sessions: sessions.length,
        weekEarnings: weekSessions.reduce((s, sess) => s + (sess.earnings || 0), 0),
        totalTrips: sessions.reduce((s, sess) => s + (sess.trips || 0), 0),
      })
    } catch {}

    try {
      const clients = JSON.parse(localStorage.getItem('orca-bizzplug-clients') || '[]')
      setBizStats({
        clients: clients.length,
        active: clients.filter((c: any) => c.status === 'active').length,
        pending: clients.filter((c: any) => c.status === 'pending').length,
      })
    } catch {}
  }, [])

  const cards = [
    {
      id: 'dj',
      href: '/dj',
      icon: Mic2,
      color: '#F43F5E',
      title: 'DJ Gig Manager',
      description: 'Track gigs, clients, gear checklist, and payments',
      stats: [
        { label: 'Total Gigs', value: String(djStats.total), icon: Calendar },
        { label: 'Upcoming', value: String(djStats.upcoming), icon: TrendingUp },
        { label: 'Revenue', value: fmt(djStats.revenue), icon: DollarSign },
      ],
    },
    {
      id: 'lyft',
      href: '/lyft',
      icon: Car,
      color: '#22D3EE',
      title: 'Lyft Metrics',
      description: 'Track earnings, trips, and driving performance',
      stats: [
        { label: 'Sessions', value: String(lyftStats.sessions), icon: Calendar },
        { label: 'This Week', value: fmt(lyftStats.weekEarnings), icon: DollarSign },
        { label: 'Total Trips', value: String(lyftStats.totalTrips), icon: TrendingUp },
      ],
    },
    {
      id: 'bizzplug',
      href: '/bizzplug',
      icon: Palette,
      color: '#F59E0B',
      title: 'BizzyPlug Client Manager',
      description: 'Manage graphic design clients, projects, and invoices',
      stats: [
        { label: 'Clients', value: String(bizStats.clients), icon: Users },
        { label: 'Active', value: String(bizStats.active), icon: TrendingUp },
        { label: 'Pending', value: String(bizStats.pending), icon: Calendar },
      ],
    },
  ]

  return (
    <div style={{ backgroundColor: theme.bg }} className="min-h-screen pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 backdrop-blur-xl border-b px-4 py-4 sm:px-6"
        style={{ backgroundColor: `${theme.bg}95`, borderColor: theme.border }}
      >
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold" style={{ color: theme.text }}>Work</h1>
          <p className="text-sm mt-0.5" style={{ color: theme.textM }}>Your business operations hub</p>
        </div>
      </motion.div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          {cards.map(card => {
            const Icon = card.icon
            return (
              <motion.div key={card.id} variants={fadeUp}>
                <Link href={card.href}>
                  <div
                    className="rounded-2xl p-5 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ background: `${card.color}18` }}
                        >
                          <Icon size={24} style={{ color: card.color }} />
                        </div>
                        <div>
                          <h2 className="font-bold text-base" style={{ color: theme.text }}>
                            {card.title}
                          </h2>
                          <p className="text-xs mt-0.5 leading-snug" style={{ color: theme.textM }}>
                            {card.description}
                          </p>
                        </div>
                      </div>
                      <div
                        className="p-2 rounded-xl shrink-0"
                        style={{ backgroundColor: `${card.color}15` }}
                      >
                        <ArrowRight size={16} style={{ color: card.color }} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      {card.stats.map((stat, i) => {
                        const StatIcon = stat.icon
                        return (
                          <div
                            key={i}
                            className="rounded-xl p-3 text-center"
                            style={{ backgroundColor: `${card.color}0a` }}
                          >
                            <StatIcon size={14} style={{ color: card.color }} className="mx-auto mb-1" />
                            <p className="text-xs font-medium mb-1" style={{ color: theme.textM }}>
                              {stat.label}
                            </p>
                            <p className="font-bold text-sm" style={{ color: card.color }}>
                              {stat.value}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
