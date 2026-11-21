'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Bracket, provisionalData } from '../_components/Bracket'
import { useSpades } from '../_components/useSpades'
import { ErrorBox, Loading, Shell } from '../_components/ui'

function BracketView() {
  const t = useSearchParams().get('t')
  const { data, error, loading, online, reload } = useSpades<any>('public', { t })
  if (loading && !data) return <Shell active="bracket"><Loading /></Shell>
  if (!data?.tournament) return <Shell active="bracket" online={online}><div className="sp-wrap-narrow"><ErrorBox message={error || 'Not found'} onRetry={reload} /></div></Shell>
  const T = data.tournament
  const champ = T.championTeamId ? data.teams.find((x: any) => x.id === T.championTeamId) : null
  return (
    <Shell active="bracket" online={online} viewer={data.viewer}>
      <div className="sp-wrap grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>{T.name}</p>
            <h1 className="sp-display text-4xl mt-1">{T.useBracket ? 'Live bracket' : 'Games'}</h1>
          </div>
          <Link href={`/spades/display${t ? `?t=${t}` : ''}`} className="sp-btn sp-btn-sm sp-btn-ghost">TV mode</Link>
        </div>
        {champ && <div className="sp-card-paper p-5 text-center"><p className="sp-label">Champions</p><p className="sp-display text-4xl">{champ.name}</p></div>}
        {T.bracketPublished && data.matches.length ? <Bracket data={data} /> : <Bracket data={provisionalData(data)} linkMatches={false} />}
        <p className="text-xs" style={{ color: 'var(--sp-dim)' }}>Scores update live as hands are verified. A winner advances only after the tournament director finalizes the result.</p>
      </div>
    </Shell>
  )
}

export default function Page() {
  return <Suspense fallback={<Loading />}><BracketView /></Suspense>
}
