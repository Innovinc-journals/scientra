# Backend Integration

- **Backend:** FastAPI ("Scientra Academic Publishing API" v1.3.0), built by a separate developer, on AWS.
- **Prod API origin:** `https://api.scientrajournals.org` (append `/api/v1` **once**). Swagger `/docs`, schema `/openapi.json`.
- **Frontend:** React 19 + Vite on cPanel, `https://scientrajournals.org`.
- **Local dev API:** `http://127.0.0.1:8000` (local backend + test data).
- **UI is frozen:** only logic changes. Any unavoidable UI addition is listed under "Decisions" and needs approval first.
- **Source of truth:** the backend document (sections 1-4.2 received) + live `/openapi.json` (81 operations, fetched 2026-11-16). Sections after 4.2 of the document are still awaited; endpoints marked **(schema only)** are known from OpenAPI but not yet from the document.

## 1. Current state (before integration)

| Area | Current | File |
|---|---|---|
| Journals/articles/categories/stats | `apiClient.js` fake API over static `data.js`; already consumed through react-query by Home, Journals, JournalDetails, JournalLayout, JournalSectionDetails, JournalArticles, ArticleDetails | `src/api/apiClient.js` |
| News | Reads `data.js` directly | `src/pages/News.jsx` |
| Manuscript submit | Base64 to Google Apps Script (Drive) | `AuthorSubmit.jsx` |
| Login / Register / Apply editor | Fake `setTimeout` | `Login.jsx`, `Register.jsx`, `ApplyEditor.jsx` |
| Admin employees / applications / manuscripts | Local mock data | `src/pages/admin/*` |
| Route guards | None (`/admin/*` and `/submit` open) | `App.jsx` |

Pages already use `apiClient` + react-query, so public screens can switch by changing `apiClient.js` internals.

## 2. Architecture rules

- `src/api/http.js`: one axios instance, `baseURL = VITE_API_BASE_URL + '/api/v1'`. No URL anywhere else.
- Request interceptor adds `Authorization: Bearer <access_token>` (access token only). FormData: never set Content-Type.
- Response interceptor: on `401` do **one** refresh (single in-flight promise; refresh tokens rotate; replace **both** tokens); retry the original request once; if refresh fails, clear session and go to `/login`.
- Error normaliser: `{code, message, details}`; show `message`; map `details.errors[]` (location + message) to form fields, else a form-level error.
- Status handling: `403` access/verification message, `404` unavailable record, `409` reload record then offer next action, `413` smaller file, `429` honour `Retry-After`, `503` unavailable + deliberate retry. **Never auto-retry mutations** after an uncertain network failure. Surface `X-Request-ID` for support.
- Lists: `{items,total,page,page_size}`, page starts at 1, max 100, reset to 1 on filter change; separate loading / empty / error / populated states.
- IDs are strings; use server IDs in links. Manuscript, article, user IDs and version numbers are all different.
- `src/auth/`: `AuthContext` (user from `/auth/me`), `ProtectedRoute` (role-based), `roleHome(role)`. Access rule = actual `role`; drop the email-domain logic; treat `redirect_hint` as a hint only.
- Downloads: call API with Bearer; if `application/json` open `{url}` **without** the Authorization header; else Blob download. Never build S3 URLs from `file_s3_key`.
- Render user text as text; sanitise any Markdown (policies) before HTML rendering.

## 3. Endpoint map (all 81 operations)

### Auth
| Screen | Endpoint | Notes |
|---|---|---|
| Register | `POST /auth/register` | 201 -> save session -> `/auth/me` -> verify-email screen. name, email, institution, password, confirm_password |
| Login | `POST /auth/login` | email, password, remember_me. Route by `role` |
| Session restore | `GET /auth/me` | id, email, name, role, status, email_verified |
| Refresh | `POST /auth/refresh` | `{refresh_token}`; single-flight |
| Logout | `POST /auth/logout` | `{refresh_token}` -> 204 -> clear |
| Verify email | `POST /auth/verify-email` | `{token}`; route `/verify-email#token=...`; refetch `/auth/me` |
| Resend verification | `POST /auth/resend-verification` | Bearer, no body, cooldown |
| Forgot password | `POST /auth/forgot-password` | generic confirmation always |
| Reset password | `POST /auth/reset-password` | token, password, confirm_password; route `/reset-password#token=...` |
| Accept invite | `POST /auth/accept-invite` | Done by the backend page `/auth/create-password`; frontend only needs login |
| OAuth (optional) | `GET /auth/oauth/{provider}/start`, `POST /auth/oauth/{provider}` | google/github; `credentials:"include"`; 503 = unconfigured; do last |

