import type { GroceryCategory, GroceryItem } from './types'

export const CAT_CONFIG: Record<GroceryCategory, { label: string; color: string; emoji: string }> = {
  protein:    { label: 'Protein',            color: '#EF4444', emoji: '🥩' },
  carbs:      { label: 'Carbs',               color: '#D97706', emoji: '🌾' },
  fruit:      { label: 'Fruit',                color: '#10B981', emoji: '🍓' },
  vegetables: { label: 'Vegetables',          color: '#22C55E', emoji: '🥦' },
  smoothie:   { label: 'Smoothie Ingredients', color: '#EC4899', emoji: '🥤' },
  snacks:     { label: 'Snacks',              color: '#8B5CF6', emoji: '🍿' },
  breakfast:  { label: 'Breakfast',           color: '#F59E0B', emoji: '🧇' },
  household:  { label: 'Household',           color: '#64748B', emoji: '🧻' },
}

interface GroceryIngredient {
  name: string
  category: GroceryCategory
}

/** Base grocery components for every Phase-4 meal preset, keyed by preset name (src/lib/meals.ts MEAL_PRESETS). */
export const MEAL_INGREDIENTS: Record<string, GroceryIngredient[]> = {
  'Waffles + Peanut Butter + Eggs': [
    { name: 'Waffles', category: 'breakfast' },
    { name: 'Peanut Butter', category: 'breakfast' },
    { name: 'Eggs', category: 'breakfast' },
  ],
  'Chicken + Rice': [
    { name: 'Chicken Breast', category: 'protein' },
    { name: 'Rice', category: 'carbs' },
  ],
  'Ground Beef + Rice': [
    { name: 'Ground Beef', category: 'protein' },
    { name: 'Rice', category: 'carbs' },
  ],
  'Turkey Sandwich + Fruit': [
    { name: 'Sliced Turkey', category: 'protein' },
    { name: 'Bread', category: 'carbs' },
    { name: 'Fruit', category: 'fruit' },
  ],
  'Chicken Wrap': [
    { name: 'Chicken Breast', category: 'protein' },
    { name: 'Tortillas', category: 'carbs' },
  ],
  'Pasta + Ground Beef': [
    { name: 'Pasta', category: 'carbs' },
    { name: 'Ground Beef', category: 'protein' },
  ],
  'Rotisserie Chicken + Microwave Rice': [
    { name: 'Rotisserie Chicken', category: 'protein' },
    { name: 'Microwave Rice', category: 'carbs' },
  ],
  'Strawberry Banana Protein Smoothie': [
    { name: 'Strawberries', category: 'smoothie' },
    { name: 'Bananas', category: 'smoothie' },
    { name: 'Milk', category: 'smoothie' },
    { name: 'Greek Yogurt', category: 'smoothie' },
    { name: 'Protein Powder', category: 'smoothie' },
    { name: 'Peanut Butter', category: 'smoothie' },
    { name: 'Oats', category: 'smoothie' },
  ],
  'Chicken + Rice + Vegetables': [
    { name: 'Chicken Breast', category: 'protein' },
    { name: 'Rice', category: 'carbs' },
    { name: 'Mixed Vegetables', category: 'vegetables' },
  ],
  'Ground Beef + Pasta': [
    { name: 'Ground Beef', category: 'protein' },
    { name: 'Pasta', category: 'carbs' },
  ],
  'Steak + Potatoes': [
    { name: 'Steak', category: 'protein' },
    { name: 'Potatoes', category: 'carbs' },
  ],
  'Burgers + Potatoes': [
    { name: 'Ground Beef', category: 'protein' },
    { name: 'Burger Buns', category: 'carbs' },
    { name: 'Potatoes', category: 'carbs' },
  ],
  'Chicken Pasta': [
    { name: 'Chicken Breast', category: 'protein' },
    { name: 'Pasta', category: 'carbs' },
  ],
  'Taco Bowls': [
    { name: 'Ground Beef', category: 'protein' },
    { name: 'Rice', category: 'carbs' },
    { name: 'Taco Toppings', category: 'vegetables' },
  ],
  'Greek Yogurt': [
    { name: 'Greek Yogurt', category: 'snacks' },
  ],
  'Peanut Butter Sandwich': [
    { name: 'Peanut Butter', category: 'snacks' },
    { name: 'Bread', category: 'snacks' },
  ],
  'Cereal + Milk': [
    { name: 'Cereal', category: 'snacks' },
    { name: 'Milk', category: 'snacks' },
  ],
  'Cottage Cheese': [
    { name: 'Cottage Cheese', category: 'snacks' },
  ],
  'Protein Shake': [
    { name: 'Protein Powder', category: 'snacks' },
  ],
}

/** Flattened, deduped grocery suggestions covering every meal Hero actually eats (Phase 4 presets). */
export function getSuggestedGroceries(): GroceryIngredient[] {
  const seen = new Map<string, GroceryIngredient>()
  Object.values(MEAL_INGREDIENTS).forEach(ingredients => {
    ingredients.forEach(ing => {
      const key = ing.name.toLowerCase()
      if (!seen.has(key)) seen.set(key, ing)
    })
  })
  return Array.from(seen.values())
}

/** Items flagged as running low, either by quantity threshold or by estimated days-of-supply elapsed. */
export function getStaplesRunningLow(items: GroceryItem[], today: Date = new Date()): GroceryItem[] {
  return items.filter(item => {
    if (item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold) return true
    if (item.estimatedDays != null && item.purchaseDate) {
      const purchased = new Date(item.purchaseDate + 'T00:00:00')
      const daysElapsed = Math.floor((today.getTime() - purchased.getTime()) / 86400000)
      if (daysElapsed >= item.estimatedDays * 0.8) return true
    }
    return false
  })
}

export interface GrocerySettings {
  reUpDay: number // 0=Sunday..6=Saturday
}

export function getDefaultGrocerySettings(): GrocerySettings {
  return { reUpDay: 6 }
}

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
