# NutriCare: AI-Based Nutrition Advisor

React + TypeScript (Vite) frontend, Express + TypeScript backend, JSON-file storage, Google Gemini for AI features.
Built mobile-first from the "NutriCare AI Screen Collection" PDF.

## 1. Run it (Windows, PowerShell, VS Code)

Install Node.js 20 or newer from https://nodejs.org, then in the project folder:

```powershell
npm ci
copy .env.example .env      # then open .env and fill it in (see section 2)
npm run dev:all             # website: http://localhost:3000   API: http://localhost:8787
```

Open http://localhost:3000 in Chrome. To test on your phone, use the "Network" address Vite prints (same Wi-Fi).
**Camera note:** browsers only allow the live camera on `localhost` or HTTPS. On a plain `http://192.168...` address the
Scan screen falls back to the Gallery button (choose or take a photo with your phone's camera app).

### Production style (one server)
```powershell
npm run build     # type-checks frontend + backend, then builds /dist
npm start         # serves the built site AND the API on http://localhost:8787
```

## 2. Environment variables (`.env`)
| Name | Purpose |
|---|---|
| `JWT_SECRET` | Long random string that signs logins. Required for logins to survive restarts. |
| `GEMINI_API_KEY` | Free key from https://aistudio.google.com/apikey. Without it, AI chat and photo analysis show a clear "not configured" message. Everything else works. |
| `GEMINI_MODEL` | Default `gemini-2.5-flash` (must be a vision-capable model). |
| `ADMIN_EMAIL` | Reserved administrator email. The server bootstraps this account; it cannot be registered through the public registration endpoint. |
| `ADMIN_PASSWORD` | Password used only when bootstrapping the administrator account on first startup. Store it as a deployment secret. |
| `ADMIN_NAME` | Optional display name for the bootstrapped administrator. |
| `CORS_ORIGIN` | Optional trusted frontend origin(s), comma-separated. In production, CORS is disabled unless this is explicitly configured. |
| `AUTH_RATE_LIMIT` | Optional registration/login rate limit per client per 15 minutes (5-1000, default 30). |
| `DATA_FILE` | Optional persistent JSON database path. In production, point this at persistent storage/volume. |
Never commit `.env`. The API key stays on the server and is never sent to the browser.

## 3. Commands
| Command | What it does |
|---|---|
| `npm run dev:all` | frontend + backend with auto reload |
| `npm run typecheck` | TypeScript check (frontend and backend) |
| `npm test` | 27 automated tests (calculations, API, auth, isolation, admin rules, AI failure handling, food sources, planner rotation and advisor helpers) |
| `npm run build` | type-check + production build |

## 4. Screens (all 13 from the PDF)
| PDF screen | Route | File |
|---|---|---|
| Onboarding | `#/onboarding` | `src/pages/Auth.tsx` |
| Sign in / Create account | `#/login`, `#/register` | `src/pages/Auth.tsx` |
| Home | `#/home` | `src/pages/Home.tsx` |
| Food database | `#/foods` | `src/pages/Diary.tsx` |
| Food diary | `#/diary` | `src/pages/Diary.tsx` |
| Scan food | `#/scan` | `src/pages/Scan.tsx` |
| Meal analysis | `#/analysis` | `src/pages/Scan.tsx` |
| NutriCare Advisor (Nutrition tab) / AI Advisor (Fitness tab) | `#/advisor` | `src/pages/Advisor.tsx` |
| Meal planner | `#/planner` | `src/pages/Planner.tsx` |
| Analytics | `#/analytics` | `src/pages/Analytics.tsx` |
| Profile (+ goals, diet, allergies, account, admin) | `#/profile…` | `src/pages/Profile.tsx` |

## 5. How it works (for your defense)
- `shared/nutrition.ts`: tested formulas. Portion nutrition = per-100 g value x grams / 100. BMR uses Mifflin-St Jeor, TDEE = BMR x activity factor, goal adjusts -15% / +10%, with a 1,200 (F) / 1,500 (M) kcal floor. Under-18s and incomplete profiles get a general 2,000 kcal default with a note.
- The server **recalculates all nutrition from the food database**; numbers sent by the browser are ignored.
- Every private route needs a login token; every meal/plan/weight query is filtered by the logged-in user's id; admin routes check the role stored in the database.
- Photo flow: browser downsizes the image -> `/api/ai/analyze-image` validates type/size -> Gemini returns JSON -> validated with zod -> matched to food IDs in the database -> user reviews/corrects -> saved as "AI estimate" entries.
- Advisor flow: `/api/ai/chat` sends only goal, activity, age, diet, allergies and today's totals (no name or email), with safety rules in the system prompt.
- Meal planner is deterministic (no AI needed): it picks meal combinations closest to each meal's share of your calorie target and filters by allergies and diet.
- Data is stored in `data/db.json` (written atomically). Back this file up; it holds the accounts and meals.

## 6. Honest limitations
- **This is a new project, not an upgrade of your old Nourish AI code.** The ZIP was never received, so the old accounts and meal records were not migrated. If you have an old `db.json`/users file, send it and a migration script can be written. Do not overwrite `data/db.json` unless you want to replace data.
- Food values in `server/foods.ts` carry explicit source and quality metadata. Verified Ethiopian food records use the documented Ethiopian Food Composition Table 2025 source metadata; generic prepared-food values are marked `estimated`. See `FOOD_DATA_SOURCES.md`, `FOOD_DATA_METHODOLOGY.md`, and `FOOD_DATA_VALIDATION_2025.md`.
- AI features were **not tested with a real Gemini key** (none available here). Failure paths (no key, bad image, invalid output) are tested; the success path depends on your key and model access.
- The screens were **not visually compared pixel-by-pixel** with the PDF in a browser (no browser was available in the build environment). Layout, colours and text follow the PDF; please check on your phone and adjust `src/styles.css` where needed.
- Barcode scanning, password-reset email, push notifications/meal reminders, voice input and Amharic professional review are **not implemented**. Amharic covers navigation, headings and main buttons and has not been reviewed by a translator.
- The Fitness tab's "Start" button only marks today as active; it does not run a workout timer.
- JSON storage suits a demo or one server. For many users, move to a real database (SQLite/PostgreSQL).
- NutriCare gives general information, not medical advice.

### Production security notes

- Set `NODE_ENV=production` and use a strong, persistent `JWT_SECRET` (minimum 32 characters).
- Keep `ADMIN_PASSWORD` out of source control; it is only used when the administrator is bootstrapped for the first time.
- If the frontend is hosted separately from the API, set `CORS_ORIGIN` explicitly. Do not use `*` for a production frontend.
- Keep `DATA_FILE` on persistent storage so user data survives restarts/redeployments.
- The submission archive should not include `.env`, `data/db.json`, `node_modules`, or generated `dist` files.

## Phase 2 improvements

This release includes the complete Phase 2 hardening pass:

- food-source documentation and explicit sourced/estimated/custom quality labels;
- improved deterministic meal-plan scoring with calorie/macro fit, allergy/diet enforcement, day rotation, and within-day variety penalties;
- additional backend tests and frontend advisor unit tests;
- explicit English/Amharic AI response instruction;
- server-side AI conversation persistence, isolated by user and advisor mode;
- unfinished Forgot Password UI removed rather than presenting a non-working feature;
- unfinished Barcode mode removed rather than presenting a non-working feature;
- production CORS/security configuration retained from Phase 1.

### Run in VS Code

```bash
npm ci
npm test
npm run build
npm run dev:all
```

Create a local `.env` from `.env.example`. Never commit `.env`, real database files, API keys, or `node_modules`.


## Phase 3 documentation

Architecture, algorithms, security, testing, limitations, future work, and screenshot guidance are in the `docs/` directory:

- `docs/architecture/SYSTEM_ARCHITECTURE.md`
- `docs/architecture/ER_DIAGRAM.md`
- `docs/architecture/AI_WORKFLOW.md`
- `docs/MEAL_PLANNER_ALGORITHM.md`
- `docs/SECURITY_ARCHITECTURE.md`
- `docs/TEST_CASE_TABLE.md`
- `docs/LIMITATIONS_AND_FUTURE_WORK.md`
- `docs/DOCUMENTATION_SCREENSHOT_CHECKLIST.md`

## Final submission hygiene

The submission package intentionally excludes `.env`, `data/db.json`, `node_modules`, `dist`, `.git`, temporary files, and real API credentials. Copy `.env.example` to `.env` for local development and keep the real Gemini API key out of source control and submission archives.
