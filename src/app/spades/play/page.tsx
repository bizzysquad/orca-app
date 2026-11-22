'use client'

import Link from 'next/link'
import { MyTable } from '../_components/MyTable'
import { useSpades } from '../_components/useSpades'
import { Empty, ErrorBox, Loading, NoEvents, Shell } from '../_components/ui'

export default function PlayPage() {
  const { data, error, loading, online, act, serverNow, reload } = useSpades<any>('play')
  if (loading && !data) return <Shell active="play"><Loading /></Shell>
  const viewer = data?.viewer
  if (data?.noEvent && data?.viewer?.kind !== 'player') return <Shell active="play" online={online} viewer={data?.viewer}><NoEvents /></Shell>
  if (!data?.tournament) return <Shell active="play" online={online}><div className="sp-wrap-narrow"><ErrorBox message={error || 'Could not load'} onRetry={reload} /></div></Shell>

  if (!viewer || viewer.kind === 'public') {
    return (
      <Shell active="play" online={online} viewer={viewer}>
        <div className="sp-wrap-narrow grid gap-4">
          <h1 className="sp-display text-4xl">My table</h1>
          <Empty title="Register your team, or join one">
            Captains: register your team on this phone. Partners: type the access code your captain gave you.
          </Empty>
          {data.tournament.registrationOpen && !data.tournament.rosterLocked && <Link href="/spades#signup" className="sp-btn sp-btn-gold">Sign up</Link>}
          <Link href="/spades/join" className="sp-btn">I have an access code</Link>
        </div>
      </Shell>
    )
  }
  if (viewer.kind !== 'player') {
    return (
      <Shell active="play" online={online} viewer={viewer}>
        <div className="sp-wrap-narrow grid gap-3">
          <h1 className="sp-display text-4xl">Signed in as staff</h1>
          <p style={{ color: 'var(--sp-muted)' }}>You are signed in as {viewer.name}. Use the table dashboard to follow matches, or Test Mode on the Director page to see exactly what players see.</p>
          <Link href="/spades/supervisor" className="sp-btn sp-btn-gold">Open table dashboard</Link>
        </div>
      </Shell>
    )
  }
  return (
    <Shell active="play" online={online} viewer={viewer}>
      <div className="sp-wrap-narrow grid gap-4">
        <MyTable data={data} act={act} serverNow={serverNow} />
        <Link href="/spades/bracket" className="sp-btn sp-btn-ghost">See the full bracket</Link>
      </div>
    </Shell>
  )
}
