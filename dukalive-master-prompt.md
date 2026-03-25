# DukaLive — Master Build Prompt
**For:** Antigravity (Gemini)  
**Author:** Kilion Rodney Lemi  
**Project:** DukaLive v2.0 — Order Management System for TikTok Live Commerce  
**Date:** March 2026  

---

## Who You Are Building For

DukaLive is a real product being built for informal merchants in Nairobi, Kenya who sell on TikTok Live. The core problem: during a live session, sellers are simultaneously hosting, verifying M-Pesa payments, and coordinating delivery — with no system to manage it. DukaLive solves this.

You are building this for a first-year CS student who understands systems at a high level and will review everything you produce. Do not take shortcuts. Do not guess. If a specification says something explicitly, implement it exactly as written.

---

## The Full Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite), Tailwind CSS, React Router v6, Supabase JS client |
| Realtime | Supabase Realtime (WebSockets) |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting (API) | Railway |
| Hosting (Frontend) | Vercel or Railway static |
| Form intake | Google Forms + minimal Apps Script forwarder |
| SMS intake | Android SMS Forwarder app → Express webhook |

---

## Three Specification Documents

Everything you need to build this system is defined across three documents. Read all three before writing a single line of code.

1. `dukalive-frontend-spec.md` — Every screen, component, design system, state management, PWA config
2. `dukalive-schema-spec.md` — Every Supabase table, column, constraint, index, RLS policy
3. `dukalive-api-spec.md` — Every Express endpoint, request/response shape, matching engine logic, error format

**These documents are the source of truth. If there is any ambiguity, refer back to the spec. Do not invent behavior.**

---

## Build Order

Follow this exact order. Do not skip ahead. Each phase depends on the previous.

### Phase 1 — Supabase Setup
1. Create all tables from `dukalive-schema-spec.md` exactly as specified
2. Enable RLS on all tables
3. Write all RLS policies as specified
4. Create all indexes as specified
5. Enable Supabase Realtime on the `orders` table only
6. Verify the `expected_amount` generated column works correctly

### Phase 2 — Backend (Express on Railway)
1. Initialize Node.js project with Express
2. Install dependencies: `express`, `@supabase/supabase-js`, `cors`, `dotenv`
3. Set up environment variables as specified in `dukalive-api-spec.md`
4. Implement auth middleware (`authenticate` + `requireRole`) exactly as specified
5. Implement endpoints in this order:
   - `POST /api/orders` (form intake — needed for testing first)
   - `POST /api/sms/:webhook_token` (matching engine — the core logic)
   - `POST /api/sessions` and `PATCH /api/sessions/:id/end`
   - `GET /api/sessions` and `GET /api/sessions/:id/summary`
   - `GET /api/orders` and order PATCH endpoints
   - Settings endpoints
   - Auth invite endpoint
6. Implement the SMS matching engine exactly as specified in the 11-step logic in `dukalive-api-spec.md` — do not simplify or skip steps
7. Deploy to Railway

### Phase 3 — Frontend (React PWA)
1. Initialize Vite + React project
2. Install dependencies: `@supabase/supabase-js`, `react-router-dom`, `recharts`, `tailwindcss`
3. Set up design system — CSS variables exactly as specified in `dukalive-frontend-spec.md` Section 1
4. Import Google Fonts: Rajdhani + DM Mono
5. Build components in this order:
   - `useHaptics` hook
   - `useRealtime` hook (Supabase Realtime subscription)
   - `AppContext` + global state
   - `<LoginScreen />`
   - `<OrderCard />` + `<OrderDrawer />`
   - `<LiveTicker />`
   - `<SessionHeader />`
   - `<SessionSummary />` with Recharts bestseller bar chart
   - `<SettingsScreen />`
   - `<ConfirmModal />`
6. Build pages and React Router routes as specified
7. Implement role-based navigation (seller tabs vs handyman tabs)
8. Configure PWA manifest as specified
9. Connect all components to the backend API

### Phase 4 — Google Form + Apps Script
1. Create the Google Form with these exact fields:
   - Full Name (short answer)
   - TikTok Handle (short answer)
   - Phone Number (short answer)
   - Delivery Location (short answer)
   - Item Name (short answer)
   - Quantity (short answer, number)
   - Unit Price (short answer, number — pre-filled, hidden from buyer)
