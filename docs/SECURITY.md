# Security Rules

## Environment files
- `.env` is git-ignored. Share values via a secure channel, never via git/chat/screenshots.
- `.env.example` documents variable names only, with empty values.
- `VITE_*` variables are **public** (embedded in the browser bundle). Only URLs go there. Secrets (DB creds, AWS keys, JWT secrets, signing keys) live only on the backend.
- History note: an old `.env` (Google Apps Script URL) exists in git history (commit `3c64b2a`). Treat that URL as exposed and retire it when the Drive upload is removed.

## API integration rules (frontend)
1. HTTPS only. No `http://` API URLs outside local dev.
2. Single axios instance in `src/api/` reading `VITE_API_BASE_URL`. No hardcoded URLs anywhere else.
3. Auth tokens: prefer **httpOnly, Secure, SameSite cookies** set by the backend. If the backend uses bearer JWT, keep the token in memory (not `localStorage`) where possible and attach it via an axios interceptor. Confirm with the backend developer.
4. Handle `401` (clear session, redirect to login) and `403` (access denied) globally.
5. Role-based route guards for `/admin/*` and any protected page. Guards are UX only; the backend must enforce authorization on every endpoint.
6. Never trust client checks (e.g. email domain) for roles. Role comes from the backend.
7. Never log tokens, passwords or full payloads to the console.
8. File upload: send via the backend (multipart or S3 pre-signed URL). Client validates type/size for UX only; backend must validate again (type, size, malware scan).
9. Do not render backend HTML with `dangerouslySetInnerHTML` without sanitising.
10. No secrets in the repo: check `git diff` before each commit.

## Requests to the backend developer (security)
- CORS: allow only the production and dev frontend origins.
- Rate limiting on login, register, upload and apply endpoints.
- Password hashing (bcrypt/argon2), short-lived access tokens, refresh flow.
- Server-side validation of all inputs, upload type and size limits.
- Role checks per endpoint (author / editor / admin).
- Security headers and HTTPS everywhere.
