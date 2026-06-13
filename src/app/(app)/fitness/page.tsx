'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell, Scale, Flame, Plus, Check, X,
  Sparkles, Target, Trophy, ShoppingCart,
  TrendingUp, Loader2, Play, CheckCircle,
  ChevronDown, Calendar, ShieldCheck,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { Theme } from '@/context/ThemeContext'
import type { WeightLog } from '@/lib/types'

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

interface WorkoutDay {
  dayNumber: number
  date: string
  title: string
  workout: string
  completed: boolean
}

interface FitnessPlan {
  id: string
  name: string
  duration: '1-week' | '2-week' | 'monthly' | 'transformation'
  startDate: string
  goals: string
  planText: string
  workoutDays: WorkoutDay[]
  status: 'active' | 'completed' | 'paused'
}

interface FitnessStreak {
  workoutStreak: number
  nutritionStreak: number
  lastWorkoutDate: string
  lastNutritionDate: string
  longestWorkoutStreak: number
  totalWorkoutsCompleted: number
}

interface GroceryFoodItem {
  id: string
  name: string
  quantity?: string
  category: string
  consumed: boolean
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

// ── WORKOUT PLAN SECTION ──

const DURATION_LABELS: Record<FitnessPlan['duration'], string> = {
  '1-week': '1 Week',
  '2-week': '2 Weeks',
  'monthly': '1 Month',
  'transformation': '3-Month Transformation',
}

const DURATION_DAYS: Record<FitnessPlan['duration'], number> = {
  '1-week': 7,
  '2-week': 14,
  'monthly': 30,
  'transformation': 90,
}

function WorkoutPlanSection({ theme, streak, onStreakUpdate }: {
  theme: Theme
  streak: FitnessStreak
  onStreakUpdate: (s: FitnessStreak) => void
}) {
  const [plan, setPlan] = useState<FitnessPlan | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<FitnessPlan['duration']>('1-week')
  const [goals, setGoals] = useState('')
  const [generating, setGenerating] = useState(false)
  const [draftPlan, setDraftPlan] = useState<{ text: string; days: WorkoutDay[] } | null>(null)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

  useEffect(() => {
    try {
      const p = localStorage.getItem('orca-fitness-plan')
      if (p) setPlan(JSON.parse(p))
    } catch {}
  }, [])

  const savePlan = (p: FitnessPlan | null) => {
    try { localStorage.setItem('orca-fitness-plan', JSON.stringify(p)) } catch {}
    setPlan(p)
  }

  const generatePlan = async () => {
    setGenerating(true)
    setDraftPlan(null)
    try {
      const prompt = `You are Bentley, the hard-driving personal AI fitness coach for your boss — a 6'3", 159-lb man targeting 200 lbs through serious muscle gain. He has completed ${streak.totalWorkoutsCompleted || 0} workouts so far.

Generate a ${DURATION_LABELS[selectedDuration]} personalized workout plan.
Goals: ${goals || 'Build muscle mass, increase strength, progressive overload'}

Format EXACTLY like this:
PLAN NAME: [name]
OVERVIEW: [2 sentences about the approach]
EXPECTED RESULTS: [what they'll achieve if 100% consistent]

DAILY SCHEDULE:
DAY 1 - [Title]: [Exercises with sets/reps]
DAY 2 - [Title]: [Workout or REST]
[continue for all ${DURATION_DAYS[selectedDuration]} days]

RECOVERY PROTOCOL: [sleep, nutrition timing, active recovery]
PROGRESSION NOTES: [week-over-week progression strategy]
MILESTONES: [what to expect at each stage]

Keep it specific, results-driven. Include real exercises with sets/reps. Be Bentley — direct, no fluff.`

      const res = await fetch('/api/bentley', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      })
      const data = await res.json()
      const text: string = data.response || data.message || 'Failed to generate plan. Try again.'

      const days: WorkoutDay[] = []
      const lines = text.split('\n')
      for (const line of lines) {
        const m = line.match(/^DAY\s+(\d+)\s*[-–]\s*(.+?):\s*(.+)$/i)
        if (m) {
          const d = new Date()
          d.setDate(d.getDate() + (parseInt(m[1]) - 1))
          days.push({
            dayNumber: parseInt(m[1]),
            date: d.toISOString().split('T')[0],
            title: m[2].trim(),
            workout: m[3].trim(),
            completed: false,
          })
        }
      }

      if (days.length === 0) {
        for (let i = 0; i < DURATION_DAYS[selectedDuration]; i++) {
          const d = new Date()
          d.setDate(d.getDate() + i)
          days.push({
            dayNumber: i + 1,
            date: d.toISOString().split('T')[0],
            title: (i + 1) % 7 === 0 ? 'Active Recovery' : 'Training',
            workout: (i + 1) % 7 === 0 ? 'Light cardio, stretching, mobility' : 'See plan details above',
            completed: false,
          })
        }
      }

      setDraftPlan({ text, days })
    } catch {
      setDraftPlan({ text: 'Error connecting to Bentley. Check your API connection.', days: [] })
    } finally {
      setGenerating(false)
    }
  }

