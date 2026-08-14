'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell, Scale, Flame, Plus, Check, X,
  Sparkles, Target, Trophy, ShoppingCart,
  TrendingUp, Loader2, Play, CheckCircle,
  ChevronDown, Calendar, ShieldCheck, ChevronLeft, ChevronRight, Minus, Edit3,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/context/ThemeContext'
import type { Theme } from '@/context/ThemeContext'
import type { WeightLog, WorkoutDayPlan, WorkoutExerciseDef, WorkoutExerciseLog, MealLog, GroceryItem } from '@/lib/types'
import { setLocalSynced } from '@/lib/syncLocal'
import { getDefaultWorkoutPlan, getLastLog, getSuggestedWeight } from '@/lib/workouts'
import { PROTEIN_TARGET, MEAL_LABELS, MEAL_ORDER, MEAL_PROTEIN_TARGETS, MEAL_PRESETS, getDailyTotals, type MealPreset } from '@/lib/meals'
import { getStaplesRunningLow } from '@/lib/grocery'

const BENTLEY_GOLD = '#F59E0B'
const BENTLEY_INDIGO = '#6366F1'
const BENTLEY_GREEN = '#10B981'
const BENTLEY_RED = '#EF4444'
const FITNESS_PINK = '#EC4899'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 26 } },
}

const TODAY = new Date().toISOString().slice(0, 10)
const gid = () => Math.random().toString(36).slice(2, 9)

// ── INTERFACES ──

interface FitnessStreak {
  workoutStreak: number
  nutritionStreak: number
  lastWorkoutDate: string
  lastNutritionDate: string
  longestWorkoutStreak: number
  totalWorkoutsCompleted: number
}

// ── PROGRESS RING ──

function ProgressRing({ value, max, color, label, sub }: {
  value: number; max: number; color: string; label: string; sub?: string
}) {
  const pct = Math.min(1, max > 0 ? value / max : 0)
  const r = 32
  const circ = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke={`${color}20`} strokeWidth="8" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color: '#CBD5E1' }}>{label}</span>
      {sub && <span className="text-[10px]" style={{ color: '#64748B' }}>{sub}</span>}
    </div>
  )
}

