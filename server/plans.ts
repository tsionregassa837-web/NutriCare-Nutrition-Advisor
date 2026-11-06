import { nutritionForServings, sumMacros } from '../shared/nutrition';
import type { DayPlan, Food, MealType, PlanMeal, Profile } from '../shared/types';

interface Template { slot: MealType; name: string; items: [string, number][] }

export const TEMPLATES: Template[] = [
  { slot: 'breakfast', name: 'Injera with shiro', items: [['injera', 2], ['shiro', 1]] },
  { slot: 'breakfast', name: 'Firfir with a boiled egg and tea', items: [['firfir', 1], ['egg', 1], ['tea', 1]] },
  { slot: 'breakfast', name: 'Chechebsa with tea', items: [['chechebsa', 1], ['tea', 1]] },
  { slot: 'breakfast', name: 'Oat porridge with banana', items: [['oats', 1], ['banana', 1]] },
  { slot: 'breakfast', name: 'Bread, eggs and tea', items: [['bread', 2], ['egg', 2], ['tea', 1]] },
  { slot: 'breakfast', name: 'Genfo with tea', items: [['genfo', 1], ['tea', 1]] },
  { slot: 'breakfast', name: 'Fruit salad with yogurt', items: [['fruit-salad', 1], ['yogurt', 1]] },
  { slot: 'lunch', name: 'Tibs with salad and injera', items: [['tibs', 1], ['salad', 1], ['injera', 1]] },
  { slot: 'lunch', name: 'Misir wot with injera and gomen', items: [['misir', 1], ['injera', 2], ['gomen', 1]] },
  { slot: 'lunch', name: 'Beyaynetu with injera', items: [['beyaynetu', 1], ['injera', 2]] },
  { slot: 'lunch', name: 'Doro wot with injera', items: [['doro-wot', 1], ['injera', 2]] },
  { slot: 'lunch', name: 'Rice with lentils and salad', items: [['rice', 1], ['lentils', 1], ['salad', 1]] },
  { slot: 'lunch', name: 'Grilled fish with potato and salad', items: [['fish', 1], ['potato', 1], ['salad', 1]] },
  { slot: 'lunch', name: 'Chicken with rice and salad', items: [['chicken-breast', 1], ['rice', 1], ['salad', 1]] },
  { slot: 'dinner', name: 'Misir wot with gomen', items: [['misir', 1], ['gomen', 1], ['injera', 1]] },
  { slot: 'dinner', name: 'Shiro with injera', items: [['shiro', 1], ['injera', 2]] },
  { slot: 'dinner', name: 'Kik alicha with atkilt and injera', items: [['kik-alicha', 1], ['atkilt', 1], ['injera', 1]] },
  { slot: 'dinner', name: 'Fossolia with injera', items: [['fossolia', 1], ['injera', 2]] },
  { slot: 'dinner', name: 'Chicken with sweet potato and salad', items: [['chicken-breast', 1], ['sweet-potato', 1], ['salad', 1]] },
  { slot: 'dinner', name: 'Pasta with lentils', items: [['pasta', 1], ['lentils', 1]] },
  { slot: 'snack', name: 'Fruit and tea', items: [['banana', 1], ['tea', 1]] },
  { slot: 'snack', name: 'Boiled egg', items: [['egg', 1]] },
  { slot: 'snack', name: 'Boiled chickpeas (shimbra)', items: [['chickpeas', 0.5]] },
  { slot: 'snack', name: 'Yogurt with an apple', items: [['yogurt', 1], ['apple', 1]] },
  { slot: 'snack', name: 'Orange', items: [['orange', 1]] },
  { slot: 'snack', name: 'Handful of peanuts', items: [['peanuts', 1]] },
];

const SHARE: Record<MealType, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };

