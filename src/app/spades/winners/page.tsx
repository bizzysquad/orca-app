'use client'

import { useEffect, useState } from 'react'
import { Empty, Loading, Shell, SpadeIcon } from '../_components/ui'

// League standings use the same championship records. Hidden until a league starts.
const SHOW_LEAGUE = false

export default function WinnersPage() {
  const [list, setList] = useState<any[] | null>(null)
  const [records, setRecords] = useState<{ events: any[]; teams: any[] } | null>(null)
  useEffect(() => {
    fetch('/api/spades/winners', { cache: 'no-store' }).then(r => r.json()).then(j => setList(j.winners || [])).catch(() => setList([]))
    fetch('/api/spades/state?view=public&records=1', { cache: 'no-store' }).then(r => r.json()).then(j => setRecords(j.records || { events: [], teams: [] })).catch(() => setRecords({ events: [], teams: [] }))
  }, [])
  const date = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const decided = (records?.events || []).filter(e => e.champion)
  return (
    <Shell active="winners">
      <div className="sp-wrap grid gap-6">
        <div>
          <p className="sp-label" style={{ color: 'var(--sp-gold)' }}>Powered by DJ MASKOFF</p>
          <h1 className="sp-display text-4xl mt-1">Winners</h1>
          <p className="mt-2" style={{ color: 'var(--sp-muted)' }}>Every championship, the teams that won it, and everyone&apos;s record in games played for the trophy.</p>
        </div>

        {list === null ? <Loading /> : list.length > 0 && (
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

        <section className="grid gap-3" aria-label="Championships">
          <h2 className="sp-display text-3xl">Championships</h2>
          {records === null ? <Loading /> : decided.length === 0 ? (
            <Empty title="First champions coming soon">Win a championship tournament and your team goes up here.</Empty>
          ) : (
            <div className="grid gap-2">
              {decided.map(e => (
                <div key={e.id} className="sp-card p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="sp-label">{date(e.date)} · {e.name}</p>
                    <p className="sp-display text-2xl mt-1">🏆 {e.champion}</p>
                    {e.championPlayers?.length > 0 && <p className="font-bold">{e.championPlayers.join(' & ')}</p>}
                  </div>
                  <div className="text-right text-sm" style={{ color: 'var(--sp-muted)' }}>
                    {e.runnerUp && <div>Beat {e.runnerUp}{e.score ? `, ${e.score}` : ''}</div>}
                    <div>{e.teams} teams</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {records && records.teams.length > 0 && (
          <section className="sp-card p-4 grid gap-3" aria-label="Team records">
            <h2 className="sp-display text-2xl">Team records</h2>
            <p className="text-sm" style={{ color: 'var(--sp-muted)' }}>Games played in championship tournaments.</p>
            <div className="sp-scroll">
              <table className="sp-table">
                <thead><tr><th>Team</th><th>Players</th><th className="text-right">Titles</th><th className="text-right">Won</th><th className="text-right">Lost</th><th className="text-right">Events</th></tr></thead>
                <tbody>
                  {records.teams.map(t => (
                    <tr key={t.team}>
                      <td className="font-black">{t.titles > 0 ? '🏆 ' : ''}{t.team}</td>
                      <td className="text-sm" style={{ color: 'var(--sp-muted)' }}>{t.players.join(' & ')}</td>
                      <td className="sp-num text-right font-black" style={{ color: t.titles ? 'var(--sp-gold)' : undefined }}>{t.titles}</td>
                      <td className="sp-num text-right">{t.wins}</td>
                      <td className="sp-num text-right">{t.losses}</td>
                      <td className="sp-num text-right">{t.events}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {SHOW_LEAGUE && records && (
          <section className="sp-card p-4 grid gap-3" aria-label="League">
            <h2 className="sp-display text-2xl">League standings</h2>
            <ol className="grid gap-1">
              {[...records.teams].sort((x, y) => y.wins - x.wins || x.losses - y.losses).map((t, i) => (
                <li key={t.team} className="flex justify-between p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.22)' }}>
                  <span><b className="sp-num mr-2">{i + 1}</b>{t.team}</span><span className="sp-num">{t.wins} to {t.losses}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </Shell>
  )
}
