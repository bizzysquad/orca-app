'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Palette, Plus, Trash2, Edit3, DollarSign, CheckCircle,
  Clock, X, Mail, Inbox, Globe, Instagram, Phone, User,
  ExternalLink, Save, Eye, Layers, RefreshCw, ChevronRight,
  FileText, Database, Send, Upload, Paperclip, ChevronUp, ChevronDown, Package, EyeOff, Eye as EyeIcon,
  Check, Loader2,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { fmt } from '@/lib/utils'
import { setLocalSynced } from '@/lib/syncLocal'
import { pullFromCloud } from '@/lib/syncEngine'
import { PageShell, PageHeader, Panel, PanelTitle, Bar, Button, IconButton, RowMenu, EmptyState, useField, Field, Choice, Sheet } from '@/components/ui/kit'
import { Segmented } from '@/components/layout/CustomizePanel'

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

function DeliveryTab({ clients }: { clients: BizClientProfile[] }) {
  const { theme } = useTheme()
  const field = useField()
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [clientQuery, setClientQuery] = useState('')
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

  // Synced across devices (was saved to this device only before the redesign).
  const saveTemplates = (updated: ReplyTemplate[]) => {
    setTemplates(updated)
    try { setLocalSynced(TEMPLATES_KEY, JSON.stringify(updated)) } catch {}
  }

  const saveEdit = () => {
    if (!editLabel.trim() || !editText.trim() || !editingId) return
    saveTemplates(templates.map(t => (t.id === editingId ? { ...t, label: editLabel.trim(), text: editText.trim() } : t)))
    setEditingId(null)
  }
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
  const resetToDefaults = () => { saveTemplates(DEFAULT_REPLY_TEMPLATES); setEditingId(null) }
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

  const shownClients = clients.filter(c => !clientQuery || `${c.artistName} ${c.email || ''} ${c.instagram || ''}`.toLowerCase().includes(clientQuery.toLowerCase()))
  const Step = ({ n, title, done }: { n: number; title: string; done?: boolean }) => (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold" style={{ backgroundColor: done ? theme.accent : `${theme.text}0d`, color: done ? theme.bg : theme.text }}>{done ? <Check size={13} /> : n}</span>
      <h3 className="text-[14px] font-semibold" style={{ color: theme.text }}>{title}</h3>
    </div>
  )

  return (
    <div className="space-y-4">
      <p className="text-[13px]" style={{ color: theme.subtext }}>Send finished work from Buzyplug@gmail.com. The email includes download links and a link to leave a review.</p>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-start">
        <Panel>
          <Step n={1} title="Pick a client" done={!!client} />
          {clients.length === 0 ? (
            <p className="text-[13px]" style={{ color: theme.subtext }}>No clients yet. Clients are added when you create projects.</p>
          ) : (
            <>
              <input value={clientQuery} onChange={e => setClientQuery(e.target.value)} placeholder="Search clients" aria-label="Search clients" {...field} />
              <ul className="mt-2 max-h-[360px] overflow-y-auto">
                {shownClients.map(c => {
                  const on = selectedClient === c.id
                  return (
                    <li key={c.id}>
                      <button onClick={() => { setSelectedClient(c.id); setDeliverEmail(c.email || '') }} className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left" style={{ backgroundColor: on ? `${theme.accent}18` : undefined }}>
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0" style={{ backgroundColor: `${theme.text}0d`, color: theme.text }}>{c.artistName.charAt(0).toUpperCase()}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13.5px] font-medium truncate" style={{ color: theme.text }}>{c.artistName}</span>
                          <span className="block text-[11.5px] truncate" style={{ color: theme.subtext }}>{c.email || c.instagram || 'No email saved'}</span>
                        </span>
                        {on && <Check size={15} style={{ color: theme.accent }} />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Panel>

        <Panel>
          {!client ? (
            <div className="py-10 text-center text-[13px]" style={{ color: theme.subtext }}>Pick a client to write their delivery email.</div>
          ) : (
            <div className="space-y-5">
              <div>
                <Step n={2} title={`Write to ${client.artistName}`} done={!!deliverMessage} />
                <div className="space-y-3">
                  <Field label="Email"><input type="email" value={deliverEmail} onChange={e => setDeliverEmail(e.target.value)} placeholder="client@email.com" {...field} /></Field>
                  <div className="flex items-end gap-2">
                    <Field label="Start from a template" className="flex-1">
                      <select value="" onChange={e => { if (e.target.value) applyTemplate(e.target.value) }} {...field}>
                        <option value="">Choose a template</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </Field>
                    <Button onClick={() => setShowManageTemplates(true)}>Edit templates</Button>
                  </div>
                  <Field label="Message">
                    <textarea rows={5} value={deliverMessage} onChange={e => setDeliverMessage(e.target.value)} placeholder="Pick a template or write a message" {...field} className={`${field.className} h-auto py-2 leading-relaxed`} />
                  </Field>
                </div>
              </div>
              <div>
                <Step n={3} title="Attach files and send" done={sent} />
                <label className="flex items-center justify-center gap-2 h-11 rounded-lg text-[13px] font-medium cursor-pointer" style={{ border: `1px dashed ${theme.border}`, color: theme.text }}>
                  <Upload size={15} /> {deliverFiles.length > 0 ? `${deliverFiles.length} file${deliverFiles.length > 1 ? 's' : ''} ready, choose again to replace` : 'Choose files'}
                  <input type="file" accept="image/*,video/*,.pdf,.psd,.ai,.zip" multiple className="hidden" onChange={e => { if (e.target.files) setDeliverFiles(Array.from(e.target.files)) }} />
                </label>
                {deliverFiles.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {deliverFiles.map((f, i) => (
                      <span key={i} className="text-[11.5px] pl-2 pr-1 h-7 rounded-md flex items-center gap-1" style={{ backgroundColor: `${theme.text}0a`, color: theme.text }}>
                        <Paperclip size={11} /> {f.name.length > 22 ? f.name.slice(0, 19) + '…' : f.name}
                        <button onClick={() => setDeliverFiles(deliverFiles.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="p-1" style={{ color: theme.subtext }}><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
                {sendError && <p className="text-xs mt-3" style={{ color: theme.bad }}>{sendError}</p>}
                <Button className="w-full mt-3" variant="primary" disabled={sending || !deliverEmail} onClick={handleDeliver}>
                  {sent ? <><Check size={15} /> Delivered</> : sending ? <><Loader2 size={15} className="animate-spin" /> Sending</> : <><Send size={15} /> Send to {client.artistName}</>}
                </Button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Sheet open={showManageTemplates} onClose={() => { setShowManageTemplates(false); setEditingId(null) }} title="Reply templates" sub={`${templates.length} saved`}>
        <div className="space-y-4">
          <ul>
            {templates.map((t, idx) => (
              <li key={t.id} style={{ borderTop: idx ? `1px solid ${theme.border}` : undefined }}>
                {editingId === t.id ? (
                  <div className="py-3 space-y-2">
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Template name" aria-label="Template name" {...field} />
                    <textarea rows={3} value={editText} onChange={e => setEditText(e.target.value)} aria-label="Message" {...field} className={`${field.className} h-auto py-2`} />
                    <div className="flex gap-2">
                      <Button className="flex-1" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      <Button className="flex-1" size="sm" variant="primary" disabled={!editLabel.trim() || !editText.trim()} onClick={saveEdit}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium truncate" style={{ color: theme.text }}>{t.label}</p>
                      <p className="text-[11.5px] truncate" style={{ color: theme.subtext }}>{t.text}</p>
                    </div>
                    <RowMenu label={`Actions for ${t.label}`} items={[
                      { label: 'Edit', icon: Edit3, onClick: () => { setEditingId(t.id); setEditLabel(t.label); setEditText(t.text) } },
                      ...(idx > 0 ? [{ label: 'Move up', icon: ChevronUp, onClick: () => moveTemplate(idx, -1) }] : []),
                      ...(idx < templates.length - 1 ? [{ label: 'Move down', icon: ChevronDown, onClick: () => moveTemplate(idx, 1) }] : []),
                      { label: 'Delete', icon: Trash2, danger: true, onClick: () => deleteTemplate(t.id) },
                    ]} />
                  </div>
                )}
              </li>
            ))}
            {templates.length === 0 && <li className="py-3 text-[13px]" style={{ color: theme.subtext }}>No templates. Add one below or reset to the defaults.</li>}
          </ul>
          <div className="pt-4 space-y-2" style={{ borderTop: `1px solid ${theme.border}` }}>
            <p className="text-[13px] font-medium" style={{ color: theme.text }}>Add a template</p>
            <input value={newTplLabel} onChange={e => setNewTplLabel(e.target.value)} placeholder="Name, e.g. Album cover done" aria-label="New template name" {...field} />
            <textarea rows={3} value={newTplText} onChange={e => setNewTplText(e.target.value)} placeholder="Message" aria-label="New template message" {...field} className={`${field.className} h-auto py-2`} />
            <div className="flex gap-2">
              <Button onClick={resetToDefaults}>Reset to defaults</Button>
              <Button className="flex-1" variant="primary" disabled={!newTplLabel.trim() || !newTplText.trim()} onClick={addTemplate}><Plus size={14} /> Add template</Button>
            </div>
          </div>
        </div>
      </Sheet>
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

  // ── Layout (2026-11 redesign) ──
  const field = useField()
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const [projectQuery, setProjectQuery] = useState('')
  const [clientQuery, setClientQuery] = useState('')
  const area = { ...field, className: `${field.className} h-auto py-2 leading-relaxed` }
  const small = { ...field, className: 'w-full h-9 px-2.5 rounded-lg text-[13px] outline-none focus:ring-2' }
  const setSite = (patch: Record<string, any>) => setSiteSettings((s: any) => ({ ...s, ...patch }))
  const setStatus = (id: string, status: ProjectStatus) => persistProjects(projects.map(x => (x.id === id ? { ...x, status } : x)))
  const typeLabel = (v: string) => PROJECT_TYPES.find(t => t.value === v)?.label || v
  const openProject = projects.find(p => p.id === openProjectId) || null
  const pendingValue = projects.filter(p => p.status === 'new-lead').reduce((s, p) => s + Math.max(0, (p.quote || 0) - (p.paid || 0)), 0)

  const shownProjects = visible.filter(p => !projectQuery || `${p.artistName} ${p.email || ''} ${p.instagram || ''} ${p.songName || ''}`.toLowerCase().includes(projectQuery.toLowerCase()))
  const shownClients = clientDb.filter(c => !clientQuery || `${c.artistName} ${c.email || ''} ${c.instagram || ''} ${c.phone || ''}`.toLowerCase().includes(clientQuery.toLowerCase()))

  const WEBSITE_SECTIONS: { id: string; label: string; icon: any }[] = [
    { id: 'theme', label: 'Branding', icon: Palette },
    { id: 'hero', label: 'Hero', icon: FileText },
    { id: 'about', label: 'About', icon: User },
    { id: 'portfolio', label: `Portfolio · ${portfolioPhotos.length}`, icon: Layers },
    { id: 'services', label: `Services · ${services.length}`, icon: DollarSign },
    { id: 'rollout', label: 'Rollout packages', icon: Package },
    { id: 'links', label: 'Payment and social', icon: ExternalLink },
    { id: 'order', label: 'Page layout', icon: Layers },
  ]
  const section = websiteSection || 'theme'

  const openNewProject = () => { setForm(BLANK_PROJECT()); setEditId(null); setSelectedClientId(''); setShowForm(true) }
  const openNewClient = () => { setClientForm({ artistName: '', email: '', phone: '', instagram: '', notes: '' }); setEditClientId(null); setShowClientForm(true) }

  const saveClientForm = () => {
    if (!clientForm.artistName) return
    if (editClientId) persistClients(clientDb.map(c => (c.id === editClientId ? { ...c, ...clientForm } as BizClientProfile : c)))
    else persistClients([...clientDb, { id: gid(), ...clientForm, createdAt: new Date().toISOString().slice(0, 10) } as BizClientProfile])
    setShowClientForm(false); setEditClientId(null); setClientForm({})
  }

  return (
    <PageShell>
      <PageHeader
        title="BizzyPlug"
        sub="Design projects, clients and your website"
        right={<>
          <Link href="/bizzyplug" target="_blank"><Button><Eye size={14} /> Website</Button></Link>
          {activeTab === 'clients'
            ? <Button variant="primary" onClick={openNewClient}><Plus size={15} /> Add client</Button>
            : <Button variant="primary" onClick={openNewProject}><Plus size={15} /> New project</Button>}
        </>}
      />

      <Panel pad={false} className="mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Revenue', value: fmt(totalRevenue), sub: 'Paid across all projects' },
            { label: 'Open projects', value: String(newLeadCount), sub: 'Leads and in progress' },
            { label: 'Waiting on payment', value: fmt(pendingValue), sub: 'Quoted but unpaid', tone: pendingValue > 0 ? theme.warn : undefined },
            { label: 'Completed', value: String(completedCount), sub: `${clientDb.length} clients` },
          ].map((s, i) => (
            <div key={s.label} className={`px-4 sm:px-5 py-4 min-w-0 ${i % 2 ? 'border-l' : ''} ${i > 0 ? 'lg:border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''}`} style={{ borderColor: theme.border }}>
              <p className="text-xs font-medium flex items-center gap-1.5 truncate" style={{ color: theme.subtext }}>{s.tone && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.tone }} />}{s.label}</p>
              <p className="mt-1 text-[20px] md:text-[24px] font-semibold tnum tracking-tight leading-tight truncate" style={{ color: theme.text }}>{s.value}</p>
              <p className="mt-1 text-[11.5px] truncate" style={{ color: theme.subtext }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mb-4 overflow-x-auto no-scrollbar">
        <Segmented value={activeTab} onChange={v => setActiveTab(v as DashTab)} options={[
          { value: 'projects', label: `Projects${newLeadCount ? ` · ${newLeadCount}` : ''}` },
          { value: 'clients', label: 'Clients' },
          { value: 'delivery', label: 'Deliver' },
          { value: 'website', label: 'Website' },
        ]} />
      </div>

      {/* ═══ PROJECTS ═══ */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Segmented size="sm" value={filterStatus} onChange={v => setFilterStatus(v as ProjectStatus | 'all')} options={[
              { value: 'new-lead', label: `Open · ${newLeadCount}` },
              { value: 'completed', label: `Completed · ${completedCount}` },
              { value: 'all', label: `All · ${projects.length}` },
            ]} />
            <input value={projectQuery} onChange={e => setProjectQuery(e.target.value)} placeholder="Search projects" aria-label="Search projects" {...field} className={`${field.className} sm:max-w-[260px] sm:ml-auto`} />
          </div>
          {shownProjects.length === 0 ? (
            <EmptyState title={projects.length ? 'No projects match' : 'No projects yet'} sub={projects.length ? undefined : 'New website orders land here, or add one yourself.'} action={!projects.length ? <Button variant="primary" onClick={openNewProject}><Plus size={15} /> New project</Button> : undefined} />
          ) : (
            <Panel pad={false}>
              <ul>
                {shownProjects.map((p, i) => {
                  const pct = p.quote > 0 ? Math.min(100, Math.round((p.paid / p.quote) * 100)) : 0
                  const done = p.status === 'completed'
                  return (
                    <li key={p.id} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                      <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
                        <button className="flex-1 min-w-0 text-left" onClick={() => setOpenProjectId(p.id)}>
                          <p className="text-[14px] font-medium truncate flex items-center gap-2" style={{ color: theme.text }}>
                            {p.artistName}
                            {(p as any).paymentStatus === 'paid' && <span className="text-[11px] font-normal" style={{ color: theme.ok }}>Paid online</span>}
                          </p>
                          <p className="text-[12px] truncate" style={{ color: theme.subtext }}>{[typeLabel(p.projectType), p.songName, p.deadline ? `Due ${p.deadline}` : ''].filter(Boolean).join(' · ')}</p>
                          {p.quote > 0 && (
                            <div className="mt-1.5 flex items-center gap-2 max-w-[280px]">
                              <div className="flex-1"><Bar pct={pct} color={pct >= 100 ? theme.ok : theme.accent} height={4} /></div>
                              <span className="text-[11px] tnum shrink-0" style={{ color: theme.subtext }}>{fmt(p.paid)} of {fmt(p.quote)}</span>
                            </div>
                          )}
                        </button>
                        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] shrink-0" style={{ color: done ? theme.subtext : theme.accent }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: done ? theme.subtext : theme.accent }} />{STATUS_CONFIG[p.status]?.label || p.status}
                        </span>
                        <Button size="sm" onClick={() => setStatus(p.id, done ? 'new-lead' : 'completed')}>{done ? 'Reopen' : <><Check size={13} /> Done</>}</Button>
                        <RowMenu label={`More actions for ${p.artistName}`} items={[
                          { label: 'Details', icon: Eye, onClick: () => setOpenProjectId(p.id) },
                          { label: 'Edit', icon: Edit3, onClick: () => handleEdit(p) },
                          { label: 'Delete', icon: Trash2, danger: true, onClick: () => handleDelete(p.id) },
                        ]} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {/* ═══ CLIENTS ═══ */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <input value={clientQuery} onChange={e => setClientQuery(e.target.value)} placeholder="Search clients" aria-label="Search clients" {...field} />
          {clientDb.length === 0 ? (
            <EmptyState title="No clients yet" sub="Clients are added automatically when you create a project." action={<Button variant="primary" onClick={openNewClient}><Plus size={15} /> Add client</Button>} />
          ) : (
            <Panel pad={false}>
              <ul>
                {shownClients.map((client, i) => {
                  const clientProjects = getClientProjects(client)
                  const isExpanded = expandedClient === client.id
                  const spent = clientProjects.reduce((s, cp) => s + (cp.paid || 0), 0)
                  return (
                    <li key={client.id} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                      <div className="flex items-center gap-3 px-4 sm:px-5 py-3">
                        <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setExpandedClient(isExpanded ? null : client.id)} aria-expanded={isExpanded}>
                          <span className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0" style={{ backgroundColor: `${theme.text}0d`, color: theme.text }}>{client.artistName.charAt(0).toUpperCase()}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[14px] font-medium truncate" style={{ color: theme.text }}>{client.artistName}</span>
                            <span className="block text-[12px] truncate" style={{ color: theme.subtext }}>{[client.email, client.instagram, client.phone].filter(Boolean).join(' · ') || 'No contact info'}</span>
                          </span>
                          <span className="text-right shrink-0">
                            <span className="block text-[13px] font-medium tnum" style={{ color: theme.text }}>{spent > 0 ? fmt(spent) : ''}</span>
                            <span className="block text-[11px]" style={{ color: theme.subtext }}>{clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}</span>
                          </span>
                        </button>
                        <RowMenu label={`More actions for ${client.artistName}`} items={[
                          { label: 'New project', icon: Plus, onClick: () => { setForm({ ...BLANK_PROJECT(), artistName: client.artistName, email: client.email || '', phone: client.phone || '', instagram: client.instagram || '', clientId: client.id }); setEditId(null); setSelectedClientId(client.id); setShowForm(true) } },
                          { label: 'Edit', icon: Edit3, onClick: () => { setClientForm(client); setEditClientId(client.id); setShowClientForm(true) } },
                          { label: 'Delete', icon: Trash2, danger: true, onClick: () => { persistClients(clientDb.filter(c => c.id !== client.id)); setExpandedClient(null) } },
                        ]} />
                      </div>
                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-4 sm:pl-[68px] space-y-2">
                          {client.notes && <p className="text-[12.5px]" style={{ color: theme.subtext }}>{client.notes}</p>}
                          {clientProjects.length === 0 ? <p className="text-[12.5px]" style={{ color: theme.subtext }}>No projects yet.</p> : (
                            <ul className="rounded-xl px-3" style={{ backgroundColor: `${theme.text}06` }}>
                              {clientProjects.map((cp, j) => (
                                <li key={cp.id} style={{ borderTop: j ? `1px solid ${theme.border}` : undefined }}>
                                  <button className="w-full flex items-center justify-between gap-2 py-2 text-[12.5px] text-left" onClick={() => setOpenProjectId(cp.id)}>
                                    <span className="min-w-0">
                                      <span className="block truncate" style={{ color: theme.text }}>{typeLabel(cp.projectType)}</span>
                                      <span className="block" style={{ color: theme.subtext }}>{cp.createdAt}{cp.deadline ? ` · Due ${cp.deadline}` : ''} · {STATUS_CONFIG[cp.status]?.label || cp.status}</span>
                                    </span>
                                    {cp.quote > 0 && <span className="tnum shrink-0" style={{ color: theme.text }}>{fmt(cp.paid)} / {fmt(cp.quote)}</span>}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
                {shownClients.length === 0 && <li className="px-5 py-6 text-[13px]" style={{ color: theme.subtext }}>No clients match “{clientQuery}”.</li>}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {/* ═══ DELIVER ═══ */}
      {activeTab === 'delivery' && <DeliveryTab clients={clientDb} />}

      {/* ═══ WEBSITE ═══ */}
      {activeTab === 'website' && (
        <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)] items-start">
          <nav className="md:sticky md:top-20" aria-label="Website sections">
            <div className="md:hidden overflow-x-auto no-scrollbar">
              <Segmented size="sm" value={section} onChange={v => setWebsiteSection(v)} options={WEBSITE_SECTIONS.map(s => ({ value: s.id, label: s.label }))} />
            </div>
            <ul className="hidden md:block space-y-px">
              {WEBSITE_SECTIONS.map(s => {
                const on = s.id === section
                return (
                  <li key={s.id}>
                    <button onClick={() => setWebsiteSection(s.id)} className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] text-left" style={{ backgroundColor: on ? `${theme.text}0d` : undefined, color: on ? theme.text : theme.subtext, fontWeight: on ? 600 : 500 }}>
                      <s.icon size={15} style={{ color: on ? theme.accent : undefined }} /> {s.label}
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="hidden md:block mt-4 space-y-2">
              <Button className="w-full" variant="primary" onClick={saveSiteSettings}>{siteSaved ? <><CheckCircle size={14} /> Published</> : <><Save size={14} /> Save and publish</>}</Button>
              <a href="/bizzyplug" target="_blank" rel="noopener noreferrer" className="block"><Button className="w-full"><Eye size={14} /> Preview</Button></a>
            </div>
          </nav>

          <div className="min-w-0 space-y-4">
            {section === 'theme' && (
              <Panel>
                <PanelTitle title="Branding" sub="Logo, color theme and background effects" />
                <div className="space-y-5">
                  <Field label="Logo" group>
                    <div className="flex items-center gap-3 flex-wrap">
                      {siteSettings.logoUrl && <img src={siteSettings.logoUrl} alt="Logo" className="h-12 rounded-md object-contain" style={{ border: `1px solid ${theme.border}` }} />}
                      <label className="h-9 px-3.5 rounded-lg inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer" style={{ border: `1px solid ${theme.border}`, color: theme.text }}>
                        <Upload size={14} /> {siteSettings.logoUrl ? 'Change logo' : 'Upload logo'}
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
                            if (res.ok) { const d = await res.json(); if (d.photo?.url) setSite({ logoUrl: d.photo.url }) }
                          } catch {}
                          e.target.value = ''
                        }} />
                      </label>
                      {siteSettings.logoUrl && <Button variant="ghost" onClick={() => setSite({ logoUrl: '' })}>Remove</Button>}
                    </div>
                  </Field>
                  <Field label="Theme" group>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {THEME_PRESETS.map(preset => {
                        const isActive = (siteSettings.activeTheme || 'dark-modern') === preset.id
                        return (
                          <button key={preset.id} onClick={() => setSite({ activeTheme: preset.id })} aria-pressed={isActive} className="rounded-xl p-3 text-left" style={{ border: `1px solid ${isActive ? theme.accent : theme.border}`, backgroundColor: isActive ? `${theme.accent}10` : undefined }}>
                            <p className="text-[13px] font-medium mb-2 flex items-center justify-between" style={{ color: theme.text }}>{preset.name}{isActive && <Check size={14} style={{ color: theme.accent }} />}</p>
                            <div className="flex gap-1.5">
                              {[preset.colors.bg, preset.colors.purple, preset.colors.white, preset.colors.bgCard].map((c, i) => (
                                <span key={i} className="w-5 h-5 rounded-full" style={{ backgroundColor: c, border: `1px solid ${theme.border}` }} />
                              ))}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Glow effects" group>
                      <Choice value={siteSettings.glowEnabled ? 'on' : 'off'} onChange={v => setSite({ glowEnabled: v === 'on' })} options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} />
                    </Field>
                    <Field label="Background">
                      <select value={siteSettings.gradientStyle || 'radial'} onChange={e => setSite({ gradientStyle: e.target.value })} {...field}>
                        <option value="radial">Radial gradient</option>
                        <option value="linear">Linear gradient</option>
                        <option value="none">None</option>
                      </select>
                    </Field>
                  </div>
                </div>
              </Panel>
            )}

            {section === 'hero' && (
              <Panel>
                <PanelTitle title="Hero" sub="The first thing visitors see" />
                <div className="space-y-3">
                  <Field label="Headline"><input value={siteSettings.heroHeadline || ''} onChange={e => setSite({ heroHeadline: e.target.value })} placeholder="Tired Of The AI Covers, Lets Get You Something Authentic" {...field} /></Field>
                  <Field label="Sub-headline"><input value={siteSettings.heroSubheadline || ''} onChange={e => setSite({ heroSubheadline: e.target.value })} placeholder="PREMIUM DESIGN. REAL IMPACT." {...field} /></Field>
                  <Field label="Description"><textarea rows={3} value={siteSettings.bio || ''} onChange={e => setSite({ bio: e.target.value })} {...area} /></Field>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Main button text"><input value={siteSettings.ctaText || ''} onChange={e => setSite({ ctaText: e.target.value })} placeholder="BOOK A DESIGN" {...field} /></Field>
                    <Field label="Second button text"><input value={siteSettings.ctaSecondaryText || ''} onChange={e => setSite({ ctaSecondaryText: e.target.value })} placeholder="VIEW PORTFOLIO" {...field} /></Field>
                  </div>
                </div>
              </Panel>
            )}

            {section === 'about' && (
              <Panel>
                <PanelTitle title="About" />
                <div className="space-y-3">
                  <Field label="Headline"><input value={siteSettings.aboutHeadline || ''} onChange={e => setSite({ aboutHeadline: e.target.value })} placeholder="Creativity. Culture. Branding That Hits." {...field} /></Field>
                  <Field label="Text"><textarea rows={5} value={siteSettings.aboutText || ''} onChange={e => setSite({ aboutText: e.target.value })} {...area} /></Field>
                </div>
              </Panel>
            )}

            {section === 'portfolio' && (
              <Panel>
                <PanelTitle
                  title="Portfolio"
                  sub={`${portfolioPhotos.length} of 40 photos. Photos save the moment you upload them.`}
                  right={<RowMenu label="Portfolio options" items={[
                    { label: showCatManager ? 'Hide categories' : 'Manage categories', icon: Layers, onClick: () => setShowCatManager(!showCatManager) },
                    ...(portfolioPhotos.length ? [{ label: 'Delete all photos', icon: Trash2, danger: true, onClick: () => { if (confirm('Delete ALL portfolio photos?')) purgeAllPhotos() } }] : []),
                  ]} />}
                />

                {showCatManager && (
                  <div className="rounded-xl p-3 mb-4 space-y-2" style={{ border: `1px solid ${theme.border}` }}>
                    <p className="text-[13px] font-medium" style={{ color: theme.text }}>Categories</p>
                    <div className="flex flex-wrap gap-1.5">
                      {portfolioCategories.map(cat => (
                        <span key={cat} className="inline-flex items-center gap-1 pl-2.5 pr-1 h-7 rounded-md text-[12px]" style={{ backgroundColor: `${theme.text}0a`, color: theme.text }}>
                          {fmtCat(cat)}
                          <button onClick={() => setPortfolioCategories(c => c.filter(x => x !== cat))} aria-label={`Remove ${fmtCat(cat)}`} className="p-1" style={{ color: theme.subtext }}><X size={11} /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New category" aria-label="New category"
                        onKeyDown={e => { if (e.key === 'Enter' && newCatName.trim()) { const slug = slugCat(newCatName); if (slug && !portfolioCategories.includes(slug)) { setPortfolioCategories(c => [...c, slug]); setNewCatName('') } } }} {...field} />
                      <Button onClick={() => { const slug = slugCat(newCatName); if (slug && !portfolioCategories.includes(slug)) { setPortfolioCategories(c => [...c, slug]); setNewCatName('') } }}><Plus size={14} /> Add</Button>
                    </div>
                    <p className="text-[11.5px]" style={{ color: theme.subtext }}>Category changes are kept when you save and publish.</p>
                  </div>
                )}

                <div className="rounded-xl p-3 mb-4 grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end" style={{ backgroundColor: `${theme.text}06` }}>
                  <Field label="Title (optional)"><input value={newPhotoTitle} onChange={e => setNewPhotoTitle(e.target.value)} {...field} /></Field>
                  <Field label="Category">
                    <select value={newPhotoCategory} onChange={e => setNewPhotoCategory(e.target.value)} {...field}>
                      {portfolioCategories.map(c => <option key={c} value={c}>{fmtCat(c)}</option>)}
                    </select>
                  </Field>
                  <label className="h-10 px-4 rounded-lg inline-flex items-center justify-center gap-1.5 text-[13px] font-medium cursor-pointer" style={{ backgroundColor: theme.accent, color: theme.bg, opacity: uploadingPortfolio ? 0.6 : 1 }}>
                    {uploadingPortfolio ? <><RefreshCw size={14} className="animate-spin" /> {uploadProgress.current} of {uploadProgress.total}</> : <><Upload size={14} /> Upload photos</>}
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingPortfolio} onChange={e => { const files = e.target.files; if (files && files.length > 0) uploadPortfolioPhotos(Array.from(files)); e.target.value = '' }} />
                  </label>
                </div>
                {uploadingPortfolio && uploadProgress.total > 1 && <div className="mb-3"><Bar pct={(uploadProgress.current / uploadProgress.total) * 100} color={theme.accent} /></div>}
                {uploadStatus && <p className="text-xs mb-3" style={{ color: uploadStatus.type === 'success' ? theme.ok : theme.bad }}>{uploadStatus.message}</p>}

                <div className="mb-3 overflow-x-auto no-scrollbar">
                  <Segmented size="sm" value={adminPortfolioFilter} onChange={v => setAdminPortfolioFilter(v)} options={[
                    { value: 'all', label: `All · ${portfolioPhotos.length}` },
                    ...portfolioCategories.map(cat => ({ value: cat, label: `${fmtCat(cat)} · ${portfolioPhotos.filter(p => p.category === cat).length}` })),
                  ]} />
                </div>
                {filteredAdminPhotos.length === 0 ? <p className="text-[13px] py-4" style={{ color: theme.subtext }}>No photos here yet.</p> : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredAdminPhotos.map(p => (
                      <div key={p.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                        <img src={p.url} alt={p.title} className="w-full h-32 object-cover block" />
                        {editingPhotoId === p.id ? (
                          <div className="p-2 space-y-1.5">
                            <input value={editPhotoTitle} onChange={e => setEditPhotoTitle(e.target.value)} placeholder="Title" aria-label="Title" {...small} />
                            <select value={editPhotoCategory} onChange={e => setEditPhotoCategory(e.target.value)} aria-label="Category" {...small}>
                              {portfolioCategories.map(c => <option key={c} value={c}>{fmtCat(c)}</option>)}
                            </select>
                            <div className="flex gap-1.5">
                              <Button size="sm" className="flex-1" onClick={() => setEditingPhotoId(null)}>Cancel</Button>
                              <Button size="sm" className="flex-1" variant="primary" onClick={() => updatePhoto(p.id, { title: editPhotoTitle, category: editPhotoCategory })}>Save</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 pl-2.5 pr-1 py-1.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-[12.5px] font-medium truncate" style={{ color: theme.text }}>{p.title}</p>
                              <p className="text-[11px]" style={{ color: theme.subtext }}>{fmtCat(p.category)}</p>
                            </div>
                            <label className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer" title="Replace image" style={{ color: theme.subtext }}>
                              <RefreshCw size={14} />
                              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) updatePhoto(p.id, { file: f }); e.target.value = '' }} />
                            </label>
                            <RowMenu label={`Actions for ${p.title}`} items={[
                              { label: 'Edit title and category', icon: Edit3, onClick: () => startEditPhoto(p) },
                              { label: 'Delete', icon: Trash2, danger: true, onClick: () => deletePortfolioPhoto(p.id) },
                            ]} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            )}

            {section === 'links' && (
              <Panel>
                <PanelTitle title="Payment and social links" />
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Field label="Cash App"><input value={siteSettings.cashAppTag || ''} onChange={e => setSite({ cashAppTag: e.target.value })} placeholder="$BizzyPlug" {...field} /></Field>
                    <Field label="PayPal"><input value={siteSettings.paypalEmail || ''} onChange={e => setSite({ paypalEmail: e.target.value })} {...field} /></Field>
                    <Field label="Venmo"><input value={siteSettings.venmoHandle || ''} onChange={e => setSite({ venmoHandle: e.target.value })} {...field} /></Field>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Instagram URL"><input value={siteSettings.instagramUrl || ''} onChange={e => setSite({ instagramUrl: e.target.value })} placeholder="https://instagram.com/bizzyplug" {...field} /></Field>
                    <Field label="Contact email"><input value={siteSettings.contactEmail || ''} onChange={e => setSite({ contactEmail: e.target.value })} {...field} /></Field>
                  </div>
                </div>
              </Panel>
            )}

            {section === 'services' && (
              <Panel>
                <PanelTitle title="Services and pricing" sub="What customers can order on your site" />
                <ul>
                  {services.map((s, i) => (
                    <li key={i} style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                      {editingService === i ? (
                        <div className="py-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Name"><input value={s.name} onChange={e => { const u = [...services]; u[i] = { ...u[i], name: e.target.value }; setServices(u) }} {...field} /></Field>
                            <Field label="Price ($)"><input type="number" value={s.price} onChange={e => { const u = [...services]; u[i] = { ...u[i], price: Number(e.target.value) }; setServices(u) }} {...field} /></Field>
                            <Field label="Tag">
                              <select value={(s as any).tag || ''} onChange={e => { const u = [...services]; u[i] = { ...u[i], tag: e.target.value, popular: e.target.value === 'Popular' } as any; setServices(u) }} {...field}>
                                <option value="">No tag</option>
                                {['Popular', 'Discount', '50% Off', 'Limited Time', 'New', 'Bundle'].map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </Field>
                            <Field label="Sale price ($)"><input type="number" value={(s as any).salePrice || ''} onChange={e => { const u = [...services]; u[i] = { ...u[i], salePrice: e.target.value ? Number(e.target.value) : undefined } as any; setServices(u) }} {...field} /></Field>
                          </div>
                          <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: `${theme.text}06` }}>
                            <p className="text-[12.5px] font-medium" style={{ color: theme.text }}>Extra questions on the order form</p>
                            {((s as any).customFields || []).map((f: any, fi: number) => (
                              <div key={fi} className="flex items-center gap-1.5">
                                <input placeholder="Question" aria-label="Question" value={f.label} onChange={e => { const u = [...services]; const cf = [...((u[i] as any).customFields || [])]; cf[fi] = { ...cf[fi], label: e.target.value }; u[i] = { ...u[i], customFields: cf } as any; setServices(u) }} {...small} />
                                <select aria-label="Answer type" value={f.type} onChange={e => { const u = [...services]; const cf = [...((u[i] as any).customFields || [])]; cf[fi] = { ...cf[fi], type: e.target.value }; u[i] = { ...u[i], customFields: cf } as any; setServices(u) }} {...small} className={`${small.className} max-w-[110px]`}>
                                  <option value="text">Short text</option>
                                  <option value="textarea">Long text</option>
                                  <option value="select">Dropdown</option>
                                </select>
                                {f.type === 'select' && (
                                  <input placeholder="Options, comma separated" aria-label="Options" value={f.options || ''} onChange={e => { const u = [...services]; const cf = [...((u[i] as any).customFields || [])]; cf[fi] = { ...cf[fi], options: e.target.value }; u[i] = { ...u[i], customFields: cf } as any; setServices(u) }} {...small} />
                                )}
                                <IconButton label="Remove question" onClick={() => { const u = [...services]; const cf = [...((u[i] as any).customFields || [])]; cf.splice(fi, 1); u[i] = { ...u[i], customFields: cf } as any; setServices(u) }}><X size={14} /></IconButton>
                              </div>
                            ))}
                            <Button size="sm" onClick={() => { const u = [...services]; u[i] = { ...u[i], customFields: [...((u[i] as any).customFields || []), { label: '', type: 'text', options: '' }] } as any; setServices(u) }}><Plus size={13} /> Add question</Button>
                          </div>
                          <Button className="w-full" variant="primary" onClick={() => setEditingService(null)}>Done</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-medium truncate" style={{ color: theme.text }}>{s.name}{(s as any).tag && <span className="ml-2 text-[11px] font-normal" style={{ color: theme.accent }}>{(s as any).tag}</span>}</p>
                            {((s as any).customFields || []).length > 0 && <p className="text-[11.5px]" style={{ color: theme.subtext }}>{(s as any).customFields.length} extra question{(s as any).customFields.length === 1 ? '' : 's'}</p>}
                          </div>
                          <span className="text-[13.5px] tnum shrink-0" style={{ color: theme.text }}>
                            {(s as any).salePrice ? <><span style={{ color: theme.ok }}>${(s as any).salePrice}</span> <span className="line-through text-xs" style={{ color: theme.subtext }}>${s.price}</span></> : `$${s.price}`}
                          </span>
                          <RowMenu label={`Actions for ${s.name}`} items={[
                            { label: 'Edit', icon: Edit3, onClick: () => setEditingService(i) },
                            ...(i > 0 ? [{ label: 'Move up', icon: ChevronUp, onClick: () => { const u = [...services]; [u[i - 1], u[i]] = [u[i], u[i - 1]]; setServices(u) } }] : []),
                            ...(i < services.length - 1 ? [{ label: 'Move down', icon: ChevronDown, onClick: () => { const u = [...services]; [u[i], u[i + 1]] = [u[i + 1], u[i]]; setServices(u) } }] : []),
                            { label: 'Delete', icon: Trash2, danger: true, onClick: () => setServices(services.filter((_, j) => j !== i)) },
                          ]} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <input placeholder="New service" aria-label="New service name" value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))} {...field} />
                  <input type="number" placeholder="$" aria-label="New service price" value={newService.price} onChange={e => setNewService(s => ({ ...s, price: e.target.value }))} {...field} className={`${field.className} max-w-[90px]`} />
                  <Button onClick={() => {
                    if (!newService.name || !newService.price) return
                    setServices([...services, { name: newService.name, price: Number(newService.price) }])
                    setNewService({ name: '', price: '' })
                  }}><Plus size={14} /> Add</Button>
                </div>
              </Panel>
            )}

            {section === 'rollout' && (
              <div className="space-y-4">
                {rolloutPackages.map((pkg: any, pi: number) => (
                  <Panel key={pkg.id}>
                    <div className="flex items-center gap-2 mb-4">
                      <input value={pkg.label} onChange={e => { const u = [...rolloutPackages]; u[pi] = { ...u[pi], label: e.target.value }; setRolloutPackages(u) }} aria-label="Package name" {...field} className={`${field.className} font-semibold`} />
                      <Button onClick={() => { const u = [...rolloutPackages]; u[pi] = { ...u[pi], tiers: [...u[pi].tiers, { id: gid(), name: 'New Tier', price: 0, period: '/mo', campaigns: 1, description: '', badge: '', active: true, salePrice: null, services: ['Custom Cover Artwork'], extras: [] }] }; setRolloutPackages(u) }}><Plus size={14} /> Tier</Button>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {pkg.tiers.map((tier: any, ti: number) => {
                        const setTier = (patch: any) => { const u = [...rolloutPackages]; const tiers = [...u[pi].tiers]; tiers[ti] = { ...tier, ...patch }; u[pi] = { ...u[pi], tiers }; setRolloutPackages(u) }
                        return (
                          <div key={tier.id} className="rounded-xl p-3 space-y-2" style={{ border: `1px solid ${theme.border}`, opacity: tier.active ? 1 : 0.55 }}>
                            <div className="flex items-center gap-2">
                              <input value={tier.name} onChange={e => setTier({ name: e.target.value })} aria-label="Tier name" {...small} className={`${small.className} font-medium`} />
                              <input type="number" value={tier.price} onChange={e => setTier({ price: Number(e.target.value) })} aria-label="Price" {...small} className={`${small.className} max-w-[80px]`} />
                              <RowMenu label={`Actions for ${tier.name}`} items={[
                                { label: tier.active ? 'Hide on site' : 'Show on site', icon: tier.active ? EyeOff : EyeIcon, onClick: () => setTier({ active: !tier.active }) },
                                ...(ti > 0 ? [{ label: 'Move up', icon: ChevronUp, onClick: () => { const u = [...rolloutPackages]; const t = [...u[pi].tiers]; [t[ti - 1], t[ti]] = [t[ti], t[ti - 1]]; u[pi] = { ...u[pi], tiers: t }; setRolloutPackages(u) } }] : []),
                                ...(ti < pkg.tiers.length - 1 ? [{ label: 'Move down', icon: ChevronDown, onClick: () => { const u = [...rolloutPackages]; const t = [...u[pi].tiers]; [t[ti], t[ti + 1]] = [t[ti + 1], t[ti]]; u[pi] = { ...u[pi], tiers: t }; setRolloutPackages(u) } }] : []),
                                { label: 'Delete tier', icon: Trash2, danger: true, onClick: () => { const u = [...rolloutPackages]; const t = [...u[pi].tiers]; t.splice(ti, 1); u[pi] = { ...u[pi], tiers: t }; setRolloutPackages(u) } },
                              ]} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input placeholder="Badge, e.g. Best Value" aria-label="Badge" value={tier.badge} onChange={e => setTier({ badge: e.target.value })} {...small} />
                              <input type="number" placeholder="Sale price" aria-label="Sale price" value={tier.salePrice || ''} onChange={e => setTier({ salePrice: e.target.value ? Number(e.target.value) : null })} {...small} />
                            </div>
                            <input placeholder="Description" aria-label="Description" value={tier.description} onChange={e => setTier({ description: e.target.value })} {...small} />
                            <label className="flex items-center gap-2 text-[12px]" style={{ color: theme.subtext }}>Campaigns a month
                              <input type="number" value={tier.campaigns} onChange={e => setTier({ campaigns: Number(e.target.value) })} {...small} className={`${small.className} max-w-[70px]`} />
                            </label>
                            <textarea rows={4} aria-label="Included services, one per line" value={[...tier.services, ...tier.extras].join('\n')}
                              onChange={e => setTier({ services: e.target.value.split('\n').filter((l: string) => l.trim()), extras: [] })} {...small} className={`${small.className} h-auto py-2`} />
                            <p className="text-[11px]" style={{ color: theme.subtext }}>Included services, one per line</p>
                          </div>
                        )
                      })}
                    </div>
                  </Panel>
                ))}
                <Button className="w-full" onClick={() => setRolloutPackages([...rolloutPackages, { id: gid(), label: 'New Package', tiers: [] }])}><Plus size={14} /> Add package type</Button>
              </div>
            )}

            {section === 'order' && (
              <Panel>
                <PanelTitle title="Page layout" sub="Order and visibility of the sections on your site" />
                <ul>
                  {sectionOrder.map((sec, i) => {
                    const labels: Record<string, string> = { booking: 'Book your design', portfolio: 'Featured work', rollout: 'Monthly rollout plans', testimonials: 'Reviews and testimonials' }
                    const isHidden = hiddenSections.includes(sec)
                    return (
                      <li key={sec} className="flex items-center gap-2 py-2.5" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                        <span className="w-6 text-center text-xs tnum" style={{ color: theme.subtext }}>{i + 1}</span>
                        <span className="flex-1 text-[13.5px]" style={{ color: isHidden ? theme.subtext : theme.text, textDecoration: isHidden ? 'line-through' : undefined }}>{labels[sec] || sec}</span>
                        <IconButton label={isHidden ? 'Show section' : 'Hide section'} onClick={() => setHiddenSections(h => (h.includes(sec) ? h.filter(s => s !== sec) : [...h, sec]))}>{isHidden ? <EyeOff size={15} /> : <Eye size={15} />}</IconButton>
                        <IconButton label="Move up" onClick={() => { if (i === 0) return; const u = [...sectionOrder]; [u[i - 1], u[i]] = [u[i], u[i - 1]]; setSectionOrder(u) }}><ChevronUp size={15} /></IconButton>
                        <IconButton label="Move down" onClick={() => { if (i === sectionOrder.length - 1) return; const u = [...sectionOrder]; [u[i], u[i + 1]] = [u[i + 1], u[i]]; setSectionOrder(u) }}><ChevronDown size={15} /></IconButton>
                      </li>
                    )
                  })}
                </ul>
              </Panel>
            )}

            <div className="md:hidden sticky bottom-4 flex gap-2">
              <a href="/bizzyplug" target="_blank" rel="noopener noreferrer"><Button><Eye size={14} /> Preview</Button></a>
              <Button className="flex-1" variant="primary" onClick={saveSiteSettings}>{siteSaved ? <><CheckCircle size={14} /> Published</> : <><Save size={14} /> Save and publish</>}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PROJECT DETAILS ═══ */}
      <Sheet
        open={!!openProject}
        onClose={() => setOpenProjectId(null)}
        title={openProject?.artistName || ''}
        sub={openProject ? `${typeLabel(openProject.projectType)} · ${STATUS_CONFIG[openProject.status]?.label || openProject.status}` : undefined}
        footer={openProject ? <>
          <Button variant="danger" ariaLabel="Delete project" onClick={() => { handleDelete(openProject.id); setOpenProjectId(null) }}><Trash2 size={14} /></Button>
          <Button className="flex-1" onClick={() => { handleEdit(openProject); setOpenProjectId(null) }}><Edit3 size={14} /> Edit</Button>
          <Button className="flex-1" variant="primary" onClick={() => setStatus(openProject.id, openProject.status === 'completed' ? 'new-lead' : 'completed')}>
            {openProject.status === 'completed' ? 'Reopen' : <><Check size={14} /> Mark complete</>}
          </Button>
        </> : undefined}
      >
        {openProject && (() => {
          const p: any = openProject
          const pct = p.quote > 0 ? Math.min(100, Math.round((p.paid / p.quote) * 100)) : 0
          return (
            <div className="space-y-4">
              {p.quote > 0 && (
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[22px] font-semibold tnum" style={{ color: theme.text }}>{fmt(p.paid)}</span>
                    <span className="text-xs tnum" style={{ color: theme.subtext }}>of {fmt(p.quote)} quoted</span>
                  </div>
                  <Bar pct={pct} color={pct >= 100 ? theme.ok : theme.accent} />
                </div>
              )}
              <ul className="space-y-2 text-[13.5px]">
                {p.email && <li className="flex items-center gap-2.5"><Mail size={15} style={{ color: theme.subtext }} /><a href={`mailto:${p.email}`} style={{ color: theme.accent }}>{p.email}</a></li>}
                {p.phone && <li className="flex items-center gap-2.5"><Phone size={15} style={{ color: theme.subtext }} /><a href={`tel:${p.phone}`} style={{ color: theme.accent }}>{p.phone}</a></li>}
                {p.instagram && <li className="flex items-center gap-2.5" style={{ color: theme.text }}><Instagram size={15} style={{ color: theme.subtext }} />{p.instagram}</li>}
                {p.deadline && <li className="flex items-center gap-2.5" style={{ color: theme.text }}><Clock size={15} style={{ color: theme.subtext }} />Due {p.deadline}</li>}
                {p.paymentMethod && <li className="flex items-center gap-2.5" style={{ color: theme.text }}><DollarSign size={15} style={{ color: theme.subtext }} />Paid by {p.paymentMethod}{p.paidDate ? ` on ${new Date(p.paidDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</li>}
              </ul>
              {p.songName && <div><p className="text-[11.5px] mb-0.5" style={{ color: theme.subtext }}>Song or project</p><p className="text-[13.5px]" style={{ color: theme.text }}>{p.songName}</p></div>}
              {p.details && <div><p className="text-[11.5px] mb-0.5" style={{ color: theme.subtext }}>Details</p><p className="text-[13.5px] whitespace-pre-wrap" style={{ color: theme.text }}>{p.details}</p></div>}
              {p.notes && <div><p className="text-[11.5px] mb-0.5" style={{ color: theme.subtext }}>Notes</p><p className="text-[13.5px] whitespace-pre-wrap" style={{ color: theme.text }}>{p.notes}</p></div>}
              {p.serviceDescriptions && Object.keys(p.serviceDescriptions).length > 0 && (
                <div>
                  <p className="text-[11.5px] mb-1" style={{ color: theme.subtext }}>Service details</p>
                  <ul className="rounded-xl px-3" style={{ backgroundColor: `${theme.text}06` }}>
                    {Object.entries(p.serviceDescriptions).map(([key, val], i) => (
                      <li key={key} className="py-2" style={{ borderTop: i ? `1px solid ${theme.border}` : undefined }}>
                        <p className="text-[12px] font-medium" style={{ color: theme.text }}>{key.includes('::') ? key.split('::').join(' · ') : key}</p>
                        <p className="text-[12.5px]" style={{ color: theme.subtext }}>{val as string}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.referenceUrls && p.referenceUrls.length > 0 && (
                <div>
                  <p className="text-[11.5px] mb-1" style={{ color: theme.subtext }}>Reference files · {p.referenceUrls.length}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {p.referenceUrls.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                        <img src={url} alt={`Reference ${idx + 1}`} className="w-full h-20 object-cover block" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[11.5px]" style={{ color: theme.subtext }}>Created {p.createdAt}</p>
            </div>
          )
        })()}
      </Sheet>

      {/* ═══ PROJECT FORM ═══ */}
      <Sheet
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Edit project' : 'New project'}
        footer={<>
          <Button className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!form.artistName} onClick={handleSaveProject}>{editId ? 'Save changes' : 'Save project'}</Button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3">
          {!editId && clientDb.length > 0 && (
            <Field label="Existing client (optional)" className="col-span-2">
              <select value={selectedClientId} onChange={e => {
                const cid = e.target.value
                setSelectedClientId(cid)
                if (cid) {
                  const c = clientDb.find(x => x.id === cid)
                  if (c) setForm(f => ({ ...f, artistName: c.artistName || '', email: c.email || '', phone: c.phone || '', instagram: c.instagram || '', clientId: c.id }))
                } else setForm(f => ({ ...f, artistName: '', email: '', phone: '', instagram: '', clientId: undefined }))
              }} {...field}>
                <option value="">New client</option>
                {[...clientDb].sort((a, b) => a.artistName.localeCompare(b.artistName)).map(c => <option key={c.id} value={c.id}>{c.artistName}{c.email ? ` · ${c.email}` : ''}</option>)}
              </select>
            </Field>
          )}
          <Field label="Artist or brand"><input value={form.artistName || ''} onChange={e => setForm(f => ({ ...f, artistName: e.target.value }))} autoFocus {...field} /></Field>
          <Field label="Instagram"><input value={form.instagram || ''} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@handle" {...field} /></Field>
          <Field label="Email"><input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} {...field} /></Field>
          <Field label="Phone"><input type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} {...field} /></Field>
          <Field label="Service">
            <select value={form.projectType || 'custom-artwork'} onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))} {...field}>
              {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status || 'new-lead'} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))} {...field}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Quote ($)"><input type="number" inputMode="decimal" value={form.quote || ''} onChange={e => setForm(f => ({ ...f, quote: Number(e.target.value) }))} {...field} /></Field>
          <Field label="Paid ($)"><input type="number" inputMode="decimal" value={form.paid || ''} onChange={e => setForm(f => ({ ...f, paid: Number(e.target.value) }))} {...field} /></Field>
          <Field label="Deadline"><input type="date" value={form.deadline || ''} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} {...field} /></Field>
          <Field label="Paid with">
            <select value={form.paymentMethod || ''} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} {...field}>
              <option value="">Not paid</option>
              <option value="cashapp">Cash App</option>
              <option value="paypal">PayPal</option>
              <option value="venmo">Venmo</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Song or project name" className="col-span-2"><input value={form.songName || ''} onChange={e => setForm(f => ({ ...f, songName: e.target.value }))} {...field} /></Field>
          <Field label="Details" className="col-span-2"><textarea rows={3} value={form.details || ''} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} {...area} /></Field>
          <Field label="Private notes" className="col-span-2"><textarea rows={2} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} {...area} /></Field>
        </div>
      </Sheet>

      {/* ═══ CLIENT FORM ═══ */}
      <Sheet
        open={showClientForm}
        onClose={() => setShowClientForm(false)}
        title={editClientId ? 'Edit client' : 'Add client'}
        footer={<>
          <Button className="flex-1" onClick={() => setShowClientForm(false)}>Cancel</Button>
          <Button className="flex-1" variant="primary" disabled={!clientForm.artistName} onClick={saveClientForm}>{editClientId ? 'Save changes' : 'Save client'}</Button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Artist or brand" className="col-span-2"><input value={clientForm.artistName || ''} onChange={e => setClientForm(f => ({ ...f, artistName: e.target.value }))} autoFocus {...field} /></Field>
          <Field label="Instagram"><input value={clientForm.instagram || ''} onChange={e => setClientForm(f => ({ ...f, instagram: e.target.value }))} {...field} /></Field>
          <Field label="Phone"><input type="tel" value={clientForm.phone || ''} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} {...field} /></Field>
          <Field label="Email" className="col-span-2"><input type="email" value={clientForm.email || ''} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} {...field} /></Field>
          <Field label="Notes" className="col-span-2"><textarea rows={3} value={clientForm.notes || ''} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} {...area} /></Field>
        </div>
      </Sheet>
    </PageShell>
  )
}
