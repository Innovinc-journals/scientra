# Backend Integration

Backend: built by a separate developer, deployed on AWS. Frontend: React + Vite, hosted on cPanel.
**UI is frozen**: only logic changes.

## 1. Current state (before integration)

| Area | Current behaviour | File |
|---|---|---|
| Journals / articles / stats | Static data + fake delay | `src/api/apiClient.js`, `src/utils/data.js` |
| Manuscript submit | Base64 POST to Google Apps Script (Drive) | `src/pages/author/AuthorSubmit.jsx` |
| Login | Fake `setTimeout`; email domain decides `/admin` | `src/pages/Login.jsx` |
| Register | Fake `setTimeout` | `src/pages/Register.jsx` |
| Apply as editor | Fake `setTimeout` | `src/pages/ApplyEditor.jsx` |
| Admin employees | Local mock state | `src/pages/admin/AdminEmployees.jsx` |
| Admin manuscripts | `mockManuscripts` | `src/pages/admin/AdminManuscripts.jsx` |
| Admin applications | Mock data | `src/pages/admin/AdminApplications.jsx` |
| Route protection | None on `/admin/*` | `src/App.jsx` |

## 2. Integration plan

1. Create axios instance (`VITE_API_BASE_URL`), interceptors for auth and 401/403.
2. Auth context + `ProtectedRoute` (role-based) wrapped around `/admin/*`.
3. Login / Register wired to API.
4. Manuscript submit via backend; **remove Google Drive upload** and the hardcoded Apps Script URL.
5. Journals / articles / stats via API (keep static data as fallback until the API is ready).
6. Admin pages (employees, applications, manuscripts) via API.
7. Apply-editor form via API.

## 3. API contract tracker

Fill in from the backend developer's document.

| Feature | Method | Endpoint | Auth | Request | Response | Status |
|---|---|---|---|---|---|---|
| Login | | | | | | Pending doc |
| Register | | | | | | Pending doc |
| Current user | | | | | | Pending doc |
| Submit manuscript | | | | | | Pending doc |
| List journals | | | | | | Pending doc |
| List articles | | | | | | Pending doc |
| Apply as editor | | | | | | Pending doc |
| Admin: employees | | | | | | Pending doc |
| Admin: manuscripts | | | | | | Pending doc |
| Admin: applications | | | | | | Pending doc |

## 4. Open questions
- Auth method: httpOnly cookie or bearer JWT? Refresh token flow?
- File upload: multipart or S3 pre-signed URL? Max size / allowed types?
- Dev/staging API base URL?
- Roles and their permissions?
- Error response format?
