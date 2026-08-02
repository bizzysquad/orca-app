'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, RotateCcw, MessageSquare, Users, ArrowLeft } from 'lucide-react'
import AdminShell from '../../admin/_components/AdminShell'

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  valid: { label: 'VALID — READY TO ADMIT', bg: 'bg-emerald-500/15 border-emerald-500/40', text: 'text-emerald-400' },
  checked_in: { label: 'ALREADY CHECKED IN', bg: 'bg-amber-500/15 border-amber-500/40', text: 'text-amber-400' },
  invalid: { label: 'INVALID TICKET', bg: 'bg-danger/15 border-danger/40', text: 'text-danger' },
  cancelled: { label: 'CANCELLED', bg: 'bg-danger/15 border-danger/40', text: 'text-danger' },
  refunded: { label: 'REFUNDED', bg: 'bg-danger/15 border-danger/40', text: 'text-danger' },
  transferred: { label: 'TRANSFERRED AWAY', bg: 'bg-white/10 border-white/20', text: 'text-text-secondary' },
  expired: { label: 'EXPIRED', bg: 'bg-white/10 border-white/20', text: 'text-text-secondary' },
  flagged: { label: 'FLAGGED — VERIFY MANUALLY', bg: 'bg-amber-500/15 border-amber-500/40', text: 'text-amber-400' },
}

export default function CheckinScanResultPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [acting, setActing] = useState(false)
  const [message, setMessage] = useState('')
  const [note, setNote] = useState('')
  const [role, setRole] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/rsvp/checkin?token=${params.token}`)
      .then(res => { if (!res.ok) throw new Error('not found'); return res.json() })
      .then(setData)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [params.token])

  useEffect(load, [load])
  useEffect(() => {
    fetch('/api/rsvp/staff/login').then(r => r.ok ? r.json() : null).then(d => d && setRole(d.role))
  }, [])

  const act = async (action: 'check_in' | 'reverse' | 'reject' | 'door_note') => {
    setActing(true)
    setMessage('')
    try {
      const res = await fetch('/api/rsvp/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, action, note }),
      })
      const d = await res.json()
      if (!res.ok) {
        setMessage(d.error || 'Action failed')
      } else {
        setMessage(action === 'check_in' ? 'Checked in!' : action === 'reverse' ? 'Check-in reversed.' : 'Logged.')
        setNote('')
        load()
      }
    } finally {
      setActing(false)
    }
  }

  return (
    <AdminShell>
      <button onClick={() => router.push('/RSVP/check-in')} className="flex items-center gap-1.5 text-2xs text-text-muted mb-4">
        <ArrowLeft size={12} /> Back to scanner
      </button>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={26} /></div>
      ) : notFound || !data ? (
        <div className="text-center py-20 border border-dashed border-danger/40 rounded-2xl">
          <XCircle className="mx-auto text-danger mb-2" size={28} />
          <p className="text-text-secondary text-sm">Ticket not found. This QR code may be fraudulent.</p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          <div className={`rounded-2xl border-2 p-6 text-center mb-6 ${STATUS_META[data.ticket.status]?.bg || 'bg-white/5 border-white/10'}`}>
            <p className={`text-sm font-black tracking-wide ${STATUS_META[data.ticket.status]?.text}`}>
              {STATUS_META[data.ticket.status]?.label || data.ticket.status.toUpperCase()}
            </p>
            {data.ticket.status === 'checked_in' && data.ticket.checked_in_at && (
              <p className="text-2xs text-text-muted mt-1">at {new Date(data.ticket.checked_in_at).toLocaleTimeString()} by {data.ticket.checked_in_by}</p>
            )}
          </div>

          <div className="bg-surface-card border border-surface-border rounded-2xl p-5 mb-5">
            <h2 className="text-lg font-bold text-text-primary">{data.ticket.holder_name}</h2>
            <p className="text-xs text-text-secondary">{data.event?.name}</p>
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div><span className="text-text-muted">Ticket Type</span><br /><span className="text-text-primary font-semibold">{data.ticketTypeName}</span></div>
              <div><span className="text-text-muted">Ticket #</span><br /><span className="text-text-primary font-semibold">{data.ticket.ticket_number}</span></div>
              {data.ticket.guest_names?.length > 0 && (
                <div className="col-span-2 flex items-center gap-1.5"><Users size={12} className="text-text-muted" /> {data.ticket.guest_names.join(', ')}</div>
              )}
              {data.ticket.order && (
                <div className="col-span-2 text-2xs text-text-muted">{data.ticket.order.buyer_email} · Order: {data.ticket.order.status}</div>
              )}
            </div>
          </div>

          {message && <p className="text-center text-sm font-semibold text-gold mb-4">{message}</p>}

          <div className="flex flex-col gap-3">
            {data.ticket.status === 'valid' && (
              <button onClick={() => act('check_in')} disabled={acting} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gold-gradient text-brand-black font-black text-base disabled:opacity-60">
                {acting ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Check In Guest</>}
              </button>
            )}
            {data.ticket.status === 'checked_in' && (role === 'event_admin' || role === 'owner') && (
              <button onClick={() => act('reverse')} disabled={acting} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-amber-500/40 text-amber-400 font-bold text-sm disabled:opacity-60">
                <RotateCcw size={15} /> Reverse Check-In
              </button>
            )}
            <div className="flex gap-2">
              <input
                value={note} onChange={e => setNote(e.target.value)} placeholder="Door note (optional)"
                className="flex-1 px-3 py-2.5 rounded-lg bg-brand-soft border border-surface-border text-text-primary text-sm placeholder:text-text-muted outline-none"
              />
              <button onClick={() => act('door_note')} disabled={acting || !note} className="px-4 py-2.5 rounded-lg border border-surface-border text-text-secondary text-xs font-semibold disabled:opacity-40">
                <MessageSquare size={14} />
              </button>
            </div>
            {data.ticket.status !== 'valid' && data.ticket.status !== 'checked_in' && (
              <button onClick={() => act('reject')} disabled={acting} className="w-full py-3 rounded-xl border border-danger/40 text-danger font-bold text-sm disabled:opacity-60">
                Log Rejected Entry
              </button>
            )}
          </div>

          {data.history?.length > 0 && (
            <div className="mt-6">
              <p className="text-2xs font-bold text-text-muted uppercase mb-2">History</p>
              <div className="space-y-1.5">
                {data.history.map((h: any) => (
                  <div key={h.id} className="text-2xs text-text-muted flex justify-between">
                    <span>{h.action.replace('_', ' ')} — {h.staff_name}</span>
                    <span>{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  )
}
