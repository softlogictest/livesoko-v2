# LiveSoko: Public Repository Security 🔓🛡️

Managing a public repository (like on GitHub) requires discipline to ensure your private data stays private.

## 1. Is the Codebase Safe?
**Yes.** The core codebase is safe for public viewing because:
- **No Hardcoded Keys**: We have removed all actual API keys, passwords, and tokens from the `.js` and `.ts` files.
- **Environment Driven**: We use `.env` files for configuration.
- **Logic Only**: The public repo contains the "Engine" (how the app works), not the "Fuel" (your specific data).

## 2. The Golden Rule: Use `.gitignore` 📂
Our `.gitignore` excludes:
- `.env` and `.env.local` — your secrets never leave your machine.
- `*.db`, `*.db-shm`, `*.db-wal` — your customer data stays local.
- `node_modules/` — dependencies are installed fresh per environment.
- `backend/public/` and `frontend/dist/` — build artifacts are regenerated.
- `backend/clear_sheet_url.js` and `backend/repair_db.js` — utility scripts stay local.

> **Critical**: Never remove `.env` from the `.gitignore`. If you accidentally commit a `.env` file, change your passwords/tokens immediately, even if you delete the file later (it stays in the Git history forever!).

## 3. What IS Safe on GitHub
- All `.js`, `.ts`, `.tsx` source code (contains logic, not secrets).
- `package.json` files (dependency lists, not credentials).
- Documentation in `/docs`.
- Configuration files like `railway.json`, `tailwind.config.js`, `vite.config.ts`.

## 4. What is NOT Safe on GitHub
- `.env` files (contains DB paths, default passwords).
- `*.db` files (contains actual customer order data).
- Any file with an API key, token, or password hardcoded in it.

## 5. If You Suspect Exposure
1. **Rotate tokens immediately**: Generate a new webhook token in LiveSoko Settings.
2. **Change passwords**: Update your admin password via the LiveSoko UI.
3. **Revoke GitHub PATs**: Go to GitHub → Settings → Developer Settings → Personal Access Tokens and revoke any compromised tokens.
4. **Check git history**: Run `git log --all --oneline -- backend/.env` to see if secrets were ever committed. If so, use `git filter-branch` or BFG Repo-Cleaner to scrub them from history.
