# NutriCare — Phase 2 Complete Package

Implemented in this package:

1. Food database source/citation documentation and quality labels.
2. Improved meal-planning scoring with calorie/macro fit, allergy/diet filtering, rotation, and within-day variety penalties.
3. Additional backend tests plus frontend advisor unit tests.
4. Explicit Amharic/English AI response instruction.
5. Persistent AI conversations in the server JSON store, isolated by user and advisor mode.
6. Removed unfinished Forgot Password UI.
7. Removed unfinished Barcode mode.
8. Retained Phase 1 JWT, admin, validation, CORS, security headers, and AI image safety hardening.

## Verification

The modified TypeScript/TSX files passed TypeScript syntax/transpile validation in the build environment. Full `npm test` and `npm run build` should be run in the Windows VS Code environment after `npm ci`, because native `esbuild` binaries are platform-specific.

## Important

- Do not include `.env` or real Gemini API keys in the ZIP.
- Do not include `node_modules`.
- Add your real `GEMINI_API_KEY` only to your local `.env` when you are ready for real Gemini testing.


## Post-package verification fixes
- Removed an unused `setNote` state setter in `src/pages/Auth.tsx` so the TypeScript production build passes with `noUnusedLocals`.
- Made the AI no-key test send a fully valid chat request (`mode`, `lang`, and `history`) before asserting the expected `503 AI_NOT_CONFIGURED` response.
- Local development still requires creating `.env` from `.env.example` with a strong `JWT_SECRET`; the real Gemini key remains optional for startup and should never be committed.
