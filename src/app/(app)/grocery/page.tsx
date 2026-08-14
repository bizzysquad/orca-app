'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, Plus, ArrowLeft, Sparkles, AlertTriangle,
  Check, Trash2, ChevronRight, RefreshCw, Package,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import type { GroceryItem, GroceryCategory } from '@/lib/types'
import { setLocalSynced } from '@/lib/syncLocal'
import { CAT_CONFIG, getSuggestedGroceries, getStaplesRunningLow, getDefaultGrocerySettings, type GrocerySettings, WEEKDAY_NAMES } from '@/lib/grocery'

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'
const BENTLEY_GREEN = '#10B981'
const BENTLEY_RED = '#EF4444'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

const MEAL_PLAN_SUGGESTIONS = getSuggestedGroceries()

function getExpiryStatus(item: GroceryItem): { label: string; color: string; urgent: boolean } {
  if (!item.expirationDate) return { label: '', color: '', urgent: false }
  const today = new Date()
  const exp = new Date(item.expirationDate + 'T00:00:00')
  const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: 'Expired', color: BENTLEY_RED, urgent: true }
  if (diff <= 2) return { label: `Exp in ${diff}d`, color: BENTLEY_RED, urgent: true }
  if (diff <= 5) return { label: `Exp in ${diff}d`, color: BENTLEY_GOLD, urgent: false }
  return { label: `${diff}d left`, color: BENTLEY_GREEN, urgent: false }
}

const BLANK_ITEM = (): Partial<GroceryItem> => ({
  name: '',
  category: 'protein' as GroceryCategory,
  quantity: 1,
  unit: 'item',
  purchaseDate: new Date().toISOString().slice(0, 10),
})

