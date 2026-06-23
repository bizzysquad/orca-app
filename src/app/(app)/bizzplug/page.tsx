'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette, Plus, Trash2, Edit3, DollarSign, CheckCircle,
  Clock, AlertCircle, X, User, Phone, Mail, FileText,
  Inbox, Globe, ChevronRight, ChevronDown, Instagram,
  ExternalLink, Save, Eye, Layers, RefreshCw,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { fmt } from '@/lib/utils'
import { setLocalSynced } from '@/lib/syncLocal'

const BIZ_PURPLE = '#9333EA'
const BIZ_GOLD = '#F59E0B'

function gid() { return Math.random().toString(36).slice(2, 10) }

type ProjectStatus = 'new-lead' | 'intake' | 'waiting-payment' | 'paid' | 'in-progress' | 'waiting-client' | 'revision' | 'completed' | 'follow-up' | 'archived'
type ProjectType = 'logo' | 'album-cover' | 'flyer' | 'branding' | 'social-media' | 'pre-made' | 'custom-artwork' | 'story-promo' | 'streaming-ad' | 'tracklist' | 'cartoons' | 'other'

interface BizClient {
  id: string
  name: string
  email?: string
  phone?: string
  instagram?: string
  artistName?: string
  projectType: string
  status: string
  quote: number
  paid: number
  paymentMethod?: string
  paymentDate?: string
  notes?: string
  createdAt: string
  deadline?: string
  songName?: string
  tracklist?: string
  details?: string
}

interface BizSubmission {
  id: string
  name: string
  email: string
  phone: string
  artistName: string
  instagram: string
  projectType: string
  songName: string
  tracklist: string
  details: string
  notes: string
  deadline: string
  status: string
  createdAt: string
}

interface BizService {
  name: string
  price: number
  description?: string
  popular?: boolean
  active?: boolean
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  'new-lead':        { label: 'New Lead',          color: '#94A3B8' },
  'intake':          { label: 'Intake Submitted',  color: '#3B82F6' },
  'waiting-payment': { label: 'Waiting Payment',   color: BIZ_GOLD },
  'paid':            { label: 'Paid',              color: '#10B981' },
  'in-progress':     { label: 'In Progress',       color: BIZ_PURPLE },
  'waiting-client':  { label: 'Waiting on Client', color: '#F97316' },
  'revision':        { label: 'Revision Needed',   color: '#EC4899' },
  'completed':       { label: 'Completed',         color: '#10B981' },
  'follow-up':       { label: 'Follow-up',         color: '#6366F1' },
  'archived':        { label: 'Archived',          color: '#64748B' },
}

const PROJECT_TYPES: { value: string; label: string }[] = [
  { value: 'pre-made',       label: 'Pre-Made Artwork' },
  { value: 'custom-artwork', label: 'Custom Artwork' },
  { value: 'logo',           label: 'Logo Design' },
  { value: 'album-cover',    label: 'Album Cover' },
  { value: 'flyer',          label: 'Flyer / Poster' },
  { value: 'branding',       label: 'Full Branding' },
  { value: 'social-media',   label: 'Social Media Kit' },
  { value: 'story-promo',    label: 'Story Promo Ad' },
  { value: 'streaming-ad',   label: 'Streaming Ad' },
  { value: 'tracklist',      label: 'Tracklist' },
  { value: 'cartoons',       label: 'Cartoons' },
  { value: 'other',          label: 'Other' },
]

const DEFAULT_SERVICES: BizService[] = [
  { name: 'Pre-Made Artwork', price: 25, active: true },
  { name: 'Custom Artwork', price: 50, popular: true, active: true },
  { name: 'Story Promo Ad', price: 10, active: true },
  { name: 'Streaming Ad', price: 20, active: true },
  { name: 'Tracklist', price: 30, active: true },
  { name: 'Flyer', price: 30, active: true },
  { name: 'Cartoons', price: 120, active: true },
  { name: 'Logos', price: 150, popular: true, active: true },
]

const BLANK_CLIENT = (): Partial<BizClient> => ({
  name: '', email: '', phone: '', instagram: '', artistName: '',
  projectType: 'custom-artwork', status: 'new-lead',
  quote: 0, paid: 0, paymentMethod: '', notes: '', deadline: '',
  songName: '', tracklist: '', details: '',
})

type DashTab = 'projects' | 'inbox' | 'website'