Token fragment: `new URLSearchParams(location.hash.slice(1)).get('token')`; keep in memory, clear the fragment (`history.replaceState`), support manual code entry, recovery message for missing/expired/used. Lifetimes: verify 24h, reset 30m, invite 72h.
Password rule: 8-128 chars, upper-case, digit, special; must match confirm.

### Public site
| Screen | Endpoint |
|---|---|
| Home | `GET /stats`, `/categories`, `/articles/trending`, `/articles/most-viewed`, `/news` (handle `countries:null`, empty lists) |
| Journal directory | `GET /journals?category&activeLetter&q&page&page_size` (omit unset filters; A-Z built in frontend) |
| Journal detail / section | `GET /journals/{id}`, `/journals/{id}/sections/{sectionSlug}` |
| Journal tabs | `GET /journals/{id}/articles` (+`sort`), `/volumes`, `/special-issues`, `/editorial-board`, `/news` |
| Global board | `GET /editorial-board` |
| Article search | `GET /articles?q&type&sort=recent|views|citations` |
| Article detail | `GET /articles/{id}`, `/articles/{id}/related`, `POST /articles/{id}/view` (once per genuine view; may return `counted:false`) |
| Download | `GET /articles/{id}/download` (download rule above) |
| Bookmarks | `GET /bookmarks`, `POST /bookmarks/{articleId}`, `DELETE /bookmarks/{articleId}` (204) |
| News / policies | `GET /news`, `/news/{id}`, `/policies`, `/policies/{slug}` (sanitise markdown) |
| Contact | `POST /contact` {first_name,last_name,email,subject,message}; show returned reference |
| Apply editor | `POST /applications/apply-editor` {title (Dr./Prof./Mr./Ms.), name, email, institution, expertise, scholar_url (HTTPS Google Scholar/ORCID), cover_letter (50+), website:""} |

### Author
| Screen | Endpoint |
|---|---|
| Submit | `POST /manuscripts/submit` multipart: journal_id, title (5-500), abstract (20-100000), article_type (default `ORIGINAL RESEARCH`), co_authors (JSON string, 1-100), file (PDF/DOC/DOCX, <=10 MiB). Needs verified email |
| Dashboard | `GET /manuscripts/my-submissions` |
| Detail | `GET /manuscripts/{id}` (versions[kind, version_number], remarks, status_history, production_tasks, proof_version, approved_proof_version) |
| Revision (schema only) | `POST /manuscripts/{id}/revisions` multipart: author_response (10+), file |
| Proof (schema only) | `GET /manuscripts/{id}/proof`, `POST /manuscripts/{id}/approve-proof` {proof_version} |
| APC waiver (schema only) | `POST /manuscripts/{id}/apc-waiver` {reason 10+} |

co_authors item: `{first_name,last_name,email,affiliation_name,orcid_id,is_corresponding}`. The signed-in author's email must be included, exactly one corresponding, unique emails, order = array order.

### Staff screening
| Step | Endpoint |
|---|---|
| Queue | `GET /admin/manuscripts?status=SUBMITTED&employee_assignment=unassigned|mine&q&employee_stage=PRODUCTION` |
| Detail | `GET /admin/manuscripts/{id}` (+screening_checks, employee_assignments) |
| Source download | `GET /admin/manuscripts/{id}/download?version=n` |
| Claim | `POST /admin/manuscripts/{id}/claim` (409 = someone else claimed -> refresh queue) |
| Assign employee (SUPER_ADMIN) | `POST /admin/manuscripts/{id}/assign-employee` {stage SCREENING|PRODUCTION, employee_id, note 10+} |
| Screening check | `POST /admin/manuscripts/{id}/screening-checks` {check_type PLAGIARISM|DUPLICATE|FORMATTING, result PASS|FAIL, similarity_score 0-100?, notes?}; 201; latest per type counts |
| Screening decision | `POST /admin/manuscripts/{id}/screening-decision` {outcome PASS|REQUEST_CORRECTIONS|REJECT, editor_id (for PASS), message (10+ unless PASS)} -> `ASSIGNED_TO_EDITOR` |
| Assign editor | `POST /admin/manuscripts/{id}/assign-editor` {editor_id, note} |

### Editor (schema only; document section pending)
`GET /editor/manuscripts`, `GET /editor/manuscripts/{id}`, `GET /editor/manuscripts/{id}/versions/{n}/download`, `PATCH /editor/manuscripts/{id}/decision` {decision REVISIONS_REQUESTED|ACCEPTED|REJECTED, remarks 10+}.

### Production / publish (schema only; document section pending)
`POST /admin/manuscripts/{id}/proof` (multipart file), `PATCH /admin/manuscripts/{id}/production-tasks/{task}` {status, notes}, `GET /admin/production?employee_assignment`, `GET /admin/manuscripts/{id}/doi-status`, `POST .../register-doi`, `POST .../publish`, `PATCH /admin/manuscripts/{id}/decision`.
Publish button: show "Live DOI registration pending" until Crossref goes live; test success only against a sandbox.

