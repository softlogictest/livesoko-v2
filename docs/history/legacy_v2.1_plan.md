# LiveSoko v2.1 — Local-First Build Plan (STRESS-TESTED)

## Core Principles
1. **RELIABLE first** — every choice asks "what if this breaks?"
2. **Google Forms stays** — buyers fill the form, seller never types orders
3. **Cloud backup** — periodic SQLite export
4. **Supabase backend preserved** — kept in codebase for v4/v5 multi-seller mode

---

## Architecture

```
Seller's Laptop
├── Express (0.0.0.0:3000)
│   ├── SQLite (livesoko.db) in WAL mode
│   ├── Google Sheets Poller (every 5s during active session)
│   ├── SSE /api/events (realtime push to browsers)
│   ├── SMS webhook (M-Pesa from phone on local network)
│   └── Serves React frontend as static files
│
├── Same WiFi / Hotspot:
│   ├── Seller's browser → http://192.168.x.x:3000
│   ├── Handyman's browser → http://192.168.x.x:3000
│   └── Seller's phone (SMS Forwarder → same IP:3000)
```

---

## Stress Test: 8 Failure Scenarios

### 1. Google Sheets rate limiting
**Risk:** Polling every 3s = 720 req/hr. During a 3-hour live = ~2,160 requests.
**Verdict:** Google allows moderate published-sheet reads. But to be safe:
- Poll every **5 seconds** (not 3) = 720 requests per hour
- Only poll **during active sessions** (not 24/7)
- If a fetch fails, **back off** to 15 seconds, then retry at 5s
- **Worst case:** One poll fails, next one catches the missed rows. No data loss.

### 2. Laptop goes to sleep mid-live
**Risk:** Express stops → missed SMS → missed form entries
**Mitigation:**
- On session start, show warning: "Keep laptop awake and plugged in"
- When laptop wakes, the Sheets poller catches up on ALL missed rows automatically
- SMS messages stay queued in SMS Forwarder and are re-sent when connection restores

### 3. WiFi/hotspot drops
**Risk:** Handyman's phone loses connection to SSE stream
**Mitigation:**
- `EventSource` (SSE) **auto-reconnects** — this is built into the browser standard
- On reconnect, frontend does a full data refresh to catch up
- Show a "Reconnecting..." banner in the UI

### 4. SQLite file corruption / laptop crash
**Risk:** All session data lost
**Mitigation:**
- SQLite in **WAL mode** (Write-Ahead Logging) — crash-resistant by design
- Automatic backup copy every 30 minutes to `./backups/` folder
- Future: upload backup to your server

### 5. SMS Forwarder can't reach laptop IP
**Risk:** M-Pesa verification fails, all orders stuck on PENDING
**Mitigation:**
- Express prints clear local IP on startup: `"LiveSoko running at http://192.168.1.50:3000"`
- Settings screen shows the SMS Forwarder URL to copy
- Add a **"Test Connection"** button in Settings that sends a test SMS to verify the link
- If on hotspot, the IP is typically `192.168.43.1` (Android standard)

### 6. Port 3000 already in use
**Risk:** App doesn't start
**Mitigation:** Try ports 3000 → 3001 → 3002 automatically. Print whichever works.

### 7. Google Form has wrong/extra columns
**Risk:** Sheet parsing fails, orders not created
**Mitigation:**
- Match columns **by header name**, not by index (this was already a non-negotiable rule in the original spec)
- Log parsing errors clearly but don't crash
- Skip bad rows, continue processing good ones

### 8. Two orders with same amount arrive simultaneously
**Risk:** SMS matches the wrong order
**Mitigation:** This is the existing matching engine logic — unchanged. Most recent PENDING order gets matched, others flagged as REVIEW. This is already battle-tested in the spec.

---

## Google Sheets Polling: Detailed Design

```
Google Form → auto-saves to Google Sheet (zero code, built-in)
                        ↓
Seller publishes Sheet: File → Share → Publish to web → CSV
                        ↓
Seller pastes the CSV URL into LiveSoko Settings
                        ↓
Backend fetches CSV every 5 seconds (only during active session)
                        ↓
Compares rows against SQLite (last_processed_row tracker)
                        ↓
New rows → INSERT into orders table → SSE broadcast
```

