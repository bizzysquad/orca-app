'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell, Scale, Flame, Plus, Check, X,
  ChevronRight, Coffee, Apple, Moon, Sun,
  Sparkles, Target, Trophy, Zap, Star, ShoppingCart,
  TrendingUp, RotateCcw, Heart, Activity,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { WeightLog, MealLog } from '@/lib/types'

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

const MEAL_ICONS: Record<string, React.ElementType> = {
  breakfast: Sun, lunch: Coffee, dinner: Moon, snack: Apple, smoothie: Dumbbell,
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

// ── WORKOUT PROGRAMS ──
type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

interface Exercise {
  name: string
  sets: number
  reps: string
  rest: string
  note?: string
}

interface WorkoutDay {
  day: string
  label: string
  exercises: Exercise[]
  isRest?: boolean
}

const WORKOUT_PROGRAMS: Record<FitnessLevel, { name: string; color: string; description: string; days: WorkoutDay[] }> = {
  beginner: {
    name: 'Beginner',
    color: BENTLEY_GREEN,
    description: 'Build your foundation. 3 days/week, full body.',
    days: [
      { day: 'Monday', label: 'Full Body A', exercises: [
        { name: 'Push-Ups', sets: 3, reps: '8-10', rest: '60s' },
        { name: 'Squats (Bodyweight)', sets: 3, reps: '12-15', rest: '60s' },
        { name: 'Dumbbell Row', sets: 3, reps: '10 each', rest: '60s' },
        { name: 'Plank', sets: 3, reps: '20-30s', rest: '45s' },
        { name: 'Glute Bridge', sets: 3, reps: '12-15', rest: '45s' },
      ]},
      { day: 'Tuesday', label: 'Rest / Walk', isRest: true, exercises: [] },
      { day: 'Wednesday', label: 'Full Body B', exercises: [
        { name: 'Dumbbell Press', sets: 3, reps: '8-10', rest: '60s' },
        { name: 'Romanian Deadlift', sets: 3, reps: '10-12', rest: '75s' },
        { name: 'Lat Pulldown / Pull-Aparts', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Lunges', sets: 3, reps: '10 each', rest: '60s' },
        { name: 'Dumbbell Curl', sets: 2, reps: '12', rest: '45s' },
      ]},
      { day: 'Thursday', label: 'Rest / Walk', isRest: true, exercises: [] },
      { day: 'Friday', label: 'Full Body C', exercises: [
        { name: 'Incline Push-Ups', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Goblet Squat', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Face Pulls / Band Rows', sets: 3, reps: '12-15', rest: '45s' },
        { name: 'Hip Thrust', sets: 3, reps: '12-15', rest: '60s' },
        { name: 'Tricep Dips', sets: 2, reps: '8-10', rest: '45s' },
      ]},
      { day: 'Saturday', label: 'Active Recovery', isRest: true, exercises: [] },
      { day: 'Sunday', label: 'Rest', isRest: true, exercises: [] },
    ],
  },
  intermediate: {
    name: 'Intermediate',
    color: BENTLEY_INDIGO,
    description: 'Push-Pull-Legs split. 4 days/week.',
    days: [
      { day: 'Monday', label: 'Push Day', exercises: [
        { name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s' },
        { name: 'Overhead Press', sets: 3, reps: '8-10', rest: '90s' },
        { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '75s' },
        { name: 'Lateral Raises', sets: 3, reps: '12-15', rest: '45s' },
        { name: 'Tricep Pushdown', sets: 3, reps: '12-15', rest: '45s' },
        { name: 'Push-Ups to failure', sets: 2, reps: 'Max', rest: '60s', note: 'Finisher' },
      ]},
      { day: 'Tuesday', label: 'Pull Day', exercises: [
        { name: 'Barbell Row', sets: 4, reps: '6-8', rest: '90s' },
        { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest: '75s' },
        { name: 'Cable Row', sets: 3, reps: '10-12', rest: '75s' },
        { name: 'Face Pulls', sets: 3, reps: '15-20', rest: '45s' },
        { name: 'Barbell Curl', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Hammer Curl', sets: 2, reps: '12 each', rest: '45s' },
      ]},
      { day: 'Wednesday', label: 'Rest', isRest: true, exercises: [] },
      { day: 'Thursday', label: 'Legs A', exercises: [
        { name: 'Barbell Squat', sets: 4, reps: '6-8', rest: '120s' },
        { name: 'Romanian Deadlift', sets: 3, reps: '8-10', rest: '90s' },
        { name: 'Leg Press', sets: 3, reps: '12-15', rest: '75s' },
        { name: 'Leg Curl', sets: 3, reps: '12-15', rest: '60s' },
        { name: 'Calf Raises', sets: 4, reps: '15-20', rest: '45s' },
      ]},
      { day: 'Friday', label: 'Upper Body', exercises: [
        { name: 'Weighted Pull-Ups / Chin-Ups', sets: 4, reps: '6-8', rest: '90s' },
        { name: 'Dumbbell Bench', sets: 4, reps: '8-10', rest: '90s' },
        { name: 'Arnold Press', sets: 3, reps: '10', rest: '75s' },
        { name: 'EZ Bar Curl', sets: 3, reps: '10-12', rest: '60s' },
        { name: 'Skull Crushers', sets: 3, reps: '10-12', rest: '60s' },
      ]},
      { day: 'Saturday', label: 'Active Recovery', isRest: true, exercises: [] },
      { day: 'Sunday', label: 'Rest', isRest: true, exercises: [] },
    ],
  },
  advanced: {
    name: 'Advanced',
    color: BENTLEY_GOLD,
    description: 'Upper/Lower 5-day split with progressive overload.',
    days: [
      { day: 'Monday', label: 'Upper Strength', exercises: [
        { name: 'Barbell Bench Press', sets: 5, reps: '5', rest: '2-3 min' },
        { name: 'Weighted Pull-Ups', sets: 5, reps: '5', rest: '2-3 min' },
        { name: 'Seated OHP', sets: 4, reps: '6-8', rest: '2 min' },
        { name: 'Barbell Row', sets: 4, reps: '6-8', rest: '90s' },
        { name: 'Dips', sets: 3, reps: '8-10', rest: '90s' },
      ]},
      { day: 'Tuesday', label: 'Lower Strength', exercises: [
        { name: 'Barbell Back Squat', sets: 5, reps: '5', rest: '3 min' },
        { name: 'Conventional Deadlift', sets: 4, reps: '5', rest: '3 min' },
        { name: 'Bulgarian Split Squat', sets: 3, reps: '8 each', rest: '90s' },
        { name: 'Nordic Curl / Leg Curl', sets: 3, reps: '6-8', rest: '90s' },
        { name: 'Standing Calf Raise', sets: 4, reps: '12-15', rest: '60s' },
      ]},
      { day: 'Wednesday', label: 'Active Recovery / Cardio', isRest: true, exercises: [] },
      { day: 'Thursday', label: 'Upper Hypertrophy', exercises: [
        { name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', rest: '75s' },
        { name: 'Cable Row', sets: 4, reps: '10-12', rest: '75s' },
        { name: 'Cable Fly', sets: 3, reps: '12-15', rest: '60s' },
        { name: 'Lateral Raises', sets: 4, reps: '15-20', rest: '45s' },
        { name: 'Superset: Curls + Pushdowns', sets: 3, reps: '12', rest: '60s' },
      ]},
      { day: 'Friday', label: 'Lower Hypertrophy', exercises: [
        { name: 'Hack Squat / Leg Press', sets: 4, reps: '10-12', rest: '90s' },
        { name: 'Romanian Deadlift', sets: 4, reps: '10-12', rest: '90s' },
        { name: 'Leg Extension', sets: 3, reps: '12-15', rest: '60s' },
        { name: 'Seated Leg Curl', sets: 3, reps: '12-15', rest: '60s' },
        { name: 'Hip Thrust', sets: 3, reps: '12-15', rest: '75s' },
      ]},
      { day: 'Saturday', label: 'Conditioning', isRest: true, exercises: [] },
      { day: 'Sunday', label: 'Rest', isRest: true, exercises: [] },
    ],
  },
  expert: {
    name: 'Expert',
    color: FITNESS_PINK,
    description: '6-day PPL with periodization. Max intensity.',
    days: [
      { day: 'Monday', label: 'Push (Heavy)', exercises: [
        { name: 'Barbell Bench Press', sets: 5, reps: '3-5', rest: '3-4 min', note: '85-90% 1RM' },
        { name: 'Seated Overhead Press', sets: 4, reps: '4-6', rest: '3 min' },
        { name: 'Weighted Dips', sets: 4, reps: '6-8', rest: '2 min' },
        { name: 'Cable Fly', sets: 3, reps: '12-15', rest: '60s' },
        { name: 'Overhead Tricep Extension', sets: 3, reps: '10-12', rest: '60s' },
      ]},
      { day: 'Tuesday', label: 'Pull (Heavy)', exercises: [
        { name: 'Weighted Pull-Ups', sets: 5, reps: '3-5', rest: '3-4 min', note: '85-90% 1RM' },
        { name: 'Barbell Row', sets: 4, reps: '4-6', rest: '3 min' },
        { name: 'Rack Pulls / Shrugs', sets: 3, reps: '6-8', rest: '2 min' },
        { name: 'Face Pulls', sets: 3, reps: '15-20', rest: '45s' },
        { name: 'Barbell Curl', sets: 4, reps: '8-10', rest: '60s' },
      ]},
      { day: 'Wednesday', label: 'Legs (Heavy)', exercises: [
        { name: 'Barbell Squat', sets: 5, reps: '3-5', rest: '4 min', note: '85-90% 1RM' },
        { name: 'Deadlift', sets: 4, reps: '3-5', rest: '4 min' },
        { name: 'Front Squat', sets: 3, reps: '6-8', rest: '3 min' },
        { name: 'Leg Curl', sets: 3, reps: '8-10', rest: '90s' },
        { name: 'Calf Raise', sets: 5, reps: '10-12', rest: '60s' },
      ]},
      { day: 'Thursday', label: 'Push (Hypertrophy)', exercises: [
        { name: 'Incline Press', sets: 4, reps: '8-10', rest: '90s' },
        { name: 'DB Lateral Raise', sets: 5, reps: '15-20', rest: '45s' },
        { name: 'Machine Chest Press', sets: 3, reps: '12-15', rest: '75s' },
        { name: 'Cable Pushdown', sets: 4, reps: '12-15', rest: '60s' },
      ]},
      { day: 'Friday', label: 'Pull (Hypertrophy)', exercises: [
        { name: 'Lat Pulldown', sets: 4, reps: '10-12', rest: '75s' },
        { name: 'Cable Row', sets: 4, reps: '10-12', rest: '75s' },
        { name: 'Rear Delt Fly', sets: 4, reps: '15-20', rest: '45s' },
        { name: 'Hammer Curl', sets: 4, reps: '12', rest: '60s' },
        { name: 'Preacher Curl', sets: 3, reps: '10-12', rest: '60s' },
      ]},
      { day: 'Saturday', label: 'Legs (Hypertrophy)', exercises: [
        { name: 'Hack Squat', sets: 4, reps: '10-12', rest: '90s' },
        { name: 'Romanian Deadlift', sets: 4, reps: '10-12', rest: '90s' },
        { name: 'Leg Extension', sets: 4, reps: '15-20', rest: '60s' },
        { name: 'Seated Leg Curl', sets: 4, reps: '12-15', rest: '60s' },
        { name: 'Hip Thrust', sets: 4, reps: '10-12', rest: '90s' },
      ]},
      { day: 'Sunday', label: 'Rest / Recovery', isRest: true, exercises: [] },
    ],
  },
}

// ── PROGRESS RING ──
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
          <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
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

function gid() { return Math.random().toString(36).slice(2, 10) }

// ── GROCERY ITEM TYPE ──
interface GroceryFoodItem {
  id: string
  name: string
  quantity: string
  category: string
  addedDate: string
  consumed: boolean
}

// ── PUSH-UP TRACKER ──
function PushUpTracker({ theme }: { theme: any }) {
  const [logs, setLogs] = useState<{ date: string; count: number }[]>([])
  const [goal, setGoal] = useState(50)
  const [input, setInput] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-pushup-logs')
      if (saved) setLogs(JSON.parse(saved))
      const savedGoal = localStorage.getItem('orca-pushup-goal')
      if (savedGoal) setGoal(parseInt(savedGoal))
    } catch {}
  }, [])

  const todayLog = logs.find(l => l.date === TODAY)
  const todayCount = todayLog?.count || 0

  const logPushUps = () => {
    const n = parseInt(input)
    if (!n || n <= 0) return
    const next = todayLog
      ? logs.map(l => l.date === TODAY ? { ...l, count: l.count + n } : l)
      : [...logs, { date: TODAY, count: n }]
    setLogs(next)
    localStorage.setItem('orca-pushup-logs', JSON.stringify(next))
    setInput('')
  }

  // Streak calc
  const streak = useMemo(() => {
    let s = 0
    const d = new Date()
    while (true) {
      const ds = d.toISOString().slice(0, 10)
      const log = logs.find(l => l.date === ds)
      if (!log || log.count < goal) break
      s++
      d.setDate(d.getDate() - 1)
    }
    return s
  }, [logs, goal])

  const pct = Math.min((todayCount / goal) * 100, 100)

  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} style={{ color: FITNESS_PINK }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Push-Up Tracker</span>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${BENTLEY_GOLD}18` }}>
            <Flame size={11} style={{ color: BENTLEY_GOLD }} />
            <span className="text-xs font-bold" style={{ color: BENTLEY_GOLD }}>{streak} day streak</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-2xl font-black" style={{ color: todayCount >= goal ? BENTLEY_GREEN : theme.text }}>{todayCount}</span>
            <span className="text-sm" style={{ color: theme.subtext }}>/ {goal} goal</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.border }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? BENTLEY_GREEN : FITNESS_PINK }} />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {[10, 20, 25, 50].map(n => (
          <button
            key={n}
            onClick={() => {
              const count = n
              const next = todayLog
                ? logs.map(l => l.date === TODAY ? { ...l, count: l.count + count } : l)
                : [...logs, { date: TODAY, count }]
              setLogs(next)
              localStorage.setItem('orca-pushup-logs', JSON.stringify(next))
            }}
            className="flex-1 py-2 rounded-xl text-xs font-bold"
            style={{ background: `${FITNESS_PINK}15`, color: FITNESS_PINK, border: `1px solid ${FITNESS_PINK}30` }}
          >
            +{n}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Custom amount"
          className="flex-1 px-3 py-2 rounded-xl border text-sm"
          style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
        />
        <button onClick={logPushUps} disabled={!input} className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40" style={{ background: FITNESS_PINK, color: '#fff' }}>Log</button>
      </div>

      {/* Last 7 days mini chart */}
      <div className="flex gap-1.5 pt-1">
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i))
          const ds = d.toISOString().slice(0, 10)
          const log = logs.find(l => l.date === ds)
          const hit = (log?.count || 0) >= goal
          const isToday = ds === TODAY
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full h-5 rounded flex items-center justify-center text-[8px] font-bold" style={{ background: hit ? `${BENTLEY_GREEN}30` : `${theme.border}50`, color: hit ? BENTLEY_GREEN : theme.subtext }}>
                {log?.count || 0}
              </div>
              <span className="text-[8px]" style={{ color: isToday ? BENTLEY_GOLD : theme.subtext }}>
                {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── WORKOUT SECTION ──
function WorkoutSection({ theme }: { theme: any }) {
  const [level, setLevel] = useState<FitnessLevel>('beginner')
  const [completedToday, setCompletedToday] = useState<string[]>([])
  const [streaks, setStreaks] = useState<Record<string, number>>({})

  const dayOfWeek = new Date().getDay()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayName = dayNames[dayOfWeek]

  const program = WORKOUT_PROGRAMS[level]
  const todayWorkout = program.days.find(d => d.day === todayName)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-fitness-level')
      if (saved) setLevel(saved as FitnessLevel)
      const savedCompleted = localStorage.getItem(`orca-workout-completed-${TODAY}`)
      if (savedCompleted) setCompletedToday(JSON.parse(savedCompleted))
    } catch {}
  }, [])

  const saveLevel = (l: FitnessLevel) => {
    setLevel(l)
    localStorage.setItem('orca-fitness-level', l)
  }

  const toggleExercise = (name: string) => {
    const next = completedToday.includes(name)
      ? completedToday.filter(n => n !== name)
      : [...completedToday, name]
    setCompletedToday(next)
    localStorage.setItem(`orca-workout-completed-${TODAY}`, JSON.stringify(next))
  }

  const totalExercises = todayWorkout?.exercises.length || 0
  const doneCount = todayWorkout?.exercises.filter(e => completedToday.includes(e.name)).length || 0

  return (
    <div className="space-y-4">
      {/* Level selector */}
      <div className="grid grid-cols-4 gap-1.5">
        {(Object.keys(WORKOUT_PROGRAMS) as FitnessLevel[]).map(l => {
          const prog = WORKOUT_PROGRAMS[l]
          return (
            <button
              key={l}
              onClick={() => saveLevel(l)}
              className="py-2 rounded-xl text-xs font-bold"
              style={{
                background: level === l ? prog.color : `${prog.color}18`,
                color: level === l ? '#fff' : prog.color,
                border: `1px solid ${level === l ? prog.color : `${prog.color}30`}`,
              }}
            >
              {prog.name}
            </button>
          )
        })}
      </div>

      <div className="rounded-xl p-3" style={{ background: `${program.color}10`, border: `1px solid ${program.color}30` }}>
        <p className="text-xs font-semibold" style={{ color: program.color }}>{program.description}</p>
      </div>

      {/* Today's workout */}
      {todayWorkout && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Today · {todayWorkout.label}</p>
              {!todayWorkout.isRest && totalExercises > 0 && (
                <p className="text-xs mt-0.5" style={{ color: doneCount === totalExercises ? BENTLEY_GREEN : theme.subtext }}>
                  {doneCount}/{totalExercises} exercises done
                </p>
              )}
            </div>
            {!todayWorkout.isRest && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: `${program.color}18` }}>
                <Trophy size={11} style={{ color: program.color }} />
                <span className="text-xs font-bold" style={{ color: program.color }}>{Math.round((doneCount / totalExercises) * 100) || 0}%</span>
              </div>
            )}
          </div>

          {todayWorkout.isRest ? (
            <div className="rounded-2xl p-6 text-center" style={{ background: `${BENTLEY_GREEN}10`, border: `1px solid ${BENTLEY_GREEN}30` }}>
              <Heart size={28} className="mx-auto mb-2" style={{ color: BENTLEY_GREEN }} />
              <p className="font-bold" style={{ color: BENTLEY_GREEN }}>Rest Day</p>
              <p className="text-xs mt-1" style={{ color: theme.subtext }}>Recovery is where growth happens. Stretch, hydrate, eat.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayWorkout.exercises.map(ex => {
                const done = completedToday.includes(ex.name)
                return (
                  <button
                    key={ex.name}
                    onClick={() => toggleExercise(ex.name)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{ background: done ? `${BENTLEY_GREEN}12` : theme.card, border: `1px solid ${done ? BENTLEY_GREEN + '30' : theme.border}` }}
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: done ? BENTLEY_GREEN : 'transparent', border: `1.5px solid ${done ? BENTLEY_GREEN : theme.border}` }}>
                      {done && <Check size={11} color="#fff" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: done ? theme.subtext : theme.text, textDecoration: done ? 'line-through' : 'none' }}>{ex.name}</p>
                      <p className="text-xs" style={{ color: theme.subtext }}>{ex.sets} sets × {ex.reps} · {ex.rest} rest{ex.note ? ` · ${ex.note}` : ''}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Full week overview */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.subtext }}>This Week</p>
        <div className="space-y-1.5">
          {program.days.map(day => (
            <div
              key={day.day}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: day.day === todayName ? `${program.color}15` : theme.card, border: `1px solid ${day.day === todayName ? program.color + '30' : theme.border}` }}
            >
              <span className="text-xs font-bold w-10 shrink-0" style={{ color: day.day === todayName ? program.color : theme.subtext }}>{day.day.slice(0, 3)}</span>
              <span className="text-sm flex-1" style={{ color: day.day === todayName ? theme.text : theme.subtext }}>{day.label}</span>
              {day.isRest && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${BENTLEY_GREEN}20`, color: BENTLEY_GREEN }}>REST</span>}
              {!day.isRest && <span className="text-[10px]" style={{ color: theme.subtext }}>{day.exercises.length} exercises</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Push-up tracker */}
      <PushUpTracker theme={theme} />
    </div>
  )
}

