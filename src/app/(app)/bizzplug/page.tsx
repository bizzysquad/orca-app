'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette, Plus, Trash2, Edit3, DollarSign, CheckCircle,
  Clock, X, Mail, Inbox, Globe, Instagram, Phone, User,
  ExternalLink, Save, Eye, Layers, RefreshCw, ChevronRight,
  FileText, Database,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { fmt } from '@/lib/utils'
import { setLocalSynced } from '@/lib/syncLocal'

const BIZ_PURPLE = '#9333EA'
const BIZ_GOLD = '#F59E0B'

function gid() { return Math.random().toString(36).slice(2, 10) }

type ProjectStatus = 'new-lead' | 'completed'

interface BizProject {
  id: string
  clientId?: string
  artistName: string
  email?: string
  phone?: string
  instagram?: string
  projectType: string
  status: ProjectStatus
  quote: number
  paid: number
  paymentMethod?: string
  notes?: string
  songName?: string
  tracklist?: string
  details?: string
  deadline?: string
  createdAt: string
}

interface BizClientProfile {
  id: string
  artistName: string
  email?: string
  phone?: string
  instagram?: string
  notes?: string
  createdAt: string
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
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  'new-lead':  { label: 'New Lead',   color: BIZ_PURPLE },
  'completed': { label: 'Completed',  color: '#10B981' },
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
  { name: 'Pre-Made Artwork', price: 25 },
  { name: 'Custom Artwork', price: 50, popular: true },
  { name: 'Story Promo Ad', price: 10 },
  { name: 'Streaming Ad', price: 20 },
  { name: 'Tracklist', price: 30 },
  { name: 'Flyer', price: 30 },
  { name: 'Cartoons', price: 120 },
  { name: 'Logos', price: 150, popular: true },
]

const BLANK_PROJECT = (): Partial<BizProject> => ({
  artistName: '', email: '', phone: '', instagram: '',
  projectType: 'custom-artwork', status: 'new-lead',
  quote: 0, paid: 0, paymentMethod: '', notes: '', deadline: '',
  songName: '', tracklist: '', details: '',
})

type DashTab = 'projects' | 'clients' | 'inbox' | 'website'

