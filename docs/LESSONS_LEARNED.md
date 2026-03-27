# VibeSoko: Lessons Learned & SWE Feedback 🎓

If I were your Lead Senior Software Engineer, these are the top lessons I’d want you to take away from the VibeSoko journey. We moved from "it works on my machine" to "it works for everyone, securely."

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
- **The Hurdle**: Renaming "DukaLive" to "VibeSoko" meant touching everything from DB seeds to PWA manifests.
- **The Fix**: Global search-and-replace followed by a manual audit of logic tokens (like `dukalive_token` -> `vibesoko_token`).
- **The Lesson**: Branding isn't just CSS. It's in your tokens, your storage keys, and your API paths. Treat rebranding like a major refactor, not a cosmetic change.
