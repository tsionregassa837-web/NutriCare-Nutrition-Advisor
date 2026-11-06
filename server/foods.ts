import type { Food } from '../shared/types';

type Cat = Food['category'];
const V = ['vegan', 'vegetarian', 'fasting'];
const VEG = ['vegetarian'];
const EST = 'Ethiopian Food Composition Table 2025 and Ethiopian Food Recipes 2025 reviewed; no exact matching record for this generic item was identified, so the project estimate is retained. Values vary by recipe, cooking method, ingredients, and portion. Do not use for clinical decisions.';

const EFC = (code: string) => `Ethiopian Food Composition Table 2025, food code ${code}. Nutrients are per 100 g edible/prepared food.`;

function f(
  id: string, name: string, category: Cat, servingLabel: string, servingGrams: number,
  kcal: number, protein: number, carbs: number, fat: number, fiber: number,
  extra: { alt?: string[]; am?: string; allergens?: string[]; diet?: string[]; source?: string; quality?: Food['quality'] } = {},
): Food {
  return {
    id, name, nameAm: extra.am, alt: extra.alt ?? [], category, servingLabel, servingGrams,
    per100g: { kcal, protein, carbs, fat, fiber },
    allergens: extra.allergens ?? [], diet: extra.diet ?? [], source: extra.source ?? EST, quality: extra.quality ?? 'estimated',
  };
}

