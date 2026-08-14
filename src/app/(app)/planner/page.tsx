'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Edit3, X, Check, RefreshCw,
  CalendarDays, Utensils, Dumbbell, TrendingUp, Car, Briefcase, MapPin, Calendar, Sparkles,
  DollarSign,
} from 'lucide-react'
import { useOrcaData } from '@/context/OrcaDataContext'
import { useTheme } from '@/context/ThemeContext'
import { setLocalSynced } from '@/lib/syncLocal'
import { fmt, fmtD, gid, today, addD } from '@/lib/utils'
import { getDefaultWeekdayTemplates, getBlocksForDate, getFinancialRemindersForDate, getLifeTaskRemindersForDate } from '@/lib/planner'
import type { PlannerBlock, PlannerBlockType, Subscription } from '@/lib/types'
import {
  getDefaultLaundrySettings, getDefaultLiquorSettings, DAILY_BUDGET,
  getDailySpending, getWeeklySpending,
  type LaundrySettings, type LiquorSettings, type SpendingEntry,
} from '@/lib/lifeTasks'
import { getDefaultGrocerySettings, type GrocerySettings } from '@/lib/grocery'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TYPE_META: Record<PlannerBlockType, { icon: React.ComponentType<any>; color: string; label: string }> = {
  meal: { icon: Utensils, color: '#F59E0B', label: 'Meal' },
  workout: { icon: Dumbbell, color: '#EC4899', label: 'Workout' },
  trade: { icon: TrendingUp, color: '#10B981', label: 'Trade' },
  drive: { icon: Car, color: '#6366F1', label: 'Drive' },
  work: { icon: Briefcase, color: '#3B82F6', label: 'Work' },
  errand: { icon: MapPin, color: '#8B5CF6', label: 'Errand' },
  appointment: { icon: Calendar, color: '#F43F5E', label: 'Appointment' },
  custom: { icon: Sparkles, color: '#6B7280', label: 'Custom' },
}

interface PlannerTaskRef {
  id: string
  text: string
  completed: boolean
  dueDate?: string
}

const emptyBlockForm = { startTime: '09:00', endTime: '10:00', label: '', type: 'custom' as PlannerBlockType, notes: '' }

