'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Gift, Loader2, MapPin } from 'lucide-react'

// Guest-facing pass for a separate perk code (delivery = 'separate')
export default function PerkPassPage() {
  const params = useParams<{ token: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/rsvp/perk-codes/${params.token}`)
      .then(res => (res.ok ? res.json() : null))
      .then(setData)
      .finally(() => setLoading(false))
  }, [params.token])

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gold" size={28} /></div>
  if (!data) return <div className="min-h-screen flex items-center justify-center px-4 text-text-secondary">This perk link is invalid.</div>

  const { status, event, holder_name } = data
  const used = !status.ok

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#161616] to-[#0A0A0A] border border-gold-liquid/30 shadow-gold-lg overflow-hidden animate-fade-in-up">
        <div className="px-6 pt-7 pb-5 text-center border-b border-white/10">
          <div className="text-2xs font-bold tracking-[0.3em] text-gold uppercase mb-3">DJ Maskoff Events · Perk</div>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gold-gradient text-brand-black flex items-center justify-center mb-3"><Gift size={22} /></div>
          <h1 className="text-2xl font-extrabold text-white leading-tight">{status.perk.name}</h1>
          {status.perk.description && <p className="text-sm text-white/60 mt-2">{status.perk.description}</p>}
        </div>

        <div className="px-6 py-6 flex flex-col items-center">
          <div className={`bg-white p-3 rounded-2xl ${used ? 'opacity-30 grayscale' : ''}`}>
            <img src={`/api/rsvp/perk-codes/${params.token}/qr`} alt="Perk QR code" className="w-48 h-48" />
          </div>
          <p className={`mt-4 text-sm font-bold ${used ? 'text-danger' : 'text-emerald-400'}`}>
            {used ? status.reason : status.usesAllowed == null ? 'Ready to use' : `${status.usesLeft} of ${status.usesAllowed} left`}
          </p>
          <p className="text-2xs text-white/40 mt-1">Show this at the bar or to any staff member</p>
        </div>

        <div className="px-6 pb-6 text-2xs text-white/50 space-y-1 text-center">
          <p>For {holder_name} at <strong className="text-white/70">{event?.name}</strong></p>
          {event?.venue && <p className="flex items-center justify-center gap-1"><MapPin size={11} /> {[event.venue, event.city].filter(Boolean).join(', ')}</p>}
        </div>
      </div>
    </div>
  )
}
