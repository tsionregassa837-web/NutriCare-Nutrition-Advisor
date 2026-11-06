# AI Nutrition Advisor Workflow

## AI chat workflow

```mermaid
flowchart TD
    A[User opens Advisor] --> B[Load saved conversation]
    B --> C[User enters message]
    C --> D[Frontend sends message + mode + language]
    D --> E[JWT auth middleware]
    E --> F[Validate request with Zod]
    F --> G[Build short advisor history]
    G --> H[Build user context from profile/targets]
    H --> I{GEMINI_API_KEY configured?}
    I -- No --> J[503 AI_NOT_CONFIGURED]
    I -- Yes --> K[Gemini generateContent]
    K --> L{Response valid?}
    L -- No --> M[Mapped AI error]
    L -- Yes --> N[Store user + model messages]
    N --> O[Return answer to frontend]
    O --> P[Display answer]
```

## Photo-analysis workflow

```mermaid
flowchart TD
    A[User selects meal photo] --> B[Validate image data]
    B --> C[Validate MIME/magic bytes + size]
    C --> D[Send image + food catalog to Gemini]
    D --> E[Receive structured JSON]
    E --> F[Validate response with Zod]
    F --> G[Match foods to catalog]
    G --> H[Apply allergy/diet compatibility rules]
    H --> I[Return allowed items + explicit block reasons]
    I --> J[User reviews result]
```

## Safety boundary

The AI is an assistant, not a medical diagnostic system. The system prompt instructs the model to provide general guidance, avoid diagnosis/treatment, respect allergies and dietary restrictions, treat calorie values as estimates, and recommend professional care for pregnancy, medical conditions, eating disorders or children.

The server-side eligibility rules remain authoritative for food compatibility. The AI does not get permission to override allergy or diet restrictions.

## Configuration

- `GEMINI_API_KEY`: server-only secret; empty during development is supported.
- `GEMINI_MODEL`: defaults to `gemini-2.5-flash`.
- Chat timeout: 30 seconds.
- Photo-analysis timeout: 45 seconds.
- AI request rate limit: 20 requests/minute per process.
