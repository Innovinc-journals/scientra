# Changelog (integration work)

## 2026-11-16
- Created `develop` branch (`main` stays = production).
- `.env` removed from git tracking and added to `.gitignore`; added `.env.example`.
- Added `docs/` (workflow, security, backend integration tracker).
- Received backend API document (sections 1-4.2) and fetched live `/openapi.json` (81 operations).
- Wrote full endpoint map, phased plan, architecture rules and open decisions in `BACKEND_INTEGRATION.md`.
- Updated token-handling rule in `SECURITY.md` (bearer tokens in body, not cookies).
- No application code changed yet.
- Received backend document sections 4.3-6 (editor, revisions, production, proof, DOI, admin, build order). Updated `BACKEND_INTEGRATION.md`: real contracts, status labels, DOI release gate, do-not-build list, acceptance checklist.
- Owner approved: co-author rows, new role screens in matching style. Test target still open.
- **Phase 0 done:** `src/api/http.js` (axios, bearer, single-flight refresh, error normaliser), `src/auth/*` (session store, AuthContext, ProtectedRoute, roles, fragment-token helper), `.env.example`.
- **Phase 1 done:** Login/Register wired to the API (UI unchanged apart from error banners); new Forgot password, Reset password, Verify email pages in the Login card style; `/admin/*` guarded by role (SUPER_ADMIN: employees/applications/settings, STAFF+SUPER_ADMIN: manuscripts); AdminLayout shows the real user and signs out via the API.
- Verified: lint 0 errors; pure-logic smoke tests pass; imports resolve. Not browser-tested against the live API (no approved test account yet).
- Pending: owner answers (test target, editor picker); Phase 2 next.