export default function BizzyPlugPage() {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<DashTab>('projects')
  const [projects, setProjects] = useState<BizProject[]>([])
  const [clientDb, setClientDb] = useState<BizClientProfile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<BizProject>>(BLANK_PROJECT())
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('new-lead')
  const [submissions, setSubmissions] = useState<BizSubmission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [services, setServices] = useState<BizService[]>(DEFAULT_SERVICES)
  const [siteSettings, setSiteSettings] = useState<any>({
    bio: 'Custom artwork, logos, album covers, flyers, and more. Professional designs delivered fast.',
    cashAppTag: '$BizzyPlug', paypalEmail: 'buzyplug@gmail.com', venmoHandle: '@Buzyplug',
  })
  const [editingService, setEditingService] = useState<number | null>(null)
  const [newService, setNewService] = useState({ name: '', price: '' })
  const [siteSaved, setSiteSaved] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const [editClientId, setEditClientId] = useState<string | null>(null)
  const [clientForm, setClientForm] = useState<Partial<BizClientProfile>>({})
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [portfolioPhotos, setPortfolioPhotos] = useState<{ id: string; url: string; title: string; category: string }[]>([])
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [newPhotoTitle, setNewPhotoTitle] = useState('')
  const [newPhotoCategory, setNewPhotoCategory] = useState('album-covers')

  const loadPortfolio = useCallback(async () => {
    try { const res = await fetch('/api/bizzyplug/photos'); if (res.ok) { const d = await res.json(); setPortfolioPhotos(d.photos || []) } } catch {}
  }, [])

  const uploadPortfolioPhotos = async (files: File[]) => {
    setUploadingPortfolio(true)
    setUploadStatus(null)
    setUploadProgress({ current: 0, total: files.length })
    let succeeded = 0
    let failed = 0

    for (let i = 0; i < files.length; i++) {
      setUploadProgress({ current: i + 1, total: files.length })
      const file = files[i]
      const title = newPhotoTitle
        ? (files.length > 1 ? `${newPhotoTitle} ${i + 1}` : newPhotoTitle)
        : file.name.replace(/\.[^.]+$/, '')
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('title', title)
        fd.append('category', newPhotoCategory)
        const res = await fetch('/api/bizzyplug/photos', { method: 'POST', body: fd })
        if (res.ok) succeeded++
        else failed++
      } catch { failed++ }
    }

    await loadPortfolio()
    setNewPhotoTitle('')
    setUploadingPortfolio(false)
    setUploadProgress({ current: 0, total: 0 })

    if (failed === 0) {
      setUploadStatus({ type: 'success', message: `${succeeded} photo${succeeded !== 1 ? 's' : ''} uploaded` })
    } else {
      setUploadStatus({ type: 'error', message: `${succeeded} uploaded, ${failed} failed` })
    }
    setTimeout(() => setUploadStatus(null), 3000)
  }

  const deletePortfolioPhoto = async (id: string) => {
    try { await fetch('/api/bizzyplug/photos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); setPortfolioPhotos(p => p.filter(x => x.id !== id)) } catch {}
  }

  useEffect(() => {
    try { const s = localStorage.getItem('orca-bizzplug-clients'); if (s) setProjects(JSON.parse(s)) } catch {}
    try { const c = localStorage.getItem('orca-bizzplug-client-db'); if (c) setClientDb(JSON.parse(c)) } catch {}
    try {
      const ss = localStorage.getItem('orca-bizzplug-site-settings')
      if (ss) {
        const parsed = JSON.parse(ss)
        if (parsed.services?.length > 0) setServices(parsed.services)
        setSiteSettings((s: any) => ({ ...s, ...parsed }))
      }
    } catch {}
  }, [])

  const persistProjects = (updated: BizProject[]) => {
    setProjects(updated)
    try { setLocalSynced('orca-bizzplug-clients', JSON.stringify(updated)) } catch {}
  }

  const persistClients = (updated: BizClientProfile[]) => {
    setClientDb(updated)
    try { setLocalSynced('orca-bizzplug-client-db', JSON.stringify(updated)) } catch {}
  }

  const handleSaveProject = () => {
    if (!form.artistName) return
    if (editId) {
      persistProjects(projects.map(p => p.id === editId ? { ...p, ...form } as BizProject : p))
      setEditId(null)
    } else {
      const project: BizProject = {
        id: gid(),
        artistName: form.artistName!,
        email: form.email || '', phone: form.phone || '', instagram: form.instagram || '',
        projectType: form.projectType || 'custom-artwork', status: (form.status as ProjectStatus) || 'new-lead',
        quote: Number(form.quote) || 0, paid: Number(form.paid) || 0,
        paymentMethod: form.paymentMethod || '', notes: form.notes || '',
        songName: form.songName || '', tracklist: form.tracklist || '', details: form.details || '',
        deadline: form.deadline || '', createdAt: new Date().toISOString().slice(0, 10),
      }
      persistProjects([project, ...projects])
      // Auto-add to client DB if not there
      const key = (project.email || project.artistName).toLowerCase()
      if (!clientDb.some(c => (c.email || c.artistName).toLowerCase() === key)) {
        persistClients([...clientDb, { id: gid(), artistName: project.artistName, email: project.email, phone: project.phone, instagram: project.instagram, createdAt: project.createdAt }])
      }
    }
    setForm(BLANK_PROJECT())
    setShowForm(false)
  }

  const handleEdit = (p: BizProject) => { setForm(p); setEditId(p.id); setShowForm(true) }
  const handleDelete = (id: string) => persistProjects(projects.filter(p => p.id !== id))

  const importSubmission = (sub: BizSubmission) => {
    const project: BizProject = {
      id: gid(), artistName: sub.artistName || sub.name, email: sub.email, phone: sub.phone,
      instagram: sub.instagram, projectType: sub.projectType || 'other', status: 'new-lead',
      quote: 0, paid: 0, notes: sub.notes, songName: sub.songName, tracklist: sub.tracklist,
      details: sub.details, deadline: sub.deadline,
      createdAt: sub.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    }
    persistProjects([project, ...projects])
    // Auto-add to client DB
    const key = (project.email || project.artistName).toLowerCase()
    if (!clientDb.some(c => (c.email || c.artistName).toLowerCase() === key)) {
      persistClients([...clientDb, { id: gid(), artistName: project.artistName, email: project.email, phone: project.phone, instagram: project.instagram, createdAt: project.createdAt }])
    }
  }

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true)
    try { const res = await fetch('/api/bizzyplug/submissions'); if (res.ok) { const d = await res.json(); setSubmissions(d.submissions || []) } } catch {}
    setLoadingSubmissions(false)
  }, [])

  useEffect(() => { if (activeTab === 'inbox') loadSubmissions() }, [activeTab, loadSubmissions])
  useEffect(() => { if (activeTab === 'website') loadPortfolio() }, [activeTab, loadPortfolio])

  const saveSiteSettings = async () => {
    const payload = { ...siteSettings, services }
    try { setLocalSynced('orca-bizzplug-site-settings', JSON.stringify(payload)) } catch {}
    try { await fetch('/api/bizzyplug/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) } catch {}
    setSiteSaved(true)
    setTimeout(() => setSiteSaved(false), 2000)
  }

  const visible = filterStatus === 'all' ? projects : projects.filter(p => p.status === filterStatus)
  const totalRevenue = projects.filter(p => p.status === 'completed').reduce((s, p) => s + p.paid, 0)
  const newLeadCount = projects.filter(p => p.status === 'new-lead').length
  const completedCount = projects.filter(p => p.status === 'completed').length

  const getClientProjects = (client: BizClientProfile) => {
    const key = (client.email || client.artistName).toLowerCase()
    return projects.filter(p => (p.email || p.artistName).toLowerCase() === key)
  }

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
            <button onClick={() => { setForm(BLANK_PROJECT()); setEditId(null); setShowForm(true) }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>
              + New Project
            </button>
          )}
          {activeTab === 'clients' && (
            <button onClick={() => { setClientForm({ artistName: '', email: '', phone: '', instagram: '', notes: '' }); setEditClientId(null); setShowClientForm(true) }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>
              + Add Client
            </button>
          )}
        </div>
      </motion.div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Revenue', value: fmt(totalRevenue), color: '#10B981' },
            { label: 'New Leads', value: String(newLeadCount), color: BIZ_PURPLE },
            { label: 'Completed', value: String(completedCount), color: '#10B981' },
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
            { key: 'clients' as DashTab, label: 'Clients', icon: Database },
            { key: 'inbox' as DashTab, label: 'Inbox', icon: Inbox },
            { key: 'website' as DashTab, label: 'Website', icon: Globe },
          ]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-1 py-2.5 px-1 text-[11px] rounded-xl transition-all"
              style={{
                backgroundColor: activeTab === key ? BIZ_PURPLE : 'transparent',
                color: activeTab === key ? '#fff' : BIZ_PURPLE,
                fontWeight: activeTab === key ? 700 : 500,
              }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ── PROJECTS TAB ── */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['all', 'new-lead', 'completed'] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className="px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all"
                  style={{
                    backgroundColor: filterStatus === s ? BIZ_PURPLE : theme.card,
                    color: filterStatus === s ? '#fff' : theme.textM,
                    border: `1px solid ${filterStatus === s ? BIZ_PURPLE : theme.border}`,
                  }}>
                  {s === 'all' ? `All (${projects.length})` : `${STATUS_CONFIG[s].label} (${projects.filter(p => p.status === s).length})`}
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <Palette size={32} className="mx-auto mb-3 opacity-30" style={{ color: BIZ_PURPLE }} />
                <p className="text-sm" style={{ color: theme.textM }}>No projects yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map(p => {
                  const cfg = STATUS_CONFIG[p.status] || { label: p.status, color: '#94A3B8' }
                  const pct = p.quote > 0 ? Math.min(100, Math.round((p.paid / p.quote) * 100)) : 0
                  return (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm" style={{ color: theme.text }}>{p.artistName}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: theme.textM }}>
                            {PROJECT_TYPES.find(t => t.value === p.projectType)?.label || p.projectType}
                            {p.deadline ? ` · Due ${p.deadline}` : ''}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {p.email && <span className="text-[10px] flex items-center gap-1" style={{ color: theme.textM }}><Mail size={10} />{p.email}</span>}
                            {p.instagram && <span className="text-[10px] flex items-center gap-1" style={{ color: theme.textM }}><Instagram size={10} />{p.instagram}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg" style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}><Edit3 size={13} /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg" style={{ backgroundColor: '#EF444418', color: '#EF4444' }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                      {p.quote > 0 && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1" style={{ color: theme.textM }}>
                            <span>Paid: <span className="font-bold" style={{ color: '#10B981' }}>{fmt(p.paid)}</span></span>
                            <span>Quote: <span className="font-bold" style={{ color: BIZ_GOLD }}>{fmt(p.quote)}</span></span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#10B981' : BIZ_PURPLE }} />
                          </div>
                        </div>
                      )}
                      {p.details && <p className="text-xs mt-2 italic truncate" style={{ color: theme.textM }}>"{p.details}"</p>}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CLIENTS TAB ── */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            {clientDb.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <Database size={32} className="mx-auto mb-3 opacity-30" style={{ color: BIZ_PURPLE }} />
                <p className="text-sm" style={{ color: theme.textM }}>No clients yet. Import from Inbox or add manually.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientDb.map(client => {
                  const clientProjects = getClientProjects(client)
                  const isExpanded = expandedClient === client.id
                  return (
                    <div key={client.id} className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                      <button onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                        className="w-full flex items-center gap-3 p-4 text-left">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${BIZ_PURPLE}15` }}>
                          <User size={16} style={{ color: BIZ_PURPLE }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm" style={{ color: theme.text }}>{client.artistName}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {client.email && <span className="text-[10px]" style={{ color: theme.textM }}>{client.email}</span>}
                            {client.instagram && <span className="text-[10px]" style={{ color: theme.textM }}>{client.instagram}</span>}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}>
                          {clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}
                        </span>
                        <ChevronRight size={14} style={{ color: theme.textM, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: theme.border }}>
                          <div className="pt-3 flex items-center gap-3 flex-wrap">
                            {client.phone && <span className="text-xs flex items-center gap-1" style={{ color: theme.textM }}><Phone size={11} />{client.phone}</span>}
                            {client.email && <span className="text-xs flex items-center gap-1" style={{ color: theme.textM }}><Mail size={11} />{client.email}</span>}
                            {client.instagram && <span className="text-xs flex items-center gap-1" style={{ color: theme.textM }}><Instagram size={11} />{client.instagram}</span>}
                          </div>
                          {clientProjects.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: theme.textM }}>Project History</p>
                              <div className="space-y-1.5">
                                {clientProjects.map(cp => {
                                  const cfg = STATUS_CONFIG[cp.status] || { label: cp.status, color: '#94A3B8' }
                                  return (
                                    <div key={cp.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ backgroundColor: theme.bg }}>
                                      <div>
                                        <p className="text-xs font-semibold" style={{ color: theme.text }}>{PROJECT_TYPES.find(t => t.value === cp.projectType)?.label || cp.projectType}</p>
                                        <p className="text-[10px]" style={{ color: theme.textM }}>{cp.createdAt}{cp.deadline ? ` · Due ${cp.deadline}` : ''}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {cp.quote > 0 && <span className="text-xs font-bold" style={{ color: '#10B981' }}>{fmt(cp.paid)}/{fmt(cp.quote)}</span>}
                                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => { setClientForm(client); setEditClientId(client.id); setShowClientForm(true) }}
                              className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}>Edit</button>
                            <button onClick={() => { persistClients(clientDb.filter(c => c.id !== client.id)); setExpandedClient(null) }}
                              className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: '#EF444415', color: '#EF4444' }}>Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
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
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textM }}>Submissions from orcafin.app/bizzyplug</p>
              <button onClick={loadSubmissions} disabled={loadingSubmissions}
                className="p-2 rounded-xl" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <RefreshCw size={14} className={loadingSubmissions ? 'animate-spin' : ''} style={{ color: theme.textM }} />
              </button>
            </div>
            {loadingSubmissions ? (
              <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <RefreshCw size={24} className="animate-spin mx-auto mb-3" style={{ color: BIZ_PURPLE }} />
                <p className="text-sm" style={{ color: theme.textM }}>Loading...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                <Inbox size={32} className="mx-auto mb-3 opacity-30" style={{ color: BIZ_PURPLE }} />
                <p className="text-sm" style={{ color: theme.textM }}>No submissions yet. Share orcafin.app/bizzyplug</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map(sub => (
                  <div key={sub.id} className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm" style={{ color: theme.text }}>{sub.artistName || sub.name}</h3>
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
                      {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
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

            {/* Hero Section */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BIZ_PURPLE }}>Hero Section</p>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Headline</label>
                <input className={inputCls} style={inputStyle} value={siteSettings.heroHeadline || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, heroHeadline: e.target.value }))} placeholder="Tired Of The AI Covers, Lets Get You Something Authentic" />
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Description</label>
                <textarea rows={3} value={siteSettings.bio || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, bio: e.target.value }))}
                  className={inputCls} style={{ ...inputStyle, resize: 'vertical' as any }} placeholder="Stand out with custom album covers, logos, flyers..." />
              </div>
            </div>

            {/* About Section */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BIZ_PURPLE }}>About Section</p>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>About Headline</label>
                <input className={inputCls} style={inputStyle} value={siteSettings.aboutHeadline || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, aboutHeadline: e.target.value }))} placeholder="Creativity. Culture. Branding That Hits." />
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>About Text</label>
                <textarea rows={3} value={siteSettings.aboutText || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, aboutText: e.target.value }))}
                  className={inputCls} style={{ ...inputStyle, resize: 'vertical' as any }} placeholder="Bizzyplug is more than a design studio..." />
              </div>
            </div>

            {/* Portfolio Photos */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BIZ_PURPLE }}>Portfolio Photos</p>
              {portfolioPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {portfolioPhotos.map(p => (
                    <div key={p.id} className="relative group rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                      <img src={p.url} alt={p.title} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                      <div className="absolute inset-0 flex items-end" style={{ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.8))' }}>
                        <div className="p-2 w-full flex items-end justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-white truncate">{p.title}</p>
                            <p className="text-[9px] capitalize" style={{ color: '#94A3B8' }}>{p.category.replace('-', ' ')}</p>
                          </div>
                          <button onClick={() => deletePortfolioPhoto(p.id)} className="p-1 rounded-lg shrink-0" style={{ backgroundColor: '#EF444440' }}>
                            <Trash2 size={11} style={{ color: '#EF4444' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} style={inputStyle} placeholder="Photo title (optional)" value={newPhotoTitle} onChange={e => setNewPhotoTitle(e.target.value)} />
                  <select className={inputCls} style={inputStyle} value={newPhotoCategory} onChange={e => setNewPhotoCategory(e.target.value)}>
                    <option value="album-covers">Album Covers</option>
                    <option value="logos">Logos</option>
                    <option value="flyers">Flyers</option>
                    <option value="websites">Websites</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <label className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold cursor-pointer" style={{ backgroundColor: `${BIZ_PURPLE}12`, color: BIZ_PURPLE, border: `1px dashed ${BIZ_PURPLE}40`, opacity: uploadingPortfolio ? 0.6 : 1 }}>
                  {uploadingPortfolio
                    ? <><RefreshCw size={14} className="animate-spin" /> Uploading {uploadProgress.current} of {uploadProgress.total}...</>
                    : <><Plus size={14} /> Upload Photos</>}
                  <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingPortfolio} onChange={e => { const files = e.target.files; if (files && files.length > 0) uploadPortfolioPhotos(Array.from(files)); e.target.value = '' }} />
                </label>
                {uploadingPortfolio && uploadProgress.total > 1 && (
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`, backgroundColor: BIZ_PURPLE }} />
                  </div>
                )}
                {uploadStatus && (
                  <p className="text-xs font-bold text-center py-1" style={{ color: uploadStatus.type === 'success' ? '#10B981' : '#EF4444' }}>
                    {uploadStatus.type === 'success' ? <CheckCircle size={12} className="inline mr-1" /> : null}
                    {uploadStatus.message}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Links */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BIZ_PURPLE }}>Payment Links</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Cash App</label>
                  <input className={inputCls} style={inputStyle} value={siteSettings.cashAppTag || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, cashAppTag: e.target.value }))} placeholder="$BizzyPlug" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>PayPal</label>
                  <input className={inputCls} style={inputStyle} value={siteSettings.paypalEmail || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, paypalEmail: e.target.value }))} placeholder="buzyplug@gmail.com" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Venmo</label>
                  <input className={inputCls} style={inputStyle} value={siteSettings.venmoHandle || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, venmoHandle: e.target.value }))} placeholder="@Buzyplug" />
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BIZ_PURPLE }}>Social Links</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Instagram URL</label>
                  <input className={inputCls} style={inputStyle} value={siteSettings.instagramUrl || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, instagramUrl: e.target.value }))} placeholder="https://instagram.com/bizzyplug" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Contact Email</label>
                  <input className={inputCls} style={inputStyle} value={siteSettings.contactEmail || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, contactEmail: e.target.value }))} placeholder="buzyplug@gmail.com" />
                </div>
              </div>
            </div>

            {/* Services & Pricing */}
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BIZ_PURPLE }}>Services & Pricing</p>
              <div className="space-y-2">
                {services.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                    {editingService === i ? (
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input className="px-2 py-1.5 rounded-lg border text-xs col-span-1" style={inputStyle} value={s.name} onChange={e => { const u = [...services]; u[i] = { ...u[i], name: e.target.value }; setServices(u) }} />
                        <input type="number" className="px-2 py-1.5 rounded-lg border text-xs" style={inputStyle} value={s.price} onChange={e => { const u = [...services]; u[i] = { ...u[i], price: Number(e.target.value) }; setServices(u) }} />
                        <button onClick={() => setEditingService(null)} className="px-2 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>Done</button>
                      </div>
                    ) : (
                      <>
                        <p className="flex-1 text-sm font-semibold" style={{ color: theme.text }}>{s.name}</p>
                        <span className="text-sm font-bold" style={{ color: BIZ_PURPLE }}>${s.price}</span>
                        <button onClick={() => setEditingService(i)} className="p-1 rounded-lg" style={{ color: theme.textM }}><Edit3 size={12} /></button>
                        <button onClick={() => setServices(services.filter((_, j) => j !== i))} className="p-1 rounded-lg" style={{ color: '#EF4444' }}><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="flex-1 px-3 py-2 rounded-xl border text-xs" style={inputStyle} placeholder="Service name" value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))} />
                <input type="number" className="w-20 px-3 py-2 rounded-xl border text-xs" style={inputStyle} placeholder="$" value={newService.price} onChange={e => setNewService(s => ({ ...s, price: e.target.value }))} />
                <button onClick={() => {
                  if (!newService.name || !newService.price) return
                  setServices([...services, { name: newService.name, price: Number(newService.price) }])
                  setNewService({ name: '', price: '' })
                }} className="px-3 py-2 rounded-xl text-xs font-bold shrink-0" style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}>
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <button onClick={saveSiteSettings}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: siteSaved ? '#10B981' : BIZ_PURPLE, color: '#fff' }}>
              {siteSaved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save & Publish</>}
            </button>
          </div>
        )}
      </div>

      {/* Project Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end" onClick={() => setShowForm(false)}>
            <motion.div initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="w-full border-t rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-xl" style={{ color: theme.text }}>{editId ? 'Edit Project' : 'New Project'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl" style={{ backgroundColor: theme.border }}><X size={16} style={{ color: theme.text }} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Artist / Brand *</label><input className={inputCls} style={inputStyle} placeholder="Artist name" value={form.artistName || ''} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} /></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Instagram</label><input className={inputCls} style={inputStyle} placeholder="@handle" value={form.instagram || ''} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} /></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Email</label><input className={inputCls} style={inputStyle} type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Phone</label><input className={inputCls} style={inputStyle} type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Service</label><select className={inputCls} style={inputStyle} value={form.projectType || 'custom-artwork'} onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))}>{PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Status</label><select className={inputCls} style={inputStyle} value={form.status || 'new-lead'} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Quote ($)</label><input className={inputCls} style={inputStyle} type="number" placeholder="0" value={form.quote || ''} onChange={e => setForm(f => ({ ...f, quote: Number(e.target.value) }))} /></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Paid ($)</label><input className={inputCls} style={inputStyle} type="number" placeholder="0" value={form.paid || ''} onChange={e => setForm(f => ({ ...f, paid: Number(e.target.value) }))} /></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Deadline</label><input className={inputCls} style={inputStyle} type="date" value={form.deadline || ''} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Payment Method</label><select className={inputCls} style={inputStyle} value={form.paymentMethod || ''} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}><option value="">Not paid</option><option value="cashapp">Cash App</option><option value="paypal">PayPal</option><option value="venmo">Venmo</option><option value="other">Other</option></select></div>
                <div className="sm:col-span-2"><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Song / Project Name</label><input className={inputCls} style={inputStyle} placeholder="Song or project name" value={form.songName || ''} onChange={e => setForm(f => ({ ...f, songName: e.target.value }))} /></div>
                <div className="sm:col-span-2"><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Details</label><textarea rows={3} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Project details..." value={form.details || ''} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} /></div>
                <div className="sm:col-span-2"><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Notes</label><textarea rows={2} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Internal notes..." value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <button onClick={handleSaveProject} disabled={!form.artistName}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50" style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>
                {editId ? '✓ Update' : '+ Save Project'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Add/Edit Modal */}
      <AnimatePresence>
        {showClientForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end" onClick={() => setShowClientForm(false)}>
            <motion.div initial={{ y: 120 }} animate={{ y: 0 }} exit={{ y: 120 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="w-full border-t rounded-t-3xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-xl" style={{ color: theme.text }}>{editClientId ? 'Edit Client' : 'Add Client'}</h2>
                <button onClick={() => setShowClientForm(false)} className="p-2 rounded-xl" style={{ backgroundColor: theme.border }}><X size={16} style={{ color: theme.text }} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Artist / Brand *</label><input className={inputCls} style={inputStyle} value={clientForm.artistName || ''} onChange={e => setClientForm(f => ({ ...f, artistName: e.target.value }))} /></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Instagram</label><input className={inputCls} style={inputStyle} value={clientForm.instagram || ''} onChange={e => setClientForm(f => ({ ...f, instagram: e.target.value }))} /></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Email</label><input className={inputCls} style={inputStyle} type="email" value={clientForm.email || ''} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Phone</label><input className={inputCls} style={inputStyle} type="tel" value={clientForm.phone || ''} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div className="sm:col-span-2"><label className="text-[10px] font-bold uppercase block mb-1" style={{ color: theme.textM }}>Notes</label><textarea rows={2} className={`${inputCls} resize-none`} style={inputStyle} value={clientForm.notes || ''} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} /></div>
              </div>
              <button onClick={() => {
                if (!clientForm.artistName) return
                if (editClientId) {
                  persistClients(clientDb.map(c => c.id === editClientId ? { ...c, ...clientForm } as BizClientProfile : c))
                } else {
                  persistClients([...clientDb, { id: gid(), ...clientForm, createdAt: new Date().toISOString().slice(0, 10) } as BizClientProfile])
                }
                setShowClientForm(false); setEditClientId(null); setClientForm({})
              }} disabled={!clientForm.artistName}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50" style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>
                {editClientId ? '✓ Update Client' : '+ Save Client'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