  const startPlan = () => {
    if (!draftPlan || draftPlan.days.length === 0) return
    const nameMatch = draftPlan.text.match(/PLAN NAME:\s*(.+)/i)
    const newPlan: FitnessPlan = {
      id: gid(),
      name: nameMatch?.[1]?.trim() || `${DURATION_LABELS[selectedDuration]} Muscle Gain Plan`,
      duration: selectedDuration,
      startDate: TODAY,
      goals: goals || 'Build muscle, gain weight',
      planText: draftPlan.text,
      workoutDays: draftPlan.days,
      status: 'active',
    }
    savePlan(newPlan)
    setDraftPlan(null)
  }

  const markDayComplete = (dayNumber: number) => {
    if (!plan) return
    const day = plan.workoutDays.find(d => d.dayNumber === dayNumber)
    if (day?.completed) return

    const updated: FitnessPlan = {
      ...plan,
      workoutDays: plan.workoutDays.map(d =>
        d.dayNumber === dayNumber ? { ...d, completed: true } : d
      ),
    }

    const prev = streak.lastWorkoutDate
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().split('T')[0]
    const newWorkoutStreak = (prev === yStr) ? streak.workoutStreak + 1
      : (prev === TODAY) ? streak.workoutStreak
      : 1
    const newStreak: FitnessStreak = {
      ...streak,
      workoutStreak: newWorkoutStreak,
      longestWorkoutStreak: Math.max(streak.longestWorkoutStreak || 0, newWorkoutStreak),
      lastWorkoutDate: TODAY,
      totalWorkoutsCompleted: (streak.totalWorkoutsCompleted || 0) + 1,
    }
    onStreakUpdate(newStreak)

    if (updated.workoutDays.every(d => d.completed)) updated.status = 'completed'
    savePlan(updated)
  }

  const completedCount = plan?.workoutDays.filter(d => d.completed).length || 0
  const totalDays = plan?.workoutDays.length || 0
  const progressPct = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0
  const todayWorkout = plan?.workoutDays.find(d => d.date === TODAY)

