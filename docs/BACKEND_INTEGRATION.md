# Backend Integration

- **Backend:** FastAPI ("Scientra Academic Publishing API" v1.3.0), built by a separate developer, on AWS.
- **Prod API origin:** `https://api.scientrajournals.org` (append `/api/v1` **once**). Swagger `/docs`, schema `/openapi.json`.
- **Frontend:** React 19 + Vite on cPanel, `https://scientrajournals.org`.
- **Local dev API:** `http://127.0.0.1:8000` (local backend + test data).
- **UI is frozen:** only logic changes. Any unavoidable UI addition is listed under "Decisions" and needs approval first.
- **Source of truth:** the full backend handoff document (sections 1-6 received) + live `/openapi.json` (81 operations, fetched 2026-11-16). Related backend docs not yet seen: `SCIENTRA_SWAGGER_MANUAL_TESTING.md`, `EMPLOYEE_ASSIGNMENTS.md`, `IMPLEMENTATION_STATUS.md`, `PRODUCTION_EMAIL.md`. Ask for them if a detail is unclear.

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
| Revision | `POST /manuscripts/{id}/revisions` multipart: author_response (10-10,000), file. Only when status is CORRECTIONS_REQUESTED or REVISIONS_REQUESTED. 201 creates next source version. Screening corrections return to SUBMITTED; editor revisions return to ASSIGNED_TO_EDITOR (same editor) |
| Read decision remarks | `GET /manuscripts/{id}` (remarks, status_history) |
| Proof review | `GET /manuscripts/{id}/proof` (latest proof; download rule applies) |
| Approve proof | `POST /manuscripts/{id}/approve-proof` {proof_version} -> `{proof_version, approved:true}`. Send the exact number reviewed. 409 = reload and ask to review again |
| APC waiver | `POST /manuscripts/{id}/apc-waiver` {reason 10+}, only for an ACCEPTED manuscript |

Note: there is **no author endpoint to download their own source versions**. Do not build one. Source and proof lists stay separate in the UI.

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

### Editor (document 4.3)
| Step | Endpoint |
|---|---|
| Queue (scoped to assigned editor) | `GET /editor/manuscripts` |
| Detail | `GET /editor/manuscripts/{id}` |
| Compare source versions | `GET /editor/manuscripts/{id}/versions/{n}/download` (no server-side diff; compare client-side by opening two versions) |
| Decision | `PATCH /editor/manuscripts/{id}/decision` {decision REVISIONS_REQUESTED\|ACCEPTED\|REJECTED, remarks 10-10,000} |
| Super Admin override | `PATCH /admin/manuscripts/{id}/decision` (same body) |

On ACCEPTED the current screening employee becomes production owner automatically. SUPER_ADMIN may change it with `assign-employee` stage PRODUCTION. If no eligible owner exists, the record shows in the unassigned production queue for SUPER_ADMIN.

### Production, proof, DOI, publish (document 4.4)
| Step | Endpoint |
|---|---|
| Production list | `GET /admin/production?employee_assignment=mine\|unassigned` (SUPER_ADMIN also sees all) |
| Detail | `GET /admin/manuscripts/{id}` |
| Upload proof | `POST /admin/manuscripts/{id}/proof` multipart `file` only; **PDF required** even if the author sent DOCX. 201 `{proof_version}`. Clears author approval and resets PROOFREADING and FORMATTING_CHECK. Reload tasks and approval state after upload. Frozen once DOI registration starts |
| Tasks | `PATCH /admin/manuscripts/{id}/production-tasks/{task}` task = TYPESETTING, PROOFREADING, FORMATTING_CHECK; body `{status:"DONE", notes}`. AUTHOR_FINAL_APPROVAL is set by the author endpoint, DOI_REGISTRATION by the worker; never editable from the UI |
| Register DOI | `POST /admin/manuscripts/{id}/register-doi` (no body) -> 202 + record. Preconditions: current proof approved and all four non-DOI tasks DONE |
| DOI status | `GET /admin/manuscripts/{id}/doi-status`; poll every few seconds, stop on REGISTERED, FAILED, navigation away or bounded timeout. NOT_STARTED = no registration; PENDING = queued; FAILED = operator issue |
| Publish | `POST /admin/manuscripts/{id}/publish` (no body). 200 returns the article; save `response.id` as articleId and open `GET /articles/{articleId}`. Never derive from manuscript ID. Repeating returns the existing article |