### Super Admin / governance (schema only; document section pending)
`GET /admin/dashboard`; employees `GET/POST /admin/employees`, `PATCH/DELETE /admin/employees/{id}` (role STAFF|EDITOR|SUPER_ADMIN, status ACTIVE|INACTIVE); applications `GET /admin/applications?status`, `GET /admin/applications/{id}`, `POST /admin/applications/{id}/{decision}`; `GET/PATCH /admin/inquiries`; `GET /admin/apc-waivers`, `POST /admin/apc-waivers/{id}/{decision}`; `GET/PUT /admin/settings`; `PUT /admin/policies/{slug}`; `POST /admin/journals`, `POST /admin/categories`.
Ops only (not used by UI): `GET /health`, `GET /ready`, `GET /`.

## 4. Phased plan (commit to `develop` after each phase; no builds, only `npm run dev` + `npm run lint`)

| Phase | Scope | Touches |
|---|---|---|
| 0 | `.env.example` (`VITE_API_BASE_URL`), `http.js`, error normaliser, session store, `AuthContext`, `ProtectedRoute`, role routing, 401 single-flight refresh | new files, `main.jsx`, `App.jsx` |
| 1 | Login, Register, Forgot/Reset password, Verify email (+ resend, cooldown), Logout, session restore | `Login.jsx`, `Register.jsx`, new routes |
| 2 | Public read APIs behind `apiClient.js` with **response adapters** so existing UI props stay unchanged; News, policies, contact, apply-editor, bookmarks, view count, downloads | `apiClient.js`, `News.jsx`, `ApplyEditor.jsx`, contact page |
| 3 | Author: submit (replaces Drive), my-submissions, detail, revision upload, proof approve, APC waiver | `AuthorSubmit.jsx` + new author pages |
| 4 | Staff: queue, claim, detail, source download, screening checks, screening decision, assign editor | `AdminManuscripts.jsx` + detail |
| 5 | Editor: assigned list, detail, version download, decision | new pages |
| 6 | Production: proof upload, tasks, DOI status, publish (pending state) | admin pages |
| 7 | Super Admin: dashboard, employees, applications, inquiries, waivers, settings, policies, journals/categories | `AdminEmployees.jsx`, `AdminApplications.jsx`, others |
| 8 | Cleanup: remove Drive code and hardcoded Apps Script URL, remove static `data.js` fallback, optional OAuth, docs + release checklist | many |

Admin status labels in the current mock UI (New / In Review / Accepted / Rejected) must be mapped from real backend states (`SUBMITTED`, `ASSIGNED_TO_EDITOR`, `ACCEPTED`, `REJECTED`, ...), not hardcoded.

## 5. Decisions needed (UI is frozen, so these need approval)

1. **Co-authors:** the current form takes comma-separated names, but the API needs per-author first/last name, email, affiliation, one corresponding author, and the signed-in author included. This cannot be met without a small UI change (author rows). Needs approval or the actual designed screen.
2. **New screens:** verify-email, reset-password, forgot-password, author dashboard/detail, staff queue/detail, editor reviews, production and proof approval do not exist in the current UI. Share the designed screens; otherwise I reuse the existing Card/Button/Badge components and the admin layout.
3. **Journal/article shape:** the current UI uses camelCase fields (`impactFactor`, `coverImage`, `chiefEditor`, ...). Adapters will map API fields to those; any field the API lacks must be agreed (hide vs keep static).
4. **Editor picker gap:** `GET /admin/employees` is SUPER_ADMIN only. Staff cannot list editors; agree an operator-provided editor ID or SUPER_ADMIN assigns, until a staff-readable lookup exists.
5. **Token storage:** refresh/logout take the refresh token in the request body, so it must live in JS-accessible storage. Plan: access token in memory; refresh token in `sessionStorage` (or `localStorage` when `remember_me`). Mitigate with no `dangerouslySetInnerHTML` on unsanitised data and a CSP when deployed.
6. **Testing target:** write actions on production create real records and send real emails. Use a local backend, or ask the operator to add the exact dev origin (e.g. `http://localhost:5173`) to `CORS_ORIGINS` and use approved test accounts.
7. **Hosting (later):** cPanel needs an SPA rewrite to `index.html` for `/verify-email`, `/reset-password` and other deep links.
8. **Still awaited:** remaining backend document sections (editor review, revisions, proofs, production tasks, publish, admin), including valid manuscript statuses and production task names.

## 6. Contract status

| Area | Status |
|---|---|
| Auth, public, author submit, staff screening | Documented, ready to build |
| Editor, revisions, proofs, production, DOI, admin | Schema only; wait for document before building |