export default function BizzyPlugPage() {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<DashTab>('projects')
  const [clients, setClients] = useState<BizClient[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<BizClient>>(BLANK_CLIENT())
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all')
  const [submissions, setSubmissions] = useState<BizSubmission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [services, setServices] = useState<BizService[]>(DEFAULT_SERVICES)
  const [siteSettings, setSiteSettings] = useState<any>({
    bio: 'Custom artwork, logos, album covers, flyers, and more. Professional designs delivered fast.',
    cashAppTag: '$BizzyPlug',
    paypalEmail: 'buzyplug@gmail.com',
    venmoHandle: '@Buzyplug',
  })
  const [editingService, setEditingService] = useState<number | null>(null)
  const [newService, setNewService] = useState({ name: '', price: '', description: '' })
  const [siteSaved, setSiteSaved] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-bizzplug-clients')
      if (saved) setClients(JSON.parse(saved))
    } catch {}
    try {
      const ss = localStorage.getItem('orca-bizzplug-site-settings')
      if (ss) {
        const parsed = JSON.parse(ss)
        if (parsed.services?.length > 0) setServices(parsed.services)
        setSiteSettings(s => ({ ...s, ...parsed }))
      }
    } catch {}
  }, [])

  const persist = (updated: BizClient[]) => {
    setClients(updated)
    try { setLocalSynced('orca-bizzplug-clients', JSON.stringify(updated)) } catch {}
  }

  const handleSave = () => {
    if (!form.name) return
    if (editId) {
      persist(clients.map(c => c.id === editId ? { ...c, ...form } as BizClient : c))
      setEditId(null)
    } else {
      const client: BizClient = {
        id: gid(),
        name: form.name!,
        email: form.email || '',
        phone: form.phone || '',
        instagram: form.instagram || '',
        artistName: form.artistName || '',
        projectType: form.projectType || 'custom-artwork',
        status: form.status || 'new-lead',
        quote: Number(form.quote) || 0,
        paid: Number(form.paid) || 0,
        paymentMethod: form.paymentMethod || '',
        paymentDate: form.paymentDate || '',
        notes: form.notes || '',
        deadline: form.deadline || '',
        songName: form.songName || '',
        tracklist: form.tracklist || '',
        details: form.details || '',
        createdAt: new Date().toISOString().slice(0, 10),
      }
      persist([client, ...clients])
    }
    setForm(BLANK_CLIENT())
    setShowForm(false)
  }

  const handleEdit = (c: BizClient) => { setForm(c); setEditId(c.id); setShowForm(true) }
  const handleDelete = (id: string) => persist(clients.filter(c => c.id !== id))

  const importSubmission = (sub: BizSubmission) => {
    const exists = clients.some(c => c.email?.toLowerCase() === sub.email.toLowerCase() && c.name.toLowerCase() === sub.name.toLowerCase())
    if (exists) return
    const client: BizClient = {
      id: gid(), name: sub.name, email: sub.email, phone: sub.phone,
      instagram: sub.instagram, artistName: sub.artistName,
      projectType: sub.projectType || 'other', status: 'intake',
      quote: 0, paid: 0, notes: sub.notes,
      songName: sub.songName, tracklist: sub.tracklist, details: sub.details,
      deadline: sub.deadline, createdAt: sub.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    }
    persist([client, ...clients])
  }

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true)
    try {
      const res = await fetch('/api/bizzyplug/submissions')
      if (res.ok) {
        const d = await res.json()
        setSubmissions(d.submissions || [])
      }
    } catch {}
    setLoadingSubmissions(false)
  }, [])

  useEffect(() => { if (activeTab === 'inbox') loadSubmissions() }, [activeTab, loadSubmissions])

  const saveSiteSettings = async () => {
    const payload = { ...siteSettings, services }
    try { setLocalSynced('orca-bizzplug-site-settings', JSON.stringify(payload)) } catch {}
    try {
      await fetch('/api/bizzyplug/site-settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {}
    setSiteSaved(true)
    setTimeout(() => setSiteSaved(false), 2000)
  }

  const visible = filterStatus === 'all' ? clients : clients.filter(c => c.status === filterStatus)
  const totalRevenue = clients.filter(c => c.status === 'completed').reduce((s, c) => s + c.paid, 0)
  const totalOutstanding = clients.filter(c => c.status !== 'completed' && c.status !== 'archived').reduce((s, c) => s + Math.max(0, c.quote - c.paid), 0)
  const activeCount = clients.filter(c => ['in-progress', 'paid', 'revision'].includes(c.status)).length
  const pendingPayment = clients.filter(c => c.status === 'waiting-payment').length

  const inputCls = "w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
  const inputStyle = { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }

  return (
    <div style={{ backgroundColor: theme.bg }} className="min-h-screen pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 backdrop-blur-xl border-b px-4 py-4 sm:px-6"
        style={{ backgroundColor: `${theme.bg}95`, borderColor: theme.border }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text }}>BizzyPlug</h1>
            <p className="text-sm mt-0.5" style={{ color: theme.textM }}>Client & project management</p>
          </div>
          {activeTab === 'projects' && (
            <button onClick={() => { setForm(BLANK_CLIENT()); setEditId(null); setShowForm(true) }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>
              + New Project
            </button>
          )}
        </div>
      </motion.div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Revenue', value: fmt(totalRevenue), color: '#10B981' },
            { label: 'Outstanding', value: fmt(totalOutstanding), color: BIZ_GOLD },
            { label: 'Active', value: String(activeCount), color: BIZ_PURPLE },
            { label: 'Awaiting Pay', value: String(pendingPayment), color: '#F97316' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-3 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-[10px] font-medium mb-0.5" style={{ color: theme.textM }}>{s.label}</p>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex rounded-2xl overflow-hidden p-1" style={{ backgroundColor: `${BIZ_PURPLE}15`, border: `1px solid ${BIZ_PURPLE}30` }}>
          {([
            { key: 'projects' as DashTab, label: 'Projects', icon: Layers },
            { key: 'inbox' as DashTab, label: 'Inbox', icon: Inbox },
            { key: 'website' as DashTab, label: 'Website', icon: Globe },
          ]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs rounded-xl transition-all"
              style={{
                backgroundColor: activeTab === key ? BIZ_PURPLE : 'transparent',
                color: activeTab === key ? '#fff' : BIZ_PURPLE,
                fontWeight: activeTab === key ? 700 : 500,
              }}>
              <Icon size={14} /> {label}
              {key === 'inbox' && submissions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: activeTab === key ? '#fff3' : `${BIZ_PURPLE}25`, color: activeTab === key ? '#fff' : BIZ_PURPLE }}>{submissions.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── PROJECTS TAB ── */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {/* Status filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {(['all', ...Object.keys(STATUS_CONFIG)] as (ProjectStatus | 'all')[]).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className="px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all shrink-0"
                  style={{
                    backgroundColor: filterStatus === s ? BIZ_PURPLE : theme.card,
                    color: filterStatus === s ? '#fff' : theme.textM,
                    border: `1px solid ${filterStatus === s ? BIZ_PURPLE : theme.border}`,
                  }}>
                  {s === 'all' ? `All (${clients.length})` : `${STATUS_CONFIG[s].label} (${clients.filter(c => c.status === s).length})`}
                </button>
              ))}
            </div>

            {/* Client/Project list */}
            {visible.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <Palette size={32} className="mx-auto mb-3 opacity-30" style={{ color: BIZ_PURPLE }} />
                <p className="text-sm" style={{ color: theme.textM }}>No projects yet. Add your first one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map(client => {
                  const cfg = STATUS_CONFIG[client.status as ProjectStatus] || { label: client.status, color: '#94A3B8' }
                  const balance = client.quote - client.paid
                  const pct = client.quote > 0 ? Math.min(100, Math.round((client.paid / client.quote) * 100)) : 0
                  return (
                    <motion.div key={client.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm" style={{ color: theme.text }}>{client.name}</h3>
                            {client.artistName && <span className="text-xs" style={{ color: theme.textM }}>({client.artistName})</span>}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: theme.textM }}>
                            {PROJECT_TYPES.find(t => t.value === client.projectType)?.label || client.projectType}
                            {client.deadline ? ` · Due ${client.deadline}` : ''}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {client.email && <span className="text-[10px] flex items-center gap-1" style={{ color: theme.textM }}><Mail size={10} />{client.email}</span>}
                            {client.instagram && <span className="text-[10px] flex items-center gap-1" style={{ color: theme.textM }}><Instagram size={10} />{client.instagram}</span>}
                            {client.phone && <span className="text-[10px] flex items-center gap-1" style={{ color: theme.textM }}><Phone size={10} />{client.phone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleEdit(client)} className="p-1.5 rounded-lg" style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}><Edit3 size={13} /></button>
                          <button onClick={() => handleDelete(client.id)} className="p-1.5 rounded-lg" style={{ backgroundColor: '#EF444418', color: '#EF4444' }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                      {client.quote > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1" style={{ color: theme.textM }}>
                            <span>Paid: <span className="font-bold" style={{ color: '#10B981' }}>{fmt(client.paid)}</span></span>
                            <span>Quote: <span className="font-bold" style={{ color: BIZ_GOLD }}>{fmt(client.quote)}</span></span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#10B981' : BIZ_PURPLE }} />
                          </div>
                          {balance > 0 && <p className="text-[10px] mt-1" style={{ color: '#EF4444' }}>{fmt(balance)} outstanding</p>}
                        </div>
                      )}
                      {client.details && <p className="text-xs mt-2 italic truncate" style={{ color: theme.textM }}>"{client.details}"</p>}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── INBOX TAB ── */}
        {activeTab === 'inbox' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textM }}>
                Submissions from orcafin.app/bizzyplug
              </p>
              <button onClick={loadSubmissions} disabled={loadingSubmissions}
                className="p-2 rounded-xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <RefreshCw size={14} className={loadingSubmissions ? 'animate-spin' : ''} style={{ color: theme.textM }} />
              </button>
            </div>
            {loadingSubmissions ? (
              <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <RefreshCw size={24} className="animate-spin mx-auto mb-3" style={{ color: BIZ_PURPLE }} />
                <p className="text-sm" style={{ color: theme.textM }}>Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <Inbox size={32} className="mx-auto mb-3 opacity-30" style={{ color: BIZ_PURPLE }} />
                <p className="text-sm" style={{ color: theme.textM }}>No submissions yet. Share your page!</p>
                <p className="text-xs mt-1" style={{ color: theme.textM }}>orcafin.app/bizzyplug</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map(sub => (
                  <div key={sub.id} className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm" style={{ color: theme.text }}>{sub.name}</h3>
                          {sub.artistName && <span className="text-xs" style={{ color: theme.textM }}>({sub.artistName})</span>}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: theme.textM }}>
                          {sub.projectType || 'Project Request'}{sub.deadline ? ` · Deadline: ${sub.deadline}` : ''}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {sub.email && <span className="text-[10px] flex items-center gap-1" style={{ color: theme.textM }}><Mail size={10} />{sub.email}</span>}
                          {sub.instagram && <span className="text-[10px] flex items-center gap-1" style={{ color: theme.textM }}><Instagram size={10} />{sub.instagram}</span>}
                        </div>
                        {sub.details && <p className="text-xs mt-2 italic" style={{ color: theme.textM }}>"{sub.details}"</p>}
                      </div>
                      <button onClick={() => importSubmission(sub)}
                        className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold"
                        style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE, border: `1px solid ${BIZ_PURPLE}30` }}>
                        + Import
                      </button>
                    </div>
                    <p className="text-[10px]" style={{ color: theme.textM }}>
                      Submitted {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WEBSITE TAB ── */}
        {activeTab === 'website' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textM }}>Manage orcafin.app/bizzyplug</p>
              <a href="/bizzyplug" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE, border: `1px solid ${BIZ_PURPLE}30` }}>
                <Eye size={12} /> Preview
              </a>
            </div>

            {/* Bio */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-2" style={{ color: theme.textM }}>Page Description</label>
              <textarea rows={3} value={siteSettings.bio || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, bio: e.target.value }))}
                className={inputCls} style={{ ...inputStyle, resize: 'vertical' as any }} placeholder="Describe your services..." />
            </div>

            {/* Payment Links */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.textM }}>Payment Links</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Cash App Tag</label>
                  <input className={inputCls} style={inputStyle} value={siteSettings.cashAppTag || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, cashAppTag: e.target.value }))} placeholder="$BizzyPlug" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>PayPal Email</label>
                  <input className={inputCls} style={inputStyle} value={siteSettings.paypalEmail || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, paypalEmail: e.target.value }))} placeholder="buzyplug@gmail.com" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Venmo Handle</label>
                  <input className={inputCls} style={inputStyle} value={siteSettings.venmoHandle || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, venmoHandle: e.target.value }))} placeholder="@Buzyplug" />
                </div>
              </div>
            </div>

            {/* Services Manager */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.textM }}>Services & Pricing</p>
              <div className="space-y-2">
                {services.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                    {editingService === i ? (
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input className="px-2 py-1.5 rounded-lg border text-xs col-span-1" style={{ ...inputStyle }} value={s.name} onChange={e => { const u = [...services]; u[i] = { ...u[i], name: e.target.value }; setServices(u) }} />
                        <input type="number" className="px-2 py-1.5 rounded-lg border text-xs" style={{ ...inputStyle }} value={s.price} onChange={e => { const u = [...services]; u[i] = { ...u[i], price: Number(e.target.value) }; setServices(u) }} />
                        <button onClick={() => setEditingService(null)} className="px-2 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>Done</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: theme.text }}>{s.name}</p>
                        </div>
                        <span className="text-sm font-bold shrink-0" style={{ color: BIZ_PURPLE }}>${s.price}</span>
                        {s.popular && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${BIZ_PURPLE}18`, color: BIZ_PURPLE }}>POPULAR</span>}
                        <button onClick={() => setEditingService(i)} className="p-1 rounded-lg shrink-0" style={{ color: theme.textM }}><Edit3 size={12} /></button>
                        <button onClick={() => setServices(services.filter((_, j) => j !== i))} className="p-1 rounded-lg shrink-0" style={{ color: '#EF4444' }}><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {/* Add new service */}
              <div className="flex gap-2">
                <input className="flex-1 px-3 py-2 rounded-xl border text-xs" style={inputStyle} placeholder="Service name" value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))} />
                <input type="number" className="w-20 px-3 py-2 rounded-xl border text-xs" style={inputStyle} placeholder="$" value={newService.price} onChange={e => setNewService(s => ({ ...s, price: e.target.value }))} />
                <button onClick={() => {
                  if (!newService.name || !newService.price) return
                  setServices([...services, { name: newService.name, price: Number(newService.price), active: true }])
                  setNewService({ name: '', price: '', description: '' })
                }} className="px-3 py-2 rounded-xl text-xs font-bold shrink-0" style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Save button */}
            <button onClick={saveSiteSettings}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: siteSaved ? '#10B981' : BIZ_PURPLE, color: '#fff' }}>
              {siteSaved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save & Publish</>}
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="w-full border-t rounded-t-3xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-xl" style={{ color: theme.text }}>{editId ? 'Edit Project' : 'New Project'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl" style={{ backgroundColor: theme.border }}>
                  <X size={16} style={{ color: theme.text }} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Client Name *</label>
                  <input className={inputCls} style={inputStyle} placeholder="Client name" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Artist / Brand</label>
                  <input className={inputCls} style={inputStyle} placeholder="Artist name" value={form.artistName || ''} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Email</label>
                  <input className={inputCls} style={inputStyle} type="email" placeholder="email@example.com" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Phone</label>
                  <input className={inputCls} style={inputStyle} type="tel" placeholder="(555) 000-0000" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Instagram</label>
                  <input className={inputCls} style={inputStyle} placeholder="@handle" value={form.instagram || ''} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Service Type</label>
                  <select className={inputCls} style={inputStyle} value={form.projectType || 'custom-artwork'} onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))}>
                    {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Status</label>
                  <select className={inputCls} style={inputStyle} value={form.status || 'new-lead'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Deadline</label>
                  <input className={inputCls} style={inputStyle} type="date" value={form.deadline || ''} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Quote ($)</label>
                  <input className={inputCls} style={inputStyle} type="number" placeholder="0" value={form.quote || ''} onChange={e => setForm(f => ({ ...f, quote: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Paid ($)</label>
                  <input className={inputCls} style={inputStyle} type="number" placeholder="0" value={form.paid || ''} onChange={e => setForm(f => ({ ...f, paid: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Payment Method</label>
                  <select className={inputCls} style={inputStyle} value={form.paymentMethod || ''} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    <option value="">Not paid yet</option>
                    <option value="cashapp">Cash App</option>
                    <option value="paypal">PayPal</option>
                    <option value="venmo">Venmo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Song / Project Name</label>
                  <input className={inputCls} style={inputStyle} placeholder="Song title or project name" value={form.songName || ''} onChange={e => setForm(f => ({ ...f, songName: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Project Details</label>
                  <textarea rows={3} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Describe the project..." value={form.details || ''} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.textM }}>Notes</label>
                  <textarea rows={2} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Internal notes..." value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <button onClick={handleSave} disabled={!form.name}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>
                {editId ? '✓ Update Project' : '+ Save Project'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
