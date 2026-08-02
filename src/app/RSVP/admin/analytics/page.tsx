'use client'

import { useEffect, useState } from 'react'
import { Loader2, Download, Eye, Users, Ticket, DollarSign, CheckCircle2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import AdminShell from '../_components/AdminShell'

const EXPORTS = [
  { type: 'guest-list', label: 'Guest List' },
  { type: 'voters', label: 'Voter List' },
  { type: 'tickets', label: 'Ticket Sales' },
  { type: 'checkins', label: 'Check-In List' },
  { type: 'suggestions', label: 'Suggestions' },
  { type: 'emails', label: 'Email List' },
  { type: 'revenue-summary', label: 'Revenue Summary' },
  { type: 'door-list', label: 'Printable Door List' },
]

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-text-muted text-2xs mb-1"><Icon size={12} /> {label}</div>
      <div className="text-xl font-extrabold text-text-primary">{value}</div>
    </div>
  )
}

function fmtUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function AnalyticsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [eventId, setEventId] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rsvp/events').then(r => r.json()).then(d => {
      setEvents(d.events || [])
      if (d.events?.[0]) setEventId(d.events[0].id)
    })
  }, [])

  useEffect(() => {
    if (!eventId) return
    setLoading(true)
    fetch(`/api/rsvp/analytics?event_id=${eventId}`).then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [eventId])

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-text-primary">Analytics</h1>
        <select
          className="px-3 py-2 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm"
          value={eventId}
          onChange={e => setEventId(e.target.value)}
        >
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={26} /></div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatTile icon={Eye} label="Page Visits" value={data.pageVisits} />
            <StatTile icon={Users} label="Voters" value={data.totalVoters} />
            <StatTile icon={Ticket} label="RSVPs" value={data.totalRsvps} />
            <StatTile icon={CheckCircle2} label="Checked In" value={`${data.totalCheckedIn} (${data.attendancePct}%)`} />
            <StatTile icon={DollarSign} label="Gross Revenue" value={fmtUsd(data.grossRevenueCents)} />
            <StatTile icon={DollarSign} label="Est. Stripe Fees" value={fmtUsd(data.estimatedStripeFeesCents)} />
            <StatTile icon={DollarSign} label="Net Revenue" value={fmtUsd(data.netRevenueCents)} />
            <StatTile icon={Users} label="Waitlist" value={data.waitlistSize} />
          </div>

          {data.votesByDate?.length > 0 && (
            <div className="bg-surface-card border border-surface-border rounded-2xl p-5 mb-6">
              <h3 className="text-sm font-bold text-text-primary mb-4">Votes By Date</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.votesByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="label" stroke="#A1A1A1" fontSize={11} />
                  <YAxis stroke="#A1A1A1" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#181818', border: '1px solid #2A2A2A', borderRadius: 8 }} />
                  <Bar dataKey="votes" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.votesByPoll?.map((p: any) => (
            <div key={p.question} className="bg-surface-card border border-surface-border rounded-2xl p-5 mb-6">
              <h3 className="text-sm font-bold text-text-primary mb-4">{p.question}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={p.options}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="label" stroke="#A1A1A1" fontSize={11} />
                  <YAxis stroke="#A1A1A1" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#181818', border: '1px solid #2A2A2A', borderRadius: 8 }} />
                  <Bar dataKey="votes" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}

          {data.ticketsByType?.length > 0 && (
            <div className="bg-surface-card border border-surface-border rounded-2xl p-5 mb-6">
              <h3 className="text-sm font-bold text-text-primary mb-4">Tickets By Type</h3>
              <div className="space-y-2">
                {data.ticketsByType.map((t: any) => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">{t.name}</span>
                    <span className="text-text-primary font-semibold">{t.sold} sold{t.remaining != null ? ` · ${t.remaining} left` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface-card border border-surface-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-text-primary mb-4">Exports</h3>
            <div className="flex flex-wrap gap-2">
              {EXPORTS.map(e => (
                <a
                  key={e.type}
                  href={`/api/rsvp/export/${e.type}?event_id=${eventId}`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-border text-2xs font-semibold text-text-secondary hover:border-gold/40 hover:text-text-primary transition"
                >
                  <Download size={12} /> {e.label}
                </a>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-text-secondary text-sm">No data.</p>
      )}
    </AdminShell>
  )
}
