# NutriCare Food Data Validation — 2025 Ethiopian Sources

## Sources used

- Ethiopian Food Composition Table 2025 (EPHI/FAO), using exact food codes where the catalog item matched a table record.
- Ethiopian Food Recipes 2025 (EPHI/FAO), used as the recipe-level reference during review of composite Ethiopian foods.

## Updated as sourced

The following catalog records now use `quality: sourced` and include a traceable Ethiopian Food Composition Table 2025 food code in `source`:

- Shiro wot (keye) — 030085
- Misir wot (keye) — 030093
- Kik alicha (field pea) — 030094
- Doro wot — 070152
- Beef tibs — 070156
- Teff chechebsa — 010189
- Genfo (barley/wheat, oil) — 010185
- Kitfo — 070153
- Gomen (boiled kale) — 040092
- Fossolia with carrot — 040090
- Dabo / white wheat bread — 010133
- Rice (white, cooked) — 010167
- Pasta (cooked) — 010164
- Oats (rolled, raw) — 010071
- Potato (boiled) — 020026
- Sweet potato (orange flesh, boiled) — 020037
- Chicken meat without skin, grilled — 070106
- Nile tilapia (grilled) — 090022
- Boiled egg — 080007
- Lentils (whole, boiled) — 030073
- Chickpeas (boiled) — 030052
- Peanuts (dry, raw) — 060005
- Yogurt (whole, plain) — 100019
- Tea (black, no sugar) — 120020
- Tea infusion with sugar — 120037
- Coffee (black) — 120007
- Banana — 050005
- Orange — 050012
- Apple — 050001
- Mango — 050016
- Avocado — 050003

## Important allergen/diet corrections

- Teff chechebsa is not tagged with gluten because the cited record is brown teff; it is tagged with milk because the record specifies butter.
- Generic oats are no longer tagged as a gluten allergen. The sourced record is rolled oats; cross-contact is a separate packaging/manufacturing concern that the current schema does not model.
- Dabo no longer uses the incorrect `dabo kolo` alias.
- Composite dishes are tagged conservatively based on the cited recipe where available.

## Records intentionally left estimated

The uploaded 2025 sources did not provide an exact matching generic record for every original catalog item. These remain `quality: estimated` rather than being falsely marked as sourced: Injera, Firfir, Atkilt wot, Beyaynetu, Green salad with lemon, lean beef (generic cooked), whole milk, fruit salad, and honey.

These should be given an exact recipe/food-composition source before academic or clinical-facing submission.

## Validation note

The updated `server/foods.ts` was syntax/type-checked independently with TypeScript for the food/type files. Full project tests/build could not be executed in this Linux validation environment because the uploaded project contained Windows `node_modules` binaries and reinstalling dependencies timed out. The project should therefore be run locally with `npm ci`, then `npm test` and `npm run build`.
