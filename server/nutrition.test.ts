import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bmi, bmr, computeTargets, nutritionForServings, scaleNutrition } from '../shared/nutrition';
import { SEED_FOODS } from './foods';
import { foodBlockReasons, generateDayPlan, isFoodAllowed } from './plans';

test('portion scaling uses per-100g x grams / 100', () => {
  const r = scaleNutrition({ kcal: 200, protein: 10, carbs: 30, fat: 5, fiber: 2 }, 150);
  assert.equal(r.kcal, 300); assert.equal(r.protein, 15); assert.equal(r.carbs, 45);
});
test('servings multiply grams', () => {
  const injera = SEED_FOODS.find((f) => f.id === 'injera')!;
  assert.equal(nutritionForServings(injera, 2).grams, 200);
  assert.equal(nutritionForServings(injera, 2).kcal, 380);
});
test('invalid nutrition inputs are rejected instead of producing misleading values', () => {
  assert.throws(() => scaleNutrition({ kcal: 10, protein: 1, carbs: 1, fat: 1, fiber: 1 }, -1), /grams/);
  assert.throws(() => nutritionForServings(SEED_FOODS[0], Number.NaN), /servings/);
  assert.throws(() => bmi(0, 60), /positive finite/);
  assert.throws(() => bmr('female', -1, 160, 30), /positive finite/);
});
test('BMI and Mifflin-St Jeor', () => {
  assert.equal(bmi(170, 70), 24.2);
  assert.equal(bmr('female', 60, 165, 30), 1320);
  assert.equal(bmr('male', 80, 180, 30), 1780);
});
test('targets: default when profile incomplete, personal when complete, safe floor', () => {
  assert.equal(computeTargets({}).isDefault, true);
  const t = computeTargets({ sex: 'female', age: 30, heightCm: 165, weightKg: 60, activity: 'light', goal: 'maintain' });
  assert.equal(t.isDefault, false); assert.equal(t.kcal, 1820);
  const low = computeTargets({ sex: 'female', age: 80, heightCm: 150, weightKg: 35, activity: 'sedentary', goal: 'lose' });
  assert.ok(low.kcal >= 1200);
  assert.equal(computeTargets({ sex: 'female', age: 16, heightCm: 160, weightKg: 50 }).isDefault, true);
});
test('planner rejects invalid calorie targets and day indexes', () => {
  const foods = new Map(SEED_FOODS.map((f) => [f.id, f]));
  const profile = { allergies: [], diets: [] };
  assert.throws(() => generateDayPlan(0, foods, profile, 0), /targetKcal/);
  assert.throws(() => generateDayPlan(2000, foods, profile, -1), /dayIndex/);
});
test('allergy and diet filters', () => {
  const egg = SEED_FOODS.find((f) => f.id === 'egg')!;
  const shiro = SEED_FOODS.find((f) => f.id === 'shiro')!;
  assert.equal(isFoodAllowed(egg, { allergies: ['Egg'], diets: [] }), false);
  assert.equal(isFoodAllowed(egg, { allergies: [], diets: ['vegan'] }), false);
  assert.equal(isFoodAllowed(shiro, { allergies: [], diets: ['vegan', 'fasting'] }), true);
});

test('photo-analysis policy returns explicit allergy and diet block reasons', () => {
  const doro = SEED_FOODS.find((f) => f.id === 'doro-wot')!;
  const shiro = SEED_FOODS.find((f) => f.id === 'shiro')!;
  assert.deepEqual(foodBlockReasons(doro, { allergies: ['egg'], diets: [] }), ['allergy: egg']);
  assert.deepEqual(foodBlockReasons(doro, { allergies: ['egg'], diets: ['vegan'] }), ['allergy: egg', 'diet: vegan']);
  assert.deepEqual(foodBlockReasons(shiro, { allergies: [], diets: ['vegan', 'fasting'] }), []);
  assert.equal(isFoodAllowed(doro, { allergies: ['egg'], diets: [] }), false);
  assert.equal(isFoodAllowed(shiro, { allergies: [], diets: ['vegan', 'fasting'] }), true);
});
test('vegan plan never contains animal foods or allergens', () => {
  const foods = new Map(SEED_FOODS.map((f) => [f.id, f]));
  for (let d = 0; d < 5; d++) {
    const plan = generateDayPlan(2000, foods, { allergies: ['gluten'], diets: ['vegan'] }, d);
    for (const meal of Object.values(plan)) for (const it of meal.items) assert.ok(isFoodAllowed(foods.get(it.foodId)!, { allergies: ['gluten'], diets: ['vegan'] }), it.foodId);
  }
});


test('verified food records use traceable 2025 Ethiopian sources', () => {
  const doro = SEED_FOODS.find((f) => f.id === 'doro-wot')!;
  const tibs = SEED_FOODS.find((f) => f.id === 'tibs')!;
  const chechebsa = SEED_FOODS.find((f) => f.id === 'chechebsa')!;
  const oats = SEED_FOODS.find((f) => f.id === 'oats')!;
  assert.equal(doro.quality, 'sourced');
  assert.match(doro.source, /food code 070152/);
  assert.deepEqual(doro.per100g, { kcal: 219, protein: 6.8, carbs: 5.1, fat: 18.4, fiber: 2.9 });
  assert.equal(tibs.quality, 'sourced');
  assert.match(tibs.source, /food code 070156/);
  assert.equal(chechebsa.allergens.includes('gluten'), false);
  assert.equal(chechebsa.allergens.includes('milk'), true);
  assert.equal(oats.allergens.length, 0);
});

test('food catalog has source metadata and explicit quality labels', () => {
  assert.ok(SEED_FOODS.length >= 20);
  for (const food of SEED_FOODS) {
    assert.ok(food.source.trim().length > 10, food.id);
    assert.ok(['estimated', 'sourced', 'custom'].includes(food.quality), food.id);
  }
});

test('planner rotates strong candidates across days when available', () => {
  const foods = new Map(SEED_FOODS.map((f) => [f.id, f]));
  const profile = { allergies: [], diets: [] };
  const plans = Array.from({ length: 5 }, (_, d) => generateDayPlan(2000, foods, profile, d));
  const breakfasts = new Set(plans.map((p) => p.breakfast?.name).filter(Boolean));
  assert.ok(breakfasts.size >= 2);
});