**DOI release gate:** with the DOI provider disabled, register-doi returns 503; with sandbox registration enabled it can return a `sandbox:` identifier and publish rejects it with 409. **Keep Publish unavailable on production** (show "Live DOI registration pending") until live Crossref is integrated. Test success only against a non-production sandbox.

### Super Admin / governance (document section 5)
| Screen | Endpoint and behaviour |
|---|---|
| Dashboard | `GET /admin/dashboard` (STAFF and SUPER_ADMIN). Use server counters; render `null` averages as unavailable |
| Employees | `GET/POST /admin/employees`, `PATCH/DELETE /admin/employees/{userId}`. Invite form: name, email, role (STAFF\|EDITOR\|SUPER_ADMIN). 201 = "invitation queued"; `email_verified` is false until accepted. DELETE deactivates; last active SUPER_ADMIN is protected. SUPER_ADMIN invites need an approved internal domain |
| Editor applications | `GET /admin/applications?status=PENDING`, `GET /admin/applications/{id}`, `POST .../approve` or `/reject` (no body). Approval of a new editor queues the Create-password email; a role conflict needs the operator |
| Inquiries | `GET /admin/inquiries`, `PATCH /admin/inquiries/{id}` (no body = resolve) |
| Categories | `POST /admin/categories` {name, description, color_gradient, display_order}; omit `id` |
| Journals | `POST /admin/journals` {category_id, title, issn `1234-567X`, description}; omit `id`. ISSN is required today; explain this in the form |
| APC waivers | Author `POST /manuscripts/{id}/apc-waiver`; STAFF/SUPER_ADMIN `GET /admin/apc-waivers`, `POST /admin/apc-waivers/{waiverId}/approve` or `/reject` (no body) |
| Settings | `GET/PUT /admin/settings`; only top-level keys `contact_directory`, `site_metadata`, `publishing_information`, each an object. Never store credentials |
| Policies | `PUT /admin/policies/{slug}` {title, content_markdown}; public `GET /policies/{slug}` |

Ops only (not used by UI): `GET /health`, `GET /ready`, `GET /`.

### Do NOT build (no backend support)
Journal/category edit or delete, full editorial catalog CRUD, author source-version download, automated plagiarism scanning, article full text and references, live DOI registration.

### Status labels and button rules
| API status | Display | Normal next action |
|---|---|---|
| SUBMITTED | Awaiting screening | Staff claims or screens |
| CORRECTIONS_REQUESTED | Screening corrections requested | Author uploads revised source |
| ASSIGNED_TO_EDITOR | With editor | Assigned editor reviews and decides |
| REVISIONS_REQUESTED | Editor revisions requested | Author uploads revised source |
| ACCEPTED | Accepted, in production | Production staff and author work through proof tasks |
| REJECTED | Rejected | Read decision and history |
| PUBLISHED | Published | Open the public article |

Show buttons from role + status + ownership + version; backend stays authoritative. After any successful mutation reload the detail and affected lists. On a race or stale state (409), refresh instead of forcing the action.

## 4. Phased plan (commit to `develop` after each phase; no builds, only `npm run dev` + `npm run lint`)

