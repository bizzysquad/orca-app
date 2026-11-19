'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ChevronDown, Copy, Check, ExternalLink, FileText, Instagram, Link2, Loader2, Mail, Paperclip,
  Phone, Plus, Search, Send, Trash2, Upload, UserPlus, X, ArrowUp, ArrowDown, Pencil,
} from 'lucide-react'
import type { CrClient, Delivery, DeliveryLink, DeliveryTemplate } from '@/lib/crooked/clients'
import { STATUS_LABELS } from '@/lib/crooked/types'
import type { BookingStatus } from '@/lib/crooked/types'
import { socialLink } from '@/lib/crooked/team'
import { formatMoney } from '@/lib/crooked/pricing'
import { Field, newId } from './ui'

const API = '/api/crookedrumors/admin/clients'
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// Same host BizzyPlug uses for finished files: free, handles big video,
// uploads straight from the browser so nothing passes through Vercel.
async function uploadToGofile(files: File[], onProgress: (msg: string) => void): Promise<string> {
  const serverRes = await fetch('https://api.gofile.io/servers')
  if (!serverRes.ok) throw new Error('Could not reach the file host (Gofile). Try again or paste a link instead.')
  const serverData = await serverRes.json()
  const servers = serverData?.data?.servers
  const server = Array.isArray(servers) ? servers[0]?.name : serverData?.data?.server
  if (!server) throw new Error('No Gofile upload server is available right now.')
  let folderId: string | null = null
  let downloadPage: string | null = null
  for (let i = 0; i < files.length; i++) {
    onProgress(`Uploading ${i + 1} of ${files.length}: ${files[i].name}`)
    const fd = new FormData()
    fd.append('file', files[i])
    if (folderId) fd.append('folderId', folderId)
    const up = await fetch(`https://${server}.gofile.io/contents/uploadfile`, { method: 'POST', body: fd })
    const data = await up.json().catch(() => ({}))
    if (data.status !== 'ok') throw new Error(`Upload failed for ${files[i].name}`)
    if (!folderId) folderId = data.data.parentFolder
    downloadPage = data.data.downloadPage
  }
  if (!downloadPage) throw new Error('Upload failed. Please try again.')
  return downloadPage
}

