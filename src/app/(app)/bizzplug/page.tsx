'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette, Plus, Trash2, Edit3, DollarSign, CheckCircle,
  Clock, X, Mail, Inbox, Globe, Instagram, Phone, User,
  ExternalLink, Save, Eye, Layers, RefreshCw, ChevronRight,
  FileText, Database, Send, Upload, Paperclip, ChevronUp, ChevronDown, Package, EyeOff, Eye as EyeIcon,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { fmt } from '@/lib/utils'
import { setLocalSynced } from '@/lib/syncLocal'
import { pullFromCloud } from '@/lib/syncEngine'

const BIZ_PURPLE = '#9333EA'
const BIZ_GOLD = '#F59E0B'

const THEME_PRESETS = [
  { id: 'dark-modern', name: 'Dark Modern', colors: { bg: '#09090b', bgCard: '#131316', purple: '#8B5CF6', white: '#F4F4F5' } },
  { id: 'light-clean', name: 'Light Clean', colors: { bg: '#FFFFFF', bgCard: '#F9FAFB', purple: '#7C3AED', white: '#111827' } },
  { id: 'dark-slate', name: 'Dark Slate', colors: { bg: '#0F172A', bgCard: '#1E293B', purple: '#6366F1', white: '#F1F5F9' } },
  { id: 'light-warm', name: 'Light Warm', colors: { bg: '#FFFBF5', bgCard: '#FFF7ED', purple: '#9333EA', white: '#1C1917' } },
  { id: 'dark-charcoal', name: 'Dark Charcoal', colors: { bg: '#171717', bgCard: '#1F1F1F', purple: '#A855F7', white: '#FAFAFA' } },
]

function gid() { return Math.random().toString(36).slice(2, 10) }
function fmtCat(s: string) { return s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }
function slugCat(s: string) { return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }

const DEFAULT_CATEGORIES = ['album-covers', 'logos', 'flyers', 'websites', 'other']

function compressImage(file: File, maxDim = 2000, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    if (file.size < 500_000) { resolve(file); return }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width <= maxDim && height <= maxDim && file.size < 3_000_000) { resolve(file); return }
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob && blob.size < file.size) {
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        } else { resolve(file) }
      }, 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

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

type DashTab = 'projects' | 'clients' | 'website' | 'delivery'

interface ReplyTemplate {
  id: string
  label: string
  text: string
}

const DEFAULT_REPLY_TEMPLATES: ReplyTemplate[] = [
  { id: 'complete', label: 'Design Complete', text: "Your design is complete and ready to download! Let me know if you need any adjustments or different file formats." },
  { id: 'revision', label: 'Revision Delivered', text: "Here's your revised design based on your feedback. Hope this is exactly what you had in mind! Reach out if anything needs tweaking." },
  { id: 'rush', label: 'Rush Order Done', text: "Your rush order is complete and delivered on time as promised! All files are ready to download. Thanks for trusting BizzyPlug with your project!" },
  { id: 'branding', label: 'Full Branding Package', text: "Your full branding package is complete! Logo, flyers, and social media assets are all included. Let me know if you need file formats adjusted or additional sizes." },
  { id: 'thanks', label: 'Thank You Note', text: "Thank you for your patience throughout this process! Your project is complete and ready for download. It was a pleasure working with you — I look forward to the next one!" },
  { id: 'followup', label: 'Follow-Up Check-In', text: "Just following up to make sure you received your files and everything looks good! Don't hesitate to reach out if you have any questions or need any revisions." },
  { id: 'payment', label: 'Payment Reminder', text: "Your design is ready to go! Please complete the remaining balance so I can send over your final files. Reach out if you have any questions about payment." },
]

const TEMPLATES_KEY = 'orca-bizzplug-reply-templates'