  // No plan or completed: show builder
  if (!plan || plan.status === 'completed') {
    return (
      <div className="space-y-4">
        {plan?.status === 'completed' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl p-4 text-center"
            style={{ background: `linear-gradient(135deg, ${BENTLEY_GOLD}20, ${BENTLEY_GREEN}10)`, border: `1px solid ${BENTLEY_GOLD}40` }}>
            <Trophy size={28} className="mx-auto mb-2" style={{ color: BENTLEY_GOLD }} />
            <p className="font-bold text-base" style={{ color: BENTLEY_GOLD }}>{plan.name} — Complete!</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{completedCount}/{totalDays} days finished. Ready for the next level?</p>
          </motion.div>
        )}

        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F1A35, #141B2D)', border: `1px solid ${BENTLEY_GOLD}25` }}>
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={16} style={{ color: BENTLEY_GOLD }} />
            <span className="font-bold text-sm uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>Build Your Plan with Bentley</span>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748B' }}>Plan Duration</p>
              <div className="grid grid-cols-2 gap-2">
                {(['1-week', '2-week', 'monthly', 'transformation'] as const).map(d => (
                  <button key={d} onClick={() => setSelectedDuration(d)}
                    className="py-2.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: selectedDuration === d ? BENTLEY_INDIGO : `${BENTLEY_INDIGO}15`,
                      color: selectedDuration === d ? '#fff' : BENTLEY_INDIGO,
                      border: `1px solid ${selectedDuration === d ? BENTLEY_INDIGO : `${BENTLEY_INDIGO}25`}`,
                    }}>
                    {DURATION_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748B' }}>Specific Goals (optional)</p>
              <input
                value={goals}
                onChange={e => setGoals(e.target.value)}
                placeholder="e.g., focus on chest/arms, improve deadlift..."
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: '#070B14', border: '1px solid #1E2A45', color: '#CBD5E1' }}
              />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={generatePlan} disabled={generating}
              className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: `linear-gradient(135deg, ${BENTLEY_GOLD}, #D97706)`, color: '#070B14' }}>
              {generating
                ? <><Loader2 size={15} className="animate-spin" /> Bentley is building your plan...</>
                : <><Sparkles size={15} /> Generate {DURATION_LABELS[selectedDuration]} Plan</>
              }
            </motion.button>
          </div>
        </div>

        {draftPlan && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F1A35, #141B2D)', border: `1px solid ${BENTLEY_INDIGO}40` }}>
              <div className="flex items-center gap-2 mb-3">
                <Dumbbell size={14} style={{ color: BENTLEY_INDIGO }} />
                <span className="font-bold text-sm uppercase tracking-wider" style={{ color: BENTLEY_INDIGO }}>Your Plan is Ready</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#CBD5E1' }}>{draftPlan.text}</p>
              </div>
            </div>
            {draftPlan.days.length > 0 && (
              <motion.button whileTap={{ scale: 0.97 }} onClick={startPlan}
                className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3"
                style={{ background: `linear-gradient(135deg, ${BENTLEY_GREEN}, #059669)`, color: '#fff' }}>
                <Play size={20} fill="#fff" /> START THIS PLAN
              </motion.button>
            )}
          </motion.div>
        )}
      </div>
    )
  }

  // Active plan view
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F1A35, #141B2D)', border: `1px solid ${BENTLEY_INDIGO}40` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: BENTLEY_INDIGO }}>Active Plan</p>
            <h3 className="font-black text-base leading-tight truncate" style={{ color: '#E2E8F0' }}>{plan.name}</h3>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black leading-none" style={{ color: BENTLEY_GOLD }}>{progressPct}%</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#64748B' }}>{completedCount}/{totalDays} days</p>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full mb-3" style={{ background: '#1E2A45' }}>
          <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${BENTLEY_INDIGO}, ${BENTLEY_GREEN})`, transition: 'width 0.5s ease' }} />
        </div>
        <div className="flex items-center gap-2 text-[11px]" style={{ color: '#64748B' }}>
          <span>Started {new Date(plan.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <span>·</span>
          <span>{DURATION_LABELS[plan.duration]}</span>
          <span>·</span>
          <span style={{ color: BENTLEY_GREEN }}>🔥 {streak.workoutStreak} day streak</span>
        </div>
      </div>

      {todayWorkout ? (
        <div className="rounded-2xl p-4" style={{
          background: todayWorkout.completed ? `${BENTLEY_GREEN}12` : `${BENTLEY_GOLD}10`,
          border: `1px solid ${todayWorkout.completed ? BENTLEY_GREEN : BENTLEY_GOLD}35`,
        }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {todayWorkout.completed
                ? <CheckCircle size={14} style={{ color: BENTLEY_GREEN }} />
                : <Target size={14} style={{ color: BENTLEY_GOLD }} />}
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: todayWorkout.completed ? BENTLEY_GREEN : BENTLEY_GOLD }}>
                Today · Day {todayWorkout.dayNumber}
              </span>
            </div>
            {!todayWorkout.completed && (
              <motion.button whileTap={{ scale: 0.94 }} onClick={() => markDayComplete(todayWorkout.dayNumber)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{ background: BENTLEY_GOLD, color: '#070B14' }}>
                Done ✓
              </motion.button>
            )}
          </div>
          <p className="font-bold text-sm mb-1" style={{ color: '#E2E8F0' }}>{todayWorkout.title}</p>
          <p className="text-xs leading-relaxed" style={{ color: '#94A3B8' }}>{todayWorkout.workout}</p>
        </div>
      ) : (
        <div className="rounded-2xl p-4 text-center" style={{ background: '#0A0F1E', border: '1px solid #1E2A45' }}>
          <Calendar size={16} className="mx-auto mb-2" style={{ color: '#64748B' }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>No workout scheduled for today.</p>
          <p className="text-xs mt-1" style={{ color: '#64748B' }}>Rest day or catch up on a missed session.</p>
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: '#64748B' }}>Full Schedule</p>
        <div className="space-y-1.5">
          {plan.workoutDays.map(day => {
            const isPast = day.date < TODAY && !day.completed
            const isToday = day.date === TODAY
            return (
              <div key={day.dayNumber}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                  onClick={() => setExpandedDay(expandedDay === day.dayNumber ? null : day.dayNumber)}
                  style={{
                    background: day.completed ? `${BENTLEY_GREEN}10` : isToday ? `${BENTLEY_GOLD}08` : '#0A0F1E',
                    border: `1px solid ${day.completed ? `${BENTLEY_GREEN}30` : isToday ? `${BENTLEY_GOLD}30` : '#1E2A45'}`,
                    opacity: isPast ? 0.55 : 1,
                  }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                    style={{
                      background: day.completed ? BENTLEY_GREEN : isToday ? BENTLEY_GOLD : '#1E2A45',
                      color: (day.completed || isToday) ? '#070B14' : '#64748B',
                    }}>
                    {day.completed ? '✓' : day.dayNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: day.completed ? BENTLEY_GREEN : isToday ? BENTLEY_GOLD : '#94A3B8' }}>
                      Day {day.dayNumber} — {day.title}
                    </p>
                    <p className="text-[10px]" style={{ color: '#475569' }}>
                      {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  {!day.completed && (
                    <ChevronDown size={13} style={{ color: '#475569', transform: expandedDay === day.dayNumber ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                  )}
                </button>
                <AnimatePresence>
                  {expandedDay === day.dayNumber && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-4 py-3 mx-0.5 rounded-b-xl" style={{ background: '#070B14', border: '1px solid #1E2A45', borderTop: 'none' }}>
                        <p className="text-sm leading-relaxed mb-3" style={{ color: '#94A3B8' }}>{day.workout}</p>
                        {!day.completed && (
                          <motion.button whileTap={{ scale: 0.97 }} onClick={() => { markDayComplete(day.dayNumber); setExpandedDay(null) }}
                            className="w-full py-2.5 rounded-xl font-bold text-sm"
                            style={{ background: BENTLEY_GREEN, color: '#fff' }}>
                            ✓ Mark Complete
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={() => {
          savePlan({ ...plan, status: 'completed' })
        }}
        className="w-full py-2.5 rounded-xl text-xs font-semibold"
        style={{ background: 'transparent', border: '1px solid #1E2A45', color: '#475569' }}>
        End Plan Early
      </button>
    </div>
  )
}

// ── NUTRITION GAME PLAN SECTION ──

const GROCERY_CATEGORIES = ['Protein', 'Carbs', 'Fruits & Veg', 'Dairy', 'Fats', 'Other']

function NutritionGamePlanSection({ theme, streak, onNutritionCheckIn }: {
  theme: Theme
  streak: FitnessStreak
  onNutritionCheckIn: () => void
}) {
  const [groceryItems, setGroceryItems] = useState<GroceryFoodItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('Protein')
  const [generating, setGenerating] = useState(false)
  const [gamePlan, setGamePlan] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [checkedInToday, setCheckedInToday] = useState(false)

  useEffect(() => {
    try {
      const gr = localStorage.getItem('orca-grocery')
      const plan = localStorage.getItem('orca-nutrition-plan')
      const checkin = localStorage.getItem('orca-nutrition-checkin')
      if (gr) setGroceryItems(JSON.parse(gr))
      if (plan) setGamePlan(plan)
      if (checkin === TODAY) setCheckedInToday(true)
    } catch {}
  }, [])

  const saveGrocery = (items: GroceryFoodItem[]) => {
    try { localStorage.setItem('orca-grocery', JSON.stringify(items)) } catch {}
    setGroceryItems(items)
  }

  const addItem = () => {
    if (!newItemName.trim()) return
    saveGrocery([...groceryItems, { id: gid(), name: newItemName.trim(), category: newItemCategory, consumed: false }])
    setNewItemName('')
    setShowAdd(false)
  }

  const removeItem = (id: string) => saveGrocery(groceryItems.filter(i => i.id !== id))
  const toggleConsumed = (id: string) => saveGrocery(groceryItems.map(i => i.id === id ? { ...i, consumed: !i.consumed } : i))

  const available = groceryItems.filter(i => !i.consumed)
  const byCategory = GROCERY_CATEGORIES
    .map(cat => ({ cat, items: available.filter(i => i.category === cat) }))
    .filter(({ items }) => items.length > 0)

  const getGamePlan = async () => {
    setGenerating(true)
    try {
      const groceryList = available.map(i => `${i.name} (${i.category})`).join(', ')
      const prompt = `You are Bentley, personal nutrition AI for a 6'3" man at 159 lbs targeting 200 lbs through muscle gain.

