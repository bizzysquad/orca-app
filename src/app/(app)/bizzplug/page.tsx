'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette, Plus, Trash2, Edit3, DollarSign, CheckCircle,
  Clock, AlertCircle, X, User, Phone, Mail, FileText,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { fmt } from '@/lib/utils'

const BIZ_GOLD = '#F59E0B'

function gid() { return Math.random().toString(36).slice(2, 10) }

type ClientStatus = 'lead' | 'pending' | 'active' | 'completed' | 'paused'
type ProjectType = 'logo' | 'album-cover' | 'flyer' | 'branding' | 'social-media' | 'other'

interface BizClient {
  id: string
  name: string
  email?: string
  phone?: string
  projectType: ProjectType
  status: ClientStatus
  quote: number
  paid: number
  notes?: string
  createdAt: string
  deadline?: string
}

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string; icon: React.ElementType }> = {
  lead:      { label: 'Lead',      color: '#94A3B8', icon: AlertCircle },
  pending:   { label: 'Pending',   color: BIZ_GOLD,  icon: Clock },
  active:    { label: 'Active',    color: '#6366F1', icon: CheckCircle },
  completed: { label: 'Completed', color: '#10B981', icon: CheckCircle },
  paused:    { label: 'Paused',    color: '#EC4899', icon: AlertCircle },
}

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'logo',         label: 'Logo Design' },
  { value: 'album-cover',  label: 'Album Cover' },
  { value: 'flyer',        label: 'Flyer / Poster' },
  { value: 'branding',     label: 'Full Branding' },
  { value: 'social-media', label: 'Social Media Kit' },
  { value: 'other',        label: 'Other' },
]

const BLANK = (): Partial<BizClient> => ({
  name: '',
  email: '',
  phone: '',
  projectType: 'logo',
  status: 'lead',
  quote: 0,
  paid: 0,
  notes: '',
  deadline: '',
})