// ── GROCERY / NUTRITION SECTION ──
function NutritionSection({ theme }: { theme: any }) {
  const [groceries, setGroceries] = useState<GroceryFoodItem[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', quantity: '', category: 'Protein' })
  const [preferences, setPreferences] = useState({ disliked: '', veggiesDisliked: '', restrictions: '' })
  const [showPrefs, setShowPrefs] = useState(false)
  const [bentleySuggestion, setBentleySuggestion] = useState('')
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)
  const [showBentley, setShowBentley] = useState(false)

  const FOOD_CATS = ['Protein', 'Carbs', 'Vegetables', 'Fruits', 'Dairy', 'Fats', 'Other']

  useEffect(() => {
    try {
      const saved = localStorage.getItem('orca-grocery')
      if (saved) setGroceries(JSON.parse(saved))
      const savedPrefs = localStorage.getItem('orca-food-preferences')
      if (savedPrefs) setPreferences(JSON.parse(savedPrefs))
    } catch {}
  }, [])

  const saveGroceries = (items: GroceryFoodItem[]) => {
    setGroceries(items)
    localStorage.setItem('orca-grocery', JSON.stringify(items))
  }

  const savePreferences = (p: typeof preferences) => {
    setPreferences(p)
    localStorage.setItem('orca-food-preferences', JSON.stringify(p))
  }

  const addItem = () => {
    if (!newItem.name) return
    const item: GroceryFoodItem = {
      id: gid(), name: newItem.name, quantity: newItem.quantity,
      category: newItem.category, addedDate: TODAY, consumed: false,
    }
    saveGroceries([...groceries, item])
    setNewItem({ name: '', quantity: '', category: 'Protein' })
    setShowAdd(false)
  }

  const toggleConsumed = (id: string) => {
    saveGroceries(groceries.map(g => g.id === id ? { ...g, consumed: !g.consumed } : g))
  }

  const removeItem = (id: string) => {
    saveGroceries(groceries.filter(g => g.id !== id))
  }

  const getBentleySuggestions = async () => {
    const available = groceries.filter(g => !g.consumed).map(g => `${g.quantity ? g.quantity + ' ' : ''}${g.name}`).join(', ')
    if (!available) return
    setLoadingSuggestion(true)
    setShowBentley(true)
    try {
      const prompt = `Based on these available ingredients: ${available}. My food preferences — disliked foods: ${preferences.disliked || 'none'}, disliked vegetables: ${preferences.veggiesDisliked || 'none'}, dietary restrictions: ${preferences.restrictions || 'none'}. My fitness goal is to gain muscle and hit 3,200 calories and 180g protein per day. Suggest 3 specific meal ideas I can make with these ingredients. Keep it short — just meal name, estimated macros, and quick prep notes. No ingredients I've said I dislike.`
      const res = await fetch('/api/bentley', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      setBentleySuggestion(data.message || 'Unable to generate suggestions.')
    } catch {
      setBentleySuggestion('Could not connect to Bentley. Check your connection.')
    } finally {
      setLoadingSuggestion(false)
    }
  }

  const available = groceries.filter(g => !g.consumed)
  const byCategory = FOOD_CATS.map(cat => ({ cat, items: available.filter(g => g.category === cat) })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-4">
      {/* Preferences */}
      <button
        onClick={() => setShowPrefs(!showPrefs)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: `${BENTLEY_INDIGO}10`, border: `1px solid ${BENTLEY_INDIGO}30` }}
      >
        <div className="flex items-center gap-2">
          <Star size={13} style={{ color: BENTLEY_INDIGO }} />
          <span className="text-xs font-bold" style={{ color: BENTLEY_INDIGO }}>Food Preferences & Restrictions</span>
        </div>
        <ChevronRight size={13} style={{ color: BENTLEY_INDIGO, transform: showPrefs ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      <AnimatePresence>
        {showPrefs && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="rounded-xl p-4 space-y-3" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Foods I Dislike</label>
                <input
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
                  placeholder="e.g. liver, mushrooms, olives..."
                  value={preferences.disliked}
                  onChange={e => savePreferences({ ...preferences, disliked: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Vegetables I Dislike</label>
                <input
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
                  placeholder="e.g. Brussels sprouts, beets..."
                  value={preferences.veggiesDisliked}
                  onChange={e => savePreferences({ ...preferences, veggiesDisliked: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: theme.subtext }}>Dietary Restrictions</label>
                <input
                  className="w-full px-3 py-2 rounded-xl border text-sm"
                  style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
                  placeholder="e.g. no pork, lactose intolerant..."
                  value={preferences.restrictions}
                  onChange={e => savePreferences({ ...preferences, restrictions: e.target.value })}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grocery inventory */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart size={13} style={{ color: BENTLEY_GREEN }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Current Inventory</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: `${BENTLEY_GREEN}18`, color: BENTLEY_GREEN }}>{available.length}</span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl"
          style={{ background: `${BENTLEY_GREEN}18`, color: BENTLEY_GREEN }}
        >
          <Plus size={11} /> Add Food
        </button>
      </div>

      {/* Add food form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="rounded-xl p-3 space-y-2" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="col-span-1 px-3 py-2 rounded-xl border text-sm"
                  style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
                  placeholder="Quantity"
                  value={newItem.quantity}
                  onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))}
                />
                <input
                  className="col-span-2 px-3 py-2 rounded-xl border text-sm"
                  style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
                  placeholder="Food item name"
                  value={newItem.name}
                  onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {FOOD_CATS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setNewItem(p => ({ ...p, category: cat }))}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                    style={{
                      background: newItem.category === cat ? BENTLEY_GREEN : `${BENTLEY_GREEN}12`,
                      color: newItem.category === cat ? '#fff' : BENTLEY_GREEN,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: theme.bg, color: theme.subtext }}>Cancel</button>
                <button onClick={addItem} disabled={!newItem.name} className="flex-1 py-2 rounded-xl text-xs font-semibold disabled:opacity-40" style={{ background: BENTLEY_GREEN, color: '#fff' }}>Add</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inventory by category */}
      {byCategory.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
          <ShoppingCart size={24} className="mx-auto mb-2" style={{ color: theme.subtext }} />
          <p className="text-sm" style={{ color: theme.subtext }}>No food in inventory. Add items to get meal suggestions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {byCategory.map(({ cat, items }) => (
            <div key={cat}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.subtext }}>{cat}</p>
              <div className="space-y-1">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                    <button onClick={() => toggleConsumed(item.id)} className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: BENTLEY_GREEN, border: `1.5px solid ${BENTLEY_GREEN}` }}>
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

      {/* Bentley Meal Suggestions */}
      {available.length > 0 && (
        <div>
          <button
            onClick={getBentleySuggestions}
            disabled={loadingSuggestion}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${BENTLEY_GOLD}25, ${BENTLEY_INDIGO}15)`, border: `1px solid ${BENTLEY_GOLD}40`, color: BENTLEY_GOLD }}
          >
            <Sparkles size={14} />
            {loadingSuggestion ? 'Bentley is thinking...' : 'Get Meal Suggestions from Bentley'}
          </button>

          <AnimatePresence>
            {showBentley && bentleySuggestion && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-2xl p-4" style={{ background: `linear-gradient(135deg, #0F1A35, #141B2D)`, border: `1px solid ${BENTLEY_GOLD}30` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={13} style={{ color: BENTLEY_GOLD }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>Bentley's Meal Ideas</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#CBD5E1' }}>{bentleySuggestion}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ── MAIN PAGE ──
export default function FitnessPage() {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<'today' | 'workouts' | 'nutrition'>('today')
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [mealLogs, setMealLogs] = useState<MealLog[]>([])
  const [showMealModal, setShowMealModal] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newMeal, setNewMeal] = useState({ name: '', calories: '', protein: '', meal: 'breakfast' as MealLog['meal'] })
  const [inventoryItems, setInventoryItems] = useState<{ id: string; name: string; category: string; consumed: boolean }[]>([])

  useEffect(() => {
    try {
      const wl = localStorage.getItem('orca-weight-logs')
      const ml = localStorage.getItem('orca-meal-logs')
      const gr = localStorage.getItem('orca-grocery')
      if (wl) setWeightLogs(JSON.parse(wl))
      if (ml) setMealLogs(JSON.parse(ml))
      if (gr) setInventoryItems(JSON.parse(gr))
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
  const latestWeight = useMemo(() => [...weightLogs].sort((a, b) => b.date.localeCompare(a.date))[0]?.weight || 159, [weightLogs])

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
    const entry: MealLog = { id: Date.now().toString(), date: TODAY, meal, name, calories, protein: protein || 0 }
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

  const TABS = [
    { id: 'today', label: 'Today', icon: Flame },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrition', icon: ShoppingCart },
  ] as const

  return (
    <div className="min-h-screen pb-28" style={{ background: theme.bg, color: theme.text }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 sticky top-0 z-10"
        style={{ background: `${theme.bg}f0`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.border}` }}
      >
        <div>
          <h1 className="text-lg font-bold" style={{ color: theme.text }}>Fitness Hub</h1>
          <p className="text-xs" style={{ color: theme.subtext }}>159 → 200 lbs · Muscle Gain</p>
        </div>
        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowWeightModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            style={{ background: `${BENTLEY_GREEN}18`, color: BENTLEY_GREEN, border: `1px solid ${BENTLEY_GREEN}30` }}>
            <Scale size={12} /> Log Weight
          </motion.button>
          <motion.button whileTap={{ scale: 0.94 }} onClick={() => setShowMealModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            style={{ background: `${BENTLEY_INDIGO}18`, color: BENTLEY_INDIGO, border: `1px solid ${BENTLEY_INDIGO}30` }}>
            <Plus size={12} /> Meal
          </motion.button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 pt-3 pb-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
            style={{
              background: activeTab === tab.id ? FITNESS_PINK : theme.card,
              color: activeTab === tab.id ? '#fff' : theme.subtext,
              border: `1px solid ${activeTab === tab.id ? FITNESS_PINK : theme.border}`,
            }}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="px-4 pt-4 space-y-5 max-w-lg mx-auto"
      >
        {/* TODAY TAB */}
        {activeTab === 'today' && (
          <>
            <motion.div variants={fadeUp}>
              <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, #0F1A35, #141B2D)`, border: `1px solid ${BENTLEY_GOLD}25` }}>
                <div className="flex items-center gap-2 mb-4">
                  <Target size={14} style={{ color: BENTLEY_GOLD }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BENTLEY_GOLD }}>Today's Numbers</span>
                </div>
                <div className="flex justify-around">
                  <ProgressRing value={todayCalories} max={calGoal} color={calPct < 50 ? BENTLEY_RED : BENTLEY_GREEN} label="Calories" sub="goal 3,200" />
                  <ProgressRing value={todayProtein} max={proGoal} color={BENTLEY_INDIGO} label="Protein g" sub="goal 180g" />
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ border: `5px solid ${BENTLEY_GOLD}40`, background: `${BENTLEY_GOLD}10` }}>
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
                  <div className="mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2" style={{ background: `${BENTLEY_RED}18`, color: BENTLEY_RED, border: `1px solid ${BENTLEY_RED}30` }}>
                    <Flame size={12} /> You're {calGoal - todayCalories} calories behind. Bentley says: smoothie time, boss.
                  </div>
                )}
                {todayCalories >= calGoal && (
                  <div className="mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2" style={{ background: `${BENTLEY_GREEN}18`, color: BENTLEY_GREEN, border: `1px solid ${BENTLEY_GREEN}30` }}>
                    <Check size={12} /> Calorie goal hit. Protein: {todayProtein < proGoal ? `${proGoal - todayProtein}g short` : 'locked in'}.
                  </div>
                )}
              </div>
            </motion.div>

            {/* Today's Meals */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Today's Food</span>
                <span className="text-xs font-semibold" style={{ color: BENTLEY_INDIGO }}>{todayMeals.length} logged</span>
              </div>
              {todayMeals.length === 0 ? (
                <div className="rounded-2xl p-5 text-center" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <p className="text-sm" style={{ color: theme.subtext }}>Nothing logged yet today.</p>
                  <p className="text-xs mt-1" style={{ color: theme.subtext }}>Tap + Meal to start tracking.</p>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                  {todayMeals.map((meal, i) => {
                    const Icon = MEAL_ICONS[meal.meal] || Coffee
                    return (
                      <div key={meal.id} className="flex items-center gap-3 px-4 py-3" style={{ background: theme.card, borderBottom: i < todayMeals.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                        <div className="p-1.5 rounded-lg" style={{ background: `${BENTLEY_INDIGO}18` }}>
                          <Icon size={13} style={{ color: BENTLEY_INDIGO }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: theme.text }}>{meal.name}</p>
                          <p className="text-xs" style={{ color: theme.subtext }}>{meal.calories} cal · {meal.protein}g protein</p>
                        </div>
                        <button onClick={() => deleteMeal(meal.id)} className="p-1.5 rounded-xl" style={{ color: theme.subtext }}>
                          <X size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>

            {/* Quick Add — from grocery inventory or fallback meals */}
            <motion.div variants={fadeUp}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.subtext }}>Quick Add</p>
              {inventoryItems.filter(g => !g.consumed).length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {inventoryItems.filter(g => !g.consumed).slice(0, 8).map(item => (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setNewMeal(p => ({ ...p, name: item.name }))}
                      className="rounded-xl p-3 text-left"
                      style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                    >
                      <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{item.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: theme.subtext }}>{item.category}</p>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_MEALS.map(qm => (
                    <motion.button key={qm.name} whileTap={{ scale: 0.96 }} onClick={() => logMeal(qm)}
                      className="rounded-xl p-3 text-left" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                      <p className="text-sm font-semibold" style={{ color: theme.text }}>{qm.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: theme.subtext }}>{qm.cal} cal · {qm.protein}g protein</p>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Smoothies */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} style={{ color: BENTLEY_GOLD }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.subtext }}>Bentley's Smoothies</span>
              </div>
              <div className="space-y-2">
                {SMOOTHIE_SUGGESTIONS.map(s => (
                  <motion.button key={s.name} whileTap={{ scale: 0.98 }} onClick={() => logMeal({ name: s.name, cal: s.cal, protein: s.protein, meal: 'smoothie' })}
                    className="w-full rounded-xl p-4 text-left" style={{ background: `linear-gradient(135deg, #0F1A35, #141B2D)`, border: `1px solid ${BENTLEY_GOLD}25` }}>
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-bold" style={{ color: theme.text }}>{s.name}</p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${BENTLEY_GOLD}20`, color: BENTLEY_GOLD }}>+{s.cal} cal</span>
                    </div>
                    <p className="text-xs" style={{ color: theme.subtext }}>{s.ingredients}</p>
                    <p className="text-xs mt-1 font-semibold" style={{ color: BENTLEY_GREEN }}>{s.protein}g protein</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Weight History */}
            {weightLogs.length > 1 && (
              <motion.div variants={fadeUp}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.subtext }}>Weight Log</p>
                <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                  {[...weightLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((log, i, arr) => {
                    const prev = arr[i + 1]
                    const diff = prev ? log.weight - prev.weight : 0
                    return (
                      <div key={log.id} className="flex items-center justify-between px-4 py-3" style={{ background: theme.card, borderBottom: i < Math.min(arr.length - 1, 6) ? `1px solid ${theme.border}` : 'none' }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: theme.text }}>{log.weight} lbs</p>
                          <p className="text-xs" style={{ color: theme.subtext }}>{new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                        {diff !== 0 && <span className="text-xs font-bold" style={{ color: diff > 0 ? BENTLEY_GREEN : BENTLEY_RED }}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}</span>}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* WORKOUTS TAB */}
        {activeTab === 'workouts' && (
          <motion.div variants={fadeUp}>
            <WorkoutSection theme={theme} />
          </motion.div>
        )}

        {/* NUTRITION TAB */}
        {activeTab === 'nutrition' && (
          <motion.div variants={fadeUp}>
            <NutritionSection theme={theme} />
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
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4" style={{ color: theme.text }}>Log Weight</h3>
              <input type="number" value={newWeight} onChange={e => setNewWeight(e.target.value)}
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

      {/* Meal Modal */}
      <AnimatePresence>
        {showMealModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setShowMealModal(false)}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: theme.card, border: `1px solid ${theme.border}` }}
              onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>Log Meal</h3>
              <select value={newMeal.meal} onChange={e => setNewMeal(p => ({ ...p, meal: e.target.value as MealLog['meal'] }))}
                className="w-full rounded-xl px-4 py-3 outline-none" style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
                <option value="smoothie">Smoothie</option>
              </select>
              <input type="text" value={newMeal.name} onChange={e => setNewMeal(p => ({ ...p, name: e.target.value }))}
                placeholder="Meal name" className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={newMeal.calories} onChange={e => setNewMeal(p => ({ ...p, calories: e.target.value }))}
                  placeholder="Calories" className="rounded-xl px-4 py-3 outline-none"
                  style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
                <input type="number" value={newMeal.protein} onChange={e => setNewMeal(p => ({ ...p, protein: e.target.value }))}
                  placeholder="Protein (g)" className="rounded-xl px-4 py-3 outline-none"
                  style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowMealModal(false)} className="flex-1 py-3 rounded-xl font-semibold" style={{ background: theme.bg, color: theme.subtext }}>Cancel</button>
                <button onClick={() => logMeal()} disabled={!newMeal.name || !newMeal.calories}
                  className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-40" style={{ background: BENTLEY_INDIGO, color: '#fff' }}>
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
