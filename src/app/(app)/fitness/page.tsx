'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell, Scale, Flame, Droplets, Plus, Check, X,
  ChevronRight, TrendingUp, Coffee, Apple, Moon, Sun,
  ArrowLeft, Sparkles, Target,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import type { WeightLog, MealLog, WorkoutSession } from '@/lib/types'

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'
const BENTLEY_GREEN = '#10B981'
const BENTLEY_RED = '#EF4444'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

const TODAY = new Date().toISOString().slice(0, 10)

const MEAL_ICONS: Record<string, React.ElementType> = {
  breakfast: Sun,
  lunch: Coffee,
  dinner: Moon,
  snack: Apple,
  smoothie: Dumbbell,
}

const SMOOTHIE_SUGGESTIONS = [
  { name: 'Mass Gainer Smoothie', cal: 820, protein: 52, ingredients: 'Whole milk, 2 bananas, strawberries, 2 scoops protein, oats, peanut butter' },
  { name: 'Post-Workout Shake', cal: 560, protein: 45, ingredients: 'Whole milk, 1 banana, protein powder, Greek yogurt, honey' },
  { name: 'Pre-Workout Fuel', cal: 480, protein: 30, ingredients: 'Oats, peanut butter, banana, whole milk, protein' },
]

const QUICK_MEALS = [
  { name: 'Chicken & Rice', cal: 520, protein: 45, meal: 'lunch' as const },
  { name: 'Ground Beef Bowl', cal: 680, protein: 52, meal: 'dinner' as const },
  { name: 'Eggs & Oats', cal: 420, protein: 28, meal: 'breakfast' as const },
  { name: 'Greek Yogurt + Fruit', cal: 280, protein: 20, meal: 'snack' as const },
  { name: 'Peanut Butter Toast', cal: 380, protein: 16, meal: 'snack' as const },
  { name: 'Pasta w/ Meat Sauce', cal: 720, protein: 44, meal: 'dinner' as const },
]

function ProgressRing({ value, max, color, size = 80, label, sub }: {
  value: number; max: number; color: string; size?: number; label: string; sub: string
}) {
  const r = (size / 2) - 6
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const offset = circ * (1 - pct)
  const { theme } = useTheme()
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={theme.border} strokeWidth={5} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={circ} strokeLinecap="round"
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold" style={{ color: theme.text }}>{value}</span>
          <span className="text-[9px]" style={{ color: theme.subtext }}>/{max}</span>
        </div>
      </div>
      <div className="text-xs font-semibold" style={{ color }}>{label}</div>
      <div className="text-[10px]" style={{ color: theme.subtext }}>{sub}</div>
    </div>
  )
}

