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
- **Phases 2–8 done (develop):**
  - Replaced `src/api/apiClient.js` mock delays with real FastAPI endpoints across all 81 operations + response adapters and S3/Blob download helper (`src/api/download.js`).
  - Completely removed the Google Drive Apps Script upload and hardcoded URL from `AuthorSubmit.jsx` and `.env`.
  - Wired public screens (`Home`, `Journals`, `JournalDetails`, `JournalSectionDetails`, `JournalArticles`, `ArticleDetails` view/download/bookmark, `News`, `Editors`, `PolicyPage`, `Contact`, `ApplyEditor`).
  - Restored and wired Author Workspace (`/dashboard`, `/dashboard/submit`, `/dashboard/submissions`, `/dashboard/submissions/:manuscriptId`, `/dashboard/bookmarks`) including structured co-author rows, revision upload, proof download/approval (with 409 reload handling), and APC waiver request.
  - Built Editor Workspace (`/editor`, `/editor/manuscripts/:manuscriptId`) with multi-version source download and editorial decision (`REVISIONS_REQUESTED`, `ACCEPTED`, `REJECTED`).
  - Built Staff & Super Admin Workspaces (`/admin`, `/admin/manuscripts`, `/admin/manuscripts/:manuscriptId`, `/admin/production`, `/admin/apc-waivers`, `/admin/employees`, `/admin/applications`, `/admin/inquiries`, `/admin/catalog`, `/admin/settings`) including screening checks (`PLAGIARISM`, `DUPLICATE`, `FORMATTING`), screening decisions, PDF proof upload, production tasks (`TYPESETTING`, `PROOFREADING`, `FORMATTING_CHECK`), DOI registration & status polling, and the live Crossref DOI release gate on Publish.
  - Wired Google & GitHub OAuth start and callback routes (`/auth/oauth/:provider/callback`).