Current groceries: ${groceryList || 'General pantry staples'}

Create a comprehensive NUTRITION GAME PLAN formatted EXACTLY like this:

DAILY TARGETS:
- Calories: 3,200/day
- Protein: 180g/day
- Meal frequency: [recommendation]
- Eating window: [recommendation]

TODAY'S MEAL PLAN:
Breakfast: [specific meal with approx calories + protein]
Mid-Morning: [snack]
Lunch: [specific meal]
Pre-Workout: [what to eat]
Post-Workout: [recovery meal]
Dinner: [specific meal]
Evening: [optional snack to hit goal]

WEEKLY PLAN OVERVIEW:
[7-day rotation strategy using available groceries]

TOP HIGH-CALORIE MEALS:
1. [Name]: [description] — ~[cal] cal, [protein]g protein
2-5. [Continue]

POWER SMOOTHIES:
1. [Name]: [Ingredients] — ~[cal] cal, [protein]g protein
2-3. [Continue]

WEIGHT GAIN STRATEGY:
[4-5 specific tactics for hitting 3,200+ calories consistently]

Be direct, specific, results-focused. Base suggestions on available groceries.`

      const res = await fetch('/api/bentley', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      })
      const data = await res.json()
      const plan: string = data.response || data.message || ''
      setGamePlan(plan)
      try { localStorage.setItem('orca-nutrition-plan', plan) } catch {}
    } catch {
      setGamePlan('Error connecting to Bentley. Check your API configuration.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCheckIn = () => {
    setCheckedInToday(true)
    try { localStorage.setItem('orca-nutrition-checkin', TODAY) } catch {}
    onNutritionCheckIn()
  }

  return (
    <div className="space-y-4">
      {/* Daily targets */}
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #0F1A35, #141B2D)', border: `1px solid ${BENTLEY_GOLD}25` }}>
        <div className="flex items-center gap-2 mb-3">
          <Target size={13} style={{ color: BENTLEY_GOLD }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>Daily Targets</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Calories', value: '3,200', unit: 'cal/day', color: BENTLEY_GOLD },
            { label: 'Protein', value: '180', unit: 'g/day', color: BENTLEY_INDIGO },
            { label: 'Meals', value: '5–6', unit: 'per day', color: BENTLEY_GREEN },
          ].map(t => (
            <div key={t.label} className="rounded-xl p-2.5 text-center" style={{ background: `${t.color}12`, border: `1px solid ${t.color}25` }}>
              <p className="text-base font-black" style={{ color: t.color }}>{t.value}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>{t.unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Nutrition check-in */}
      {checkedInToday ? (
        <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: `${BENTLEY_GREEN}12`, border: `1px solid ${BENTLEY_GREEN}30` }}>
          <CheckCircle size={16} style={{ color: BENTLEY_GREEN }} />
          <div>
            <p className="text-sm font-bold" style={{ color: BENTLEY_GREEN }}>Nutrition locked in today ✓</p>
            <p className="text-xs" style={{ color: '#64748B' }}>Streak: {streak.nutritionStreak} days</p>
          </div>
        </div>
      ) : (
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleCheckIn}
          className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: `${BENTLEY_GREEN}18`, border: `1px solid ${BENTLEY_GREEN}40`, color: BENTLEY_GREEN }}>
          <ShieldCheck size={15} /> I Followed My Nutrition Plan Today
        </motion.button>
      )}

      {/* Grocery inventory */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>
            Grocery Inventory ({available.length} items)
          </p>
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowAdd(!showAdd)}
            className="p-1.5 rounded-lg" style={{ background: `${BENTLEY_INDIGO}20`, color: BENTLEY_INDIGO }}>
            {showAdd ? <X size={12} /> : <Plus size={12} />}
          </motion.button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
              <div className="rounded-xl p-3 space-y-2" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
                <input
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                  placeholder="Item name..."
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
                />
                <div className="flex gap-2">
                  <select value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)}
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}>
                    {GROCERY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <button onClick={addItem} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: BENTLEY_INDIGO, color: '#fff' }}>Add</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {byCategory.length === 0 ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            <ShoppingCart size={20} className="mx-auto mb-2" style={{ color: theme.subtext }} />
            <p className="text-sm" style={{ color: theme.subtext }}>No groceries added.</p>
            <p className="text-xs mt-1" style={{ color: theme.subtext }}>Add items to get a personalized nutrition plan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {byCategory.map(({ cat, items }) => (
              <div key={cat}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.subtext }}>{cat}</p>
                <div className="space-y-1">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                      style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                      <button onClick={() => toggleConsumed(item.id)}
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                        style={{ background: BENTLEY_GREEN, border: `1.5px solid ${BENTLEY_GREEN}` }}>
                        <Check size={10} color="#fff" />
                      </button>
                      <span className="flex-1 text-sm" style={{ color: theme.text }}>{item.quantity && <span style={{ color: theme.subtext }}>{item.quantity} </span>}{item.name}</span>
                      <button onClick={() => removeItem(item.id)} className="p-0.5 rounded" style={{ color: theme.subtext }}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Get nutrition game plan */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={getGamePlan} disabled={generating}
        className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: `linear-gradient(135deg, ${BENTLEY_GOLD}25, ${BENTLEY_INDIGO}15)`, border: `1px solid ${BENTLEY_GOLD}40`, color: BENTLEY_GOLD }}>
        {generating
          ? <><Loader2 size={14} className="animate-spin" /> Bentley is crafting your plan...</>
          : <><Sparkles size={14} /> {gamePlan ? 'Refresh Nutrition Game Plan' : 'Get My Nutrition Game Plan'}</>
        }
      </motion.button>

      <AnimatePresence>
        {gamePlan && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0F1A35, #141B2D)', border: `1px solid ${BENTLEY_GOLD}30` }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={13} style={{ color: BENTLEY_GOLD }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>Bentley's Nutrition Game Plan</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#CBD5E1' }}>{gamePlan}</p>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [activePlanSummary, setActivePlanSummary] = useState<{ name: string; pct: number } | null>(null)

  useEffect(() => {
    try {
      const wl = localStorage.getItem('orca-weight-logs')
      const s = localStorage.getItem('orca-fitness-streak')
      const p = localStorage.getItem('orca-fitness-plan')
      if (wl) setWeightLogs(JSON.parse(wl))
      if (s) setStreak(JSON.parse(s))
      if (p) {
        const plan: FitnessPlan = JSON.parse(p)
        if (plan.status === 'active') {
          const completed = plan.workoutDays.filter(d => d.completed).length
          const total = plan.workoutDays.length
          setActivePlanSummary({ name: plan.name, pct: total > 0 ? Math.round((completed / total) * 100) : 0 })
        }
      }
    } catch {}
  }, [activeTab])

  const saveStreak = (s: FitnessStreak) => {
    try { localStorage.setItem('orca-fitness-streak', JSON.stringify(s)) } catch {}
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
    try { localStorage.setItem('orca-weight-logs', JSON.stringify(next)) } catch {}
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
        className="px-4 pt-4 space-y-5 max-w-lg mx-auto">

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

            {/* Active plan mini-card */}
            {activePlanSummary && (
              <motion.div variants={fadeUp}>
                <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #0F1A35, #141B2D)', border: `1px solid ${BENTLEY_INDIGO}35` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: BENTLEY_INDIGO }}>Active Plan</p>
                      <p className="font-bold text-sm" style={{ color: '#E2E8F0' }}>{activePlanSummary.name}</p>
                    </div>
                    <p className="text-2xl font-black" style={{ color: BENTLEY_GOLD }}>{activePlanSummary.pct}%</p>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: '#1E2A45' }}>
                    <div className="h-full rounded-full" style={{ width: `${activePlanSummary.pct}%`, background: `linear-gradient(90deg, ${BENTLEY_INDIGO}, ${BENTLEY_GREEN})` }} />
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
            <WorkoutPlanSection theme={theme} streak={streak} onStreakUpdate={saveStreak} />
          </motion.div>
        )}

        {/* NUTRITION TAB */}
        {activeTab === 'nutrition' && (
          <motion.div variants={fadeUp}>
            <NutritionGamePlanSection theme={theme} streak={streak} onNutritionCheckIn={handleNutritionCheckIn} />
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