export default function FitnessPage() {
  const { theme } = useTheme()
  const [tab, setTab] = useState<'today' | 'log' | 'history'>('today')
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [mealLogs, setMealLogs] = useState<MealLog[]>([])

  // Log meal modal
  const [showMealModal, setShowMealModal] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newMeal, setNewMeal] = useState({ name: '', calories: '', protein: '', meal: 'breakfast' as MealLog['meal'] })

  useEffect(() => {
    try {
      const wl = localStorage.getItem('orca-weight-logs')
      const ml = localStorage.getItem('orca-meal-logs')
      if (wl) setWeightLogs(JSON.parse(wl))
      if (ml) setMealLogs(JSON.parse(ml))
    } catch {}
  }, [])

  const save = (wl: WeightLog[], ml: MealLog[]) => {
    try {
      localStorage.setItem('orca-weight-logs', JSON.stringify(wl))
      localStorage.setItem('orca-meal-logs', JSON.stringify(ml))
    } catch {}
  }

  const todayMeals = useMemo(() => mealLogs.filter(m => m.date === TODAY), [mealLogs])
  const todayCalories = useMemo(() => todayMeals.reduce((s, m) => s + m.calories, 0), [todayMeals])
  const todayProtein = useMemo(() => todayMeals.reduce((s, m) => s + m.protein, 0), [todayMeals])

  const latestWeight = useMemo(() => {
    const sorted = [...weightLogs].sort((a, b) => b.date.localeCompare(a.date))
    return sorted[0]?.weight || 159
  }, [weightLogs])

  const logWeight = () => {
    if (!newWeight || isNaN(Number(newWeight))) return
    const entry: WeightLog = { id: Date.now().toString(), date: TODAY, weight: Number(newWeight) }
    const next = [entry, ...weightLogs.filter(w => w.date !== TODAY)]
    setWeightLogs(next)
    save(next, mealLogs)
    setNewWeight('')
    setShowWeightModal(false)
  }

  const logMeal = (m?: { name: string; cal: number; protein: number; meal: MealLog['meal'] }) => {
    const name = m?.name || newMeal.name
    const calories = m?.cal || Number(newMeal.calories)
    const protein = m?.protein || Number(newMeal.protein)
    const meal = m?.meal || newMeal.meal
    if (!name || !calories) return
    const entry: MealLog = {
      id: Date.now().toString(), date: TODAY, meal, name, calories, protein: protein || 0,
    }
    const next = [...mealLogs, entry]
    setMealLogs(next)
    save(weightLogs, next)
    setNewMeal({ name: '', calories: '', protein: '', meal: 'breakfast' })
    setShowMealModal(false)
  }

  const deleteMeal = (id: string) => {
    const next = mealLogs.filter(m => m.id !== id)
    setMealLogs(next)
    save(weightLogs, next)
  }

  const calGoal = 3200
  const proGoal = 180
  const calPct = Math.round((todayCalories / calGoal) * 100)
  const weightToGo = 200 - latestWeight

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
            <h1 className="text-lg font-bold" style={{ color: theme.text }}>Fitness</h1>
            <p className="text-xs" style={{ color: theme.subtext }}>159 → 200 lbs · Muscle Gain</p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowWeightModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            style={{ background: `${BENTLEY_GREEN}18`, color: BENTLEY_GREEN, border: `1px solid ${BENTLEY_GREEN}30` }}
          >
            <Scale size={12} /> Log
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowMealModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            style={{ background: `${BENTLEY_INDIGO}18`, color: BENTLEY_INDIGO, border: `1px solid ${BENTLEY_INDIGO}30` }}
          >
            <Plus size={12} /> Meal
          </motion.button>
        </div>
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="px-4 pt-4 space-y-5 max-w-lg mx-auto"
      >
        {/* ── Today's Stats ── */}
        <motion.div variants={fadeUp}>
          <div
            className="rounded-2xl p-5"
            style={{ background: `linear-gradient(135deg, #0F1A35, #141B2D)`, border: `1px solid ${BENTLEY_GOLD}25` }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Target size={14} style={{ color: BENTLEY_GOLD }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>Today's Numbers</span>
            </div>
            <div className="flex justify-around">
              <ProgressRing value={todayCalories} max={calGoal} color={calPct < 50 ? BENTLEY_RED : BENTLEY_GREEN} label="Calories" sub="goal 3,200" />
              <ProgressRing value={todayProtein} max={proGoal} color={BENTLEY_INDIGO} label="Protein g" sub="goal 180g" />
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ border: `5px solid ${BENTLEY_GOLD}40`, background: `${BENTLEY_GOLD}10` }}
                >
                  <div className="text-center">
                    <div className="text-sm font-bold" style={{ color: theme.text }}>{latestWeight}</div>
                    <div className="text-[9px]" style={{ color: theme.subtext }}>lbs</div>
                  </div>
                </div>
                <div className="text-xs font-semibold" style={{ color: BENTLEY_GOLD }}>Weight</div>
                <div className="text-[10px]" style={{ color: theme.subtext }}>{weightToGo} to go</div>
              </div>
            </div>

            {todayCalories < 800 && (
              <div
                className="mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2"
                style={{ background: `${BENTLEY_RED}18`, color: BENTLEY_RED, border: `1px solid ${BENTLEY_RED}30` }}
              >
                <Flame size={12} />
                You're {calGoal - todayCalories} calories behind. Bentley says: smoothie time, boss.
              </div>
            )}
            {todayCalories >= calGoal && (
              <div
                className="mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2"
                style={{ background: `${BENTLEY_GREEN}18`, color: BENTLEY_GREEN, border: `1px solid ${BENTLEY_GREEN}30` }}
              >
                <Check size={12} />
                Calorie goal hit. Protein: {todayProtein < proGoal ? `${proGoal - todayProtein}g short` : 'locked in'}.
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Today's Meals ── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Today's Food</span>
            <span className="text-xs font-semibold" style={{ color: BENTLEY_INDIGO }}>{todayMeals.length} logged</span>
          </div>
          {todayMeals.length === 0 ? (
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <p className="text-sm" style={{ color: theme.subtext }}>Nothing logged yet today.</p>
              <p className="text-xs mt-1" style={{ color: theme.subtext }}>Tap + Meal to start tracking.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
              {todayMeals.map((meal, i) => {
                const Icon = MEAL_ICONS[meal.meal] || Coffee
                return (
                  <div
                    key={meal.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ background: theme.card, borderBottom: i < todayMeals.length - 1 ? `1px solid ${theme.border}` : 'none' }}
                  >
                    <div className="p-1.5 rounded-lg" style={{ background: `${BENTLEY_INDIGO}18` }}>
                      <Icon size={13} style={{ color: BENTLEY_INDIGO }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: theme.text }}>{meal.name}</p>
                      <p className="text-xs" style={{ color: theme.subtext }}>{meal.calories} cal · {meal.protein}g protein</p>
                    </div>
                    <button onClick={() => deleteMeal(meal.id)}>
                      <X size={14} style={{ color: theme.subtext }} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* ── Quick Add Meals ── */}
        <motion.div variants={fadeUp}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.subtext }}>Quick Add</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_MEALS.map(qm => (
              <motion.button
                key={qm.name}
                whileTap={{ scale: 0.96 }}
                onClick={() => logMeal(qm)}
                className="rounded-xl p-3 text-left"
                style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              >
                <p className="text-sm font-semibold" style={{ color: theme.text }}>{qm.name}</p>
                <p className="text-xs mt-0.5" style={{ color: theme.subtext }}>{qm.cal} cal · {qm.protein}g protein</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Smoothie Suggestions ── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} style={{ color: BENTLEY_GOLD }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Bentley's Smoothies</span>
          </div>
          <div className="space-y-2">
            {SMOOTHIE_SUGGESTIONS.map(s => (
              <motion.button
                key={s.name}
                whileTap={{ scale: 0.98 }}
                onClick={() => logMeal({ name: s.name, cal: s.cal, protein: s.protein, meal: 'smoothie' })}
                className="w-full rounded-xl p-4 text-left"
                style={{
                  background: `linear-gradient(135deg, #0F1A35, #141B2D)`,
                  border: `1px solid ${BENTLEY_GOLD}25`,
                }}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-bold" style={{ color: theme.text }}>{s.name}</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${BENTLEY_GOLD}20`, color: BENTLEY_GOLD }}>
                    +{s.cal} cal
                  </span>
                </div>
                <p className="text-xs" style={{ color: theme.subtext }}>{s.ingredients}</p>
                <p className="text-xs mt-1 font-semibold" style={{ color: BENTLEY_GREEN }}>{s.protein}g protein</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Weight History ── */}
        {weightLogs.length > 1 && (
          <motion.div variants={fadeUp}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.subtext }}>Weight Log</p>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
              {[...weightLogs]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 7)
                .map((log, i, arr) => {
                  const prev = arr[i + 1]
                  const diff = prev ? log.weight - prev.weight : 0
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between px-4 py-3"
                      style={{ background: theme.card, borderBottom: i < Math.min(arr.length - 1, 6) ? `1px solid ${theme.border}` : 'none' }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: theme.text }}>{log.weight} lbs</p>
                        <p className="text-xs" style={{ color: theme.subtext }}>
                          {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      {diff !== 0 && (
                        <span
                          className="text-xs font-bold"
                          style={{ color: diff > 0 ? BENTLEY_GREEN : BENTLEY_RED }}
                        >
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </span>
                      )}
                    </div>
                  )
                })}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* ── Weight Modal ── */}
      <AnimatePresence>
        {showWeightModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowWeightModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4" style={{ color: theme.text }}>Log Weight</h3>
              <input
                type="number"
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                placeholder="Enter weight in lbs"
                className="w-full rounded-xl px-4 py-3 text-lg font-bold outline-none mb-4"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
                autoFocus
              />
              <div className="flex gap-3">
                <button onClick={() => setShowWeightModal(false)} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: theme.card, color: theme.subtext }}>
                  Cancel
                </button>
                <button onClick={logWeight} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: BENTLEY_GREEN, color: '#fff' }}>
                  Log It
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Meal Modal ── */}
      <AnimatePresence>
        {showMealModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowMealModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6 space-y-4"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>Log Meal</h3>
              <select
                value={newMeal.meal}
                onChange={e => setNewMeal(p => ({ ...p, meal: e.target.value as MealLog['meal'] }))}
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
                <option value="smoothie">Smoothie</option>
              </select>
              <input
                type="text"
                value={newMeal.name}
                onChange={e => setNewMeal(p => ({ ...p, name: e.target.value }))}
                placeholder="Meal name"
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={newMeal.calories}
                  onChange={e => setNewMeal(p => ({ ...p, calories: e.target.value }))}
                  placeholder="Calories"
                  className="rounded-xl px-4 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
                />
                <input
                  type="number"
                  value={newMeal.protein}
                  onChange={e => setNewMeal(p => ({ ...p, protein: e.target.value }))}
                  placeholder="Protein (g)"
                  className="rounded-xl px-4 py-3 outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowMealModal(false)} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: theme.card, color: theme.subtext }}>
                  Cancel
                </button>
                <button
                  onClick={() => logMeal()}
                  className="flex-1 py-3 rounded-xl font-semibold"
                  style={{ background: BENTLEY_INDIGO, color: '#fff' }}
                >
                  Log It
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
