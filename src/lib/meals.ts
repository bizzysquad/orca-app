import type { MealLog } from './types'

export const PROTEIN_TARGET = 180

export const MEAL_LABELS: Record<MealLog['meal'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  smoothie: 'Smoothie / Snack',
  dinner: 'Dinner',
  snack: 'Optional Night Snack',
}

export const MEAL_ORDER: MealLog['meal'][] = ['breakfast', 'lunch', 'smoothie', 'dinner', 'snack']

export const MEAL_PROTEIN_TARGETS: Record<MealLog['meal'], [number, number] | null> = {
  breakfast: [35, 45],
  lunch: [40, 50],
  smoothie: [35, 50],
  dinner: [45, 55],
  snack: null,
}

export interface MealPreset {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  notes?: string
}

export const MEAL_PRESETS: Record<MealLog['meal'], MealPreset[]> = {
  breakfast: [
    { name: 'Waffles + Peanut Butter + Eggs', calories: 650, protein: 40, carbs: 55, fat: 28 },
  ],
  lunch: [
    { name: 'Chicken + Rice', calories: 600, protein: 45, carbs: 65, fat: 12 },
    { name: 'Ground Beef + Rice', calories: 650, protein: 42, carbs: 60, fat: 22 },
    { name: 'Turkey Sandwich + Fruit', calories: 550, protein: 40, carbs: 60, fat: 15 },
    { name: 'Chicken Wrap', calories: 580, protein: 42, carbs: 55, fat: 18 },
    { name: 'Pasta + Ground Beef', calories: 700, protein: 45, carbs: 75, fat: 22 },
    { name: 'Rotisserie Chicken + Microwave Rice', calories: 620, protein: 48, carbs: 55, fat: 16 },
  ],
  smoothie: [
    { name: 'Strawberry Banana Protein Smoothie', calories: 450, protein: 40, carbs: 55, fat: 8, notes: 'Optional peanut butter or oats add extra calories/protein' },
  ],
  dinner: [
    { name: 'Chicken + Rice + Vegetables', calories: 650, protein: 50, carbs: 60, fat: 15 },
    { name: 'Ground Beef + Pasta', calories: 750, protein: 48, carbs: 80, fat: 25 },
    { name: 'Steak + Potatoes', calories: 700, protein: 50, carbs: 50, fat: 30 },
    { name: 'Burgers + Potatoes', calories: 750, protein: 48, carbs: 55, fat: 35 },
    { name: 'Chicken Pasta', calories: 720, protein: 50, carbs: 75, fat: 20 },
    { name: 'Taco Bowls', calories: 680, protein: 45, carbs: 60, fat: 25 },
  ],
  snack: [
    { name: 'Greek Yogurt', calories: 150, protein: 20, carbs: 10, fat: 2 },
    { name: 'Peanut Butter Sandwich', calories: 350, protein: 15, carbs: 35, fat: 18 },
    { name: 'Cereal + Milk', calories: 300, protein: 12, carbs: 50, fat: 6 },
    { name: 'Cottage Cheese', calories: 180, protein: 25, carbs: 8, fat: 5 },
    { name: 'Protein Shake', calories: 200, protein: 30, carbs: 8, fat: 3 },
  ],
}

export interface DailyTotals {
  protein: number
  calories: number
  carbs: number
  fat: number
}

export function getDailyTotals(logs: MealLog[], date: string): DailyTotals {
  return logs
    .filter(l => l.date === date)
    .reduce((acc, l) => ({
      protein: acc.protein + (l.protein || 0),
      calories: acc.calories + (l.calories || 0),
      carbs: acc.carbs + (l.carbs || 0),
      fat: acc.fat + (l.fat || 0),
    }), { protein: 0, calories: 0, carbs: 0, fat: 0 })
}
