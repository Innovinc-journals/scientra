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
- Pending: owner answers to decisions in `BACKEND_INTEGRATION.md` section 5 (items 1, 2, 4 gate Phase 0/1 start).
