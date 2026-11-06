# NutriCare Data / ER Diagram

NutriCare currently uses a small JSON-file persistence layer rather than a relational database. The diagram below represents the logical data relationships used by the application.

```mermaid
erDiagram
    USER ||--o{ MEAL : logs
    USER ||--o{ WEIGHT : records
    USER ||--o{ WATER : records
    USER ||--o{ PLAN : saves
    USER ||--o{ ACTIVITY : records
    USER ||--o{ CONVERSATION : owns
    FOOD_CATALOG ||--o{ CUSTOM_FOOD : extends
    PLAN ||--o{ PLAN_MEAL : contains
    PLAN_MEAL ||--o{ PLAN_ITEM : contains
    FOOD_CATALOG ||--o{ PLAN_ITEM : referenced_by
    FOOD_CATALOG ||--o{ MEAL_ITEM : referenced_by
    MEAL ||--o{ MEAL_ITEM : contains

    USER {
      string id PK
      string name
      string email
      string passwordHash
      string role
      object profile
      string createdAt
    }
    MEAL {
      string userId FK
      string date
      string mealType
      string name
      number kcal
      number protein
      number carbs
      number fat
    }
    WEIGHT {
      string userId FK
      string date
      number kg
    }
    WATER {
      string userId FK
      string date
      number ml
    }
    PLAN {
      string userId FK
      string date
      object plan
    }
    ACTIVITY {
      string userId FK
      string date
    }
    CONVERSATION {
      string userId FK
      string mode
      string role
      string text
      string createdAt
    }
    FOOD_CATALOG {
      string id PK
      string name
      string servingLabel
      number kcal
      number protein
      number carbs
      number fat
      string[] allergens
      string[] diet
      string quality
      string source
    }
    CUSTOM_FOOD {
      string id PK
      string name
      object nutrition
    }
    PLAN_MEAL {
      string name
      number kcal
      number protein
      number carbs
      number fat
    }
    PLAN_ITEM {
      string foodId FK
      number quantity
      string servingLabel
    }
    MEAL_ITEM {
      string foodId FK
      number quantity
    }
```

## Persistence note

The implementation uses `server/db.ts` with a JSON file store. Missing collections are restored during loading so older database files can migrate forward without dropping existing data.