function DeliveryTab({ theme, clients, inputCls, inputStyle }: { theme: any; clients: BizClientProfile[]; inputCls: string; inputStyle: any }) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [deliverEmail, setDeliverEmail] = useState('')
  const [deliverMessage, setDeliverMessage] = useState('')
  const [deliverSubject, setDeliverSubject] = useState('')
  const [deliverFiles, setDeliverFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState('')
  const [showManageTemplates, setShowManageTemplates] = useState(false)
  const [newTplLabel, setNewTplLabel] = useState('')
  const [newTplText, setNewTplText] = useState('')
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editText, setEditText] = useState('')

  const [templates, setTemplates] = useState<ReplyTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(TEMPLATES_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return DEFAULT_REPLY_TEMPLATES
  })

  const client = clients.find(c => c.id === selectedClient)

  const saveTemplates = (updated: ReplyTemplate[]) => {
    setTemplates(updated)
    try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated)) } catch {}
  }

  const startEdit = (t: ReplyTemplate) => {
    setEditingId(t.id)
    setEditLabel(t.label)
    setEditText(t.text)
  }

  const saveEdit = () => {
    if (!editLabel.trim() || !editText.trim() || !editingId) return
    saveTemplates(templates.map(t => t.id === editingId ? { ...t, label: editLabel.trim(), text: editText.trim() } : t))
    setEditingId(null)
  }

  const cancelEdit = () => setEditingId(null)

  const deleteTemplate = (id: string) => {
    if (editingId === id) setEditingId(null)
    saveTemplates(templates.filter(t => t.id !== id))
  }

  const moveTemplate = (idx: number, dir: -1 | 1) => {
    const updated = [...templates]
    const target = idx + dir
    if (target < 0 || target >= updated.length) return
    ;[updated[idx], updated[target]] = [updated[target], updated[idx]]
    saveTemplates(updated)
  }

  const addTemplate = () => {
    if (!newTplLabel.trim() || !newTplText.trim()) return
    saveTemplates([...templates, { id: gid(), label: newTplLabel.trim(), text: newTplText.trim() }])
    setNewTplLabel('')
    setNewTplText('')
  }

  const resetToDefaults = () => {
    saveTemplates(DEFAULT_REPLY_TEMPLATES)
    setEditingId(null)
  }

  const applyTemplate = (id: string) => {
    const tpl = templates.find(t => t.id === id)
    if (tpl) { setDeliverMessage(tpl.text); setDeliverSubject(tpl.label) }
  }

  const handleDeliver = async () => {
    if (!deliverEmail || !client) return
    setSending(true)
    setSendError('')
    try {
      let downloadUrl: string | null = null
      if (deliverFiles.length > 0) {
        const serverRes = await fetch('https://api.gofile.io/servers')
        if (!serverRes.ok) throw new Error('Could not reach file hosting service.')
        const serverData = await serverRes.json()
        const servers = serverData?.data?.servers
        const server = Array.isArray(servers) ? servers[0]?.name : serverData?.data?.server
        if (!server) throw new Error('No upload server available.')
        let folderId: string | null = null
        for (const file of deliverFiles) {
          const fd = new FormData()
          fd.append('file', file)
          if (folderId) fd.append('folderId', folderId)
          const upRes = await fetch(`https://${server}.gofile.io/contents/uploadfile`, { method: 'POST', body: fd })
          const upData = await upRes.json()
          if (upData.status === 'ok') {
            if (!folderId) folderId = upData.data.parentFolder
            downloadUrl = upData.data.downloadPage
          }
        }
        if (!downloadUrl) throw new Error('File upload failed. Please try again.')
      }
      const res = await fetch('/api/bizzyplug/deliver', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: deliverEmail, clientName: client.artistName, message: deliverMessage, downloadUrl, subject: deliverSubject }),
      })
      if (res.ok) {
        setSent(true)
        setDeliverMessage('')
        setDeliverSubject('')
        setDeliverFiles([])
        setTimeout(() => setSent(false), 4000)
      } else {
        const d = await res.json()
        setSendError(d.error || 'Failed to send email. Check your Gmail settings.')
      }
    } catch (e: any) {
      setSendError(e.message || 'Network error. Please try again.')
    }
    setSending(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textM }}>Send completed work via Buzyplug@gmail.com</p>
      </div>

      {/* ── Reply Templates Manager ── */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <button
          onClick={() => setShowManageTemplates(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3"
          style={{ borderBottom: showManageTemplates ? `1px solid ${theme.border}` : 'none' }}>
          <div className="flex items-center gap-2">
            <FileText size={13} style={{ color: '#9333EA' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.text }}>Reply Templates</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#9333EA15', color: '#9333EA' }}>{templates.length}</span>
          </div>
          {showManageTemplates
            ? <ChevronUp size={14} style={{ color: theme.textM }} />
            : <ChevronDown size={14} style={{ color: theme.textM }} />}
        </button>

        {showManageTemplates && (
          <div className="p-4 space-y-3">

            {/* Template list */}
            <div className="space-y-2">
              {templates.map((t, idx) => (
                <div key={t.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${editingId === t.id ? '#9333EA' : theme.border}` }}>
                  {editingId === t.id ? (
                    /* ── Inline edit mode ── */
                    <div className="p-3 space-y-2" style={{ backgroundColor: '#9333EA08' }}>
                      <input
                        className={inputCls} style={{ ...inputStyle, fontSize: 12 }}
                        placeholder="Template name"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)} />
                      <textarea
                        rows={3} className={inputCls}
                        style={{ ...inputStyle, fontSize: 12, resize: 'vertical' as any }}
                        placeholder="Message text"
                        value={editText}
                        onChange={e => setEditText(e.target.value)} />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={!editLabel.trim() || !editText.trim()}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
                          style={{ backgroundColor: '#9333EA', color: '#fff' }}>
                          <Save size={11} /> Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-bold"
                          style={{ backgroundColor: theme.border, color: theme.textM }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal view mode ── */
                    <div className="flex items-center gap-2 px-3 py-2.5" style={{ backgroundColor: theme.bg }}>
                      {/* Reorder arrows */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          onClick={() => moveTemplate(idx, -1)}
                          disabled={idx === 0}
                          className="p-0.5 rounded disabled:opacity-20"
                          style={{ color: theme.textM }}>
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => moveTemplate(idx, 1)}
                          disabled={idx === templates.length - 1}
                          className="p-0.5 rounded disabled:opacity-20"
                          style={{ color: theme.textM }}>
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      {/* Label + preview */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: theme.text }}>{t.label}</p>
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: theme.textM }}>{t.text}</p>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(t)}
                          className="p-1.5 rounded-lg"
                          style={{ backgroundColor: `#9333EA12`, color: '#9333EA' }}
                          title="Edit">
                          <Edit3 size={11} />
                        </button>
                        <button
                          onClick={() => deleteTemplate(t.id)}
                          className="p-1.5 rounded-lg"
                          style={{ backgroundColor: '#EF444412', color: '#EF4444' }}
                          title="Delete">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {templates.length === 0 && (
                <p className="text-xs text-center py-3" style={{ color: theme.textM }}>No templates. Add one below or reset to defaults.</p>
              )}
            </div>

            {/* Reset + Add */}
            <div className="pt-2 border-t space-y-3" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9333EA' }}>Add New Template</p>
                <button
                  onClick={resetToDefaults}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg"
                  style={{ backgroundColor: theme.border, color: theme.textM }}>
                  Reset to Defaults
                </button>
              </div>
              <input
                className={inputCls} style={inputStyle}
                placeholder="Template name (e.g. Album Cover Done)"
                value={newTplLabel}
                onChange={e => setNewTplLabel(e.target.value)} />
              <textarea
                rows={2} className={inputCls}
                style={{ ...inputStyle, resize: 'vertical' as any }}
                placeholder="Message text..."
                value={newTplText}
                onChange={e => setNewTplText(e.target.value)} />
              <button
                onClick={addTemplate}
                disabled={!newTplLabel.trim() || !newTplText.trim()}
                className="w-full py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                style={{ backgroundColor: '#9333EA', color: '#fff' }}>
                + Save Template
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Select Client ── */}
      <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9333EA' }}>Select Client</p>
        {clients.length === 0 ? (
          <p className="text-sm" style={{ color: theme.textM }}>No clients yet. Clients are auto-added when projects are created.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {clients.map(c => (
              <button key={c.id} onClick={() => { setSelectedClient(c.id); setDeliverEmail(c.email || '') }}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center justify-between"
                style={{ backgroundColor: selectedClient === c.id ? '#9333EA15' : theme.bg, border: `1px solid ${selectedClient === c.id ? '#9333EA' : theme.border}`, color: theme.text }}>
                <div>
                  <span className="font-semibold">{c.artistName}</span>
                  {c.instagram && <span className="text-xs ml-2" style={{ color: theme.textM }}>{c.instagram}</span>}
                </div>
                {c.email && <span className="text-[10px]" style={{ color: theme.textM }}>{c.email}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Compose & Send ── */}
      {selectedClient && client && (
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9333EA' }}>Deliver to {client.artistName}</p>

          <div>
            <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Client Email</label>
            <input className={inputCls} style={inputStyle} value={deliverEmail} onChange={e => setDeliverEmail(e.target.value)} placeholder="client@email.com" />
          </div>

          {/* Quick Reply Dropdown */}
          <div>
            <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Quick Reply Template</label>
            <select
              className={inputCls}
              style={inputStyle}
              value=""
              onChange={e => { if (e.target.value) applyTemplate(e.target.value) }}>
              <option value="">— Select a template to fill message —</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold" style={{ color: theme.textM }}>Message</label>
              {deliverMessage && (
                <button onClick={() => { setDeliverMessage(''); setDeliverSubject('') }} className="text-[10px]" style={{ color: theme.textM }}>Clear</button>
              )}
            </div>
            <textarea
              rows={4}
              className={inputCls}
              style={{ ...inputStyle, resize: 'vertical' as any }}
              value={deliverMessage}
              onChange={e => setDeliverMessage(e.target.value)}
              placeholder="Select a template above or write a custom message..." />
          </div>

          <div>
            <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Upload Artwork Files</label>
            <label className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold cursor-pointer" style={{ backgroundColor: '#9333EA12', color: '#9333EA', border: '1px dashed #9333EA40' }}>
              <Upload size={14} /> {deliverFiles.length > 0 ? `${deliverFiles.length} file${deliverFiles.length > 1 ? 's' : ''} ready` : 'Choose files to send'}
              <input type="file" accept="image/*,video/*,.pdf,.psd,.ai,.zip" multiple className="hidden" onChange={e => { if (e.target.files) setDeliverFiles(Array.from(e.target.files)) }} />
            </label>
            {deliverFiles.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {deliverFiles.map((f, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-lg flex items-center gap-1" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, color: theme.textM }}>
                    <Paperclip size={10} /> {f.name.length > 18 ? f.name.slice(0, 15) + '...' : f.name}
                    <button onClick={() => setDeliverFiles(deliverFiles.filter((_, j) => j !== i))} style={{ color: '#EF4444' }}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-[9px]" style={{ color: theme.textM }}>Email will include artwork download links + a "Thank you for shopping with BizzyPlug" message with a link to leave a review.</p>

          {sendError && (
            <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ backgroundColor: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}>
              {sendError}
            </div>
          )}

          <button onClick={handleDeliver} disabled={sending || !deliverEmail}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ backgroundColor: sent ? '#10B981' : '#9333EA', color: '#fff', opacity: sending ? 0.6 : 1 }}>
            {sent ? <><CheckCircle size={16} /> Delivered!</> : sending ? 'Sending...' : <><Send size={16} /> Send to Client</>}
          </button>
        </div>
      )}
    </div>
  )
}

export default function BizzyPlugPage() {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<DashTab>('projects')
  const [projects, setProjects] = useState<BizProject[]>([])
  const [clientDb, setClientDb] = useState<BizClientProfile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<BizProject>>(BLANK_PROJECT())
  const [selectedClientId, setSelectedClientId] = useState('')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('new-lead')
  const [submissions, setSubmissions] = useState<BizSubmission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [services, setServices] = useState<BizService[]>(DEFAULT_SERVICES)
  const [siteSettings, setSiteSettings] = useState<any>({
    bio: 'Custom artwork, logos, album covers, flyers, and more. Professional designs delivered fast.',
    cashAppTag: '$BizzyPlug', paypalEmail: 'buzyplug@gmail.com', venmoHandle: '@Buzyplug',
  })
  const [editingService, setEditingService] = useState<number | null>(null)
  const [websiteSection, setWebsiteSection] = useState<string | null>('theme')
  const [newService, setNewService] = useState({ name: '', price: '' })
  const [siteSaved, setSiteSaved] = useState(false)
  const [showClientForm, setShowClientForm] = useState(false)
  const [editClientId, setEditClientId] = useState<string | null>(null)
  const [clientForm, setClientForm] = useState<Partial<BizClientProfile>>({})
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [portfolioPhotos, setPortfolioPhotos] = useState<{ id: string; url: string; title: string; category: string }[]>([])
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [newPhotoTitle, setNewPhotoTitle] = useState('')
  const [newPhotoCategory, setNewPhotoCategory] = useState('album-covers')
  const [portfolioCategories, setPortfolioCategories] = useState<string[]>(DEFAULT_CATEGORIES)
  const [adminPortfolioFilter, setAdminPortfolioFilter] = useState('all')
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null)
  const [editPhotoTitle, setEditPhotoTitle] = useState('')
  const [editPhotoCategory, setEditPhotoCategory] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [showCatManager, setShowCatManager] = useState(false)
  const [rolloutPackages, setRolloutPackages] = useState<any[]>([
    { id: 'artist', label: 'Artists', tiers: [
      { id: 'a1', name: 'Starter Rollout', price: 225, period: '/mo', campaigns: 1, description: 'One full song or campaign rollout per month.', badge: '', active: true, salePrice: null, services: ['Custom Cover Artwork','Instagram Promo Ad','Booking Ad / Promo Flyer','Motion Cover','45-Second Lyric Video','T-Shirt Merch Design','Monthly Release Gameplan'], extras: [] },
      { id: 'a2', name: 'Momentum Rollout', price: 450, period: '/mo', campaigns: 2, description: 'Two rollouts per month.', badge: 'Best Value', active: true, salePrice: null, services: ['Custom Cover Artwork','Instagram Promo Ad','Booking Ad / Promo Flyer','Motion Cover','45-Second Lyric Video','T-Shirt Merch Design','Monthly Release Gameplan'], extras: [] },
      { id: 'a3', name: 'Campaign Rollout', price: 899, period: '/mo', campaigns: 4, description: 'Four full rollouts plus a landing page.', badge: 'Full Package', active: true, salePrice: null, services: ['Custom Cover Artwork','Instagram Promo Ad','Booking Ad / Promo Flyer','Motion Cover','45-Second Lyric Video','T-Shirt Merch Design','Monthly Release Gameplan'], extras: ['Landing Page Website'] },
    ]},
    { id: 'promoter', label: 'Promoters', tiers: [
      { id: 'p1', name: 'Starter Promo', price: 199, period: '/mo', campaigns: 1, description: 'One event campaign per month.', badge: '', active: true, salePrice: null, services: ['Custom Event Flyer','Instagram Promo Ad','Story Promo Ad','Motion Flyer','Event Posting Blueprint'], extras: [] },
      { id: 'p2', name: 'Momentum Promo', price: 399, period: '/mo', campaigns: 2, description: 'Two event campaigns per month.', badge: 'Best Value', active: true, salePrice: null, services: ['Custom Event Flyer','Instagram Promo Ad','Story Promo Ad','Motion Flyer','Event Posting Blueprint'], extras: [] },
      { id: 'p3', name: 'Full Promo', price: 749, period: '/mo', campaigns: 4, description: 'Four event campaigns plus a landing page.', badge: 'Full Package', active: true, salePrice: null, services: ['Custom Event Flyer','Instagram Promo Ad','Story Promo Ad','Motion Flyer','Event Posting Blueprint'], extras: ['Landing Page Website'] },
    ]},
  ])
  const [sectionOrder, setSectionOrder] = useState<string[]>(['booking', 'portfolio', 'rollout', 'testimonials'])
  const [hiddenSections, setHiddenSections] = useState<string[]>([])

  const loadPortfolio = useCallback(async () => {
    try {
      const res = await fetch('/api/bizzyplug/photos')
      if (res.ok) {
        const d = await res.json()
        const photos = d.photos || []
        setPortfolioPhotos(photos)
        try { localStorage.setItem('orca-bizzplug-portfolio-photos', JSON.stringify(photos)) } catch {}
      }
    } catch {}
  }, [])

  const uploadPortfolioPhotos = async (files: File[]) => {
    setUploadingPortfolio(true)
    setUploadStatus(null)
    setUploadProgress({ current: 0, total: files.length })
    const uploadedPhotos: any[] = []
    let failed = 0

    for (let i = 0; i < files.length; i++) {
      setUploadProgress({ current: i + 1, total: files.length })
      const raw = files[i]
      const file = await compressImage(raw)
      const title = newPhotoTitle
        ? (files.length > 1 ? `${newPhotoTitle} ${i + 1}` : newPhotoTitle)
        : raw.name.replace(/\.[^.]+$/, '')
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('title', title)
        fd.append('category', newPhotoCategory)
        fd.append('skipDb', 'true')
        const res = await fetch('/api/bizzyplug/photos', { method: 'POST', body: fd })
        if (res.ok) { const d = await res.json(); if (d.photo) uploadedPhotos.push(d.photo) }
        else failed++
      } catch { failed++ }
    }

    if (uploadedPhotos.length > 0) {
      try {
        await fetch('/api/bizzyplug/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photos: uploadedPhotos }) })
      } catch { failed += uploadedPhotos.length; uploadedPhotos.length = 0 }
    }

    await loadPortfolio()
    setNewPhotoTitle('')
    setUploadingPortfolio(false)
    setUploadProgress({ current: 0, total: 0 })

    const succeeded = uploadedPhotos.length
    if (failed === 0 && succeeded > 0) {
      setUploadStatus({ type: 'success', message: `${succeeded} photo${succeeded !== 1 ? 's' : ''} uploaded` })
    } else if (succeeded > 0) {
      setUploadStatus({ type: 'error', message: `${succeeded} uploaded, ${failed} failed` })
    } else {
      setUploadStatus({ type: 'error', message: 'Upload failed' })
    }
    setTimeout(() => setUploadStatus(null), 3000)
  }

  const deletePortfolioPhoto = async (id: string) => {
    try {
      await fetch('/api/bizzyplug/photos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      setPortfolioPhotos(p => { const updated = p.filter(x => x.id !== id); try { localStorage.setItem('orca-bizzplug-portfolio-photos', JSON.stringify(updated)) } catch {}; return updated })
    } catch {}
  }

  const purgeAllPhotos = async () => {
    try {
      const res = await fetch('/api/bizzyplug/photos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purgeAll: true }) })
      if (res.ok) { setPortfolioPhotos([]); setUploadStatus({ type: 'success', message: 'All photos cleared' }); setTimeout(() => setUploadStatus(null), 3000) }
    } catch {}
    try { localStorage.removeItem('orca-bizzplug-portfolio-photos') } catch {}
  }

  const updatePhoto = async (id: string, updates: { title?: string; category?: string; file?: File }) => {
    const fd = new FormData()
    fd.append('id', id)
    if (updates.title !== undefined) fd.append('title', updates.title)
    if (updates.category !== undefined) fd.append('category', updates.category)
    if (updates.file) fd.append('file', updates.file)
    try {
      const res = await fetch('/api/bizzyplug/photos', { method: 'PATCH', body: fd })
      if (res.ok) await loadPortfolio()
    } catch {}
    setEditingPhotoId(null)
  }

  const startEditPhoto = (p: { id: string; title: string; category: string }) => {
    setEditingPhotoId(p.id); setEditPhotoTitle(p.title); setEditPhotoCategory(p.category)
  }

  const filteredAdminPhotos = adminPortfolioFilter === 'all' ? portfolioPhotos : portfolioPhotos.filter(p => p.category === adminPortfolioFilter)

  useEffect(() => {
    try { const s = localStorage.getItem('orca-bizzplug-clients'); if (s) setProjects(JSON.parse(s)) } catch {}
    try { const c = localStorage.getItem('orca-bizzplug-client-db'); if (c) setClientDb(JSON.parse(c)) } catch {}
    try { const p = localStorage.getItem('orca-bizzplug-portfolio-photos'); if (p) setPortfolioPhotos(JSON.parse(p)) } catch {}
    try {
      const ss = localStorage.getItem('orca-bizzplug-site-settings')
      if (ss) {
        const parsed = JSON.parse(ss)
        if (parsed.services?.length > 0) setServices(parsed.services)
        if (parsed.portfolioCategories?.length > 0) setPortfolioCategories(parsed.portfolioCategories)
        if (parsed.rolloutPackages?.length > 0) setRolloutPackages(parsed.rolloutPackages)
        if (parsed.sectionOrder?.length > 0) setSectionOrder(parsed.sectionOrder)
        if (parsed.hiddenSections) setHiddenSections(parsed.hiddenSections)
        setSiteSettings((s: any) => ({ ...s, ...parsed }))
      }
    } catch {}
    // Fetch fresh from Supabase directly — bypasses the timestamp-merge issue where
    // pullFromCloud keeps stale local data when the server wrote new leads without a client timestamp.
    fetch('/api/bizzyplug/projects')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.projects && Array.isArray(d.projects)) {
          setProjects(d.projects)
          try { localStorage.setItem('orca-bizzplug-clients', JSON.stringify(d.projects)) } catch {}
        }
        if (d?.clientDb && Array.isArray(d.clientDb)) {
          setClientDb(d.clientDb)
          try { localStorage.setItem('orca-bizzplug-client-db', JSON.stringify(d.clientDb)) } catch {}
        }
      })
      .catch(() => {
        // Fallback to cloud sync if API unavailable
        pullFromCloud().then(() => {
          try { const s = localStorage.getItem('orca-bizzplug-clients'); if (s) setProjects(JSON.parse(s)) } catch {}
          try { const c = localStorage.getItem('orca-bizzplug-client-db'); if (c) setClientDb(JSON.parse(c)) } catch {}
        }).catch(() => {})
      })
  }, [])

  const persistProjects = (updated: BizProject[]) => {
    setProjects(updated)
    try { setLocalSynced('orca-bizzplug-clients', JSON.stringify(updated)) } catch {}
    // Immediately write to Supabase so status changes and deletions survive page reload
    fetch('/api/bizzyplug/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects: updated }),
    }).catch(() => {})
  }

  const persistClients = (updated: BizClientProfile[]) => {
    setClientDb(updated)
    try { setLocalSynced('orca-bizzplug-client-db', JSON.stringify(updated)) } catch {}
    fetch('/api/bizzyplug/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientDb: updated }),
    }).catch(() => {})
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

  useEffect(() => { loadPortfolio() }, [loadPortfolio])
  useEffect(() => { if (activeTab === 'website') loadPortfolio() }, [activeTab, loadPortfolio])

  const saveSiteSettings = async () => {
    const payload = { ...siteSettings, services, portfolioCategories, rolloutPackages, sectionOrder, hiddenSections }
    try { setLocalSynced('orca-bizzplug-site-settings', JSON.stringify(payload)) } catch {}
    try { await fetch('/api/bizzyplug/site-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) } catch {}
    setSiteSaved(true)
    setTimeout(() => setSiteSaved(false), 2000)
  }

  const visible = filterStatus === 'all' ? projects : projects.filter(p => p.status === filterStatus)
  const totalRevenue = projects.reduce((s, p) => s + (p.paid || 0), 0)
  const newLeadCount = projects.filter(p => p.status === 'new-lead').length
  const completedCount = projects.filter(p => p.status === 'completed').length

  const getClientProjects = (client: BizClientProfile) => {
    const key = (client.email || client.artistName).toLowerCase()
    return projects.filter(p => (p.email || p.artistName).toLowerCase() === key)
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
  const inputStyle = { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }

  function accHead(id: string, label: string, Ic: any) {
    const open = websiteSection === id
    return (
      <button key={'acc-' + id} onClick={() => setWebsiteSection(open ? null : id)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
        style={{ backgroundColor: open ? BIZ_PURPLE + '12' : theme.card, border: '1px solid ' + (open ? BIZ_PURPLE + '40' : theme.border) }}>
        <div className="flex items-center gap-2">
          <Ic size={14} style={{ color: BIZ_PURPLE }} />
          <span className="text-xs font-bold" style={{ color: theme.text }}>{label}</span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: BIZ_PURPLE }} /> : <ChevronDown size={14} style={{ color: theme.textM }} />}
      </button>
    )
  }

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
            <button onClick={() => { setForm(BLANK_PROJECT()); setEditId(null); setSelectedClientId(''); setShowForm(true) }}
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
            { key: 'website' as DashTab, label: 'Website', icon: Globe },
            { key: 'delivery' as DashTab, label: 'Deliver', icon: Send },
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
                      className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
                      <button onClick={() => setExpandedProject(expandedProject === p.id ? null : p.id)} className="w-full p-4 text-left">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0 mr-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm" style={{ color: theme.text }}>{p.artistName}</h3>
                              <button onClick={e => { e.stopPropagation(); persistProjects(projects.map(x => x.id === p.id ? { ...x, status: x.status === 'completed' ? 'new-lead' : 'completed' } : x)) }}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold transition-all"
                                style={{ backgroundColor: `${cfg.color}18`, color: cfg.color, border: 'none', cursor: 'pointer' }}>
                                {cfg.label}
                              </button>
                              {(p as any).paymentStatus === 'paid' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: '#10B98118', color: '#10B981' }}>Paid</span>}
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: theme.textM }}>
                              {PROJECT_TYPES.find(t => t.value === p.projectType)?.label || p.projectType}
                              {p.deadline ? ` · Due ${p.deadline}` : ''}
                            </p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {p.email && <span className="text-[10px] flex items-center gap-1" style={{ color: theme.textM }}><Mail size={10} />{p.email}</span>}
                              {p.instagram && <span className="text-[10px] flex items-center gap-1" style={{ color: theme.textM }}><Instagram size={10} />{p.instagram}</span>}
                              {p.phone && <span className="text-[10px] flex items-center gap-1" style={{ color: theme.textM }}><Phone size={10} />{p.phone}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <ChevronDown size={14} style={{ color: theme.textM, transform: expandedProject === p.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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
                      </button>
                      {expandedProject === p.id && (
                        <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                          <div className="flex items-center gap-1 pt-3 flex-wrap">
                            {p.status === 'new-lead' ? (
                              <button
                                onClick={() => { persistProjects(projects.map(x => x.id === p.id ? { ...x, status: 'completed' as ProjectStatus } : x)); setExpandedProject(null) }}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                                style={{ backgroundColor: '#10B98118', color: '#10B981' }}>
                                <CheckCircle size={11} />Mark Complete
                              </button>
                            ) : (
                              <button
                                onClick={() => { persistProjects(projects.map(x => x.id === p.id ? { ...x, status: 'new-lead' as ProjectStatus } : x)); setExpandedProject(null) }}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                                style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}>
                                Move to Active
                              </button>
                            )}
                            <button onClick={() => handleEdit(p)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}><Edit3 size={11} className="inline mr-1" />Edit</button>
                            <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: '#EF444418', color: '#EF4444' }}><Trash2 size={11} className="inline mr-1" />Delete</button>
                          </div>

                          {p.songName && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: theme.textS || theme.textM }}>Song / Project</p>
                              <p className="text-xs" style={{ color: theme.text }}>{p.songName}</p>
                            </div>
                          )}

                          {p.details && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: theme.textS || theme.textM }}>Project Details</p>
                              <p className="text-xs whitespace-pre-wrap" style={{ color: theme.text }}>{p.details}</p>
                            </div>
                          )}

                          {p.notes && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: theme.textS || theme.textM }}>Notes</p>
                              <p className="text-xs whitespace-pre-wrap" style={{ color: theme.text }}>{p.notes}</p>
                            </div>
                          )}

                          {(p as any).serviceDescriptions && Object.keys((p as any).serviceDescriptions).length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: theme.textS || theme.textM }}>Service Details</p>
                              <div className="space-y-1.5">
                                {Object.entries((p as any).serviceDescriptions).map(([key, val]) => (
                                  <div key={key} className="rounded-lg px-3 py-2" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                                    <p className="text-[10px] font-bold" style={{ color: BIZ_PURPLE }}>{key.includes('::') ? key.split('::').join(' — ') : key}</p>
                                    <p className="text-xs mt-0.5" style={{ color: theme.text }}>{val as string}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(p as any).referenceUrls && (p as any).referenceUrls.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: theme.textS || theme.textM }}>Uploaded Files ({(p as any).referenceUrls.length})</p>
                              <div className="grid grid-cols-3 gap-2">
                                {(p as any).referenceUrls.map((url: string, idx: number) => (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                                    <img src={url} alt={`Reference ${idx + 1}`} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {(p as any).paymentMethod && (
                            <div className="flex items-center gap-2 text-[10px]" style={{ color: theme.textM }}>
                              <DollarSign size={10} />
                              <span>Payment: <span className="font-bold" style={{ color: '#10B981' }}>{(p as any).paymentMethod}</span></span>
                              {(p as any).paidDate && <span>· {new Date((p as any).paidDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                            </div>
                          )}

                          <p className="text-[9px]" style={{ color: theme.textM }}>Created {p.createdAt}</p>
                        </div>
                      )}
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


        {/* ── WEBSITE TAB ── */}
        {activeTab === 'website' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textM }}>Manage orcafin.app/bizzyplug</p>
              <a href="/bizzyplug" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE, border: `1px solid ${BIZ_PURPLE}30` }}>
                <Eye size={12} /> Preview
              </a>
            </div>

            {/* Theme & Branding */}
            {accHead('theme', 'Theme & Branding', Palette)}
            {websiteSection === 'theme' && (
            <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>

              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold block" style={{ color: theme.textM }}>Logo</label>
                {siteSettings.logoUrl && (
                  <div className="flex items-center gap-3">
                    <img src={siteSettings.logoUrl} alt="Logo" style={{ height: 40, objectFit: 'contain', borderRadius: 6, border: `1px solid ${theme.border}` }} />
                    <button onClick={() => setSiteSettings((s: any) => ({ ...s, logoUrl: '' }))}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: '#EF444415', color: '#EF4444' }}>
                      Remove Logo
                    </button>
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold cursor-pointer"
                  style={{ backgroundColor: `${BIZ_PURPLE}12`, color: BIZ_PURPLE, border: `1px dashed ${BIZ_PURPLE}40` }}>
                  <Upload size={14} /> {siteSettings.logoUrl ? 'Change Logo' : 'Upload Logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const fd = new FormData()
                    fd.append('file', file)
                    fd.append('title', `bizzyplug-logo-${Date.now()}`)
                    fd.append('category', 'branding')
                    fd.append('skipDb', 'true')
                    try {
                      const res = await fetch('/api/bizzyplug/photos', { method: 'POST', body: fd })
                      if (res.ok) {
                        const d = await res.json()
                        if (d.photo?.url) setSiteSettings((s: any) => ({ ...s, logoUrl: d.photo.url }))
                      }
                    } catch {}
                    e.target.value = ''
                  }} />
                </label>
              </div>

              {/* Theme Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold block" style={{ color: theme.textM }}>Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {THEME_PRESETS.map(preset => {
                    const isActive = (siteSettings.activeTheme || 'dark-modern') === preset.id
                    return (
                      <button key={preset.id} onClick={() => setSiteSettings((s: any) => ({ ...s, activeTheme: preset.id }))}
                        className="rounded-xl p-3 text-left relative"
                        style={{
                          backgroundColor: theme.bg,
                          border: isActive ? `2px solid ${BIZ_PURPLE}` : `1px solid ${theme.border}`,
                        }}>
                        {isActive && (
                          <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>Active</span>
                        )}
                        <p className="text-xs font-bold mb-2" style={{ color: theme.text }}>{preset.name}</p>
                        <div className="flex gap-1.5">
                          {[preset.colors.bg, preset.colors.purple, preset.colors.white, preset.colors.bgCard].map((c, i) => (
                            <div key={i} style={{
                              width: 18, height: 18, borderRadius: '50%', backgroundColor: c,
                              border: `1px solid ${theme.border}`,
                            }} />
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Glow & Effects */}
              <div className="space-y-3">
                <label className="text-[10px] font-semibold block" style={{ color: theme.textM }}>Effects</label>
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                  <span className="text-xs font-semibold" style={{ color: theme.text }}>Glow Effects</span>
                  <button onClick={() => setSiteSettings((s: any) => ({ ...s, glowEnabled: !s.glowEnabled }))}
                    className="relative w-10 h-5 rounded-full transition-colors"
                    style={{ backgroundColor: siteSettings.glowEnabled ? BIZ_PURPLE : theme.border }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                      style={{ left: siteSettings.glowEnabled ? 22 : 2 }} />
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Background Style</label>
                  <select className={inputCls} style={inputStyle} value={siteSettings.gradientStyle || 'radial'}
                    onChange={e => setSiteSettings((s: any) => ({ ...s, gradientStyle: e.target.value }))}>
                    <option value="radial">Radial Gradient</option>
                    <option value="linear">Linear Gradient</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>
            </div>
            )}

            {/* Hero Section */}
            {accHead('hero', 'Hero & Content', FileText)}
            {websiteSection === 'hero' && (
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Headline</label>
                <input className={inputCls} style={inputStyle} value={siteSettings.heroHeadline || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, heroHeadline: e.target.value }))} placeholder="Tired Of The AI Covers, Lets Get You Something Authentic" />
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Sub-headline</label>
                <input className={inputCls} style={inputStyle} value={siteSettings.heroSubheadline || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, heroSubheadline: e.target.value }))} placeholder="PREMIUM DESIGN. REAL IMPACT." />
              </div>
              <div>
                <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Description</label>
                <textarea rows={3} value={siteSettings.bio || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, bio: e.target.value }))}
                  className={inputCls} style={{ ...inputStyle, resize: 'vertical' as any }} placeholder="Stand out with custom album covers, logos, flyers..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Primary CTA Text</label>
                  <input className={inputCls} style={inputStyle} value={siteSettings.ctaText || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, ctaText: e.target.value }))} placeholder="BOOK A DESIGN" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold block mb-1" style={{ color: theme.textM }}>Secondary CTA Text</label>
                  <input className={inputCls} style={inputStyle} value={siteSettings.ctaSecondaryText || ''} onChange={e => setSiteSettings((s: any) => ({ ...s, ctaSecondaryText: e.target.value }))} placeholder="VIEW PORTFOLIO" />
                </div>
              </div>
            </div>
            )}

            {/* About Section — merged into Hero */}
            {accHead('about', 'About Section', User)}
            {websiteSection === 'about' && (
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
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
            )}

            {/* Portfolio Photos */}
            {accHead('portfolio', `Portfolio Photos (${portfolioPhotos.length}/40)`, Layers)}
            {websiteSection === 'portfolio' && (
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BIZ_PURPLE }}>Portfolio Photos ({portfolioPhotos.length}/40)</p>
                <div className="flex gap-1.5">
                  {portfolioPhotos.length > 0 && (
                    <button onClick={() => { if (confirm('Delete ALL portfolio photos?')) purgeAllPhotos() }} className="text-[10px] font-bold px-2 py-1 rounded-lg"
                      style={{ backgroundColor: '#EF444415', color: '#EF4444' }}>
                      Clear All
                    </button>
                  )}
                  <button onClick={() => setShowCatManager(!showCatManager)} className="text-[10px] font-bold px-2 py-1 rounded-lg"
                    style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}>
                    {showCatManager ? 'Done' : 'Manage Categories'}
                  </button>
                </div>
              </div>

              {showCatManager && (
                <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                  <div className="flex flex-wrap gap-2">
                    {portfolioCategories.map(cat => (
                      <div key={cat} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}>
                        {fmtCat(cat)}
                        <button onClick={() => setPortfolioCategories(c => c.filter(x => x !== cat))} className="ml-0.5" style={{ color: '#EF4444' }}><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input className={inputCls} style={{ ...inputStyle, fontSize: 11 }} placeholder="New category name" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newCatName.trim()) { const slug = slugCat(newCatName); if (slug && !portfolioCategories.includes(slug)) { setPortfolioCategories(c => [...c, slug]); setNewCatName('') } } }} />
                    <button onClick={() => { const slug = slugCat(newCatName); if (slug && !portfolioCategories.includes(slug)) { setPortfolioCategories(c => [...c, slug]); setNewCatName('') } }}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold shrink-0" style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>+ Add</button>
                  </div>
                </div>
              )}

              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setAdminPortfolioFilter('all')}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: adminPortfolioFilter === 'all' ? BIZ_PURPLE : theme.bg, color: adminPortfolioFilter === 'all' ? '#fff' : theme.textM, border: `1px solid ${adminPortfolioFilter === 'all' ? BIZ_PURPLE : theme.border}` }}>
                  All ({portfolioPhotos.length})
                </button>
                {portfolioCategories.map(cat => {
                  const count = portfolioPhotos.filter(p => p.category === cat).length
                  return (
                    <button key={cat} onClick={() => setAdminPortfolioFilter(cat)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: adminPortfolioFilter === cat ? BIZ_PURPLE : theme.bg, color: adminPortfolioFilter === cat ? '#fff' : theme.textM, border: `1px solid ${adminPortfolioFilter === cat ? BIZ_PURPLE : theme.border}` }}>
                      {fmtCat(cat)} ({count})
                    </button>
                  )
                })}
              </div>

              {filteredAdminPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredAdminPhotos.map(p => (
                    <div key={p.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                      <div className="relative">
                        <img src={p.url} alt={p.title} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                        <div className="absolute inset-0 flex items-end" style={{ background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.8))' }}>
                          <div className="p-2 w-full flex items-end justify-between">
                            <div className="min-w-0 flex-1 mr-1">
                              <p className="text-[10px] font-bold text-white truncate">{p.title}</p>
                              <p className="text-[9px]" style={{ color: '#94A3B8' }}>{fmtCat(p.category)}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => startEditPhoto(p)} className="p-1 rounded-lg" style={{ backgroundColor: `${BIZ_PURPLE}60` }}>
                                <Edit3 size={10} style={{ color: '#fff' }} />
                              </button>
                              <label className="p-1 rounded-lg cursor-pointer" style={{ backgroundColor: '#3B82F640' }}>
                                <RefreshCw size={10} style={{ color: '#93C5FD' }} />
                                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) updatePhoto(p.id, { file: f }); e.target.value = '' }} />
                              </label>
                              <button onClick={() => deletePortfolioPhoto(p.id)} className="p-1 rounded-lg" style={{ backgroundColor: '#EF444440' }}>
                                <Trash2 size={10} style={{ color: '#EF4444' }} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      {editingPhotoId === p.id && (
                        <div className="p-2 space-y-1.5" style={{ backgroundColor: theme.bg }}>
                          <input className={inputCls} style={{ ...inputStyle, fontSize: 11, padding: '6px 8px' }} value={editPhotoTitle} onChange={e => setEditPhotoTitle(e.target.value)} placeholder="Title" />
                          <select className={inputCls} style={{ ...inputStyle, fontSize: 11, padding: '6px 8px' }} value={editPhotoCategory} onChange={e => setEditPhotoCategory(e.target.value)}>
                            {portfolioCategories.map(c => <option key={c} value={c}>{fmtCat(c)}</option>)}
                          </select>
                          <div className="flex gap-1.5">
                            <button onClick={() => updatePhoto(p.id, { title: editPhotoTitle, category: editPhotoCategory })}
                              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>Save</button>
                            <button onClick={() => setEditingPhotoId(null)}
                              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: theme.border, color: theme.textM }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} style={inputStyle} placeholder="Photo title (optional)" value={newPhotoTitle} onChange={e => setNewPhotoTitle(e.target.value)} />
                  <select className={inputCls} style={inputStyle} value={newPhotoCategory} onChange={e => setNewPhotoCategory(e.target.value)}>
                    {portfolioCategories.map(c => <option key={c} value={c}>{fmtCat(c)}</option>)}
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

            )}

            {/* Payment & Social Links */}
            {accHead('links', 'Payment & Social Links', ExternalLink)}
            {websiteSection === 'links' && (
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

              <p className="text-[10px] font-bold uppercase tracking-wider mt-4" style={{ color: BIZ_PURPLE }}>Social & Contact</p>
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
            )}

            {/* Services & Pricing */}
            {accHead('services', `Services & Pricing (${services.length})`, DollarSign)}
            {websiteSection === 'services' && (
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="space-y-2">
                {services.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}` }}>
                    {editingService === i ? (
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input className="px-2 py-1.5 rounded-lg border text-xs" style={inputStyle} placeholder="Name" value={s.name} onChange={e => { const u = [...services]; u[i] = { ...u[i], name: e.target.value }; setServices(u) }} />
                          <input type="number" className="px-2 py-1.5 rounded-lg border text-xs" style={inputStyle} placeholder="Price" value={s.price} onChange={e => { const u = [...services]; u[i] = { ...u[i], price: Number(e.target.value) }; setServices(u) }} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select className="px-2 py-1.5 rounded-lg border text-xs" style={inputStyle} value={(s as any).tag || ''} onChange={e => { const u = [...services]; u[i] = { ...u[i], tag: e.target.value, popular: e.target.value === 'Popular' } as any; setServices(u) }}>
                            <option value="">No tag</option>
                            <option value="Popular">Popular</option>
                            <option value="Discount">Discount</option>
                            <option value="50% Off">50% Off</option>
                            <option value="Limited Time">Limited Time</option>
                            <option value="New">New</option>
                            <option value="Bundle">Bundle</option>
                          </select>
                          <input type="number" className="px-2 py-1.5 rounded-lg border text-xs" style={inputStyle} placeholder="Sale $" value={(s as any).salePrice || ''} onChange={e => { const u = [...services]; u[i] = { ...u[i], salePrice: e.target.value ? Number(e.target.value) : undefined } as any; setServices(u) }} />
                        </div>
                        <div className="border-t pt-2 mt-1" style={{ borderColor: theme.border }}>
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: BIZ_PURPLE }}>Custom Form Fields</p>
                          {((s as any).customFields || []).map((f: any, fi: number) => (
                            <div key={fi} className="flex items-center gap-1.5 mb-1">
                              <input className="flex-1 px-2 py-1 rounded-lg border text-[10px]" style={inputStyle} placeholder="Field label" value={f.label}
                                onChange={e => { const u = [...services]; const cf = [...((u[i] as any).customFields || [])]; cf[fi] = { ...cf[fi], label: e.target.value }; (u[i] as any).customFields = cf; setServices(u) }} />
                              <select className="px-1.5 py-1 rounded-lg border text-[10px]" style={inputStyle} value={f.type}
                                onChange={e => { const u = [...services]; const cf = [...((u[i] as any).customFields || [])]; cf[fi] = { ...cf[fi], type: e.target.value }; (u[i] as any).customFields = cf; setServices(u) }}>
                                <option value="text">Text</option>
                                <option value="textarea">Textarea</option>
                                <option value="select">Dropdown</option>
                              </select>
                              {f.type === 'select' && (
                                <input className="flex-1 px-2 py-1 rounded-lg border text-[10px]" style={inputStyle} placeholder="Options (comma separated)" value={f.options || ''}
                                  onChange={e => { const u = [...services]; const cf = [...((u[i] as any).customFields || [])]; cf[fi] = { ...cf[fi], options: e.target.value }; (u[i] as any).customFields = cf; setServices(u) }} />
                              )}
                              <button onClick={() => { const u = [...services]; const cf = [...((u[i] as any).customFields || [])]; cf.splice(fi, 1); (u[i] as any).customFields = cf; setServices(u) }}
                                className="p-0.5" style={{ color: '#EF4444' }}><X size={10} /></button>
                            </div>
                          ))}
                          <button onClick={() => { const u = [...services]; (u[i] as any).customFields = [...((u[i] as any).customFields || []), { label: '', type: 'text', options: '' }]; setServices(u) }}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: `${BIZ_PURPLE}10`, color: BIZ_PURPLE }}>+ Add Field</button>
                        </div>
                        <button onClick={() => setEditingService(null)} className="w-full px-2 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: BIZ_PURPLE, color: '#fff' }}>Done</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{s.name}</p>
                          {(s as any).tag && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${BIZ_PURPLE}20`, color: BIZ_PURPLE }}>{(s as any).tag}</span>}
                        </div>
                        <div className="text-right shrink-0">
                          {(s as any).salePrice ? (
                            <><span className="text-sm font-bold" style={{ color: '#10B981' }}>${(s as any).salePrice}</span><span className="text-xs ml-1 line-through" style={{ color: theme.textM }}>${s.price}</span></>
                          ) : (
                            <span className="text-sm font-bold" style={{ color: BIZ_PURPLE }}>${s.price}</span>
                          )}
                        </div>
                        {i > 0 && <button onClick={() => { const u = [...services]; [u[i-1], u[i]] = [u[i], u[i-1]]; setServices(u) }} className="p-1 rounded-lg" style={{ color: theme.textM }}><ChevronUp size={12} /></button>}
                        {i < services.length - 1 && <button onClick={() => { const u = [...services]; [u[i], u[i+1]] = [u[i+1], u[i]]; setServices(u) }} className="p-1 rounded-lg" style={{ color: theme.textM }}><ChevronDown size={12} /></button>}
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

            )}

            {/* Rollout Packages */}
            {accHead('rollout', `Rollout Packages (${rolloutPackages.length})`, Package)}
            {websiteSection === 'rollout' && (
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              {rolloutPackages.map((pkg: any, pi: number) => (
                <div key={pkg.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input className="flex-1 px-2 py-1.5 rounded-lg border text-xs font-bold" style={inputStyle} value={pkg.label} onChange={e => { const u = [...rolloutPackages]; u[pi] = { ...u[pi], label: e.target.value }; setRolloutPackages(u) }} />
                    <button onClick={() => { const u = [...rolloutPackages]; u[pi] = { ...u[pi], tiers: [...u[pi].tiers, { id: gid(), name: 'New Tier', price: 0, period: '/mo', campaigns: 1, description: '', badge: '', active: true, salePrice: null, services: ['Custom Cover Artwork'], extras: [] }] }; setRolloutPackages(u) }}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-bold shrink-0" style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}>+ Tier</button>
                  </div>
                  {pkg.tiers.map((tier: any, ti: number) => (
                    <div key={tier.id} className="rounded-xl p-3 space-y-2" style={{ backgroundColor: theme.bg, border: `1px solid ${theme.border}`, opacity: tier.active ? 1 : 0.5 }}>
                      <div className="flex items-center gap-2">
                        <input className="flex-1 px-2 py-1 rounded-lg border text-xs" style={inputStyle} value={tier.name} onChange={e => { const u = [...rolloutPackages]; u[pi].tiers[ti] = { ...tier, name: e.target.value }; setRolloutPackages(u) }} />
                        <input type="number" className="w-16 px-2 py-1 rounded-lg border text-xs" style={inputStyle} value={tier.price} onChange={e => { const u = [...rolloutPackages]; u[pi].tiers[ti] = { ...tier, price: Number(e.target.value) }; setRolloutPackages(u) }} />
                        <button onClick={() => { const u = [...rolloutPackages]; u[pi].tiers[ti] = { ...tier, active: !tier.active }; setRolloutPackages(u) }}
                          className="p-1 rounded-lg" style={{ color: tier.active ? '#10B981' : theme.textM }}>{tier.active ? <EyeIcon size={12} /> : <EyeOff size={12} />}</button>
                        <button onClick={() => { const u = [...rolloutPackages]; u[pi].tiers.splice(ti, 1); setRolloutPackages(u) }}
                          className="p-1 rounded-lg" style={{ color: '#EF4444' }}><Trash2 size={12} /></button>
                        {ti > 0 && <button onClick={() => { const u = [...rolloutPackages]; const t = u[pi].tiers; [t[ti-1], t[ti]] = [t[ti], t[ti-1]]; setRolloutPackages(u) }}
                          className="p-1 rounded-lg" style={{ color: theme.textM }}><ChevronUp size={12} /></button>}
                        {ti < pkg.tiers.length - 1 && <button onClick={() => { const u = [...rolloutPackages]; const t = u[pi].tiers; [t[ti], t[ti+1]] = [t[ti+1], t[ti]]; setRolloutPackages(u) }}
                          className="p-1 rounded-lg" style={{ color: theme.textM }}><ChevronDown size={12} /></button>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="px-2 py-1 rounded-lg border text-[10px]" style={inputStyle} placeholder="Badge (e.g. Best Value)" value={tier.badge} onChange={e => { const u = [...rolloutPackages]; u[pi].tiers[ti] = { ...tier, badge: e.target.value }; setRolloutPackages(u) }} />
                        <input type="number" className="px-2 py-1 rounded-lg border text-[10px]" style={inputStyle} placeholder="Sale price" value={tier.salePrice || ''} onChange={e => { const u = [...rolloutPackages]; u[pi].tiers[ti] = { ...tier, salePrice: e.target.value ? Number(e.target.value) : null }; setRolloutPackages(u) }} />
                      </div>
                      <input className="w-full px-2 py-1 rounded-lg border text-[10px]" style={inputStyle} placeholder="Description" value={tier.description} onChange={e => { const u = [...rolloutPackages]; u[pi].tiers[ti] = { ...tier, description: e.target.value }; setRolloutPackages(u) }} />
                      <input type="number" className="w-full px-2 py-1 rounded-lg border text-[10px]" style={inputStyle} placeholder="Campaigns per month" value={tier.campaigns} onChange={e => { const u = [...rolloutPackages]; u[pi].tiers[ti] = { ...tier, campaigns: Number(e.target.value) }; setRolloutPackages(u) }} />
                      <div>
                        <p className="text-[9px] font-bold uppercase mb-1" style={{ color: theme.textM }}>Services (one per line)</p>
                        <textarea rows={3} className="w-full px-2 py-1 rounded-lg border text-[10px]" style={{ ...inputStyle, resize: 'vertical' as any }}
                          value={[...tier.services, ...tier.extras].join('\n')}
                          onChange={e => {
                            const lines = e.target.value.split('\n').filter((l: string) => l.trim())
                            const u = [...rolloutPackages]; u[pi].tiers[ti] = { ...tier, services: lines, extras: [] }; setRolloutPackages(u)
                          }} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <button onClick={() => setRolloutPackages([...rolloutPackages, { id: gid(), label: 'New Package', tiers: [] }])}
                className="w-full py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: `${BIZ_PURPLE}12`, color: BIZ_PURPLE, border: `1px dashed ${BIZ_PURPLE}40` }}>+ Add Package Type</button>
            </div>

            )}

            {/* Section Order */}
            {accHead('order', 'Page Section Order', Layers)}
            {websiteSection === 'order' && (
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="space-y-1.5">
                {sectionOrder.map((sec, i) => {
                  const labels: Record<string, string> = { booking: 'Book Your Design', portfolio: 'Featured Work', rollout: 'Monthly Rollout Plans', testimonials: 'Reviews & Testimonials' }
                  const isHidden = hiddenSections.includes(sec)
                  return (
                    <div key={sec} className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: theme.bg, border: `1px solid ${isHidden ? '#EF444430' : theme.border}`, opacity: isHidden ? 0.5 : 1 }}>
                      <span className="text-sm font-semibold flex-1" style={{ color: theme.text }}>{labels[sec] || sec}</span>
                      <div className="flex gap-1">
                        <button onClick={() => setHiddenSections(h => h.includes(sec) ? h.filter(s => s !== sec) : [...h, sec])}
                          className="p-1.5 rounded-lg" style={{ backgroundColor: isHidden ? '#EF444415' : `${BIZ_PURPLE}15`, color: isHidden ? '#EF4444' : BIZ_PURPLE }}>
                          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {i > 0 && <button onClick={() => { const u = [...sectionOrder]; [u[i-1], u[i]] = [u[i], u[i-1]]; setSectionOrder(u) }}
                          className="p-1.5 rounded-lg" style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}><ChevronUp size={14} /></button>}
                        {i < sectionOrder.length - 1 && <button onClick={() => { const u = [...sectionOrder]; [u[i], u[i+1]] = [u[i+1], u[i]]; setSectionOrder(u) }}
                          className="p-1.5 rounded-lg" style={{ backgroundColor: `${BIZ_PURPLE}15`, color: BIZ_PURPLE }}><ChevronDown size={14} /></button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            )}

            <button onClick={saveSiteSettings}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mt-3"
              style={{ backgroundColor: siteSaved ? '#10B981' : BIZ_PURPLE, color: '#fff' }}>
              {siteSaved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save & Publish</>}
            </button>
          </div>
        )}

        {/* ── DELIVERY TAB ── */}
        {activeTab === 'delivery' && (
          <DeliveryTab theme={theme} clients={clientDb} inputCls={inputCls} inputStyle={inputStyle} />
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
                {/* Existing client picker — only shown for new projects */}
                {!editId && clientDb.length > 0 && (
                  <div className="sm:col-span-2 pb-3 border-b" style={{ borderColor: theme.border }}>
                    <label className="text-[10px] font-bold uppercase block mb-1.5" style={{ color: BIZ_PURPLE }}>
                      Fill From Existing Client
                    </label>
                    <select
                      className={inputCls}
                      style={{ ...inputStyle, borderColor: selectedClientId ? BIZ_PURPLE : undefined }}
                      value={selectedClientId}
                      onChange={e => {
                        const cid = e.target.value
                        setSelectedClientId(cid)
                        if (cid) {
                          const c = clientDb.find(x => x.id === cid)
                          if (c) setForm(f => ({ ...f, artistName: c.artistName || '', email: c.email || '', phone: c.phone || '', instagram: c.instagram || '', clientId: c.id }))
                        } else {
                          setForm(f => ({ ...f, artistName: '', email: '', phone: '', instagram: '', clientId: undefined }))
                        }
                      }}
                    >
                      <option value="">— Select a client to auto-fill —</option>
                      {[...clientDb].sort((a, b) => a.artistName.localeCompare(b.artistName)).map(c => (
                        <option key={c.id} value={c.id}>{c.artistName}{c.email ? ` · ${c.email}` : ''}</option>
                      ))}
                    </select>
                    {selectedClientId && (
                      <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: BIZ_PURPLE }}>
                        <CheckCircle size={10} /> Fields pre-filled — edit anything below as needed.
                      </p>
                    )}
                  </div>
                )}
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