| Phase | Scope | Touches |
|---|---|---|
| 0 | **DONE (develop).** `.env.example` (`VITE_API_BASE_URL`), `http.js`, error normaliser, session store, `AuthContext`, `ProtectedRoute`, role routing, 401 single-flight refresh | `src/api/*`, `src/auth/*`, `main.jsx`, `App.jsx` |
| 1 | **DONE (develop).** Login, Register, Forgot/Reset password, Verify email (+ resend, cooldown), logout, session restore, admin route guards by role | `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`, `VerifyEmail.jsx`, `AdminLayout.jsx` |
| 2 | Public read APIs behind `apiClient.js` with **response adapters** so existing UI props stay unchanged; News, policies, contact, apply-editor, bookmarks, view count, downloads | `apiClient.js`, `News.jsx`, `ApplyEditor.jsx`, contact page |
| 3 | Author: submit (replaces Drive), my-submissions, detail, revision upload, proof approve, APC waiver | `AuthorSubmit.jsx` + new author pages |
| 4 | Staff: queue, claim, detail, source download, screening checks, screening decision, assign editor | `AdminManuscripts.jsx` + detail |
| 5 | Editor: assigned list, detail, version download, decision | new pages |
| 6 | Production: proof upload, tasks, DOI status, publish (pending state) | admin pages |
| 7 | Super Admin: dashboard, employees, applications, inquiries, waivers, settings, policies, journals/categories | `AdminEmployees.jsx`, `AdminApplications.jsx`, others |
| 8 | Cleanup: remove Drive code and hardcoded Apps Script URL, remove static `data.js` fallback, optional OAuth, docs + release checklist | many |

Admin status labels in the current mock UI (New / In Review / Accepted / Rejected) must be mapped from real backend states (`SUBMITTED`, `ASSIGNED_TO_EDITOR`, `ACCEPTED`, `REJECTED`, ...), not hardcoded.

## 5. Decisions

**Resolved (owner, 2026-11-16):**
1. Co-authors: add per-author rows to the submit form, styled like the existing form (Phase 3).
2. New role screens: build them in the same visual style (existing Card/Button/Badge/AdminLayout); no off-style UI.
3. Journal/article shape: adapters keep existing UI props (Phase 2).

**Open:**
4. **Editor picker gap:** `GET /admin/employees` is SUPER_ADMIN only. Staff cannot list editors; agree an operator-provided editor ID or SUPER_ADMIN assigns, until a staff-readable lookup exists.
5. **Token storage (implemented):** access token in memory; refresh token in `sessionStorage`, or `localStorage` when "Remember me" is ticked. Mitigate with no `dangerouslySetInnerHTML` on unsanitised data and a CSP when deployed.
6. **Testing target:** not yet answered. Local `.env` currently points to the production origin. Write actions on production create real records and send real emails: use approved test accounts only, or a local backend. Calls from `http://localhost:5173` to production need that exact origin in the backend's `CORS_ORIGINS`.
7. **Hosting (later):** cPanel needs an SPA rewrite to `index.html` for `/verify-email`, `/reset-password`, `/forgot-password` and other deep links.
8. **Extra backend docs** (`SCIENTRA_SWAGGER_MANUAL_TESTING.md`, `EMPLOYEE_ASSIGNMENTS.md`, `IMPLEMENTATION_STATUS.md`, `PRODUCTION_EMAIL.md`) were referenced but not shared.
9. **OAuth buttons** (Google/GitHub on Login) are not wired; planned for phase 8 once the backend provider is configured (503 = unconfigured).

## 6. Contract status

| Area | Status |
|---|---|
| Auth, public, author, staff screening, editor, revisions, proofs, production, DOI, publish, admin | Fully documented |
| Remaining unknowns | Exact response shapes (use Swagger per screen), settings nested shape (product decision) |

## 7. Acceptance checklist (from backend handoff)

- [ ] Route guards verified with all four roles (AUTHOR, EDITOR, STAFF, SUPER_ADMIN).
- [ ] Multipart submission works with two authors and a dummy PDF.
- [ ] Claim conflict (409), screening correction and editor revision tested separately; editor ACCEPT moves the screening employee into production.
- [ ] Stale proof approval returns 409; a new proof clears approval.
- [ ] A user cannot open another author's manuscript or act in a role they do not have.
- [ ] Downloads exercised in local and S3 modes.
- [ ] DOI and publish tested on a non-production sandbox only.
- [ ] Verified on the real browser/API origins.