export default function BizzyPlugPage() {
  const { theme } = useTheme()
  const [clients, setClients] = useState<BizClient[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<BizClient>>(BLANK())
  const [filterStatus, setFilterStatus] = useState<ClientStatus | 'all'>('all')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-bizzplug-clients')
      if (saved) setClients(JSON.parse(saved))
    } catch {}
  }, [])

  const persist = (updated: BizClient[]) => {
    setClients(updated)
    try { localStorage.setItem('orca-bizzplug-clients', JSON.stringify(updated)) } catch {}
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
        projectType: form.projectType || 'logo',
        status: form.status || 'lead',
        quote: Number(form.quote) || 0,
        paid: Number(form.paid) || 0,
        notes: form.notes || '',
        deadline: form.deadline || '',
        createdAt: new Date().toISOString().slice(0, 10),
      }
      persist([client, ...clients])
    }
    setForm(BLANK())
    setShowForm(false)
  }

  const handleEdit = (c: BizClient) => {
    setForm(c)
    setEditId(c.id)
    setShowForm(true)
  }

  const handleDelete = (id: string) => persist(clients.filter(c => c.id !== id))

  const visible = filterStatus === 'all' ? clients : clients.filter(c => c.status === filterStatus)

  const totalRevenue = clients.filter(c => c.status === 'completed').reduce((s, c) => s + c.paid, 0)
  const totalOutstanding = clients.filter(c => c.status !== 'completed').reduce((s, c) => s + (c.quote - c.paid), 0)
  const activeCount = clients.filter(c => c.status === 'active').length

  return (
    <div style={{ backgroundColor: theme.bg }} className="min-h-screen pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 backdrop-blur-xl border-b px-4 py-4 sm:px-6"
        style={{ backgroundColor: `${theme.bg}95`, borderColor: theme.border }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text }}>BizzyPlug</h1>
            <p className="text-sm mt-0.5" style={{ color: theme.textM }}>Graphic design client manager</p>
          </div>
          <button
            onClick={() => { setForm(BLANK()); setEditId(null); setShowForm(true) }}
            className="px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ backgroundColor: BIZ_GOLD, color: '#0a0a0a' }}
          >
            + Add Client
          </button>
        </div>
      </motion.div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Revenue', value: fmt(totalRevenue), color: '#10B981' },
            { label: 'Outstanding', value: fmt(totalOutstanding), color: BIZ_GOLD },
            { label: 'Active Jobs', value: String(activeCount), color: '#6366F1' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-4 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-xs font-medium mb-1" style={{ color: theme.textM }}>{s.label}</p>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'lead', 'pending', 'active', 'completed', 'paused'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all"
              style={{
                backgroundColor: filterStatus === s ? BIZ_GOLD : theme.card,
                color: filterStatus === s ? '#0a0a0a' : theme.textM,
                border: `1px solid ${theme.border}`,
              }}
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
              {s !== 'all' && ` (${clients.filter(c => c.status === s).length})`}
            </button>
          ))}
        </div>

        {/* Client List */}
        {visible.length === 0 ? (
          <div className="rounded-2xl p-10 text-center" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
            <Palette size={32} className="mx-auto mb-3 opacity-30" style={{ color: BIZ_GOLD }} />
            <p className="text-sm" style={{ color: theme.textM }}>No clients yet. Add your first client!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(client => {
              const cfg = STATUS_CONFIG[client.status]
              const StatusIcon = cfg.icon
              const balance = client.quote - client.paid
              const pct = client.quote > 0 ? Math.min(100, Math.round((client.paid / client.quote) * 100)) : 0
              return (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold" style={{ color: theme.text }}>{client.name}</h3>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: theme.textM }}>
                        {PROJECT_TYPES.find(t => t.value === client.projectType)?.label}
                        {client.deadline ? ` · Due ${client.deadline}` : ''}
                      </p>
                      {(client.email || client.phone) && (
                        <p className="text-xs mt-1" style={{ color: theme.textM }}>
                          {client.email}{client.email && client.phone ? ' · ' : ''}{client.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEdit(client)}
                        className="p-1.5 rounded-lg"
                        style={{ backgroundColor: `${BIZ_GOLD}18`, color: BIZ_GOLD }}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-1.5 rounded-lg"
                        style={{ backgroundColor: '#EF444420', color: '#EF4444' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Payment progress */}
                  {client.quote > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1" style={{ color: theme.textM }}>
                        <span>Paid: <span className="font-bold" style={{ color: '#10B981' }}>{fmt(client.paid)}</span></span>
                        <span>Quote: <span className="font-bold" style={{ color: BIZ_GOLD }}>{fmt(client.quote)}</span></span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#10B981' : BIZ_GOLD }} />
                      </div>
                      {balance > 0 && (
                        <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                          {fmt(balance)} outstanding
                        </p>
                      )}
                    </div>
                  )}

                  {client.notes && (
                    <p className="text-xs mt-2 italic" style={{ color: theme.textM }}>"{client.notes}"</p>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              style={{ backgroundColor: theme.card, borderColor: theme.border }}
              className="w-full border-t rounded-t-3xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-xl" style={{ color: theme.text }}>
                  {editId ? 'Edit Client' : 'Add Client'}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl" style={{ backgroundColor: theme.border }}>
                  <X size={16} style={{ color: theme.text }} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Client Name *</label>
                  <input type="text" placeholder="Client or business name" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Email</label>
                  <input type="email" placeholder="email@example.com" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Phone</label>
                  <input type="tel" placeholder="(555) 000-0000" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Project Type</label>
                  <select value={form.projectType || 'logo'} onChange={e => setForm(f => ({ ...f, projectType: e.target.value as ProjectType }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}>
                    {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Status</label>
                  <select value={form.status || 'lead'} onChange={e => setForm(f => ({ ...f, status: e.target.value as ClientStatus }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Quote ($)</label>
                  <input type="number" placeholder="0.00" step="0.01" value={form.quote || ''} onChange={e => setForm(f => ({ ...f, quote: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Paid ($)</label>
                  <input type="number" placeholder="0.00" step="0.01" value={form.paid || ''} onChange={e => setForm(f => ({ ...f, paid: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Deadline</label>
                  <input type="date" value={form.deadline || ''} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold block mb-1" style={{ color: theme.textM }}>Notes</label>
                  <textarea rows={2} placeholder="Project details, requirements, etc." value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm resize-none" style={{ backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }} />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={!form.name}
                className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ backgroundColor: BIZ_GOLD, color: '#0a0a0a' }}
              >
                {editId ? '✓ Update Client' : '+ Save Client'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
