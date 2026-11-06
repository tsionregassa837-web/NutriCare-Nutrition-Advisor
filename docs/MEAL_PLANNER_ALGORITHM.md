# Meal-Planning Algorithm and Pseudocode

## Purpose

The planner generates a deterministic daily plan that attempts to fit a calorie target while respecting allergies and dietary restrictions. It is a heuristic planning algorithm, not a clinical meal-prescription engine.

## Inputs

- `targetKcal`: positive daily calorie target.
- `foods`: food catalog map.
- `profile.allergies`: allergy names.
- `profile.diets`: dietary restrictions.
- `dayIndex`: non-negative day number used to rotate similarly ranked candidates.

## Meal calorie shares

| Slot | Target share |
|---|---:|
| Breakfast | 25% |
| Lunch | 35% |
| Dinner | 30% |
| Snack | 10% |

## Candidate score

For each candidate meal, the planner calculates normalized errors for calories and three macronutrients. The score is:

`0.60 × calorieError + 0.18 × proteinError + 0.12 × carbsError + 0.10 × fatError + varietyPenalty`

The macro proportions used by the heuristic are 20% protein, 50% carbohydrate and 30% fat. These are explicitly treated as heuristic proportions, not clinical targets.

`varietyPenalty = repeatedFoodCount × 0.08`

## Pseudocode

```text
function generateDayPlan(targetKcal, foods, profile, dayIndex):
    validate targetKcal and dayIndex
    plan = empty
    usedFoods = empty set

    for each mealSlot in [breakfast, lunch, dinner, snack]:
        slotKcal = targetKcal × slotShare[mealSlot]
        proteinGoal = slotKcal × 0.20 / 4
        carbsGoal   = slotKcal × 0.50 / 4
        fatGoal     = slotKcal × 0.30 / 9

        candidates = all templates for mealSlot
        remove candidates containing foods blocked by allergy/diet rules
        build nutrition totals for each candidate

        for each candidate:
            calorieError = normalized distance from slotKcal
            proteinError = normalized distance from proteinGoal
            carbsError   = normalized distance from carbsGoal
            fatError     = normalized distance from fatGoal
            repeated = number of candidate foods already in usedFoods
            varietyPenalty = repeated × 0.08

            score = 0.60*calorieError
                  + 0.18*proteinError
                  + 0.12*carbsError
                  + 0.10*fatError
                  + varietyPenalty

        sort candidates by score, then name
        keep top five candidates
        choose top[dayIndex modulo numberOfTopCandidates]
        add chosen meal to plan
        add its foods to usedFoods

    return plan
```

## Important limitation

The algorithm optimizes a small predefined template catalog. It does not perform full combinatorial meal optimization, micronutrient optimization, cost optimization, or individualized medical nutrition therapy.
