import type { ActivityLevel, Food, Goal, Macros, Profile, Targets } from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Nutrition for a portion. per100g values scale by grams / 100. */
export function scaleNutrition(per100g: Macros, grams: number): Macros {
  if (!Number.isFinite(grams) || grams < 0) throw new RangeError('grams must be a finite, non-negative number');
  for (const [key, value] of Object.entries(per100g)) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`${key} must be a finite, non-negative number`);
  }
  const f = grams / 100;
  return {
    kcal: Math.round(per100g.kcal * f),
    protein: round1(per100g.protein * f),
    carbs: round1(per100g.carbs * f),
    fat: round1(per100g.fat * f),
    fiber: round1(per100g.fiber * f),
  };
}

export function nutritionForServings(food: Food, servings: number): Macros & { grams: number } {
  if (!Number.isFinite(servings) || servings < 0) throw new RangeError('servings must be a finite, non-negative number');
  if (!Number.isFinite(food.servingGrams) || food.servingGrams <= 0) throw new RangeError('food servingGrams must be a positive finite number');
  const grams = food.servingGrams * servings;
  return { grams: Math.round(grams), ...scaleNutrition(food.per100g, grams) };
}

export function bmi(heightCm: number, weightKg: number): number {
  if (!Number.isFinite(heightCm) || heightCm <= 0 || !Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError('heightCm and weightKg must be positive finite numbers');
  }
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

/** Mifflin-St Jeor equation (adults). */
export function bmr(sex: 'female' | 'male', weightKg: number, heightCm: number, age: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(heightCm) || heightCm <= 0 || !Number.isFinite(age) || age <= 0) {
    throw new RangeError('weightKg, heightCm, and age must be positive finite numbers');
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161));
}

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
const GOAL_ADJUST: Record<Goal, number> = { lose: -0.15, maintain: 0, gain: 0.1 };

const DEFAULT_TARGETS: Targets = { kcal: 2000, protein: 75, carbs: 250, fat: 65, bmi: null, bmr: null, isDefault: true, notes: [] };

/** Estimated daily targets. These are general estimates, not medical advice. */
export function computeTargets(p: Partial<Profile>): Targets {
  const notes: string[] = [];
  const valid =
    p.sex && p.age && p.heightCm && p.weightKg && p.age >= 18 && p.age <= 100 &&
    p.heightCm >= 120 && p.heightCm <= 230 && p.weightKg >= 30 && p.weightKg <= 300;
  if (!valid) {
    if (p.age && p.age < 18) notes.push('Calorie targets are only estimated for adults. Please ask a doctor or dietitian for guidance for under-18s.');
    notes.push('Using a general 2,000 kcal default. Complete your profile for a personal estimate.');
    return { ...DEFAULT_TARGETS, notes };
  }
  const rate = bmr(p.sex!, p.weightKg!, p.heightCm!, p.age!);
  const tdee = rate * ACTIVITY_FACTOR[p.activity ?? 'light'];
  let kcal = tdee * (1 + GOAL_ADJUST[p.goal ?? 'maintain']);
  const floor = p.sex === 'male' ? 1500 : 1200;
  if (kcal < floor) { kcal = floor; notes.push('Target raised to a safe minimum. Very low-calorie diets should be supervised by a professional.'); }
  kcal = Math.round(kcal / 10) * 10;
  const protein = Math.round((kcal * 0.2) / 4);
  const fat = Math.round((kcal * 0.3) / 9);
  const carbs = Math.round((kcal * 0.5) / 4);
  const b = bmi(p.heightCm!, p.weightKg!);
  notes.push('BMI and calorie needs are screening estimates, not a diagnosis.');
  return { kcal, protein, carbs, fat, bmi: b, bmr: rate, isDefault: false, notes };
}

export function sumMacros(list: Macros[]): Macros {
  const t = list.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat, fiber: a.fiber + m.fiber }), { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  return { kcal: Math.round(t.kcal), protein: round1(t.protein), carbs: round1(t.carbs), fat: round1(t.fat), fiber: round1(t.fiber) };
}
