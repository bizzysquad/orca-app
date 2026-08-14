import type { WorkoutDayPlan, WorkoutExerciseDef, WorkoutExerciseLog } from './types'

function ex(id: string, name: string, sets: number, repMin: number, repMax: number, incrementLbs: number): WorkoutExerciseDef {
  return { id, name, sets, repMin, repMax, incrementLbs }
}

export function getDefaultWorkoutPlan(): Record<number, WorkoutDayPlan> {
  return {
    0: { title: 'Rest Day', exercises: [] },
    1: {
      title: 'Push / Chest, Shoulders, Triceps',
      exercises: [
        ex('bench-press', 'Bench Press', 4, 6, 8, 5),
        ex('incline-db-press', 'Incline Dumbbell Press', 3, 8, 10, 5),
        ex('shoulder-press', 'Dumbbell or Machine Shoulder Press', 3, 8, 10, 5),
        ex('lateral-raises', 'Lateral Raises', 3, 12, 15, 2.5),
        ex('tricep-pushdowns', 'Tricep Pushdowns', 3, 10, 12, 2.5),
        ex('overhead-tricep-ext', 'Overhead Tricep Extension', 2, 10, 12, 2.5),
      ],
    },
    2: {
      title: 'Pull / Back, Biceps',
      exercises: [
        ex('lat-pulldown-pullup', 'Lat Pulldown or Pull-ups', 4, 6, 10, 5),
        ex('seated-cable-row', 'Seated Cable Row', 3, 8, 10, 5),
        ex('chest-supported-row', 'Chest-Supported Dumbbell Row', 3, 8, 10, 5),
        ex('face-pulls', 'Face Pulls or Rear-Delt Fly', 3, 12, 15, 2.5),
        ex('db-curls', 'Dumbbell Curls', 3, 10, 12, 2.5),
        ex('hammer-curls', 'Hammer Curls', 2, 10, 12, 2.5),
      ],
    },
    3: {
      title: 'Legs',
      exercises: [
        ex('squat-hack-squat', 'Squat or Hack Squat', 4, 6, 8, 10),
        ex('romanian-deadlift-1', 'Romanian Deadlift', 3, 8, 10, 10),
        ex('leg-press-1', 'Leg Press', 3, 10, 12, 10),
        ex('leg-curl-1', 'Leg Curl', 3, 10, 12, 5),
        ex('calf-raises-1', 'Calf Raises', 4, 12, 15, 5),
        ex('ab-exercise', 'Ab Exercise', 3, 15, 20, 2.5),
      ],
    },
    4: {
      title: 'Upper Body',
      exercises: [
        ex('incline-bench', 'Incline Bench Press', 3, 6, 8, 5),
        ex('lat-pulldown', 'Lat Pulldown', 3, 8, 10, 5),
        ex('db-bench-press', 'Dumbbell Bench Press', 3, 8, 10, 5),
        ex('cable-machine-row', 'Cable or Machine Row', 3, 8, 10, 5),
        ex('lateral-raises-2', 'Lateral Raises', 3, 12, 15, 2.5),
        ex('bicep-curl', 'Bicep Curl', 2, 10, 12, 2.5),
        ex('tricep-pushdown-2', 'Tricep Pushdown', 2, 10, 12, 2.5),
      ],
    },
    5: {
      title: 'Legs + Arms',
      exercises: [
        ex('leg-press-squat-2', 'Leg Press or Squat', 3, 8, 10, 10),
        ex('romanian-deadlift-2', 'Romanian Deadlift', 3, 8, 10, 10),
        ex('leg-extension', 'Leg Extension', 3, 10, 15, 5),
        ex('leg-curl-2', 'Leg Curl', 3, 10, 15, 5),
        ex('db-curl-2', 'Dumbbell Curl', 3, 10, 12, 2.5),
        ex('tricep-extension', 'Tricep Extension', 3, 10, 12, 2.5),
        ex('calf-raises-2', 'Calf Raises', 3, 12, 15, 5),
      ],
    },
    6: { title: 'Optional — Light Cardio / Mobility / Abs / Recovery', exercises: [] },
  }
}

/** Most recent log entry for an exercise before (or on) a given date. */
export function getLastLog(exerciseId: string, logs: WorkoutExerciseLog[], beforeDate: string): WorkoutExerciseLog | null {
  const matches = logs
    .filter(l => l.exerciseId === exerciseId && l.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date))
  return matches[0] || null
}

export interface WeightSuggestion {
  previousWeight: number | null
  suggestedWeight: number | null
  reason: string
}

/** Simple progressive overload: hit the top of the rep range with good form -> suggest a bump. */
export function getSuggestedWeight(def: WorkoutExerciseDef, lastLog: WorkoutExerciseLog | null): WeightSuggestion {
  if (!lastLog) {
    return { previousWeight: null, suggestedWeight: null, reason: 'No previous data yet — log your starting weight.' }
  }
  const hitTop = lastLog.goodForm && lastLog.repsAchieved >= def.repMax && lastLog.completedSets >= def.sets
  if (hitTop) {
    return {
      previousWeight: lastLog.weightUsed,
      suggestedWeight: lastLog.weightUsed + def.incrementLbs,
      reason: 'Hit the top of your rep range with good form last time — bump it up.',
    }
  }
  return {
    previousWeight: lastLog.weightUsed,
    suggestedWeight: lastLog.weightUsed,
    reason: 'Stay at this weight and aim for the top of the rep range.',
  }
}
