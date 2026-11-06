export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export type Sex = 'female' | 'male';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Lang = 'en' | 'am';

export interface Macros { kcal: number; protein: number; carbs: number; fat: number; fiber: number }

export interface Food {
  id: string;
  name: string;
  nameAm?: string;
  alt: string[];
  category: 'ethiopian' | 'grains' | 'protein' | 'vegetables' | 'fruit' | 'drinks' | 'other';
  servingLabel: string;
  servingGrams: number;
  per100g: Macros;
  allergens: string[];
  diet: string[]; // 'vegan' | 'vegetarian' | 'fasting' (fasting = Orthodox fasting-day friendly)
  source: string;
  quality: 'estimated' | 'sourced' | 'custom';
}

export interface Profile {
  age?: number;
  sex?: Sex;
  heightCm?: number;
  weightKg?: number;
  activity?: ActivityLevel;
  goal?: Goal;
  diets: string[];
  allergies: string[];
  units: 'metric' | 'imperial';
  lang: Lang;
}

export interface MealEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  foodId: string;
  name: string;
  quantity: number; // number of servings
  servingLabel: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  source: 'database' | 'ai-photo';
  createdAt: string;
}

export interface Targets {
  kcal: number; protein: number; carbs: number; fat: number;
  bmi: number | null; bmr: number | null;
  isDefault: boolean;
  notes: string[];
}

export interface PlanMeal { name: string; items: { foodId: string; name: string; quantity: number; servingLabel: string }[]; kcal: number; protein: number; carbs: number; fat: number }
export type DayPlan = Partial<Record<MealType, PlanMeal>>;