// ── STRUCTURED WORKOUT SECTION ──

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function StructuredWorkoutSection({ theme, streak, onStreakUpdate }: {
  theme: Theme
  streak: FitnessStreak
  onStreakUpdate: (s: FitnessStreak) => void
}) {
  const [plan, setPlan] = useState<Record<number, WorkoutDayPlan>>(() => {
    try {
      const saved = localStorage.getItem('orca-workout-plan')
      return saved ? JSON.parse(saved) : getDefaultWorkoutPlan()
    } catch { return getDefaultWorkoutPlan() }
  })
  const [logs, setLogs] = useState<WorkoutExerciseLog[]>(() => {
    try { return JSON.parse(localStorage.getItem('orca-workout-logs') || '[]') } catch { return [] }
  })
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [loggingExerciseId, setLoggingExerciseId] = useState<string | null>(null)
  const [logForm, setLogForm] = useState({ weightUsed: '', repsAchieved: '', completedSets: 0, goodForm: true, notes: '' })

  const persistLogs = (updated: WorkoutExerciseLog[]) => {
    setLogs(updated)
    try { setLocalSynced('orca-workout-logs', JSON.stringify(updated)) } catch {}
  }

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const weekday = new Date(selectedDate + 'T00:00:00').getDay()
  const dayPlan = plan[weekday] || { title: 'Rest Day', exercises: [] }

  const logForExercise = (exerciseId: string) => logs.find(l => l.exerciseId === exerciseId && l.date === selectedDate) || null

  const updateStreakForLog = () => {
    if (streak.lastWorkoutDate === selectedDate) return
    const yesterday = new Date(selectedDate + 'T00:00:00')
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().split('T')[0]
    const newWorkoutStreak = (streak.lastWorkoutDate === yStr) ? streak.workoutStreak + 1 : 1
    onStreakUpdate({
      ...streak,
      workoutStreak: newWorkoutStreak,
      longestWorkoutStreak: Math.max(streak.longestWorkoutStreak || 0, newWorkoutStreak),
      lastWorkoutDate: selectedDate,
      totalWorkoutsCompleted: (streak.totalWorkoutsCompleted || 0) + 1,
    })
  }

  const startLog = (def: WorkoutExerciseDef) => {
    const existing = logForExercise(def.id)
    const lastLog = getLastLog(def.id, logs, selectedDate)
    const suggestion = getSuggestedWeight(def, lastLog)
    setLoggingExerciseId(def.id)
    setLogForm({
      weightUsed: existing ? String(existing.weightUsed) : (suggestion.suggestedWeight != null ? String(suggestion.suggestedWeight) : ''),
      repsAchieved: existing ? String(existing.repsAchieved) : String(def.repMax),
      completedSets: existing ? existing.completedSets : def.sets,
      goodForm: existing ? existing.goodForm : true,
      notes: existing?.notes || '',
    })
  }

  const saveLog = (def: WorkoutExerciseDef) => {
    const weightUsed = parseFloat(logForm.weightUsed) || 0
    const repsAchieved = parseInt(logForm.repsAchieved) || 0
    const existing = logForExercise(def.id)
    const entry: WorkoutExerciseLog = {
      id: existing?.id || gid(),
      date: selectedDate,
      exerciseId: def.id,
      exerciseName: def.name,
      weightUsed,
      repsAchieved,
      completedSets: logForm.completedSets,
      targetSets: def.sets,
      goodForm: logForm.goodForm,
      notes: logForm.notes || undefined,
    }
    persistLogs(existing ? logs.map(l => l.id === existing.id ? entry : l) : [...logs, entry])
    setLoggingExerciseId(null)
    if (selectedDate === TODAY) updateStreakForLog()
  }

  const loggedCount = dayPlan.exercises.filter(e => logForExercise(e.id)).length

  return (
    <div className="space-y-4">
      {/* Date navigator */}
      <div className="flex items-center justify-between rounded-2xl p-3" style={{ background: '#0A0F1E', border: '1px solid #1E2A45' }}>
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg" style={{ color: '#64748B' }}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: '#E2E8F0' }}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {selectedDate !== TODAY && (
            <button onClick={() => setSelectedDate(TODAY)} className="text-[10px] font-semibold" style={{ color: FITNESS_PINK }}>Jump to Today</button>
          )}
        </div>
        <button onClick={() => shiftDate(1)} className="p-2 rounded-lg" style={{ color: '#64748B' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day summary */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F1A35, #141B2D)', border: `1px solid ${FITNESS_PINK}40` }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Dumbbell size={16} style={{ color: FITNESS_PINK }} />
            <h3 className="font-black text-base" style={{ color: '#E2E8F0' }}>{dayPlan.title}</h3>
          </div>
          {dayPlan.exercises.length > 0 && (
            <p className="text-xs font-bold" style={{ color: FITNESS_PINK }}>{loggedCount}/{dayPlan.exercises.length} logged</p>
          )}
        </div>
        <p className="text-[11px]" style={{ color: '#64748B' }}>🔥 {streak.workoutStreak} day streak</p>
      </div>

      {/* Exercises */}
      {dayPlan.exercises.length === 0 ? (
        <div className="rounded-2xl p-5 text-center" style={{ background: '#0A0F1E', border: '1px solid #1E2A45' }}>
          <ShieldCheck size={20} className="mx-auto mb-2" style={{ color: '#64748B' }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>{weekday === 0 ? 'Rest day.' : 'Optional day — light cardio, mobility, abs, or recovery.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dayPlan.exercises.map(def => {
            const existing = logForExercise(def.id)
            const lastLog = getLastLog(def.id, logs, selectedDate)
            const suggestion = getSuggestedWeight(def, lastLog)
            const isLogging = loggingExerciseId === def.id

            return (
              <div key={def.id} className="rounded-xl p-4" style={{ background: existing ? `${BENTLEY_GREEN}0c` : '#0A0F1E', border: `1px solid ${existing ? `${BENTLEY_GREEN}30` : '#1E2A45'}` }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold" style={{ color: '#E2E8F0' }}>{def.name}</p>
                  {existing && <CheckCircle size={15} style={{ color: BENTLEY_GREEN }} />}
                </div>
                <p className="text-xs mb-2" style={{ color: '#64748B' }}>{def.sets} sets × {def.repMin}-{def.repMax} reps</p>

                {!isLogging && (
                  <div className="flex items-center justify-between text-xs mb-2" style={{ color: '#94A3B8' }}>
                    <span>Previous: {suggestion.previousWeight != null ? `${suggestion.previousWeight} lbs` : '—'}</span>
                    <span style={{ color: FITNESS_PINK }}>{suggestion.suggestedWeight != null ? `Today: ${suggestion.suggestedWeight} lbs` : 'Log starting weight'}</span>
                  </div>
                )}
                {!isLogging && suggestion.reason && (
                  <p className="text-[10px] mb-3" style={{ color: '#475569' }}>{suggestion.reason}</p>
                )}

                {!isLogging ? (
                  <button onClick={() => startLog(def)} className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                    style={{ background: existing ? `${BENTLEY_GREEN}15` : `${FITNESS_PINK}15`, color: existing ? BENTLEY_GREEN : FITNESS_PINK }}>
                    {existing ? <><Edit3 size={11} /> Edit Log</> : <><Plus size={11} /> Log Exercise</>}
                  </button>
                ) : (
                  <div className="space-y-2 pt-2 border-t" style={{ borderColor: '#1E2A45' }}>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={logForm.weightUsed} onChange={e => setLogForm({ ...logForm, weightUsed: e.target.value })} placeholder="Weight used" className="px-3 py-2 rounded-lg text-sm" style={{ background: '#070B14', border: '1px solid #1E2A45', color: '#CBD5E1' }} />
                      <input type="number" value={logForm.repsAchieved} onChange={e => setLogForm({ ...logForm, repsAchieved: e.target.value })} placeholder="Reps achieved" className="px-3 py-2 rounded-lg text-sm" style={{ background: '#070B14', border: '1px solid #1E2A45', color: '#CBD5E1' }} />
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs" style={{ color: '#94A3B8' }}>Completed sets</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setLogForm({ ...logForm, completedSets: Math.max(0, logForm.completedSets - 1) })} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#1E2A45', color: '#94A3B8' }}><Minus size={12} /></button>
                        <span className="text-sm font-bold w-8 text-center" style={{ color: '#E2E8F0' }}>{logForm.completedSets}/{def.sets}</span>
                        <button onClick={() => setLogForm({ ...logForm, completedSets: Math.min(def.sets, logForm.completedSets + 1) })} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#1E2A45', color: '#94A3B8' }}><Plus size={12} /></button>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 px-1 text-xs" style={{ color: '#94A3B8' }}>
                      <input type="checkbox" checked={logForm.goodForm} onChange={e => setLogForm({ ...logForm, goodForm: e.target.checked })} />
                      Good form
                    </label>
                    <input value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })} placeholder="Notes (optional)" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#070B14', border: '1px solid #1E2A45', color: '#CBD5E1' }} />
                    <div className="flex gap-2">
                      <button onClick={() => setLoggingExerciseId(null)} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: '#1E2A45', color: '#94A3B8' }}>Cancel</button>
                      <button onClick={() => saveLog(def)} className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ background: BENTLEY_GREEN, color: '#fff' }}>Save</button>
                    </div>
                  </div>
                )}
                {existing?.notes && !isLogging && (
                  <p className="text-[10px] mt-2" style={{ color: '#475569' }}>{existing.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── MEAL TRACKER SECTION ──

function MealTrackerSection({ theme, streak, onNutritionCheckIn }: {
  theme: Theme
  streak: FitnessStreak
  onNutritionCheckIn: () => void
}) {
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([])

  const [mealLogs, setMealLogs] = useState<MealLog[]>([])
  const [selectedDate, setSelectedDate] = useState(TODAY)
  const [loggingMeal, setLoggingMeal] = useState<MealLog['meal'] | null>(null)
  const [customForm, setCustomForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })

  useEffect(() => {
    try {
      const gr = localStorage.getItem('orca-grocery')
      if (gr) setGroceryItems(JSON.parse(gr))
      const ml = localStorage.getItem('orca-meal-logs')
      if (ml) setMealLogs(JSON.parse(ml))
    } catch {}
  }, [])

  const groceryRunningLow = useMemo(() => getStaplesRunningLow(groceryItems), [groceryItems])

  const saveMealLogs = (updated: MealLog[]) => {
    setMealLogs(updated)
    try { setLocalSynced('orca-meal-logs', JSON.stringify(updated)) } catch {}
  }

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const logsForDate = mealLogs.filter(l => l.date === selectedDate)
  const totals = getDailyTotals(mealLogs, selectedDate)
  const proteinRemaining = Math.max(0, PROTEIN_TARGET - totals.protein)

  const logPreset = (meal: MealLog['meal'], preset: MealPreset) => {
    const entry: MealLog = { id: gid(), date: selectedDate, meal, name: preset.name, calories: preset.calories, protein: preset.protein, carbs: preset.carbs, fat: preset.fat, notes: preset.notes }
    saveMealLogs([...mealLogs, entry])
  }

  const startCustomLog = (meal: MealLog['meal']) => {
    setLoggingMeal(meal)
    setCustomForm({ name: '', calories: '', protein: '', carbs: '', fat: '' })
  }

  const saveCustomLog = (meal: MealLog['meal']) => {
    if (!customForm.name) return
    const entry: MealLog = {
      id: gid(),
      date: selectedDate,
      meal,
      name: customForm.name,
      calories: parseFloat(customForm.calories) || 0,
      protein: parseFloat(customForm.protein) || 0,
      carbs: customForm.carbs ? parseFloat(customForm.carbs) : undefined,
      fat: customForm.fat ? parseFloat(customForm.fat) : undefined,
    }
    saveMealLogs([...mealLogs, entry])
    setLoggingMeal(null)
  }

  const deleteLog = (id: string) => saveMealLogs(mealLogs.filter(l => l.id !== id))

  // Auto-drive the nutrition streak once today's logged protein crosses 80% of target
  useEffect(() => {
    if (selectedDate === TODAY && totals.protein >= PROTEIN_TARGET * 0.8 && streak.lastNutritionDate !== TODAY) {
      onNutritionCheckIn()
    }
  }, [selectedDate, totals.protein, streak.lastNutritionDate])

  return (
    <div className="space-y-4">
      {/* Date navigator */}
      <div className="flex items-center justify-between rounded-2xl p-3" style={{ background: '#0A0F1E', border: '1px solid #1E2A45' }}>
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg" style={{ color: '#64748B' }}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: '#E2E8F0' }}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {selectedDate !== TODAY && (
            <button onClick={() => setSelectedDate(TODAY)} className="text-[10px] font-semibold" style={{ color: BENTLEY_INDIGO }}>Jump to Today</button>
          )}
        </div>
        <button onClick={() => shiftDate(1)} className="p-2 rounded-lg" style={{ color: '#64748B' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Running totals */}
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #0F1A35, #141B2D)', border: `1px solid ${BENTLEY_GOLD}25` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target size={13} style={{ color: BENTLEY_GOLD }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>Protein</span>
          </div>
          <span className="text-sm font-black" style={{ color: '#E2E8F0' }}>{Math.round(totals.protein)}g / {PROTEIN_TARGET}g</span>
        </div>
        <div className="w-full h-2 rounded-full mb-1" style={{ background: '#1E2A45' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (totals.protein / PROTEIN_TARGET) * 100)}%`, background: `linear-gradient(90deg, ${BENTLEY_INDIGO}, ${BENTLEY_GOLD})`, transition: 'width 0.3s ease' }} />
        </div>
        <p className="text-[11px] mb-3" style={{ color: '#64748B' }}>{Math.round(proteinRemaining)}g remaining</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-2 text-center" style={{ background: `${BENTLEY_GOLD}12`, border: `1px solid ${BENTLEY_GOLD}25` }}>
            <p className="text-sm font-black" style={{ color: BENTLEY_GOLD }}>{Math.round(totals.calories)}</p>
            <p className="text-[9px] font-semibold uppercase" style={{ color: '#64748B' }}>calories</p>
          </div>
          <div className="rounded-xl p-2 text-center" style={{ background: `${BENTLEY_GREEN}12`, border: `1px solid ${BENTLEY_GREEN}25` }}>
            <p className="text-sm font-black" style={{ color: BENTLEY_GREEN }}>{Math.round(totals.carbs)}g</p>
            <p className="text-[9px] font-semibold uppercase" style={{ color: '#64748B' }}>carbs</p>
          </div>
          <div className="rounded-xl p-2 text-center" style={{ background: `${FITNESS_PINK}12`, border: `1px solid ${FITNESS_PINK}25` }}>
            <p className="text-sm font-black" style={{ color: FITNESS_PINK }}>{Math.round(totals.fat)}g</p>
            <p className="text-[9px] font-semibold uppercase" style={{ color: '#64748B' }}>fat</p>
          </div>
        </div>
      </div>

      {/* Meal slots */}
      <div className="space-y-2">
        {MEAL_ORDER.map(meal => {
          const presets = MEAL_PRESETS[meal]
          const targetRange = MEAL_PROTEIN_TARGETS[meal]
          const entriesForMeal = logsForDate.filter(l => l.meal === meal)
          const isLogging = loggingMeal === meal

          return (
            <div key={meal} className="rounded-xl p-4" style={{ background: entriesForMeal.length > 0 ? `${BENTLEY_GREEN}0c` : '#0A0F1E', border: `1px solid ${entriesForMeal.length > 0 ? `${BENTLEY_GREEN}30` : '#1E2A45'}` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold" style={{ color: '#E2E8F0' }}>{MEAL_LABELS[meal]}</p>
                {targetRange && <span className="text-[10px]" style={{ color: '#64748B' }}>{targetRange[0]}-{targetRange[1]}g target</span>}
              </div>

              {entriesForMeal.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {entriesForMeal.map(l => (
                    <div key={l.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#070B14' }}>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: '#CBD5E1' }}>{l.name}</p>
                        <p className="text-[10px]" style={{ color: '#64748B' }}>{l.protein}g protein · {l.calories} cal</p>
                      </div>
                      <button onClick={() => deleteLog(l.id)} className="p-1 rounded flex-shrink-0" style={{ color: '#64748B' }}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}

              {!isLogging ? (
                <div className="flex flex-wrap gap-1.5">
                  {presets.map(p => (
                    <button key={p.name} onClick={() => logPreset(meal, p)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
                      style={{ background: `${FITNESS_PINK}15`, color: FITNESS_PINK }}>
                      + {p.name}
                    </button>
                  ))}
                  <button onClick={() => startCustomLog(meal)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: '#1E2A45', color: '#94A3B8' }}>
                    + Custom
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: '#1E2A45' }}>
                  <input value={customForm.name} onChange={e => setCustomForm({ ...customForm, name: e.target.value })} placeholder="Meal name *" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#070B14', border: '1px solid #1E2A45', color: '#CBD5E1' }} />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={customForm.calories} onChange={e => setCustomForm({ ...customForm, calories: e.target.value })} placeholder="Calories" className="px-3 py-2 rounded-lg text-sm" style={{ background: '#070B14', border: '1px solid #1E2A45', color: '#CBD5E1' }} />
                    <input type="number" value={customForm.protein} onChange={e => setCustomForm({ ...customForm, protein: e.target.value })} placeholder="Protein (g)" className="px-3 py-2 rounded-lg text-sm" style={{ background: '#070B14', border: '1px solid #1E2A45', color: '#CBD5E1' }} />
                    <input type="number" value={customForm.carbs} onChange={e => setCustomForm({ ...customForm, carbs: e.target.value })} placeholder="Carbs (g)" className="px-3 py-2 rounded-lg text-sm" style={{ background: '#070B14', border: '1px solid #1E2A45', color: '#CBD5E1' }} />
                  </div>
                  <input type="number" value={customForm.fat} onChange={e => setCustomForm({ ...customForm, fat: e.target.value })} placeholder="Fat (g)" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: '#070B14', border: '1px solid #1E2A45', color: '#CBD5E1' }} />
                  <div className="flex gap-2">
                    <button onClick={() => setLoggingMeal(null)} className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: '#1E2A45', color: '#94A3B8' }}>Cancel</button>
                    <button onClick={() => saveCustomLog(meal)} disabled={!customForm.name} className="flex-1 py-2 rounded-lg text-xs font-bold disabled:opacity-40" style={{ background: BENTLEY_GREEN, color: '#fff' }}>Save</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {streak.nutritionStreak > 0 && (
        <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: `${BENTLEY_GREEN}12`, border: `1px solid ${BENTLEY_GREEN}30` }}>
          <ShieldCheck size={16} style={{ color: BENTLEY_GREEN }} />
          <p className="text-xs" style={{ color: '#64748B' }}>Nutrition streak: <span className="font-bold" style={{ color: BENTLEY_GREEN }}>{streak.nutritionStreak} days</span></p>
        </div>
      )}

      {/* Grocery summary — full grocery management lives on /grocery */}
      <Link href="/grocery">
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#0A0F1E', border: '1px solid #1E2A45' }}>
          <div className="flex items-center gap-3">
            <ShoppingCart size={16} style={{ color: BENTLEY_INDIGO }} />
            <div>
              <p className="text-sm font-bold" style={{ color: '#E2E8F0' }}>{groceryItems.length} groceries tracked</p>
              {groceryRunningLow.length > 0 && (
                <p className="text-xs" style={{ color: BENTLEY_GOLD }}>{groceryRunningLow.length} running low</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: BENTLEY_INDIGO }}>
            Manage Groceries <ChevronRight size={14} />
          </div>
        </div>
      </Link>

    </div>
  )
}

// ── ACHIEVEMENTS ──

const ACHIEVEMENT_DEFS = [
  { id: 'first-workout', title: 'First Rep', desc: 'Complete first workout', icon: '💪', check: (s: FitnessStreak) => (s.totalWorkoutsCompleted || 0) >= 1 },
  { id: 'fire-3', title: 'On Fire', desc: '3-day workout streak', icon: '🔥', check: (s: FitnessStreak) => (s.longestWorkoutStreak || 0) >= 3 },
  { id: 'week-warrior', title: 'Week Warrior', desc: '7-day streak', icon: '⚡', check: (s: FitnessStreak) => (s.longestWorkoutStreak || 0) >= 7 },
  { id: 'iron-will', title: 'Iron Will', desc: '14-day streak', icon: '🏆', check: (s: FitnessStreak) => (s.longestWorkoutStreak || 0) >= 14 },
  { id: 'ten-workouts', title: 'Double Digits', desc: '10 workouts done', icon: '🎯', check: (s: FitnessStreak) => (s.totalWorkoutsCompleted || 0) >= 10 },
  { id: 'nutrition-7', title: 'Nutrition Lock', desc: '7-day nutrition streak', icon: '🥗', check: (s: FitnessStreak) => (s.nutritionStreak || 0) >= 7 },
]

// ── MAIN PAGE ──

export default function FitnessPage() {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<'today' | 'workouts' | 'nutrition'>('today')
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [streak, setStreak] = useState<FitnessStreak>({
    workoutStreak: 0,
    nutritionStreak: 0,
    lastWorkoutDate: '',
    lastNutritionDate: '',
    longestWorkoutStreak: 0,
    totalWorkoutsCompleted: 0,
  })
  const [todaysWorkoutSummary, setTodaysWorkoutSummary] = useState<{ title: string; total: number; logged: number } | null>(null)

  useEffect(() => {
    try {
      const wl = localStorage.getItem('orca-weight-logs')
      const s = localStorage.getItem('orca-fitness-streak')
      if (wl) setWeightLogs(JSON.parse(wl))
      if (s) setStreak(JSON.parse(s))

      const wp = localStorage.getItem('orca-workout-plan')
      const plan: Record<number, WorkoutDayPlan> = wp ? JSON.parse(wp) : getDefaultWorkoutPlan()
      const wlogs: WorkoutExerciseLog[] = JSON.parse(localStorage.getItem('orca-workout-logs') || '[]')
      const todayPlan = plan[new Date().getDay()]
      if (todayPlan && todayPlan.exercises.length > 0) {
        const logged = todayPlan.exercises.filter(e => wlogs.some(l => l.exerciseId === e.id && l.date === TODAY)).length
        setTodaysWorkoutSummary({ title: todayPlan.title, total: todayPlan.exercises.length, logged })
      } else {
        setTodaysWorkoutSummary(null)
      }
    } catch {}
  }, [activeTab])

  const saveStreak = (s: FitnessStreak) => {
    try { setLocalSynced('orca-fitness-streak', JSON.stringify(s)) } catch {}
    setStreak(s)
  }

  const handleNutritionCheckIn = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().split('T')[0]
    const prev = streak.lastNutritionDate
    const newNutritionStreak = (prev === yStr) ? streak.nutritionStreak + 1
      : (prev === TODAY) ? streak.nutritionStreak
      : 1
    saveStreak({ ...streak, nutritionStreak: newNutritionStreak, lastNutritionDate: TODAY })
  }

  const logWeight = () => {
    if (!newWeight || isNaN(Number(newWeight))) return
    const entry: WeightLog = { id: gid(), date: TODAY, weight: Number(newWeight) }
    const next = [entry, ...weightLogs.filter(w => w.date !== TODAY)]
    setWeightLogs(next)
    try { setLocalSynced('orca-weight-logs', JSON.stringify(next)) } catch {}
    setNewWeight('')
    setShowWeightModal(false)
  }

  const latestWeight = useMemo(() =>
    [...weightLogs].sort((a, b) => b.date.localeCompare(a.date))[0]?.weight || 159,
    [weightLogs]
  )
  const weightToGo = 200 - latestWeight

  const earnedAchievements = useMemo(() =>
    ACHIEVEMENT_DEFS.filter(a => a.check(streak)),
    [streak]
  )

  const TABS = [
    { id: 'today' as const, label: 'Today', icon: Flame },
    { id: 'workouts' as const, label: 'Workouts', icon: Dumbbell },
    { id: 'nutrition' as const, label: 'Nutrition', icon: ShoppingCart },
  ]

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg, color: theme.text }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 sticky top-0 z-10"
        style={{ background: `${theme.bg}f0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}` }}>
        <div>
          <h1 className="text-lg font-bold" style={{ color: theme.text }}>Fitness Hub</h1>
          <p className="text-xs" style={{ color: theme.subtext }}>159 → 200 lbs · Muscle Gain</p>
        </div>
        <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowWeightModal(true)}
          className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          style={{ background: `${BENTLEY_GREEN}18`, color: BENTLEY_GREEN, border: `1px solid ${BENTLEY_GREEN}30` }}>
          <Scale size={12} /> Log Weight
        </motion.button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 pt-3 pb-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
            style={{
              background: activeTab === tab.id ? FITNESS_PINK : theme.card,
              color: activeTab === tab.id ? '#fff' : theme.subtext,
              border: `1px solid ${activeTab === tab.id ? FITNESS_PINK : theme.border}`,
            }}>
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="px-4 pt-4 space-y-5 max-w-lg mx-auto lg:max-w-3xl">

        {/* TODAY TAB */}
        {activeTab === 'today' && (
          <>
            {/* Streak badges */}
            <motion.div variants={fadeUp}>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 text-center" style={{ background: `${BENTLEY_GOLD}12`, border: `1px solid ${BENTLEY_GOLD}30` }}>
                  <Flame size={20} className="mx-auto mb-1" style={{ color: BENTLEY_GOLD }} />
                  <p className="text-3xl font-black" style={{ color: BENTLEY_GOLD }}>{streak.workoutStreak}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#64748B' }}>Workout Streak</p>
                </div>
                <div className="rounded-2xl p-4 text-center" style={{ background: `${BENTLEY_GREEN}12`, border: `1px solid ${BENTLEY_GREEN}30` }}>
                  <Target size={20} className="mx-auto mb-1" style={{ color: BENTLEY_GREEN }} />
                  <p className="text-3xl font-black" style={{ color: BENTLEY_GREEN }}>{streak.nutritionStreak}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#64748B' }}>Nutrition Streak</p>
                </div>
              </div>
            </motion.div>

            {/* Today's workout mini-card */}
            {todaysWorkoutSummary && (
              <motion.div variants={fadeUp}>
                <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #0F1A35, #141B2D)', border: `1px solid ${FITNESS_PINK}35` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: FITNESS_PINK }}>Today's Workout</p>
                      <p className="font-bold text-sm" style={{ color: '#E2E8F0' }}>{todaysWorkoutSummary.title}</p>
                    </div>
                    <p className="text-2xl font-black" style={{ color: BENTLEY_GOLD }}>{todaysWorkoutSummary.logged}/{todaysWorkoutSummary.total}</p>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: '#1E2A45' }}>
                    <div className="h-full rounded-full" style={{ width: `${todaysWorkoutSummary.total > 0 ? Math.round((todaysWorkoutSummary.logged / todaysWorkoutSummary.total) * 100) : 0}%`, background: `linear-gradient(90deg, ${FITNESS_PINK}, ${BENTLEY_GOLD})` }} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Weight progress */}
            <motion.div variants={fadeUp}>
              <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F1A35, #141B2D)', border: `1px solid ${BENTLEY_GOLD}25` }}>
                <div className="flex items-center gap-2 mb-4">
                  <Scale size={13} style={{ color: BENTLEY_GOLD }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>Weight Progress</span>
                </div>
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-4xl font-black" style={{ color: '#E2E8F0' }}>{latestWeight}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: '#64748B' }}>current lbs</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp size={24} style={{ color: BENTLEY_GREEN }} className="mx-auto mb-1" />
                    <p className="text-xl font-black" style={{ color: BENTLEY_GREEN }}>{weightToGo}</p>
                    <p className="text-xs" style={{ color: '#64748B' }}>lbs to go</p>
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-black" style={{ color: BENTLEY_GOLD }}>200</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: '#64748B' }}>goal lbs</p>
                  </div>
                </div>
                {weightLogs.length > 1 && (
                  <div className="mt-4 pt-3 border-t" style={{ borderColor: '#1E2A45' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#475569' }}>Recent</p>
                    <div className="space-y-1">
                      {[...weightLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map((log, i, arr) => {
                        const prev = arr[i + 1]
                        const diff = prev ? log.weight - prev.weight : 0
                        return (
                          <div key={log.id} className="flex items-center justify-between text-xs">
                            <span style={{ color: '#64748B' }}>{new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <div className="flex items-center gap-2">
                              <span style={{ color: '#94A3B8' }}>{log.weight} lbs</span>
                              {diff !== 0 && <span className="font-bold" style={{ color: diff > 0 ? BENTLEY_GREEN : BENTLEY_RED }}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp}>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <p className="text-2xl font-black" style={{ color: BENTLEY_INDIGO }}>{streak.totalWorkoutsCompleted || 0}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: theme.subtext }}>Total Workouts</p>
                </div>
                <div className="rounded-2xl p-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <p className="text-2xl font-black" style={{ color: BENTLEY_GOLD }}>{streak.longestWorkoutStreak || 0}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: theme.subtext }}>Best Streak</p>
                </div>
              </div>
            </motion.div>

            {/* Achievements */}
            <motion.div variants={fadeUp}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: theme.subtext }}>
                Achievements ({earnedAchievements.length}/{ACHIEVEMENT_DEFS.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {ACHIEVEMENT_DEFS.map(a => {
                  const earned = a.check(streak)
                  return (
                    <div key={a.id} className="rounded-2xl p-3 text-center" style={{
                      background: earned ? `${BENTLEY_GOLD}15` : theme.card,
                      border: `1px solid ${earned ? `${BENTLEY_GOLD}40` : theme.border}`,
                      opacity: earned ? 1 : 0.4,
                    }}>
                      <span className="text-2xl">{a.icon}</span>
                      <p className="text-[10px] font-bold mt-1 leading-tight" style={{ color: earned ? BENTLEY_GOLD : theme.subtext }}>{a.title}</p>
                      <p className="text-[9px] mt-0.5 leading-tight" style={{ color: theme.subtext }}>{a.desc}</p>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}

        {/* WORKOUTS TAB */}
        {activeTab === 'workouts' && (
          <motion.div variants={fadeUp}>
            <StructuredWorkoutSection theme={theme} streak={streak} onStreakUpdate={saveStreak} />
          </motion.div>
        )}

        {/* NUTRITION TAB */}
        {activeTab === 'nutrition' && (
          <motion.div variants={fadeUp}>
            <MealTrackerSection theme={theme} streak={streak} onNutritionCheckIn={handleNutritionCheckIn} />
          </motion.div>
        )}
      </motion.div>

      {/* Weight Modal */}
      <AnimatePresence>
        {showWeightModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowWeightModal(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6" style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4" style={{ color: theme.text }}>Log Weight</h3>
              <input type="number" value={newWeight} onChange={e => setNewWeight(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && logWeight()}
                placeholder="Enter weight in lbs"
                className="w-full rounded-xl px-4 py-3 text-lg font-bold outline-none mb-4"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setShowWeightModal(false)} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: theme.bg, color: theme.subtext }}>Cancel</button>
                <button onClick={logWeight} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: BENTLEY_GREEN, color: '#fff' }}>Log It</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