export default function GroceryPage() {
  const { theme } = useTheme()
  const [items, setItems] = useState<GroceryItem[]>([])
  const [filterCat, setFilterCat] = useState<GroceryCategory | 'all'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [newItem, setNewItem] = useState<Partial<GroceryItem>>(BLANK_ITEM())
  const [grocerySettings, setGrocerySettings] = useState<GrocerySettings>(() => {
    try {
      const saved = localStorage.getItem('orca-grocery-settings')
      return saved ? JSON.parse(saved) : getDefaultGrocerySettings()
    } catch { return getDefaultGrocerySettings() }
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-grocery')
      if (saved) setItems(JSON.parse(saved))
    } catch {}
  }, [])

  const save = (i: GroceryItem[]) => {
    try { setLocalSynced('orca-grocery', JSON.stringify(i)) } catch {}
  }

  const saveGrocerySettings = (s: GrocerySettings) => {
    setGrocerySettings(s)
    try { setLocalSynced('orca-grocery-settings', JSON.stringify(s)) } catch {}
  }

  const addItem = (suggestion?: { name: string; category: GroceryCategory }) => {
    const item: GroceryItem = {
      id: Date.now().toString(),
      name: suggestion?.name || newItem.name || '',
      category: suggestion?.category || (newItem.category as GroceryCategory) || 'household',
      quantity: newItem.quantity || 1,
      unit: newItem.unit || 'item',
      purchaseDate: newItem.purchaseDate || new Date().toISOString().slice(0, 10),
      expirationDate: newItem.expirationDate,
      calories: newItem.calories,
      protein: newItem.protein,
      estimatedDays: newItem.estimatedDays,
      lowStockThreshold: newItem.lowStockThreshold,
    }
    if (!item.name) return
    const next = [...items, item]
    setItems(next)
    save(next)
    setNewItem(BLANK_ITEM())
    setShowAddModal(false)
  }

  const removeItem = (id: string) => {
    const next = items.filter(i => i.id !== id)
    setItems(next)
    save(next)
  }

  const filtered = useMemo(() => {
    if (filterCat === 'all') return items
    return items.filter(i => i.category === filterCat)
  }, [items, filterCat])

  const alerts = useMemo(() => {
    return items.filter(i => {
      const s = getExpiryStatus(i)
      return s.urgent
    })
  }, [items])

  const byCategory = useMemo(() => {
    const groups: Partial<Record<GroceryCategory, GroceryItem[]>> = {}
    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category]!.push(item)
    })
    return groups
  }, [filtered])

  const totalCalories = useMemo(() =>
    items.reduce((s, i) => s + ((i.calories || 0) * i.quantity), 0),
    [items]
  )
  const totalProtein = useMemo(() =>
    items.reduce((s, i) => s + ((i.protein || 0) * i.quantity), 0),
    [items]
  )
  const staplesRunningLow = useMemo(() => getStaplesRunningLow(items), [items])

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg, color: theme.text }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 sticky top-0 z-10"
        style={{ background: `${theme.bg}f0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <div className="p-2 rounded-xl" style={{ background: theme.card }}>
              <ArrowLeft size={16} style={{ color: theme.subtext }} />
            </div>
          </Link>
          <div>
            <h1 className="text-lg font-bold" style={{ color: theme.text }}>Grocery</h1>
            <p className="text-xs" style={{ color: theme.subtext }}>{items.length} items tracked</p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="p-2 rounded-xl"
            style={{ background: `${BENTLEY_GOLD}18`, color: BENTLEY_GOLD }}
          >
            <Sparkles size={16} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            style={{ background: `${BENTLEY_GREEN}18`, color: BENTLEY_GREEN, border: `1px solid ${BENTLEY_GREEN}30` }}
          >
            <Plus size={12} /> Add
          </motion.button>
        </div>
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        className="px-4 pt-4 space-y-5 max-w-lg mx-auto lg:max-w-3xl"
      >
        {/* ── Grocery Re-Up Day ── */}
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-2">
              <RefreshCw size={14} style={{ color: BENTLEY_INDIGO }} />
              <span className="text-xs font-semibold" style={{ color: theme.text }}>Grocery Re-Up Day</span>
            </div>
            <select
              value={grocerySettings.reUpDay}
              onChange={e => saveGrocerySettings({ ...grocerySettings, reUpDay: Number(e.target.value) })}
              className="text-xs font-semibold rounded-lg px-2 py-1.5 outline-none"
              style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: BENTLEY_INDIGO }}
            >
              {WEEKDAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
            </select>
          </div>
        </motion.div>

        {/* ── Staples Running Low ── */}
        {staplesRunningLow.length > 0 && (
          <motion.div variants={fadeUp}>
            <div className="rounded-2xl p-4" style={{ background: `${BENTLEY_GOLD}10`, border: `1px solid ${BENTLEY_GOLD}30` }}>
              <div className="flex items-center gap-2 mb-2">
                <Package size={14} style={{ color: BENTLEY_GOLD }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: BENTLEY_GOLD }}>
                  Running Low
                </span>
              </div>
              {staplesRunningLow.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <span className="text-sm" style={{ color: theme.text }}>{item.name}</span>
                  <span className="text-xs font-bold" style={{ color: BENTLEY_GOLD }}>Restock soon</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Expiry Alerts ── */}
        {alerts.length > 0 && (
          <motion.div variants={fadeUp}>
            <div
              className="rounded-2xl p-4"
              style={{ background: `${BENTLEY_RED}10`, border: `1px solid ${BENTLEY_RED}30` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} style={{ color: BENTLEY_RED }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: BENTLEY_RED }}>
                  Expiring Soon
                </span>
              </div>
              {alerts.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <span className="text-sm" style={{ color: theme.text }}>{item.name}</span>
                  <span className="text-xs font-bold" style={{ color: BENTLEY_RED }}>
                    {getExpiryStatus(item).label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Summary ── */}
        {items.length > 0 && (
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="text-lg font-bold" style={{ color: theme.text }}>{items.length}</div>
              <div className="text-[10px]" style={{ color: theme.subtext }}>Items</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="text-lg font-bold" style={{ color: BENTLEY_GREEN }}>{totalCalories.toLocaleString()}</div>
              <div className="text-[10px]" style={{ color: theme.subtext }}>Total Cal</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="text-lg font-bold" style={{ color: BENTLEY_INDIGO }}>{totalProtein}g</div>
              <div className="text-[10px]" style={{ color: theme.subtext }}>Total Protein</div>
            </div>
          </motion.div>
        )}

        {/* ── Bentley Suggestions ── */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              variants={fadeUp}
              className="overflow-hidden"
            >
              <div
                className="rounded-2xl p-4"
                style={{ background: `linear-gradient(135deg, #0F1A35, #141B2D)`, border: `1px solid ${BENTLEY_GOLD}25` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={13} style={{ color: BENTLEY_GOLD }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>
                    From Your Meal Plan
                  </span>
                </div>
                <div className="space-y-2">
                  {MEAL_PLAN_SUGGESTIONS.map(s => (
                    <motion.button
                      key={s.name}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        addItem(s)
                        // don't close suggestions
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: `rgba(255,255,255,0.04)`, border: `1px solid rgba(255,255,255,0.06)` }}
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium" style={{ color: '#F8FAFC' }}>{s.name}</p>
                        <p className="text-xs" style={{ color: '#94A3B8' }}>{CAT_CONFIG[s.category].label}</p>
                      </div>
                      <Plus size={14} style={{ color: BENTLEY_GOLD }} />
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Category filter ── */}
        {items.length > 0 && (
          <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', ...Object.keys(CAT_CONFIG)] as (GroceryCategory | 'all')[]).map(c => (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
                style={{
                  background: filterCat === c ? BENTLEY_GREEN : theme.card,
                  color: filterCat === c ? '#fff' : theme.subtext,
                  border: `1px solid ${filterCat === c ? BENTLEY_GREEN : theme.border}`,
                }}
              >
                {c === 'all' ? 'All' : CAT_CONFIG[c].emoji + ' ' + CAT_CONFIG[c].label}
              </button>
            ))}
          </motion.div>
        )}

        {/* ── Item List ── */}
        {items.length === 0 ? (
          <motion.div variants={fadeUp}>
            <div className="rounded-2xl p-8 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <ShoppingCart size={32} style={{ color: theme.subtext, margin: '0 auto 12px' }} />
              <p className="text-sm font-medium" style={{ color: theme.text }}>No grocery items yet.</p>
              <p className="text-xs mt-1 mb-4" style={{ color: theme.subtext }}>
                Tap the ✨ button for suggestions from your meal plan.
              </p>
            </div>
          </motion.div>
        ) : (
          Object.entries(byCategory).map(([cat, catItems]) => (
            <motion.div key={cat} variants={fadeUp}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">{CAT_CONFIG[cat as GroceryCategory]?.emoji}</span>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>
                  {CAT_CONFIG[cat as GroceryCategory]?.label || cat}
                </span>
                <span className="text-xs ml-auto" style={{ color: theme.subtext }}>{catItems?.length}</span>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                {catItems?.map((item, i) => {
                  const expiry = getExpiryStatus(item)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{
                        background: theme.card,
                        borderBottom: i < (catItems?.length || 0) - 1 ? `1px solid ${theme.border}` : 'none',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate" style={{ color: theme.text }}>{item.name}</p>
                          {expiry.label && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: `${expiry.color}18`, color: expiry.color }}>
                              {expiry.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: theme.subtext }}>
                          {item.quantity} {item.unit}
                          {item.calories && ` · ${item.calories * item.quantity} cal`}
                          {item.protein && ` · ${item.protein * item.quantity}g protein`}
                        </p>
                      </div>
                      <button onClick={() => removeItem(item.id)}>
                        <Trash2 size={13} style={{ color: theme.subtext }} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* ── Add Item Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6 space-y-4"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>Add Item</h3>
              <input type="text" value={newItem.name || ''} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                placeholder="Item name" autoFocus className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
              <div className="grid grid-cols-2 gap-3">
                <select value={newItem.category || 'protein'} onChange={e => setNewItem(p => ({ ...p, category: e.target.value as GroceryCategory }))}
                  className="rounded-xl px-3 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}>
                  {Object.entries(CAT_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input type="number" value={newItem.quantity || 1} onChange={e => setNewItem(p => ({ ...p, quantity: Number(e.target.value) }))}
                    placeholder="Qty" className="w-16 rounded-xl px-3 py-3 outline-none"
                    style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
                  <input type="text" value={newItem.unit || ''} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}
                    placeholder="Unit" className="flex-1 rounded-xl px-3 py-3 outline-none"
                    style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={newItem.calories || ''} onChange={e => setNewItem(p => ({ ...p, calories: Number(e.target.value) }))}
                  placeholder="Calories" className="rounded-xl px-3 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
                <input type="number" value={newItem.protein || ''} onChange={e => setNewItem(p => ({ ...p, protein: Number(e.target.value) }))}
                  placeholder="Protein (g)" className="rounded-xl px-3 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
              </div>
              <input type="date" value={newItem.expirationDate || ''} onChange={e => setNewItem(p => ({ ...p, expirationDate: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={newItem.estimatedDays || ''} onChange={e => setNewItem(p => ({ ...p, estimatedDays: Number(e.target.value) }))}
                  placeholder="Lasts about (days)" className="rounded-xl px-3 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
                <input type="number" value={newItem.lowStockThreshold || ''} onChange={e => setNewItem(p => ({ ...p, lowStockThreshold: Number(e.target.value) }))}
                  placeholder="Low-stock qty" className="rounded-xl px-3 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: theme.card, color: theme.subtext }}>Cancel</button>
                <button onClick={() => addItem()} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: BENTLEY_GREEN, color: '#fff' }}>Add Item</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
