# NutriCare Phase 3.6 — Final Cleanup

## Purpose

This package is the clean final project candidate after Phase 3.5 documentation and architecture work.

## Included

- React + TypeScript/Vite frontend
- Express + TypeScript backend
- Nutrition calculations and validation
- Food catalog with source/quality metadata
- Allergy and diet enforcement
- Deterministic meal planner
- JWT authentication and admin authorization
- Gemini AI adapter with safe not-configured behavior
- Persistent AI conversation history
- English/Amharic advisor instruction support
- Accessibility, responsive/mobile, loading/error, and UI polish changes
- Phase 3 architecture, algorithm, security, testing, limitations, future-work, and screenshot documentation
- `.env.example` configuration template
- `package-lock.json` for reproducible installation

## Intentionally excluded

- `.env`
- real `GEMINI_API_KEY`
- real `data/db.json`
- `node_modules/`
- generated `dist/`
- `.git/`
- temporary `*.tmp` files
- editor/system cache files

## Local setup

```powershell
npm ci
Copy-Item .env.example .env
# Set a strong local JWT_SECRET in .env.
# Keep GEMINI_API_KEY empty until Phase 3.8.
npm test
npm run build
npm run dev:all
```

## Verification baseline

The project was verified before this cleanup with:

- `npm ci` — successful
- `npm test` — 27 passed, 0 failed
- `npm run build` — successful
- `npm run dev:all` — frontend and backend started successfully after a local `.env` was created

## Security reminder

Never commit or submit `.env`, real API keys, production secrets, or real user database data.
