'use client'

import { useEffect, useState } from 'react'
import { Empty, Loading, Shell, SpadeIcon } from '../_components/ui'

export default function WinnersPage() {
  const [list, setList] = useState<any[] | null>(null)
  useEffect(() => {
    fetch('/api/spades/winners', { cache: 'no-store' }).then(r => r.json()).then(j => setList(j.winners || [])).catch(() => setList([]))
  }, [])
  return (
    <Shell active="winners">
      <div className="sp-wrap grid gap-4">
        <div>
          <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>Powered by DJ MASKOFF</p>
          <h1 className="sp-display text-4xl mt-1">Winners</h1>
          <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>Every week&apos;s champions, trophy in hand.</p>
        </div>
        {list === null ? <Loading /> : list.length === 0 ? (
          <Empty title="First champions coming soon">Win the week and your photo goes up here.</Empty>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(w => (
              <article key={w.id} className="sp-card overflow-hidden">
                {w.photoUrl ? (
                  <img src={w.photoUrl} alt={`${w.team} holding the trophy`} className="w-full object-cover" style={{ aspectRatio: '4 / 5' }} loading="lazy" />
                ) : (
                  <div className="grid place-items-center" style={{ aspectRatio: '4 / 5', background: 'var(--sp-wine)' }}><SpadeIcon size={72} /></div>
                )}
                <div className="p-4">
                  <p className="sp-label">{new Date(`${w.week}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  <h2 className="sp-display text-2xl mt-1">{w.team}</h2>
                  {w.players && <p className="font-bold">{w.players}</p>}
                  {w.event && <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>{w.event}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}
