'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useSpades } from '../_components/useSpades'
import { Loading } from '../_components/ui'

// Paper backups for when connectivity drops. Staff see player names on the
// scorecards; everyone else gets team names only.
function Print() {
  const sp = useSearchParams()
  const t = sp.get('t')
  const kind = sp.get('kind') || 'scorecards'
  const staff = useSpades<any>('supervisor', { t })
  const pub = useSpades<any>('public', { t })
  const data = staff.data?.cards ? staff.data : pub.data
  if (!data?.tournament) return <Loading />
  const T = data.tournament
  const teams = new Map<string, any>((staff.data?.teamsFull || data.teams || []).map((x: any) => [x.id, x]))
  const matches = (staff.data?.cards ? staff.data.cards.map((c: any) => c.match) : data.matches || []).filter((m: any) => m.resultKind !== 'bye')
  const rounds = Array.from({ length: T.rounds }, (_, i) => i + 1)
  return (
    <div className="p-6" style={{ background: '#fff', color: '#000', minHeight: '100vh' }}>
      <div className="sp-noprint mb-4 flex gap-2">
        <button className="sp-btn sp-btn-sm" onClick={() => window.print()}>Print</button>
        <a className="sp-btn sp-btn-sm sp-btn-ghost" style={{ color: '#000' }} href={`?kind=${kind === 'bracket' ? 'scorecards' : 'bracket'}${t ? `&t=${t}` : ''}`}>{kind === 'bracket' ? 'Scorecards' : 'Bracket'}</a>
      </div>
      {kind === 'bracket' ? (
        <div>
          <h1 className="sp-display text-3xl mb-1">{T.name}</h1>
          <div className="mb-6" />
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${T.rounds}, minmax(0, 1fr))` }}>
            {rounds.map(r => (
              <div key={r} className="grid gap-4 content-around">
                <h2 className="font-black uppercase">{data.matches.find((m: any) => m.round === r)?.roundName}</h2>
                {(data.matches || []).filter((m: any) => m.round === r).map((m: any) => (
                  <div key={m.id} className="sp-print-card p-2" style={{ border: '2px solid #000' }}>
                    <div className="text-xs">Table ____ · to {m.target}</div>
                    <div className="flex justify-between font-bold border-b border-black py-1"><span>{teams.get(m.teamA)?.name || ' '}</span><span>{m.status === 'final' ? m.scoreA : '____'}</span></div>
                    <div className="flex justify-between font-bold py-1"><span>{teams.get(m.teamB)?.name || ' '}</span><span>{m.status === 'final' ? m.scoreB : '____'}</span></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        (matches.length ? matches : [{ id: 'blank', roundName: '', teamA: null, teamB: null, target: T.rules.targetDefault }]).map((m: any) => (
          <div key={m.id} className="sp-print-card sp-print-break p-4 mb-6" style={{ border: '2px solid #000' }}>
            <div className="flex justify-between">
              <h1 className="font-black text-xl uppercase">Backup scorecard · {m.roundName}</h1>
              <span>Table ____ · playing to {m.target}</span>
            </div>
            <p className="text-sm mb-3">{T.name}. Bid 10 per book, 1 per extra book. Set: minus 10 per book bid.{T.rules.bagsEnabled ? ' Every 10 bags: minus 100.' : ' No bags.'} Books each hand must total 13. Minimum team bid {T.rules.minTeamBid}. No nil.</p>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #000', padding: 4 }}>Hand</th>
                  {(['teamA', 'teamB'] as const).map(k => (
                    <th key={k} colSpan={4} style={{ border: '1px solid #000', padding: 4 }}>
                      {teams.get(m[k])?.name || 'Team ______________'}
                      {teams.get(m[k])?.players && <div className="font-normal text-xs">{teams.get(m[k]).players.map((p: any) => p.name).join(' & ')}</div>}
                    </th>
                  ))}
                  <th style={{ border: '1px solid #000', padding: 4 }}>Initials</th>
                </tr>
                <tr>{['', 'Bid', 'Books', 'Points', 'Total/Bags', 'Bid', 'Books', 'Points', 'Total/Bags', 'A / B'].map((h, i) => <th key={i} style={{ border: '1px solid #000', padding: 4, fontSize: 11 }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {Array.from({ length: 16 }, (_, i) => (
                  <tr key={i}>{Array.from({ length: 10 }, (_, j) => <td key={j} style={{ border: '1px solid #000', height: 26, padding: 2, textAlign: 'center' }}>{j === 0 ? i + 1 : ''}</td>)}</tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs mt-2">Supervisor: ______________ Final score ______ to ______ Winner ______________</p>
          </div>
        ))
      )}
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={<Loading />}><Print /></Suspense>
}
