# Food data and nutrition-planner methodology

## Current data status

The seed food catalog stores nutrient values **per 100 g** and scales them by the configured serving mass. The catalog now distinguishes records verified against the **Ethiopian Food Composition Table 2025** (`quality: sourced`, with a food code in `source`) from generic records for which the uploaded 2025 Ethiopian sources did not provide an exact match (`quality: estimated`). Recipes, oil quantity, teff/wheat proportions, moisture, and cooking method can change the result substantially.

Do not describe the current seed dataset as clinically validated or as a complete Ethiopian food-composition database. Before academic submission, complete verification of the remaining estimated records against a documented source such as the Ethiopian Food Composition Table 2025 or the Ethiopian Food Recipes 2025 (record the exact publication/version and page or food code where available). For composite Ethiopian dishes, document the recipe and cooked yield used to calculate per-100-g values. Do not assign a `sourced` status unless a traceable source has actually been checked.

## Portion calculation

For a food with nutrient value `N` per 100 g and a portion of `g` grams:

`portion nutrient = N × g / 100`

The app checks for negative/non-finite gram, serving, and body-measurement inputs in the shared nutrition helpers. API-level schema validation should also remain in place.

## Target estimates

Adult energy needs use the Mifflin–St Jeor equation and an activity multiplier, followed by a configurable goal adjustment. The resulting BMI and energy values are screening estimates, not a diagnosis or medical prescription. The current 20% protein / 50% carbohydrate / 30% fat split is a simplified heuristic and must not be presented as a personalized clinical macro prescription. The fixed minimum-calorie floors are implementation guardrails, not universal safe limits; low-energy diets and individual medical needs require qualified professional review.

## Planner behavior

The planner filters each template against the user's declared diet and allergy tags before scoring it. Eligible meals are scored using calorie fit and a heuristic macro balance (protein 20%, carbohydrate 50%, fat 30% of slot energy), then rotated deterministically across days to reduce repetition. This is a rule-based recommender, not a machine-learning model and not a guarantee of nutritional adequacy. Allergen tags are only as reliable as the underlying catalog and recipe details; users must verify packaged foods and recipes.

## Required validation before final submission

- Add a traceable source and verification status to every food record.
- Review every recipe and allergen tag with a documented ingredient list.
- Add tests for all supported diet combinations and every allergen category.
- Compare generated day totals against target ranges, including cases where few eligible meals remain.
- Clearly disclose that photo recognition and portion estimates can be wrong and require user confirmation.