export function foodBlockReasons(food: Food, profile: Pick<Profile, 'allergies' | 'diets'>): string[] {
  const allergies = profile.allergies.map((a) => a.toLowerCase().trim()).filter(Boolean);
  const reasons: string[] = [];

  for (const allergy of allergies) {
    const allergen = food.allergens.find((a) => a.toLowerCase() === allergy);
    if (allergen) {
      reasons.push(`allergy: ${allergen}`);
      continue;
    }
    if (food.name.toLowerCase().includes(allergy) || food.alt.some((x) => x.toLowerCase() === allergy)) {
      reasons.push(`allergy: ${allergy}`);
    }
  }

  const dietMismatch = profile.diets.filter((d) => !food.diet.includes(d));
  if (dietMismatch.length) reasons.push(`diet: ${dietMismatch.join(', ')}`);

  return [...new Set(reasons)];
}

export function isFoodAllowed(food: Food, profile: Pick<Profile, 'allergies' | 'diets'>): boolean {
  return foodBlockReasons(food, profile).length === 0;
}

function build(t: Template, foods: Map<string, Food>): PlanMeal | null {
  const items: PlanMeal['items'] = [];
  const macros = [];
  for (const [id, qty] of t.items) {
    const food = foods.get(id);
    if (!food) return null;
    items.push({ foodId: id, name: food.name, quantity: qty, servingLabel: food.servingLabel });
    macros.push(nutritionForServings(food, qty));
  }
  const s = sumMacros(macros);
  return { name: t.name, items, kcal: s.kcal, protein: s.protein, carbs: s.carbs, fat: s.fat };
}

export function candidatesFor(slot: MealType, foods: Map<string, Food>, profile: Pick<Profile, 'allergies' | 'diets'>): PlanMeal[] {
  return TEMPLATES.filter((t) => t.slot === slot)
    .filter((t) => t.items.every(([id]) => { const fd = foods.get(id); return fd && isFoodAllowed(fd, profile); }))
    .map((t) => build(t, foods))
    .filter((m): m is PlanMeal => m !== null);
}

/**
 * Deterministic meal-plan generator. It first enforces diet/allergy eligibility,
 * then scores candidates by calorie fit and macro balance. Macro goals are
 * heuristic proportions (20% protein, 50% carbs, 30% fat), not clinical targets.
 * dayIndex rotates similarly-scoring candidates to reduce repetitive plans.
 */
export function generateDayPlan(targetKcal: number, foods: Map<string, Food>, profile: Pick<Profile, 'allergies' | 'diets'>, dayIndex: number): DayPlan {
  if (!Number.isFinite(targetKcal) || targetKcal <= 0) throw new RangeError('targetKcal must be a positive finite number');
  if (!Number.isInteger(dayIndex) || dayIndex < 0) throw new RangeError('dayIndex must be a non-negative integer');
  const plan: DayPlan = {};
  const usedFoods = new Set<string>();
  (Object.keys(SHARE) as MealType[]).forEach((slot) => {
    const slotKcal = targetKcal * SHARE[slot];
    const proteinGoal = slotKcal * 0.20 / 4;
    const carbsGoal = slotKcal * 0.50 / 4;
    const fatGoal = slotKcal * 0.30 / 9;
    const ranked = candidatesFor(slot, foods, profile).map((meal) => {
      // Normalize each distance so no single macro dominates purely by units.
      const calorieError = Math.abs(meal.kcal - slotKcal) / Math.max(slotKcal, 1);
      const proteinError = Math.abs(meal.protein - proteinGoal) / Math.max(proteinGoal, 1);
      const carbsError = Math.abs(meal.carbs - carbsGoal) / Math.max(carbsGoal, 1);
      const fatError = Math.abs(meal.fat - fatGoal) / Math.max(fatGoal, 1);
      const repeatedFoodCount = meal.items.filter((item) => usedFoods.has(item.foodId)).length;
      const varietyPenalty = repeatedFoodCount * 0.08;
      return { meal, score: calorieError * 0.60 + proteinError * 0.18 + carbsError * 0.12 + fatError * 0.10 + varietyPenalty }; 
    }).sort((a, b) => a.score - b.score || a.meal.name.localeCompare(b.meal.name));
    // Rotate through the best-scoring candidates by day to avoid always returning the same meal.
    const top = ranked.slice(0, Math.min(5, ranked.length));
    if (top.length) {
      const chosen = top[dayIndex % top.length].meal;
      plan[slot] = chosen;
      chosen.items.forEach((item) => usedFoods.add(item.foodId));
    }
  });
  return plan;
}