export default function PlannerPage() {
  const { data } = useOrcaData()
  const { theme } = useTheme()

  const [selectedDate, setSelectedDate] = useState(today())
  const [editMode, setEditMode] = useState<'day' | 'template'>('day')

  const [templates, setTemplates] = useState<Record<number, PlannerBlock[]>>(() => {
    try {
      const saved = localStorage.getItem('orca-planner-templates')
      return saved ? JSON.parse(saved) : getDefaultWeekdayTemplates()
    } catch { return getDefaultWeekdayTemplates() }
  })
  const [overrides, setOverrides] = useState<Record<string, PlannerBlock[]>>(() => {
    try { return JSON.parse(localStorage.getItem('orca-planner-overrides') || '{}') } catch { return {} }
  })
  const [subscriptions] = useState<Subscription[]>(() => {
    try { return JSON.parse(localStorage.getItem('orca-subscriptions') || '[]') } catch { return [] }
  })
  const [tasks] = useState<PlannerTaskRef[]>(() => {
    try { return JSON.parse(localStorage.getItem('orca-tasks') || '[]') } catch { return [] }
  })

  const [laundrySettings, setLaundrySettings] = useState<LaundrySettings>(() => {
    try {
      const saved = localStorage.getItem('orca-laundry-settings')
      return saved ? JSON.parse(saved) : getDefaultLaundrySettings()
    } catch { return getDefaultLaundrySettings() }
  })
  const [liquorSettings, setLiquorSettings] = useState<LiquorSettings>(() => {
    try {
      const saved = localStorage.getItem('orca-liquor-settings')
      return saved ? JSON.parse(saved) : getDefaultLiquorSettings()
    } catch { return getDefaultLiquorSettings() }
  })
  // Grocery re-up day is edited on /grocery — read-only here.
  const [grocerySettings] = useState<GrocerySettings>(() => {
    try {
      const saved = localStorage.getItem('orca-grocery-settings')
      return saved ? JSON.parse(saved) : getDefaultGrocerySettings()
    } catch { return getDefaultGrocerySettings() }
  })
  const [spendingEntries, setSpendingEntries] = useState<SpendingEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('orca-daily-spending') || '[]') } catch { return [] }
  })
  const [spendForm, setSpendForm] = useState({ amount: '', description: '' })

  const [showBlockForm, setShowBlockForm] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [blockForm, setBlockForm] = useState(emptyBlockForm)

  const weekday = new Date(selectedDate + 'T00:00:00').getDay()
  const isOverridden = !!overrides[selectedDate]

  const persistTemplates = (updated: Record<number, PlannerBlock[]>) => {
    setTemplates(updated)
    try { setLocalSynced('orca-planner-templates', JSON.stringify(updated)) } catch {}
  }
  const persistOverrides = (updated: Record<string, PlannerBlock[]>) => {
    setOverrides(updated)
    try { setLocalSynced('orca-planner-overrides', JSON.stringify(updated)) } catch {}
  }
  const persistLaundrySettings = (updated: LaundrySettings) => {
    setLaundrySettings(updated)
    try { setLocalSynced('orca-laundry-settings', JSON.stringify(updated)) } catch {}
  }
  const persistLiquorSettings = (updated: LiquorSettings) => {
    setLiquorSettings(updated)
    try { setLocalSynced('orca-liquor-settings', JSON.stringify(updated)) } catch {}
  }
  const persistSpendingEntries = (updated: SpendingEntry[]) => {
    setSpendingEntries(updated)
    try { setLocalSynced('orca-daily-spending', JSON.stringify(updated)) } catch {}
  }

  const displayedBlocks = useMemo(() => {
    if (editMode === 'template') return [...(templates[weekday] || [])].sort((a, b) => a.startTime.localeCompare(b.startTime))
    return getBlocksForDate(selectedDate, templates, overrides)
  }, [editMode, templates, overrides, selectedDate, weekday])

  const reminders = useMemo(() => getFinancialRemindersForDate(selectedDate, data.bills, subscriptions), [selectedDate, data.bills, subscriptions])
  const tasksDueToday = useMemo(() => tasks.filter(t => !t.completed && t.dueDate === selectedDate), [tasks, selectedDate])
  const lifeTaskReminders = useMemo(
    () => getLifeTaskRemindersForDate(selectedDate, laundrySettings, liquorSettings, grocerySettings.reUpDay),
    [selectedDate, laundrySettings, liquorSettings, grocerySettings]
  )

  const dailySpent = useMemo(() => getDailySpending(spendingEntries, selectedDate), [spendingEntries, selectedDate])
  const weeklySpent = useMemo(() => getWeeklySpending(spendingEntries, selectedDate), [spendingEntries, selectedDate])
  const dailyRemaining = DAILY_BUDGET - dailySpent
  const entriesForDate = spendingEntries.filter(e => e.date === selectedDate)

  const logSpending = () => {
    const amount = parseFloat(spendForm.amount)
    if (!amount || amount <= 0) return
    const entry: SpendingEntry = { id: gid(), date: selectedDate, amount, description: spendForm.description || 'Spending' }
    persistSpendingEntries([...spendingEntries, entry])
    setSpendForm({ amount: '', description: '' })
  }

  const deleteSpending = (id: string) => persistSpendingEntries(spendingEntries.filter(e => e.id !== id))

  const resetForm = () => {
    setBlockForm(emptyBlockForm)
    setShowBlockForm(false)
    setEditingBlockId(null)
  }

  const saveBlock = () => {
    if (!blockForm.label || !blockForm.startTime || !blockForm.endTime) return
    const newBlock: PlannerBlock = {
      id: editingBlockId || gid(),
      startTime: blockForm.startTime,
      endTime: blockForm.endTime,
      label: blockForm.label,
      type: blockForm.type,
      notes: blockForm.notes || undefined,
    }

    if (editMode === 'template') {
      const current = templates[weekday] || []
      const updated = editingBlockId ? current.map(b => b.id === editingBlockId ? newBlock : b) : [...current, newBlock]
      persistTemplates({ ...templates, [weekday]: updated })
    } else {
      const base = overrides[selectedDate] || getBlocksForDate(selectedDate, templates, overrides)
      const updated = editingBlockId ? base.map(b => b.id === editingBlockId ? newBlock : b) : [...base, newBlock]
      persistOverrides({ ...overrides, [selectedDate]: updated })
    }
    resetForm()
  }

  const startEditBlock = (b: PlannerBlock) => {
    setEditingBlockId(b.id)
    setBlockForm({ startTime: b.startTime, endTime: b.endTime, label: b.label, type: b.type, notes: b.notes || '' })
    setShowBlockForm(true)
  }

  const deleteBlock = (id: string) => {
    if (editMode === 'template') {
      persistTemplates({ ...templates, [weekday]: (templates[weekday] || []).filter(b => b.id !== id) })
    } else {
      const base = overrides[selectedDate] || getBlocksForDate(selectedDate, templates, overrides)
      persistOverrides({ ...overrides, [selectedDate]: base.filter(b => b.id !== id) })
    }
  }

  const resetDayToTemplate = () => {
    const updated = { ...overrides }
    delete updated[selectedDate]
    persistOverrides(updated)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
        <CalendarDays size={20} style={{ color: theme.accent }} />
        <h1 className="text-lg font-bold" style={{ color: theme.text }}>Day Planner</h1>
      </motion.div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setEditMode('day')}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
          style={{ backgroundColor: editMode === 'day' ? theme.accent : theme.card, color: editMode === 'day' ? '#fff' : theme.textM, border: `1px solid ${editMode === 'day' ? theme.accent : theme.border}` }}
        >
          This Day
        </button>
        <button
          onClick={() => setEditMode('template')}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
          style={{ backgroundColor: editMode === 'template' ? theme.accent : theme.card, color: editMode === 'template' ? '#fff' : theme.textM, border: `1px solid ${editMode === 'template' ? theme.accent : theme.border}` }}
        >
          Edit {WEEKDAY_NAMES[weekday]} Template
        </button>
      </div>

      {/* Recurring Life Tasks settings */}
      <div className="rounded-2xl p-3 space-y-2.5" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: theme.textS }}>Recurring Life Tasks</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: theme.text }}>🧺 Laundry Day</span>
          <select
            value={laundrySettings.day}
            onChange={e => persistLaundrySettings({ ...laundrySettings, day: Number(e.target.value) })}
            className="text-xs font-semibold rounded-lg px-2 py-1.5 outline-none"
            style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.accent }}
          >
            {WEEKDAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold" style={{ color: theme.text }}>
            <input type="checkbox" checked={liquorSettings.enabled} onChange={e => persistLiquorSettings({ ...liquorSettings, enabled: e.target.checked })} />
            🍾 Liquor Re-Up <span style={{ color: theme.textS }}>(optional)</span>
          </label>
          <select
            value={liquorSettings.day}
            disabled={!liquorSettings.enabled}
            onChange={e => persistLiquorSettings({ ...liquorSettings, day: Number(e.target.value) })}
            className="text-xs font-semibold rounded-lg px-2 py-1.5 outline-none disabled:opacity-40"
            style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.accent }}
          >
            {WEEKDAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: theme.text }}>🛒 Grocery Re-Up Day</span>
          <span className="text-xs" style={{ color: theme.textM }}>{WEEKDAY_NAMES[grocerySettings.reUpDay]} · set on Grocery page</span>
        </div>
      </div>

      {editMode === 'day' && (
        <>
          {/* Date navigator */}
          <div className="flex items-center justify-between rounded-2xl p-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <button onClick={() => setSelectedDate(addD(selectedDate, -1))} className="p-2 rounded-lg" style={{ color: theme.textM }}>
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: theme.text }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              {selectedDate !== today() && (
                <button onClick={() => setSelectedDate(today())} className="text-[10px] font-semibold" style={{ color: theme.accent }}>Jump to Today</button>
              )}
            </div>
            <button onClick={() => setSelectedDate(addD(selectedDate, 1))} className="p-2 rounded-lg" style={{ color: theme.textM }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {isOverridden && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: `${theme.accent}10`, border: `1px solid ${theme.accent}30` }}>
              <span className="text-xs" style={{ color: theme.textM }}>This day has been customized from the {WEEKDAY_NAMES[weekday]} template.</span>
              <button onClick={resetDayToTemplate} className="flex items-center gap-1 text-xs font-bold flex-shrink-0" style={{ color: theme.accent }}>
                <RefreshCw size={11} /> Reset to template
              </button>
            </div>
          )}

          {/* Reminders strip */}
          {(reminders.length > 0 || tasksDueToday.length > 0 || lifeTaskReminders.length > 0) && (
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: theme.textS }}>Today's Reminders</p>
              {reminders.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span style={{ color: theme.text }}>{r.kind === 'bill' ? '💳' : '🔁'} {r.label}</span>
                  <span className="font-semibold" style={{ color: theme.textM }}>{fmt(r.amount)}</span>
                </div>
              ))}
              {lifeTaskReminders.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span style={{ color: theme.text }}>{r.kind === 'laundry' ? '🧺' : r.kind === 'liquor' ? '🍾' : '🛒'} {r.label}</span>
                </div>
              ))}
              {tasksDueToday.map(t => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span style={{ color: theme.text }}>✓ {t.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Daily Spending */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={14} style={{ color: theme.accent }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.textS }}>Daily Spending</span>
              </div>
              <span className="text-sm font-bold" style={{ color: dailyRemaining < 0 ? theme.bad : theme.accent }}>
                {fmt(dailySpent)} / {fmt(DAILY_BUDGET)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: theme.border }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (dailySpent / DAILY_BUDGET) * 100)}%`, background: dailyRemaining < 0 ? theme.bad : theme.accent, transition: 'width 0.3s ease' }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: theme.textM }}>
                {dailyRemaining >= 0 ? `${fmt(dailyRemaining)} remaining today` : `${fmt(Math.abs(dailyRemaining))} over today`}
              </span>
              <span style={{ color: theme.textM }}>{fmt(weeklySpent)} this week</span>
            </div>

            {entriesForDate.length > 0 && (
              <div className="space-y-1 pt-1">
                {entriesForDate.map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg" style={{ background: theme.bg }}>
                    <span style={{ color: theme.text }}>{e.description}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: theme.textM }}>{fmt(e.amount)}</span>
                      <button onClick={() => deleteSpending(e.id)} style={{ color: theme.textM }}><X size={11} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input type="number" value={spendForm.amount} onChange={e => setSpendForm({ ...spendForm, amount: e.target.value })} placeholder="Amount" className="w-24 px-3 py-2 rounded-lg border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
              <input value={spendForm.description} onChange={e => setSpendForm({ ...spendForm, description: e.target.value })} placeholder="What for?" className="flex-1 px-3 py-2 rounded-lg border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
              <button onClick={logSpending} disabled={!spendForm.amount} className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40" style={{ background: theme.accent, color: '#fff' }}>Log</button>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Block */}
      {!showBlockForm && (
        <button onClick={() => setShowBlockForm(true)} className="flex items-center justify-center gap-1 w-full py-2.5 rounded-xl text-xs font-bold" style={{ background: `${theme.accent}15`, color: theme.accent, border: `1px solid ${theme.accent}30` }}>
          <Plus size={12} /> Add Block
        </button>
      )}

      <AnimatePresence>
        {showBlockForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="rounded-xl p-4 space-y-3" style={{ background: `${theme.accent}08`, border: `1px solid ${theme.accent}25` }}>
            <p className="text-xs font-bold" style={{ color: theme.accent }}>{editingBlockId ? 'Edit Block' : 'Add Block'}</p>
            <input value={blockForm.label} onChange={e => setBlockForm({ ...blockForm, label: e.target.value })} placeholder="Label *" className="w-full px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
            <div className="grid grid-cols-2 gap-2">
              <input type="time" value={blockForm.startTime} onChange={e => setBlockForm({ ...blockForm, startTime: e.target.value })} className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
              <input type="time" value={blockForm.endTime} onChange={e => setBlockForm({ ...blockForm, endTime: e.target.value })} className="px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
            </div>
            <select value={blockForm.type} onChange={e => setBlockForm({ ...blockForm, type: e.target.value as PlannerBlockType })} className="w-full px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}>
              {Object.entries(TYPE_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
            <input value={blockForm.notes} onChange={e => setBlockForm({ ...blockForm, notes: e.target.value })} placeholder="Notes (optional)" className="w-full px-3 py-2 rounded-xl border text-sm" style={{ background: theme.bg, borderColor: theme.border, color: theme.text }} />
            <div className="flex gap-2">
              <button onClick={resetForm} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: theme.card, color: theme.textM }}>Cancel</button>
              <button onClick={saveBlock} disabled={!blockForm.label} className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-40" style={{ background: theme.accent, color: '#fff' }}>
                {editingBlockId ? 'Save Changes' : 'Add Block'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      <div className="space-y-2">
        {displayedBlocks.length === 0 && (
          <div className="rounded-2xl p-5 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <CalendarDays size={24} className="mx-auto mb-2" style={{ color: theme.textM, opacity: 0.5 }} />
            <p className="text-sm" style={{ color: theme.textM }}>No blocks scheduled</p>
          </div>
        )}
        {displayedBlocks.map(b => {
          const meta = TYPE_META[b.type]
          const Icon = meta.icon
          return (
            <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}20`, color: meta.color }}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{b.label}</p>
                <p className="text-xs" style={{ color: theme.textM }}>{b.startTime}–{b.endTime}{b.notes ? ` · ${b.notes}` : ''}</p>
              </div>
              <button onClick={() => startEditBlock(b)} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: theme.textM }}><Edit3 size={14} /></button>
              <button onClick={() => deleteBlock(b.id)} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: theme.bad }}><Trash2 size={14} /></button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