export default function ClientsTab() {
  const [clients, setClients] = useState<CrClient[] | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [templates, setTemplates] = useState<DeliveryTemplate[]>([])
  const [ready, setReady] = useState({ db: true, clients: true })
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [deliverFor, setDeliverFor] = useState<CrClient | null>(null)
  const [adding, setAdding] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  async function load() {
    const res = await fetch(API, { cache: 'no-store' })
    if (res.status === 401) { window.location.href = '/crookedrumor/admin/login'; return }
    const data = await res.json()
    setClients(data.clients || [])
    setDeliveries(data.deliveries || [])
    setTemplates(data.templates || [])
    setReady({ db: data.dbReady !== false, clients: data.clientsReady !== false })
    setError(data.error || '')
  }
  useEffect(() => { load() }, [])

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase()
    return (clients || []).filter(c => !n || [c.name, c.email, c.phone, c.instagram, c.company].some(v => v.toLowerCase().includes(n)))
  }, [clients, q])

  const stats = useMemo(() => {
    const list = clients || []
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    return {
      total: list.length,
      repeat: list.filter(c => c.bookings.length >= 2).length,
      deliveredMonth: deliveries.filter(d => d.status === 'sent' && new Date(d.created_at) >= monthStart).length,
      paid: list.reduce((s, c) => s + c.totalPaidCents, 0),
    }
  }, [clients, deliveries])

  async function saveClient(c: Partial<CrClient> & { email: string }) {
    const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { alert(data.error || 'Save failed'); return false }
    await load()
    return true
  }

  async function removeRecord(c: CrClient) {
    if (!confirm(c.bookings.length ? `Remove your saved details and notes for ${c.name || c.email}? They stay listed because they have bookings.` : `Delete ${c.name || c.email} from your clients?`)) return
    const res = await fetch(`${API}?email=${encodeURIComponent(c.key)}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  async function saveTemplates(next: DeliveryTemplate[]) {
    setTemplates(next)
    const res = await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templates: next }) })
    if (!res.ok) alert('Could not save templates')
  }

  if (!clients) return <div className="py-24 flex justify-center"><Loader2 className="animate-spin" size={32} /></div>

  return (
    <div className="space-y-5">
      {!ready.clients && (
        <div className="rounded-xl border-[3px] border-[var(--cr-red)] bg-[#fff1dc] p-4 flex gap-3">
          <AlertTriangle className="text-[var(--cr-red)] shrink-0" />
          <div className="text-sm">
            <div className="font-black uppercase">Client Center tables not set up yet</div>
            Run <code className="font-mono bg-[var(--cr-tan)] px-1 rounded">supabase-migration-crookedrumor-clients.sql</code> in Supabase → SQL Editor. Clients from bookings still show below, but notes, added clients, and deliveries need it.
          </div>
        </div>
      )}
      {error && <p className="text-sm font-bold text-[var(--cr-red)]">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Clients" value={String(stats.total)} />
        <Stat label="Repeat clients" value={String(stats.repeat)} />
        <Stat label="Delivered this month" value={String(stats.deliveredMonth)} />
        <Stat label="Lifetime paid" value={formatMoney(stats.paid)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cr-muted)]" />
          <input className="cr-input !text-[15px] !py-2.5 !pl-9" placeholder="Search name, email, phone, handle" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(v => !v)} className="cr-btn cr-btn-paper cr-btn-sm flex-1 sm:flex-none"><FileText size={14} /> Templates</button>
          <button onClick={() => setAdding(true)} disabled={!ready.clients} className="cr-btn cr-btn-red cr-btn-sm flex-1 sm:flex-none"><UserPlus size={14} /> Add client</button>
        </div>
      </div>

      {showTemplates && <TemplatesPanel templates={templates} onSave={saveTemplates} onClose={() => setShowTemplates(false)} />}
      {adding && <ClientForm title="Add client" onCancel={() => setAdding(false)} onSave={async c => { if (await saveClient(c)) setAdding(false) }} />}

      {shown.length === 0 && <p className="font-semibold py-10 text-center">{clients.length ? 'No clients match.' : 'No clients yet. Anyone who books shows up here automatically.'}</p>}

      <div className="space-y-3">
        {shown.map(c => (
          <ClientRow
            key={c.key}
            c={c}
            deliveries={deliveries.filter(d => d.client_email.toLowerCase() === c.key)}
            open={open === c.key}
            canEdit={ready.clients}
            onToggle={() => setOpen(open === c.key ? null : c.key)}
            onSave={saveClient}
            onRemove={() => removeRecord(c)}
            onDeliver={() => setDeliverFor(c)}
          />
        ))}
      </div>

      {deliveries.length > 0 && (
        <section className="cr-card !shadow-[4px_4px_0_var(--cr-ink)] p-4 md:p-5">
          <h3 className="cr-display text-xl mb-3">Delivery history</h3>
          <ul className="divide-y-2 divide-[var(--cr-tan)]">
            {deliveries.slice(0, 20).map(d => <DeliveryItem key={d.id} d={d} showClient />)}
          </ul>
        </section>
      )}

      {deliverFor && (
        <DeliverSheet
          client={deliverFor}
          templates={templates}
          canSend={ready.clients}
          onClose={() => setDeliverFor(null)}
          onSent={() => { load() }}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="cr-card-flat !border-[3px] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--cr-muted)]">{label}</div>
      <div className="cr-display text-2xl md:text-3xl mt-1">{value}</div>
    </div>
  )
}

// ── Client row ──────────────────────────────────────────────────────────────

function ClientRow({
  c, deliveries, open, canEdit, onToggle, onSave, onRemove, onDeliver,
}: {
  c: CrClient
  deliveries: Delivery[]
  open: boolean
  canEdit: boolean
  onToggle: () => void
  onSave: (c: Partial<CrClient> & { email: string }) => Promise<boolean>
  onRemove: () => void
  onDeliver: () => void
}) {
  const [notes, setNotes] = useState(c.notes)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => setNotes(c.notes), [c.notes])
  const social = socialLink(c.instagram)

  return (
    <div className="cr-card-flat !border-[3px] overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-3 md:p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChevronDown size={18} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        <div className="flex-1 min-w-[170px]">
          <div className="font-black">{c.name || c.email}{c.company && <span className="text-xs font-bold text-[var(--cr-muted)]"> · {c.company}</span>}</div>
          <div className="text-sm text-[var(--cr-ink-soft)] truncate">{c.email}</div>
        </div>
        <div className="text-right text-xs font-bold text-[var(--cr-muted)]">
          <div className="text-[var(--cr-ink)] text-sm font-black">{formatMoney(c.totalPaidCents)}</div>
          {c.bookings.length} booking{c.bookings.length === 1 ? '' : 's'}
        </div>
        {c.lastDelivered ? (
          <span className="text-[11px] font-black uppercase px-2 py-1 rounded border-2 border-[var(--cr-ink)] bg-emerald-200">Delivered {new Date(c.lastDelivered).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        ) : c.bookings.length === 0 ? (
          <span className="text-[11px] font-black uppercase px-2 py-1 rounded border-2 border-[var(--cr-ink)] bg-[var(--cr-paper)]">Added</span>
        ) : null}
      </button>

      {open && (
        <div className="border-t-2 border-[var(--cr-tan)] p-4 grid lg:grid-cols-2 gap-6">
          <div className="space-y-4 min-w-0">
            <button onClick={onDeliver} className="cr-btn cr-btn-red w-full"><Send size={16} /> Deliver finished work</button>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <a href={`mailto:${c.email}`} className="cr-btn cr-btn-paper cr-btn-sm !normal-case"><Mail size={14} /> Email</a>
              <button onClick={async () => { await navigator.clipboard.writeText(c.email); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="cr-btn cr-btn-paper cr-btn-sm !normal-case">
                {copied ? <Check size={14} /> : <Copy size={14} />} {c.email}
              </button>
              {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="cr-btn cr-btn-paper cr-btn-sm"><Phone size={14} /> {c.phone}</a>}
              {c.instagram && (social
                ? <a href={social} target="_blank" rel="noreferrer noopener" className="cr-btn cr-btn-paper cr-btn-sm !normal-case"><Instagram size={14} /> {c.instagram}</a>
                : <span className="cr-btn cr-btn-paper cr-btn-sm !normal-case !cursor-default"><Instagram size={14} /> {c.instagram}</span>)}
            </div>

            {c.bookings.length > 0 && (
              <div>
                <div className="cr-label mb-1.5">Bookings</div>
                <ul className="space-y-1.5">
                  {c.bookings.map(b => (
                    <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--cr-tan)]/40 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-bold truncate">{b.package_name || `Quote: ${b.category_name || 'custom'}`}</div>
                        <div className="text-xs text-[var(--cr-muted)] font-semibold">{b.ref}{b.project_date ? ` · ${fmtDate(b.project_date + 'T12:00')}` : ''}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-black uppercase">{STATUS_LABELS[b.status as BookingStatus] || b.status}</div>
                        <div className="text-xs font-semibold">{formatMoney(b.amount_paid_cents)}{b.total_cents ? ` of ${formatMoney(b.total_cents)}` : ''}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <a href="/crookedrumor/admin?tab=bookings" className="inline-block mt-1.5 text-xs font-bold underline">Manage in Bookings</a>
              </div>
            )}

            {deliveries.length > 0 && (
              <div>
                <div className="cr-label mb-1.5">Deliveries</div>
                <ul className="divide-y-2 divide-[var(--cr-tan)]">{deliveries.map(d => <DeliveryItem key={d.id} d={d} />)}</ul>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {editing ? (
              <ClientForm
                title="Edit details"
                initial={c}
                lockEmail
                onCancel={() => setEditing(false)}
                onSave={async v => { if (await onSave({ ...v, notes })) setEditing(false) }}
              />
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Info k="Name" v={c.name || '—'} />
                <Info k="Business" v={c.company || '—'} />
                <Info k="Phone" v={c.phone || '—'} />
                <Info k="Instagram" v={c.instagram || '—'} />
                <Info k="Last activity" v={c.lastActivity ? fmtDate(c.lastActivity) : '—'} />
                <Info k="Deliveries" v={String(c.deliveries)} />
              </dl>
            )}
            <Field label="Private notes" hint="Only you see these.">
              <textarea className="cr-input !text-[15px]" rows={5} value={notes} onChange={e => setNotes(e.target.value)} disabled={!canEdit} />
            </Field>
            <div className="flex flex-wrap gap-2">
              {notes !== c.notes && (
                <button
                  disabled={saving}
                  onClick={async () => { setSaving(true); await onSave({ email: c.key, name: c.name, phone: c.phone, instagram: c.instagram, company: c.company, notes }); setSaving(false) }}
                  className="cr-btn cr-btn-red cr-btn-sm flex-1"
                >
                  {saving && <Loader2 className="animate-spin" size={14} />} Save notes
                </button>
              )}
              {!editing && canEdit && <button onClick={() => setEditing(true)} className="cr-btn cr-btn-paper cr-btn-sm"><Pencil size={14} /> Edit details</button>}
            </div>
            {c.manual && (
              <button onClick={onRemove} className="text-xs font-bold text-[var(--cr-red)] inline-flex items-center gap-1">
                <Trash2 size={12} /> {c.bookings.length ? 'Clear saved details and notes' : 'Delete client'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DeliveryItem({ d, showClient }: { d: Delivery; showClient?: boolean }) {
  return (
    <li className="py-2.5 text-sm flex items-start gap-3">
      <span className={`mt-0.5 text-[10px] font-black uppercase px-1.5 py-0.5 rounded border-2 border-[var(--cr-ink)] shrink-0 ${d.status === 'sent' ? 'bg-emerald-200' : 'bg-red-200'}`}>{d.status}</span>
      <div className="min-w-0 flex-1">
        <div className="font-bold truncate">{showClient ? `${d.client_name || d.client_email}: ` : ''}{d.subject}</div>
        <div className="text-xs text-[var(--cr-muted)] font-semibold">
          {new Date(d.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          {d.booking_ref ? ` · ${d.booking_ref}` : ''}
          {d.error ? ` · ${d.error}` : ''}
        </div>
        {d.links.length > 0 && (
          <div className="flex flex-wrap gap-x-3 mt-0.5">
            {d.links.map((l, i) => <a key={i} href={l.url} target="_blank" rel="noreferrer noopener" className="text-xs font-bold underline inline-flex items-center gap-0.5">{l.label} <ExternalLink size={10} /></a>)}
          </div>
        )}
      </div>
    </li>
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

// ── Add / edit client ───────────────────────────────────────────────────────

function ClientForm({
  title, initial, lockEmail, onSave, onCancel,
}: {
  title: string
  initial?: Partial<CrClient>
  lockEmail?: boolean
  onSave: (c: { email: string; name: string; phone: string; instagram: string; company: string; notes?: string }) => void
  onCancel: () => void
}) {
  const [v, setV] = useState({
    email: initial?.key || initial?.email || '',
    name: initial?.name || '',
    phone: initial?.phone || '',
    instagram: initial?.instagram || '',
    company: initial?.company || '',
  })
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })
  return (
    <form
      onSubmit={e => { e.preventDefault(); onSave(v) }}
      className="cr-card !shadow-[4px_4px_0_var(--cr-ink)] p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="cr-display text-xl">{title}</h3>
        <button type="button" onClick={onCancel} aria-label="Cancel"><X size={20} /></button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Name"><input className="cr-input !text-[15px] !py-2.5" value={v.name} onChange={set('name')} required /></Field>
        <Field label="Email"><input type="email" className="cr-input !text-[15px] !py-2.5" value={v.email} onChange={set('email')} required disabled={lockEmail} /></Field>
        <Field label="Phone"><input className="cr-input !text-[15px] !py-2.5" value={v.phone} onChange={set('phone')} /></Field>
        <Field label="Instagram"><input className="cr-input !text-[15px] !py-2.5" value={v.instagram} onChange={set('instagram')} placeholder="@handle" /></Field>
        <Field label="Business" className="sm:col-span-2"><input className="cr-input !text-[15px] !py-2.5" value={v.company} onChange={set('company')} /></Field>
      </div>
      <button type="submit" className="cr-btn cr-btn-red cr-btn-sm w-full">Save client</button>
    </form>
  )
}

// ── Templates ───────────────────────────────────────────────────────────────

function TemplatesPanel({ templates, onSave, onClose }: { templates: DeliveryTemplate[]; onSave: (t: DeliveryTemplate[]) => void; onClose: () => void }) {
  const [editing, setEditing] = useState<DeliveryTemplate | null>(null)
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= templates.length) return
    const next = [...templates]
    ;[next[i], next[j]] = [next[j], next[i]]
    onSave(next)
  }
  const commit = () => {
    if (!editing || !editing.label.trim() || !editing.text.trim()) return
    onSave(templates.some(t => t.id === editing.id) ? templates.map(t => (t.id === editing.id ? editing : t)) : [...templates, editing])
    setEditing(null)
  }
  return (
    <section className="cr-card !shadow-[4px_4px_0_var(--cr-ink)] p-4 md:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="cr-display text-xl">Delivery templates</h3>
        <div className="flex gap-2">
          <button onClick={() => setEditing({ id: newId('tpl'), label: '', subject: '', text: '' })} className="cr-btn cr-btn-red cr-btn-sm"><Plus size={14} /> New</button>
          <button onClick={onClose} aria-label="Close templates" className="p-1"><X size={20} /></button>
        </div>
      </div>
      {editing && (
        <div className="rounded-xl border-2 border-[var(--cr-red)] p-3 space-y-2 bg-[var(--cr-paper)]">
          <Field label="Name"><input className="cr-input !text-[15px] !py-2" value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })} placeholder="Final edit ready" /></Field>
          <Field label="Email subject"><input className="cr-input !text-[15px] !py-2" value={editing.subject} onChange={e => setEditing({ ...editing, subject: e.target.value })} placeholder="Your final edit is ready" /></Field>
          <Field label="Message"><textarea className="cr-input !text-[15px]" rows={4} value={editing.text} onChange={e => setEditing({ ...editing, text: e.target.value })} /></Field>
          <div className="flex gap-2">
            <button onClick={commit} disabled={!editing.label.trim() || !editing.text.trim()} className="cr-btn cr-btn-red cr-btn-sm flex-1">Save template</button>
            <button onClick={() => setEditing(null)} className="cr-btn cr-btn-paper cr-btn-sm">Cancel</button>
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {templates.map((t, i) => (
          <li key={t.id} className="flex items-center gap-2 rounded-lg border-2 border-[var(--cr-ink)] bg-[var(--cr-paper)] px-3 py-2">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-20" aria-label="Move up"><ArrowUp size={13} /></button>
              <button onClick={() => move(i, 1)} disabled={i === templates.length - 1} className="disabled:opacity-20" aria-label="Move down"><ArrowDown size={13} /></button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{t.label}</div>
              <div className="text-xs text-[var(--cr-muted)] truncate">{t.text}</div>
            </div>
            <button onClick={() => setEditing(t)} className="p-1.5" aria-label="Edit"><Pencil size={14} /></button>
            <button onClick={() => { if (confirm(`Delete the "${t.label}" template?`)) onSave(templates.filter(x => x.id !== t.id)) }} className="p-1.5 text-[var(--cr-red)]" aria-label="Delete"><Trash2 size={14} /></button>
          </li>
        ))}
        {templates.length === 0 && <li className="text-sm text-[var(--cr-muted)]">No templates. Add one with New.</li>}
      </ul>
    </section>
  )
}

// ── Deliver ─────────────────────────────────────────────────────────────────

function DeliverSheet({
  client, templates, canSend, onClose, onSent,
}: {
  client: CrClient
  templates: DeliveryTemplate[]
  canSend: boolean
  onClose: () => void
  onSent: () => void
}) {
  const openBookings = client.bookings.filter(b => !['completed', 'cancelled'].includes(b.status))
  const [to, setTo] = useState(client.email)
  const [bookingId, setBookingId] = useState(openBookings[0]?.id || client.bookings[0]?.id || '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [links, setLinks] = useState<DeliveryLink[]>([])
  const [markDelivered, setMarkDelivered] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose()
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', esc) }
  }, [busy, onClose])

  const applyTemplate = (id: string) => {
    const t = templates.find(x => x.id === id)
    if (!t) return
    setMessage(t.text)
    setSubject(t.subject || t.label)
  }

  async function send() {
    setError('')
    if (!message.trim()) { setError('Write a message or pick a template.'); return }
    if (files.length === 0 && links.every(l => !l.url.trim()) && !confirm('No files or links attached. Send the message anyway?')) return
    try {
      const allLinks = links.filter(l => l.url.trim())
      if (files.length) {
        setBusy('Uploading files...')
        const url = await uploadToGofile(files, setBusy)
        allLinks.unshift({ label: files.length > 1 ? `Download your ${files.length} files` : 'Download your file', url })
      }
      setBusy('Sending email...')
      const res = await fetch('/api/crookedrumors/admin/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, clientName: client.name, bookingId: bookingId || null, subject, message, links: allLinks, markDelivered }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setDone(data.markedDelivered ? 'Sent, and the booking is marked Delivered.' : 'Sent.')
      onSent()
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
      onSent() // refresh history so a failed attempt shows up
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !busy && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Deliver work to ${client.name || client.email}`}
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border-[3px] border-[var(--cr-ink)] bg-[var(--cr-cream)] shadow-[8px_8px_0_var(--cr-ink)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 bg-[var(--cr-ink)] text-[var(--cr-paper)]">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] opacity-70">Deliver finished work</div>
            <div className="cr-display text-lg truncate">{client.name || client.email}</div>
          </div>
          <button onClick={onClose} disabled={!!busy} aria-label="Close"><X size={22} /></button>
        </div>

        {done ? (
          <div className="p-6 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-[var(--cr-red)] text-[var(--cr-paper)] border-[3px] border-[var(--cr-ink)] flex items-center justify-center"><Check size={30} strokeWidth={3.5} /></div>
            <div className="cr-display text-3xl">Delivered!</div>
            <p className="font-semibold">{done} {client.name || 'The client'} gets a Crooked Rumor branded email with the download link{links.length + files.length > 1 ? 's' : ''}.</p>
            <button onClick={onClose} className="cr-btn cr-btn-ink w-full">Done</button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <Field label="Send to"><input type="email" className="cr-input !text-[15px] !py-2.5" value={to} onChange={e => setTo(e.target.value)} /></Field>

            {client.bookings.length > 0 && (
              <Field label="For booking" hint="Adds a link to their booking page in the email.">
                <select className="cr-input !text-[15px] !py-2.5" value={bookingId} onChange={e => setBookingId(e.target.value)}>
                  <option value="">No specific booking</option>
                  {client.bookings.map(b => <option key={b.id} value={b.id}>{b.ref} · {b.package_name || b.category_name || 'Custom'} ({STATUS_LABELS[b.status as BookingStatus] || b.status})</option>)}
                </select>
              </Field>
            )}

            <Field label="Template">
              <select className="cr-input !text-[15px] !py-2.5" value="" onChange={e => applyTemplate(e.target.value)}>
                <option value="">Pick a template to fill the message</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Subject"><input className="cr-input !text-[15px] !py-2.5" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Your Crooked Rumor project is ready" /></Field>
            <Field label="Message"><textarea className="cr-input !text-[15px]" rows={5} value={message} onChange={e => setMessage(e.target.value)} /></Field>

            <div>
              <span className="block text-[11px] font-black uppercase tracking-[0.1em] mb-1">Files</span>
              <label className="flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-[var(--cr-ink)] bg-[var(--cr-paper)] font-black text-sm uppercase cursor-pointer hover:bg-[var(--cr-tan)]/50">
                <Upload size={16} /> {files.length ? `${files.length} file${files.length > 1 ? 's' : ''} ready` : 'Choose videos, photos, or files'}
                <input type="file" multiple className="hidden" onChange={e => { if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]); e.target.value = '' }} />
              </label>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {files.map((f, i) => (
                    <span key={i} className="text-xs font-semibold px-2 py-1 rounded-lg border-2 border-[var(--cr-ink)] bg-[var(--cr-paper)] inline-flex items-center gap-1 max-w-full">
                      <Paperclip size={11} /> <span className="truncate max-w-[160px]">{f.name}</span> <span className="text-[var(--cr-muted)]">{(f.size / 1048576).toFixed(1)}MB</span>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="text-[var(--cr-red)]"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-[var(--cr-muted)] mt-1">Uploaded to Gofile (same as BizzyPlug), then sent as one download link.</p>
            </div>

            <div>
              <span className="block text-[11px] font-black uppercase tracking-[0.1em] mb-1">Or paste links</span>
              <div className="space-y-2">
                {links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="cr-input !text-[14px] !py-2 !w-32 shrink-0" value={l.label} onChange={e => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Button text" />
                    <input className="cr-input !text-[14px] !py-2" value={l.url} onChange={e => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="drive.google.com/..." inputMode="url" autoCapitalize="none" />
                    <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="text-[var(--cr-red)] px-1" aria-label="Remove link"><X size={18} /></button>
                  </div>
                ))}
                <button onClick={() => setLinks([...links, { label: 'Download your files', url: '' }])} className="inline-flex items-center gap-1 text-sm font-black uppercase text-[var(--cr-red)]">
                  <Link2 size={15} /> Add a Drive, Dropbox, or WeTransfer link
                </button>
              </div>
            </div>

            {bookingId && (
              <label className="flex items-center gap-2.5 text-sm font-bold cursor-pointer">
                <input type="checkbox" className="w-5 h-5 accent-[var(--cr-red)]" checked={markDelivered} onChange={e => setMarkDelivered(e.target.checked)} />
                Mark this booking as Delivered after sending
              </label>
            )}

            {error && <p className="rounded-lg border-2 border-[var(--cr-red)] bg-[#fff1ec] p-3 text-sm font-bold text-[var(--cr-red)]" role="alert">{error}</p>}

            <button onClick={send} disabled={!!busy || !canSend || !to} className="cr-btn cr-btn-red w-full !py-4 text-base">
              {busy ? <><Loader2 className="animate-spin" size={18} /> {busy}</> : <><Send size={18} /> Send to client</>}
            </button>
            {!canSend && <p className="text-xs font-bold text-[var(--cr-red)] text-center">Run the Client Center migration to enable sending.</p>}
            <p className="text-xs text-center text-[var(--cr-muted)]">Sent from Crooked Rumor. Replies go to your contact email in Site &amp; payments.</p>
          </div>
        )}
      </div>
    </div>
  )
}
