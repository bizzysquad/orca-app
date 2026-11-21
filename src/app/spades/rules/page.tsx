'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { ruleSummary, DEFAULT_RULES, normalizeRules } from '@/lib/spades/rules'
import { useSpades } from '../_components/useSpades'
import { Loading, Shell, SpadeIcon } from '../_components/ui'

function Rules() {
  const t = useSearchParams().get('t')
  const { data, online } = useSpades<any>('public', { t })
  const rules = normalizeRules(data?.tournament?.rules || DEFAULT_RULES)
  return (
    <Shell active="rules" online={online} viewer={data?.viewer}>
      <div className="sp-wrap-narrow grid gap-4">
        <div>
          <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>{data?.tournament?.name || 'Spades HQ'}</p>
          <h1 className="sp-display text-4xl mt-1">Official rules</h1>
          <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>Joker spades, as played tonight. Supervisor and director rulings are final.</p>
        </div>
        {ruleSummary(rules).map(sec => (
          <section key={sec.title} className="sp-card p-5">
            <h2 className="sp-display text-xl mb-3 flex items-center gap-2"><SpadeIcon size={18} className="opacity-70" />{sec.title}</h2>
            <ul className="grid gap-2 list-disc pl-5">
              {sec.items.map(i => <li key={i}>{i}</li>)}
            </ul>
          </section>
        ))}
        <section className="sp-card-paper p-5">
          <h2 className="sp-display text-xl mb-2">How the app works at your table</h2>
          <ol className="grid gap-2 list-decimal pl-5">
            <li>Open your private invitation link once. It signs your phone in.</li>
            <li>Before every hand, enter your bid ({rules.biddingMode === 'captain' ? 'your captain enters both partner bids' : 'each player enters their own'}). The hand starts when all four bids are locked.</li>
            <li>Play the hand with real cards.</li>
            <li>Each captain taps how many books their team won. Both reports must match and add up to 13.</li>
            <li>Both captains confirm the score. Only then does it count.</li>
            <li>Something wrong? Tap Flag a problem. A supervisor reviews it.</li>
          </ol>
        </section>
      </div>
    </Shell>
  )
}

export default function Page() {
  return <Suspense fallback={<Loading />}><Rules /></Suspense>
}