**Why this is the most reliable option:**
- Google Forms → Sheets is **Google's own plumbing** — never breaks
- Published CSV = simple GET request, no API keys, no OAuth
- Idempotent: if we re-read the same row, we detect the duplicate and skip it
- Catches up after downtime automatically

---

## Version Roadmap

| Version | Architecture | Target |
|---------|-------------|--------|
| **v2.1** (now) | Local-first, SQLite, single seller | MVP — ship fast, prove it works |
| v3 | Add cloud backup + kill switch | Monetization ready |
| v4 | Optional Supabase mode for multi-seller | Scale to multiple shops |
| v5 | Full cloud SaaS | Enterprise/marketplace |

> [!NOTE]
> The current Supabase codebase (`backend/` and `frontend/`) will be preserved in a `v2-supabase/` folder for future reference.

---

## Execution Plan

### Phase A — Backend: SQLite + Local Auth

| File | Action | Purpose |
|------|--------|---------|
| `lib/database.js` | NEW | SQLite init (WAL mode), table schemas, query helpers |
| `lib/sheetPoller.js` | NEW | Google Sheets CSV poller with backoff |
| `routes/events.js` | NEW | SSE endpoint for realtime |
| [middleware/auth.js](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/backend/middleware/auth.js) | REWRITE | bcrypt local auth |
| [routes/auth.js](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/backend/routes/auth.js) | REWRITE | Login/logout endpoints |
| [routes/orders.js](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/backend/routes/orders.js) | REWRITE | SQLite + SSE broadcast |
| [routes/sessions.js](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/backend/routes/sessions.js) | REWRITE | SQLite |
| [routes/sms.js](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/backend/routes/sms.js) | REWRITE | SQLite (matching engine logic identical) |
| [routes/settings.js](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/backend/routes/settings.js) | REWRITE | SQLite |
| [index.js](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/backend/index.js) | REWRITE | Init DB, start poller, serve frontend, print IP |

### Phase B — Frontend: Remove Supabase

| File | Action | Purpose |
|------|--------|---------|
| [App.tsx](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/frontend/src/App.tsx) | REWRITE | Local auth, API-based profile |
| [Login.tsx](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/frontend/src/pages/Login.tsx) | REWRITE | POST /api/auth/login |
| [LiveFeed.tsx](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/frontend/src/pages/LiveFeed.tsx) | MODIFY | SSE for realtime |
| [useRealtime.ts](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/frontend/src/hooks/useRealtime.ts) | REWRITE | EventSource instead of Supabase |
| [Settings.tsx](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/frontend/src/pages/Settings.tsx) | MODIFY | Show local IP, Sheet URL config |
| [lib/supabase.ts](file:///c:/Users/Elitebook/OneDrive/Desktop/livesoko/frontend/src/lib/supabase.ts) | DELETE | No longer needed |

### Phase C — First-Run Experience

On first `npm start`:
1. SQLite database auto-created with tables
2. Default seller account auto-generated (email: `seller@livesoko.local`, password: `livesoko`)
3. Console prints: `LiveSoko running at http://192.168.x.x:3000 — Open this on your phone!`
4. Login screen shows default credentials
5. Settings screen guides through Google Sheet URL setup

---

## Decision Log

| Decision | Chosen | Why | Alternative considered |
|----------|--------|-----|----------------------|
| Database | SQLite (better-sqlite3) | Zero setup, crash-safe, fast | PostgreSQL (overkill), LevelDB (no SQL) |
| Realtime | SSE (EventSource) | Auto-reconnect, built into browsers, simple | WebSocket (more complex), polling (wasteful) |
| Form intake | Google Sheets CSV polling | Rock solid, no webhooks needed | ngrok webhook (unreliable free tier), manual entry (defeats purpose) |
| Auth | bcrypt + session token | Simple, reliable, no cloud dependency | Supabase Auth (broken), JWT (overcomplicated for local) |
| Polling interval | 5 seconds | Safe for Google rate limits, fast enough for UX | 3s (risky), 10s (too slow) |
