# LiveSoko: Lessons Learned - LiveSoko Enterprise Migration 🎓

If I were your Lead Senior Software Engineer, these are the top lessons I'd want you to take away from the LiveSoko journey. We moved from "it works on my machine" to "it works for everyone, securely."

## 1. The "Zero Shortcut" Rule 🛠️
- **The Hurdle**: Early versions used hardcoded test accounts (like `handyman-id-001`) and "vibe-coded" passwords.
- **The Fix**: We migrated everything to **Environment Variables** and **Cryptographic IDs (UUIDs)**.
- **The Lesson**: Shortcuts *will* come back to haunt you. If you hardcode a "test" account, it's just a backdoor waiting to be exploited in production. Always write production-grade code from Day 1.

## 2. Infrastructure: Local-First wins for Speed ⚡
- **The Hurdle**: Relying on Supabase (Cloud) introduced latency and complexity in syncing.
- **The Fix**: We moved to **SQLite (WAL Mode)**.
- **The Lesson**: For apps involving heavy real-time interaction (like TikTok Live selling), **local is king**. SQLite is practically zero-latency compared to a cloud round-trip. It also makes the app much easier to deploy and back up.

## 3. Security: The "Verify at the Query" Pattern 🛡️
- **The Hurdle**: We had IDOR vulnerabilities where anyone could flag any order.
- **The Fix**: We added `WHERE seller_id = req.user.shop_id` to *every* relevant SQL query.
- **The Lesson**: Don't trust the client. Ever. Even if the frontend looks like it's only showing "your" orders, the API must be the final gatekeeper. **Verify ownership at the database level, not just the UI level.**

## 4. Real-time: Simple > Complex 🔄
- **The Hurdle**: Managing complex state across multiple clients.
- **The Fix**: Using **SSE (Server-Sent Events)** for one-way broadcasts.
- **The Lesson**: You don't always need WebSockets. SSE is easier to implement, survives network drops better, and is perfect for "Dashboard" style apps where you just need to push updates to the UI.

## 5. Rebranding is a "Structural" Event 🎨
- **The Hurdle**: Renaming from "DukaLive" to "VibeSoko" and then to "LiveSoko" meant touching everything from DB seeds to PWA manifests to localStorage token keys.
- **The Fix**: Global search-and-replace followed by a manual audit of logic tokens (like `dukalive_token` -> `vibesoko_token` -> `livesoko_token`).
- **The Lesson**: Branding isn't just CSS. It's in your tokens, your storage keys, your database filenames, and your API paths. Treat rebranding like a major refactor, not a cosmetic change. Plan for at least 2-3 hours per rename.

## 6. Database Migrations: Be Paranoid 💾
- **The Hurdle**: Adding columns and changing constraints on SQLite tables with existing data caused foreign key corruption.
- **The Fix**: We used the safe **CREATE new → COPY data → DROP old → RENAME** pattern with `foreign_keys = OFF` to prevent cascading FK rewrites.
- **The Lesson**: Never use `ALTER TABLE` for anything beyond simple column additions in SQLite. Always use the rebuild pattern for constraint changes. And always run `PRAGMA foreign_key_check()` after migrations to verify integrity.

## 7. Environment Parity: Dev ≠ Prod 🌍
- **The Hurdle**: The app worked locally but failed on Railway because the database path didn't exist.
- **The Fix**: We added `fs.mkdirSync(dbDir, { recursive: true })` to ensure the directory is created before SQLite tries to open the file.
- **The Lesson**: Always test your "first boot" scenario. What happens when there's no database? No `.env`? No `node_modules`? Your app should handle all of these gracefully.
