'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarCheck, Package, PlusSquare, Tag, Film, FileText, LogOut, ExternalLink, Loader2, Save, AlertTriangle } from 'lucide-react'
import type { SiteDoc } from '@/lib/crooked/types'
import BookingsTab from './BookingsTab'
import PackagesTab from './PackagesTab'
import AddonsTab from './AddonsTab'
import PromosTab from './PromosTab'
import PortfolioTab from './PortfolioTab'
import ContentTab from './ContentTab'

const TABS = [
  { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { id: 'packages', label: 'Packages', icon: Package },
  { id: 'addons', label: 'Add ons', icon: PlusSquare },
  { id: 'promos', label: 'Promos', icon: Tag },
  { id: 'portfolio', label: 'Portfolio', icon: Film },
  { id: 'content', label: 'Site & payments', icon: FileText },
] as const
type TabId = (typeof TABS)[number]['id']

export type SetDoc = (fn: (d: SiteDoc) => SiteDoc) => void

export default function AdminApp() {
  const [tab, setTab] = useState<TabId>('bookings')
  const [doc, setDocState] = useState<SiteDoc | null>(null)
  const [meta, setMeta] = useState<{ stored: boolean; dbReady: boolean; updatedAt: string | null }>({ stored: false, dbReady: true, updatedAt: null })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string; conflict?: boolean } | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/crookedrumors/admin/site', { cache: 'no-store' })
    if (res.status === 401) { window.location.href = '/crookedrumor/admin/login'; return }
    const data = await res.json()
    setDocState(data.site)
    setMeta({ stored: data.stored, dbReady: data.dbReady, updatedAt: data.updatedAt })
    setDirty(false)
  }, [])

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as TabId | null
    if (t && TABS.some(x => x.id === t)) setTab(t)
    load()
  }, [load])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const setDoc: SetDoc = fn => {
    setDocState(d => (d ? fn(d) : d))
    setDirty(true)
    setMsg(null)
  }

  async function save(force = false) {
    if (!doc) return
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/crookedrumors/admin/site', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site: doc, expectedUpdatedAt: meta.updatedAt, force }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMsg({ kind: 'err', text: data.error || 'Save failed', conflict: data.conflict })
      return
    }
    setMeta(m => ({ ...m, stored: true, updatedAt: data.updatedAt }))
    setDirty(false)
    setMsg({ kind: 'ok', text: 'Saved. Live on the site now.' })
  }

  function switchTab(t: TabId) {
    setTab(t)
    window.history.replaceState(null, '', `?tab=${t}`)
  }

  async function logout() {
    if (dirty && !confirm('You have unsaved changes. Log out anyway?')) return
    await fetch('/api/crookedrumors/admin/login', { method: 'DELETE' })
    window.location.href = '/crookedrumor/admin/login'
  }

  const siteTab = tab !== 'bookings'

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 bg-[var(--cr-ink)] text-[var(--cr-paper)] border-b-[3px] border-[var(--cr-red)]">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/crookedrumors/badge.webp" alt="" className="w-9 h-9 rounded-full object-cover border-2 border-[var(--cr-paper)]" />
            <span className="cr-display text-lg truncate">CR Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/crookedrumor" target="_blank" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold opacity-80 hover:opacity-100">View site <ExternalLink size={14} /></a>
            <button onClick={logout} className="p-2 opacity-80 hover:opacity-100" aria-label="Log out" title="Log out"><LogOut size={18} /></button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-2 cr-scroll-x flex overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-extrabold uppercase tracking-wide border-b-4 transition-colors ${tab === t.id ? 'border-[var(--cr-red)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="cr-grain mx-auto max-w-6xl px-4 pt-6">
        {!meta.dbReady && (
          <div className="mb-6 rounded-xl border-[3px] border-[var(--cr-red)] bg-[#fff1dc] p-4 flex gap-3">
            <AlertTriangle className="text-[var(--cr-red)] shrink-0" />
            <div className="text-sm">
              <div className="font-black uppercase">Database not set up yet</div>
              Run <code className="font-mono bg-[var(--cr-tan)] px-1 rounded">supabase-migration-crookedrumors.sql</code> (in the ORCA folder) in Supabase → SQL Editor. Until then the public site shows starter content and booking is paused.
            </div>
          </div>
        )}
        {meta.dbReady && !meta.stored && siteTab && (
          <div className="mb-6 rounded-xl border-[3px] border-[var(--cr-ink)] bg-[var(--cr-paper)] p-4 text-sm">
            <span className="font-black uppercase">Starter content.</span> The site is showing the built in packages. Click <b>Save</b> once to store them in your database, then edit anything.
          </div>
        )}

        {!doc ? (
          <div className="py-24 flex justify-center"><Loader2 className="animate-spin" size={32} /></div>
        ) : tab === 'bookings' ? (
          <BookingsTab />
        ) : tab === 'packages' ? (
          <PackagesTab doc={doc} setDoc={setDoc} />
        ) : tab === 'addons' ? (
          <AddonsTab doc={doc} setDoc={setDoc} />
        ) : tab === 'promos' ? (
          <PromosTab doc={doc} setDoc={setDoc} />
        ) : tab === 'portfolio' ? (
          <PortfolioTab doc={doc} setDoc={setDoc} />
        ) : (
          <ContentTab doc={doc} setDoc={setDoc} />
        )}
      </main>

      {doc && siteTab && (dirty || msg || !meta.stored) && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[var(--cr-paper)] border-t-[3px] border-[var(--cr-ink)]">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
            <div className="flex-1 text-sm font-bold min-w-0">
              {msg ? (
                <span className={msg.kind === 'ok' ? 'text-green-800' : 'text-[var(--cr-red)]'}>{msg.text}</span>
              ) : dirty ? (
                'Unsaved changes'
              ) : (
                'Starter content is not stored yet'
              )}
            </div>
            {dirty && (
              <button onClick={() => { if (confirm('Discard all unsaved changes?')) load() }} className="cr-btn cr-btn-paper cr-btn-sm" disabled={saving}>Discard</button>
            )}
            {msg?.conflict ? (
              <button onClick={() => save(true)} className="cr-btn cr-btn-red cr-btn-sm" disabled={saving}>Overwrite</button>
            ) : (
              (dirty || !meta.stored) && (
                <button onClick={() => save()} className="cr-btn cr-btn-red cr-btn-sm" disabled={saving || !meta.dbReady}>
                  {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} strokeWidth={3} />} Save
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
