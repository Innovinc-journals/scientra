# Git Workflow

- `main` = production (what is live on cPanel). **Only pushed to when the owner explicitly says "push to main".**
- `develop` = ongoing work. Every finished implementation is committed and pushed here first.
- Feature work may branch from `develop` (e.g. `feature/auth`) and merge back into `develop`.

## Rules
1. Never commit directly to `main` without explicit owner approval.
2. After each completed implementation: commit to `develop` and push `develop`.
3. When the owner says "push to main": merge `develop` into `main` and push.
4. Do not run `npm run build` on every change. Verify with `npm run dev` and `npm run lint`. Build only for a release.
5. The UI is frozen: no layout/styling/copy changes. Only logic (API, auth, guards) may change.
6. Commit messages: `feat:`, `fix:`, `chore:`, `docs:`.