2. Attach the Apps Script from `dukalive-api-spec.md` to the form
3. Set the `onFormSubmit` trigger

### Phase 5 — SMS Forwarder Documentation
1. Write a clear setup guide for the seller (non-technical audience)
2. Include step-by-step instructions for SMS Forwarder app configuration
3. Include battery optimization instructions for: Tecno, Infinix, Samsung, Xiaomi

---

## Non-Negotiable Rules

These apply to every line of code you write:

1. **Never use hardcoded column indices** — always reference columns by name
2. **Never use `innerHTML` wipes** for the order feed — DOM diffing only, new cards injected individually
3. **Never poll the backend** for order updates — Supabase Realtime WebSocket only
4. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** to the frontend — backend only
5. **Always normalize phone numbers** to `+254XXXXXXXXX` format before storing
6. **Always display amounts** as `Ksh {amount.toLocaleString()}` — never raw integers
7. **Always log SMS** to `sms_logs` before any processing — even if parsing fails
8. **The `mpesa_tx_code` UNIQUE constraint** is your primary fraud prevention — never bypass it
9. **RLS is always on** — never disable it for convenience during development
10. **`expected_amount` is a generated column** — never calculate it in application code

---

## Key Business Logic to Understand

### The Matching Engine
When an M-Pesa SMS arrives at `/api/sms/:webhook_token`, the system must:
- Parse the SMS to extract: TX code, amount, sender name, date
- Match by amount (lenient) — name is a hint, not a gate
- If multiple orders have the same expected amount, take the most recent, flag others as REVIEW
- Verify date matches today in East Africa Time (UTC+3)
- Log everything to `sms_logs` regardless of outcome

### The Order Lifecycle
```
Form submitted → PENDING
SMS matched + date correct → VERIFIED
Duplicate TX code → FRAUD
Amount match but date wrong → FRAUD (reason: "Payment date mismatch")
Multiple same-amount matches → most recent = VERIFIED, others = REVIEW
Handyman confirms dispatch → FULFILLED
```

### Role Separation
- **Seller:** Full access — all tabs, session summary, analytics, settings, handyman management
- **Handyman:** Live feed only — can see orders, fulfill orders, flag for review. Cannot see revenue totals, session history, or settings.
- Both land on `/dashboard/live` after login — the UI adapts based on role

### Session Model
- One active session per seller at a time
- Session = one TikTok Live broadcast
- All orders belong to a session
- Session summary is the post-live analytics report

---

## Design Reminders

- Dark mode only — background `#0A0A0A`
- Electric green (`#00FF88`) is the brand accent and verified status color
- Signal red (`#FF2D2D`) for fraud
- Warning yellow (`#FFB800`) for review
- Fonts: Rajdhani (display/headers/amounts) + DM Mono (labels/metadata/codes)
- Mobile-first — optimized for Android, tested on low-end devices
- Haptics: double pulse for verified order, long pulse for fraud
- New order cards animate in from top — 200ms ease-out
- All motion respects `prefers-reduced-motion`

---

## File Structure Reference

See `dukalive-frontend-spec.md` Section 8 for the complete frontend file structure.

Backend structure:
```
server/
├── middleware/
│   └── auth.js
├── routes/
│   ├── orders.js
│   ├── sessions.js
│   ├── sms.js
│   └── settings.js
├── lib/
│   └── supabase.js
├── utils/
│   └── smsParser.js      ← All regex logic lives here, isolated
└── index.js
```

---

## What Success Looks Like

A seller in Nairobi starts a TikTok Live. They share their Google Form link in the comments. A buyer fills in the form and pays via M-Pesa. Within 3 seconds, the Handyman's phone vibrates twice. A green card appears at the top of the feed showing the buyer's TikTok handle, item, and verified amount. The Handyman taps the card, sees the delivery location, and taps the WhatsApp button to confirm drop-off. At the end of the session, the seller ends the live, opens the session summary, and sees exactly how much they made, which items sold best, and how many fraudulent receipts were intercepted.

That is the product. Build it.

---

*End of Master Build Prompt — DukaLive v2.0*
