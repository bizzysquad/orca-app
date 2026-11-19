'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Copy, ExternalLink, Loader2, Mail, Instagram, Trash2, Check, Search, AlertTriangle } from 'lucide-react'
import type { Application, ApplicationStatus } from '@/lib/crooked/team'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS, TEAM_SKILLS, UNPAID_OPTIONS, socialLink } from '@/lib/crooked/team'
import { Field } from './ui'

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  new: 'bg-amber-300',
  under_review: 'bg-sky-200',
  contacted: 'bg-violet-200',
  accepted: 'bg-green-300',
  declined: 'bg-gray-200',
}

const skillLabel = (a: Application, id: string) =>
  id === 'other' ? `Other: ${a.skills_other}` : TEAM_SKILLS.find(s => s.id === id)?.label || id
const opennessLabel = (id: string) => UNPAID_OPTIONS.find(o => o.id === id)?.label || id

export default function ApplicationsTab() {
  const [apps, setApps] = useState<Application[] | null>(null)
  const [status, setStatus] = useState<'all' | ApplicationStatus>('all')
  const [skill, setSkill] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [dbReady, setDbReady] = useState(true)

  async function load() {
    setError('')
    const res = await fetch('/api/crookedrumors/admin/applications', { cache: 'no-store' })
    if (res.status === 401) { window.location.href = '/crookedrumor/admin/login'; return }
    const data = await res.json()
    setApps(data.applications || [])
    setDbReady(data.dbReady !== false)
    if (data.error) setError(data.error)
  }
  useEffect(() => { load() }, [])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (apps || []).filter(a =>
      (status === 'all' || a.status === status) &&
      (!skill || a.skills.includes(skill as any)) &&
      (!needle || [a.full_name, a.email, a.location, a.social_handle].some(v => v.toLowerCase().includes(needle)))
    )
  }, [apps, status, skill, q])

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch('/api/crookedrumors/admin/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Update failed'); return false }
    setApps(list => (list || []).map(a => (a.id === id ? data.application : a)))
    return true
  }

  async function remove(a: Application) {
    if (!confirm(`Delete ${a.full_name}'s application? This can't be undone.`)) return
    const res = await fetch(`/api/crookedrumors/admin/applications?id=${a.id}`, { method: 'DELETE' })
    if (res.ok) setApps(list => (list || []).filter(x => x.id !== a.id))
  }

  if (!apps) return <div className="py-24 flex justify-center"><Loader2 className="animate-spin" size={32} /></div>

  const count = (s: ApplicationStatus) => apps.filter(a => a.status === s).length

  return (
    <div className="space-y-5">
      {!dbReady && (
        <div className="rounded-xl border-[3px] border-[var(--cr-red)] bg-[#fff1dc] p-4 flex gap-3">
          <AlertTriangle className="text-[var(--cr-red)] shrink-0" />
          <div className="text-sm">
            <div className="font-black uppercase">Applications table not set up yet</div>
            Run <code className="font-mono bg-[var(--cr-tan)] px-1 rounded">supabase-migration-crookedrumor-team.sql</code> (in the ORCA folder) in Supabase → SQL Editor. Until then the Join the Team form shows &ldquo;temporarily unavailable&rdquo; on submit.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="New" value={count('new')} red={count('new') > 0} />
        <Stat label="Under review" value={count('under_review')} />
        <Stat label="Contacted" value={count('contacted')} />
        <Stat label="Accepted" value={count('accepted')} />
      </div>

      {error && dbReady && <p className="text-sm font-bold text-[var(--cr-red)]">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {(['all', ...APPLICATION_STATUSES] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full border-2 border-[var(--cr-ink)] text-xs font-extrabold uppercase ${status === s ? 'bg-[var(--cr-ink)] text-[var(--cr-paper)]' : 'bg-[var(--cr-paper)]'}`}>
            {s === 'all' ? 'All' : APPLICATION_STATUS_LABELS[s]} ({s === 'all' ? apps.length : count(s)})
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cr-muted)]" />
          <input className="cr-input !text-[15px] !py-2.5 !pl-9" placeholder="Search name, email, city, handle" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="cr-input !text-[15px] !py-2.5 sm:!w-56" value={skill} onChange={e => setSkill(e.target.value)} aria-label="Filter by skill">
          <option value="">Every skill</option>
          {TEAM_SKILLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button onClick={load} className="text-xs font-bold underline sm:px-2">Refresh</button>
      </div>

      {shown.length === 0 && <p className="font-semibold py-10 text-center">{apps.length ? 'No applications match.' : 'No applications yet.'}</p>}

      <div className="space-y-3">
        {shown.map(a => (
          <AppRow
            key={a.id}
            a={a}
            open={open === a.id}
            onToggle={() => setOpen(open === a.id ? null : a.id)}
            onPatch={body => patch(a.id, body)}
            onDelete={() => remove(a)}
          />
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, red }: { label: string; value: number; red?: boolean }) {
  return (
    <div className={`cr-card-flat !border-[3px] p-3 ${red ? '!bg-[#fff1dc] !border-[var(--cr-red)]' : ''}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--cr-muted)]">{label}</div>
      <div className="cr-display text-2xl md:text-3xl mt-1">{value}</div>
    </div>
  )
}

function AppRow({ a, open, onToggle, onPatch, onDelete }: {
  a: Application
  open: boolean
  onToggle: () => void
  onPatch: (body: Record<string, unknown>) => Promise<boolean>
  onDelete: () => void
}) {
  const [notes, setNotes] = useState(a.admin_notes)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => { setNotes(a.admin_notes) }, [a.admin_notes])

  const social = socialLink(a.social_handle)
  const first = a.full_name.split(' ')[0]
  const mailto = `mailto:${a.email}?subject=${encodeURIComponent('Crooked Rumor: your team application')}&body=${encodeURIComponent(`Hey ${first},\n\nThanks for applying to join the Crooked Rumor team. `)}`

  return (
    <div className="cr-card-flat !border-[3px] overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-3 md:p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        <div className="flex-1 min-w-[180px]">
          <div className="font-black">{a.full_name} <span className="text-xs font-bold text-[var(--cr-muted)]">{a.location}</span></div>
          <div className="text-sm text-[var(--cr-ink-soft)] line-clamp-1">{a.skills.map(s => skillLabel(a, s)).join(' · ')}</div>
        </div>
        <div className="text-xs font-bold text-[var(--cr-muted)] text-right">
          {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          <div>{opennessLabel(a.unpaid_openness)}</div>
        </div>
        <span className={`text-[11px] font-black uppercase px-2 py-1 rounded border-2 border-[var(--cr-ink)] ${STATUS_COLOR[a.status]}`}>{APPLICATION_STATUS_LABELS[a.status]}</span>
      </button>

      {open && (
        <div className="border-t-2 border-[var(--cr-tan)] p-4 grid lg:grid-cols-2 gap-6">
          <div className="space-y-4 min-w-0">
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <a href={mailto} className="cr-btn cr-btn-red cr-btn-sm !normal-case"><Mail size={14} /> Email {first}</a>
              <button
                onClick={async () => { await navigator.clipboard.writeText(a.email); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                className="cr-btn cr-btn-paper cr-btn-sm !normal-case"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />} {a.email}
              </button>
              {a.social_handle && (social ? (
                <a href={social} target="_blank" rel="noreferrer noopener" className="cr-btn cr-btn-paper cr-btn-sm !normal-case"><Instagram size={14} /> {a.social_handle}</a>
              ) : (
                <span className="cr-btn cr-btn-paper cr-btn-sm !normal-case !cursor-default"><Instagram size={14} /> {a.social_handle}</span>
              ))}
              {a.portfolio_url && (
                <a href={a.portfolio_url} target="_blank" rel="noreferrer noopener" className="cr-btn cr-btn-ink cr-btn-sm"><ExternalLink size={14} /> Portfolio</a>
              )}
            </div>
            {a.portfolio_url && <p className="text-xs text-[var(--cr-muted)] break-all -mt-2">{a.portfolio_url}</p>}

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info k="Location" v={a.location} />
              <Info k="Open to unpaid work" v={opennessLabel(a.unpaid_openness)} />
              <Info k="Applied" v={new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} />
              <Info k="Acknowledged terms" v={a.acknowledged ? 'Yes' : 'No'} />
            </dl>

            <div>
              <div className="cr-label mb-1.5">What they do</div>
              <div className="flex flex-wrap gap-1.5">
                {a.skills.map(s => <span key={s} className="text-xs font-bold px-2 py-1 rounded-full border-2 border-[var(--cr-ink)] bg-[var(--cr-paper)]">{skillLabel(a, s)}</span>)}
              </div>
            </div>

            {a.about && <Block title="About them" text={a.about} />}
            <Block title="How they could contribute" text={a.contribution} />
          </div>

          <div className="space-y-4">
            <Field label="Status">
              <select className="cr-input !text-[15px] !py-2.5" value={a.status} onChange={e => onPatch({ status: e.target.value })}>
                {APPLICATION_STATUSES.map(s => <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>)}
              </select>
            </Field>
            <Field label="Private notes" hint="Only visible to admins.">
              <textarea className="cr-input !text-[15px]" rows={6} value={notes} onChange={e => setNotes(e.target.value)} />
            </Field>
            {notes !== a.admin_notes && (
              <button
                onClick={async () => { setSaving(true); await onPatch({ admin_notes: notes }); setSaving(false) }}
                disabled={saving}
                className="cr-btn cr-btn-red cr-btn-sm w-full"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : null} Save notes
              </button>
            )}
            <button onClick={onDelete} className="text-xs font-bold text-[var(--cr-red)] inline-flex items-center gap-1"><Trash2 size={12} /> Delete application</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="cr-label mb-1.5">{title}</div>
      <div className="text-sm whitespace-pre-wrap break-words rounded-lg bg-[var(--cr-tan)]/40 p-3">{text}</div>
    </div>
  )
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--cr-muted)]">{k}</dt>
      <dd className="font-semibold break-words">{v}</dd>
    </div>
  )
}
