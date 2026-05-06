# LiveSoko: Lessons Learned 🎓

Technical lessons from building and stabilizing LiveSoko. Each lesson came from a real bug or failure.

## 1. The "Zero Shortcut" Rule 🛠️
- **The Hurdle**: Early versions used hardcoded test accounts and "vibe-coded" passwords.
- **The Fix**: Migrated to **Environment Variables** and **Cryptographic IDs (UUIDs)**.
- **The Lesson**: Shortcuts *will* come back to haunt you. Always write production-grade code from Day 1.

## 2. Local-First Wins for Speed ⚡
- **The Hurdle**: Relying on Supabase (Cloud) introduced latency and complexity.
- **The Fix**: Moved to **SQLite (WAL Mode)** running on the same machine as the backend.
- **The Lesson**: For real-time apps (like TikTok Live selling), local is king. SQLite is near-zero-latency compared to a cloud round-trip.

## 3. Never Trust the Client 🛡️
- **The Hurdle**: IDOR vulnerabilities where anyone could flag any order.
- **The Fix**: Added `WHERE shop_id = req.user.shop_id` to *every* relevant SQL query.
- **The Lesson**: Even if the frontend only shows "your" orders, the API must verify ownership at the database level.

## 4. SSE > WebSockets for Dashboards 🔄
- **The Hurdle**: Complex state management across multiple clients.
- **The Fix**: **Server-Sent Events (SSE)** for one-way broadcasts.
- **The Lesson**: SSE is easier to implement, survives network drops (auto-reconnects), and is perfect for dashboard-style apps.

## 5. Rebranding is Structural 🎨
- **The Hurdle**: DukaLive → VibeSoko → LiveSoko meant touching DB seeds, PWA manifests, and localStorage keys.
- **The Fix**: Global search-and-replace + manual audit of logic tokens.
- **The Lesson**: Treat rebranding like a major refactor, not a cosmetic change.

## 6. SQLite Migrations: Be Paranoid 💾
- **The Hurdle**: `ALTER TABLE` and `RENAME COLUMN` in SQLite can silently corrupt foreign keys.
- **The Fix**: The safe **CREATE new → COPY data → DROP old → RENAME** pattern with `foreign_keys = OFF`.
- **The Lesson**: Never use `ALTER TABLE` for anything beyond simple column additions. Always use the rebuild pattern.
- **v2.4.0 Update**: We discovered that `orders.shop_id` was FK-referencing `profiles(id)` instead of `shops(id)` — a silent corruption from an old migration. This caused ALL order creation to fail with `FOREIGN KEY constraint failed`. Added Phase 3 migration to detect and auto-fix.

## 7. Always Check the API Response 📡
- **The Hurdle**: Frontend `fetchWithAuth()` calls would silently fail. The modal would close, but no order was created. The user saw nothing.
- **The Fix**: Check `res.ok` on every API call. If not OK, parse the error and `alert()` the user. Also dispatch state updates directly instead of relying solely on SSE.
- **The Lesson**: Never assume a `fetch()` succeeded. `fetch()` only throws on network errors — HTTP 400/500 responses are not thrown.

## 8. Clipboard API Requires HTTPS 📋
- **The Hurdle**: `navigator.clipboard.writeText()` silently fails on mobile HTTP (LAN access).
- **The Fix**: Textarea-based fallback: create invisible textarea → select → `execCommand('copy')`.
- **The Lesson**: When your users access via `http://192.168.x.x`, many browser APIs are restricted. Always have fallbacks.

## 9. SSE Broadcast Needs shop_id 🔌
- **The Hurdle**: `broadcast('order:deleted', { id })` never reached any client because `shop_id` was missing.
- **The Fix**: The `broadcast()` function routes events by `data.shop_id`. If it's undefined, the event silently drops. Always include `shop_id` in every broadcast payload.
- **The Lesson**: Debug SSE issues from the broadcast function outward, not the client inward.

## 10. Route Patterns Matter in Production 🔗
- **The Hurdle**: `/@:slug` worked in React Router dev mode but broke in production builds. Buyers saw a 404 page.
- **The Fix**: Changed to `/shop/:slug`. Clean, reliable, no special characters.
- **The Lesson**: Avoid special characters (`@`, `#`, etc.) in route patterns. They may work in development but fail unpredictably in production builds or behind reverse proxies.

## 11. Mobile Background & Native > Headless 📱
- **The Hurdle**: Tried to build an SMS Forwarder using Expo/React Native SDK 52. The "New Architecture" broke all legacy SMS libraries, and background execution was notoriously unstable.
- **The Fix**: Abandoned Expo entirely. Built a **Pure Native Kotlin** app (~2MB). Used a native `BroadcastReceiver` for SMS and **GitHub Actions** to compile the APK remotely.
- **The Lesson**: For simple utility tasks (SMS listening, background services), React Native is a heavy, brittle distraction. Native code is lighter, more reliable, and easier to build via CI/CD than fighting "bleeding-edge" framework dependencies. Also: Never reference app icons in the Manifest if you haven't created the image files — it's a silent build killer.
## 12. External Webhooks need window.location.origin 🔌
- **The Hurdle**: The companion app was failing to connect on Railway. The Settings page was hardcoded to `http://` and fallback to port `3000`. On Railway, this generated an unreachable URL (e.g. `http://livesoko.up.railway.app:3000/...`).
- **The Fix**: Replaced manual URL construction with `window.location.origin`. 
- **The Lesson**: Never hardcode protocols or ports for links that need to be copied. `window.location.origin` automatically handles the difference between Local Dev (`http://192.168.x.x:3000`) and Production (`https://domain.com`) without any extra logic.