export const SEED_FOODS: Food[] = [
  f('injera', 'Injera', 'ethiopian', '1 piece', 100, 190, 6.5, 38, 1.5, 3, { alt: ['enjera', 'teff injera'], am: 'እንጀራ', diet: V }),
  f('shiro', 'Shiro wot (keye)', 'ethiopian', '1 cup', 250, 133, 2.1, 4.8, 11.4, 1.3, { alt: ['shiro', 'shiro wat'], am: 'ሽሮ', diet: V, source: EFC('030085'), quality: 'sourced' }),
  f('misir', 'Misir wot (keye)', 'ethiopian', '1 cup', 250, 131, 5.5, 9.4, 7.3, 2.7, { alt: ['misir', 'red lentil stew'], am: 'ምስር ወጥ', diet: V, source: EFC('030093'), quality: 'sourced' }),
  f('kik-alicha', 'Kik alicha (field pea)', 'ethiopian', '1 cup', 250, 166, 7.4, 13.3, 8.5, 3.5, { alt: ['kik', 'yellow split pea stew'], am: 'ክክ አልጫ', diet: V, source: EFC('030094'), quality: 'sourced' }),
  f('doro-wot', 'Doro wot', 'ethiopian', '1 serving', 250, 219, 6.8, 5.1, 18.4, 2.9, { alt: ['doro wat', 'chicken stew'], am: 'ዶሮ ወጥ', allergens: ['egg'], source: EFC('070152'), quality: 'sourced' }),
  f('tibs', 'Beef tibs', 'ethiopian', '1 plate', 200, 191, 15.4, 3.1, 12.6, 1.7, { alt: ['tibs', 'tibs beef', 'sauteed beef'], am: 'ጥብስ', source: EFC('070156'), quality: 'sourced' }),
  f('firfir', 'Firfir', 'ethiopian', '1 cup', 200, 170, 5, 28, 4, 2, { alt: ['fitfit'], am: 'ፍርፍር', diet: V }),
  f('chechebsa', 'Teff chechebsa', 'ethiopian', '1 serving', 150, 338, 6.6, 40.5, 15.3, 6.3, { alt: ['chechebsa', 'kita firfir'], am: 'ጨጨብሳ', allergens: ['milk'], diet: VEG, source: EFC('010189'), quality: 'sourced' }),
  f('genfo', 'Genfo (barley/wheat, oil)', 'ethiopian', '1 cup', 250, 145, 2.6, 17.6, 6.3, 4, { alt: ['genfo', 'porridge'], am: 'ገንፎ', diet: V, source: EFC('010185'), quality: 'sourced' }),
  f('kitfo', 'Kitfo', 'ethiopian', '1 serving', 150, 197, 16.8, 1, 15.9, 0.4, { am: 'ክትፎ', source: EFC('070153'), quality: 'sourced' }),
  f('gomen', 'Gomen (boiled kale)', 'ethiopian', '1 cup', 150, 182, 3.8, 3.2, 16.1, 4.3, { alt: ['gomen', 'collard greens', 'gomen wot'], am: 'ጎመን', diet: V, source: EFC('040092'), quality: 'sourced' }),
  f('atkilt', 'Atkilt wot', 'ethiopian', '1 cup', 200, 70, 1.5, 9, 3.5, 2.5, { alt: ['atkilt', 'cabbage carrot potato'], am: 'አትክልት ወጥ', diet: V }),
  f('fossolia', 'Fossolia with carrot', 'ethiopian', '1 cup', 150, 238, 3.1, 9.4, 19.8, 5, { alt: ['fossolia', 'green beans'], am: 'ፎሶሊያ', diet: V, source: EFC('040090'), quality: 'sourced' }),
  f('beyaynetu', 'Beyaynetu (fasting vegetables, no injera)', 'ethiopian', '1 plate', 400, 110, 5, 14, 4, 4, { alt: ['fasting platter'], am: 'በያይነቱ', diet: V }),
  f('dabo', 'Dabo (white wheat bread)', 'grains', '1 slice', 60, 267, 7.9, 54.4, 1.3, 3, { alt: ['dabo'], am: 'ዳቦ', allergens: ['gluten'], source: EFC('010133'), quality: 'sourced' }),
  f('bread', 'Bread (wheat, white)', 'grains', '1 slice', 30, 267, 7.9, 54.4, 1.3, 3, { alt: ['white bread', 'toast'], allergens: ['gluten'], source: EFC('010133'), quality: 'sourced' }),
  f('rice', 'Rice (white, cooked)', 'grains', '1 cup', 160, 117, 2.6, 25.6, 0.3, 0.5, { alt: ['white rice'], diet: V, source: EFC('010167'), quality: 'sourced' }),
  f('pasta', 'Pasta (cooked)', 'grains', '1 cup', 140, 122, 3.6, 25, 0.5, 1.3, { alt: ['macaroni', 'spaghetti'], allergens: ['gluten'], diet: V, source: EFC('010164'), quality: 'sourced' }),
  f('oats', 'Oats (rolled, raw)', 'grains', '1/2 cup', 40, 374, 12.1, 59.3, 7.7, 9.5, { alt: ['oatmeal'], diet: V, source: EFC('010071'), quality: 'sourced' }),
  f('potato', 'Potato (boiled)', 'vegetables', '1 medium', 150, 78, 1.9, 17, 0, 0.8, { alt: ['dinich'], diet: V, source: EFC('020026'), quality: 'sourced' }),
  f('sweet-potato', 'Sweet potato (orange flesh, boiled)', 'vegetables', '1 medium', 130, 107, 1, 23.4, 0.2, 4, { alt: ['bat'], diet: V, source: EFC('020037'), quality: 'sourced' }),
  f('salad', 'Green salad with lemon', 'vegetables', '1 cup', 100, 18, 1, 3.5, 0.2, 1.5, { alt: ['salata', 'mixed salad'], diet: V }),
  f('chicken-breast', 'Chicken (meat, no skin, grilled)', 'protein', '1 piece', 120, 186, 34.4, 0, 5.4, 0, { source: EFC('070106'), quality: 'sourced' }),
  f('beef', 'Beef (lean, cooked)', 'protein', '1 serving', 100, 250, 26, 0, 15, 0, { alt: ['siga'] }),
  f('fish', 'Nile tilapia (grilled)', 'protein', '1 fillet', 120, 114, 25.2, 0, 1.5, 0, { alt: ['asa', 'tilapia'], allergens: ['fish'], source: EFC('090022'), quality: 'sourced' }),
  f('egg', 'Boiled egg', 'protein', '1 egg', 50, 118, 11.3, 2.3, 7.1, 0, { alt: ['inkulal', 'egg'], allergens: ['egg'], diet: VEG, source: EFC('080007'), quality: 'sourced' }),
  f('lentils', 'Lentils (whole, boiled)', 'protein', '1 cup', 200, 118, 9.8, 15.1, 0.6, 6.2, { alt: ['misir'], diet: V, source: EFC('030073'), quality: 'sourced' }),
  f('chickpeas', 'Chickpeas (boiled)', 'protein', '1 cup', 165, 155, 9.6, 19.5, 1.9, 10.9, { alt: ['shimbra', 'shimbra asa'], diet: V, source: EFC('030052'), quality: 'sourced' }),
  f('peanuts', 'Peanuts (dry, raw)', 'protein', '1 handful', 30, 583, 23.8, 14.5, 45.9, 8.3, { alt: ['ground nut'], allergens: ['peanut'], diet: V, source: EFC('060005'), quality: 'sourced' }),
  f('milk', 'Milk (whole)', 'drinks', '1 cup', 245, 61, 3.2, 4.8, 3.3, 0, { alt: ['cow milk'], allergens: ['milk'], diet: VEG }),
  f('yogurt', 'Yogurt (whole, plain)', 'drinks', '1 cup', 245, 52, 3, 4.1, 2.6, 0, { alt: ['ergo', 'yoghurt'], allergens: ['milk'], diet: VEG, source: EFC('100019'), quality: 'sourced' }),
  f('tea', 'Tea (black, no sugar)', 'drinks', '1 cup', 240, 1, 0, 0.3, 0, 0, { alt: ['shai', 'black tea'], diet: V, source: EFC('120020'), quality: 'sourced' }),
  f('tea-sugar', 'Tea infusion with sugar', 'drinks', '1 serving', 165, 37, 0, 9.3, 0, 0, { diet: V, source: EFC('120037'), quality: 'sourced' }),
  f('coffee', 'Coffee (black)', 'drinks', '1 cup', 240, 12, 0.7, 1.7, 0.1, 0.6, { alt: ['buna'], am: 'ቡና', diet: V, source: EFC('120007'), quality: 'sourced' }),
  f('banana', 'Banana', 'fruit', '1 medium', 118, 106, 0.9, 24.1, 0.1, 1.9, { alt: ['muz'], diet: V, source: EFC('050005'), quality: 'sourced' }),
  f('orange', 'Orange', 'fruit', '1 medium', 130, 43, 0.9, 7.3, 0.4, 3.1, { alt: ['birtukan'], diet: V, source: EFC('050012'), quality: 'sourced' }),
  f('apple', 'Apple', 'fruit', '1 medium', 180, 52, 0.2, 11, 0.3, 2.3, { diet: V, source: EFC('050001'), quality: 'sourced' }),
  f('mango', 'Mango', 'fruit', '1 cup', 165, 70, 0.5, 16, 0.1, 1.5, { diet: V, source: EFC('050016'), quality: 'sourced' }),
  f('avocado', 'Avocado', 'fruit', '1/2 fruit', 100, 154, 1.1, 6.4, 13.2, 3.6, { diet: V, source: EFC('050003'), quality: 'sourced' }),
  f('fruit-salad', 'Fruit salad', 'fruit', '1 cup', 150, 55, 0.7, 14, 0.2, 1.5, { diet: V }),
  f('honey', 'Honey', 'other', '1 tbsp', 21, 304, 0.3, 82, 0, 0.2, { alt: ['mar'], diet: VEG }),
];
