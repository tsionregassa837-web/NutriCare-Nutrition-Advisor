# NutriCare Test-Case Summary

The current automated suite contains **27 passing tests**.

| # | Area | Test coverage | Result |
|---:|---|---|---|
| 1 | JWT | Reject missing/default/weak production secrets | PASS |
| 2 | Security | Production security configuration and baseline headers | PASS |
| 3 | Auth | Invalid auth rate-limit configuration | PASS |
| 4 | Auth | Registration, duplicate detection and login | PASS |
| 5 | Auth | Protected routes reject missing/bad tokens | PASS |
| 6 | Meals | Server nutrition calculation and user isolation | PASS |
| 7 | Profile | Profile persistence and target updates | PASS |
| 8 | Admin | Secure bootstrap and admin route enforcement | PASS |
| 9 | Foods | Allergy/diet compatibility and conflict rejection | PASS |
| 10 | Planner | Plans respect allergies and saved plans reject conflicts | PASS |
| 11 | AI | Missing-key behavior and image validation | PASS |
| 12 | Analytics | Analytics and water/weight records | PASS |
| 13 | AI history | Conversation isolation by user and mode | PASS |
| 14 | Nutrition | Portion scaling | PASS |
| 15 | Nutrition | Serving multiplication | PASS |
| 16 | Nutrition | Invalid nutrition input rejection | PASS |
| 17 | Nutrition | BMI and Mifflin-St Jeor calculations | PASS |
| 18 | Targets | Defaults, personal targets and safe floor | PASS |
| 19 | Planner | Invalid target/day input rejection | PASS |
| 20 | Rules | Allergy and diet filters | PASS |
| 21 | Photo AI | Explicit allergy/diet block reasons | PASS |
| 22 | Planner | Vegan plan excludes animal foods/allergens | PASS |
| 23 | Food data | Verified records have traceable 2025 Ethiopian sources | PASS |
| 24 | Food data | Source metadata and quality labels | PASS |
| 25 | Planner | Candidate rotation across days | PASS |
| 26 | Frontend advisor | Error filtering and latest-ten history | PASS |
| 27 | Frontend advisor | English/Amharic language instruction | PASS |

## Verification commands

```powershell
npm ci
npm test
npm run build
npm run dev:all
```

The final verification phase should additionally perform manual browser checks for authentication, diary, planner, scanner, advisor, profile, mobile layout and error states.
