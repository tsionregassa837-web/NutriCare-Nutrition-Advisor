# NutriCare Food Data Sources

## Primary source
- Ethiopian Food Composition Table (2025). Sourced records in `server/foods.ts` include the corresponding food code in the `source` field.

## Recipe/estimate source
- Ethiopian Food Recipes 2025 reviewed for generic prepared-food estimates where an exact composition-table record was not identified. These records are explicitly marked `quality: estimated`.

## Interpretation
- `sourced` means the project maps the food to a traceable 2025 Ethiopian Food Composition Table code.
- `estimated` means the project retains a practical estimate because recipe/portion variability prevents a direct exact match.
- `custom` is reserved for administrator-added foods and must not be presented as an official composition-table value.

Nutrition values are estimates for general wellness use and are not a substitute for clinical dietary assessment.
