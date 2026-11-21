'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { displayRules, DEFAULT_RULES, normalizeRules } from '@/lib/spades/rules'
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
          <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>Supervisor and director rulings are final.</p>
        </div>
        {displayRules(rules).map((sec, si) => (
          <section key={si} className="sp-card p-5">
            <h2 className="sp-display text-xl mb-3 flex items-center gap-2"><SpadeIcon size={18} className="opacity-70" />{sec.title}</h2>
            <ul className="grid gap-2 list-disc pl-5">
              {sec.items.map((i, ii) => <li key={ii}>{i}</li>)}
            </ul>
          </section>
        ))}
        <section className="sp-card-paper p-5">
          <h2 className="sp-display text-xl mb-2">How the app works at your table</h2>
          <ol className="grid gap-2 list-decimal pl-5">
            <li>Register your team on your phone. That phone is your team's scorekeeper for the night.</li>
            <li>Before every hand, enter your bid ({rules.biddingMode === 'captain' ? 'the scorekeeper phone enters both partner bids' : 'each player enters their own'}). The hand starts when all four bids are locked.</li>
            <li>Play the hand with real cards.</li>
            <li>When the hand is over, each captain counts the books on their side and enters that one number.</li>
            <li>If the two numbers add up to 13 the hand scores itself. If not, recount and enter again.</li>
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
