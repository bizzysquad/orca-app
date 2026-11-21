'use client'

import Link from 'next/link'
import { MatchPanel } from '../../_components/MatchPanel'
import { useSpades } from '../../_components/useSpades'
import { ErrorBox, Loading, Shell } from '../../_components/ui'

export default function MatchPage({ params }: { params: { id: string } }) {
  const { data, error, loading, online, act, serverNow, reload } = useSpades<any>('match', { match: params.id })
  if (loading && !data) return <Shell><Loading /></Shell>
  if (!data?.match) {
    return (
      <Shell online={online} viewer={data?.viewer}>
        <div className="sp-wrap-narrow grid gap-3"><ErrorBox message={error || 'Match not found'} onRetry={reload} /><Link href="/spades/bracket" className="sp-btn">Back to the bracket</Link></div>
      </Shell>
    )
  }
  return (
    <Shell online={online} viewer={data.viewer}>
      <div className="sp-wrap-narrow grid gap-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="sp-display text-2xl">{data.teamA?.name || 'TBD'} <span style={{ color: 'var(--sp-gold)' }}>vs</span> {data.teamB?.name || 'TBD'}</h1>
          <Link href={data.viewer.level === 'staff' ? '/spades/supervisor' : '/spades/bracket'} className="sp-btn sp-btn-sm sp-btn-ghost">Back</Link>
        </div>
        {data.viewer.level === 'public' && <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Spectator view. Bids show once all four are locked.</p>}
        <MatchPanel d={data} act={act} serverNow={serverNow} />
      </div>
    </Shell>
  )
}
