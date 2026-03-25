# DukaLive — Frontend Specification
**Version:** 2.0  
**Stack:** React (Vite), Tailwind CSS, Supabase Realtime, React Router v6  
**Target:** Mobile-first PWA, Android-optimized, dark mode only  
**Brand:** DukaLive  
**Language:** English  

---

## 1. Design System

### 1.1 Philosophy
Tactical operations aesthetic. Not a startup SaaS — a mission control for street commerce. Every pixel earns its place. The interface is invisible until a sale happens, then loud enough to ensure no coin is missed. Optimized for readability under ring lights and bright outdoor conditions.

### 1.2 Color Palette
```css
:root {
  /* Backgrounds */
  --bg-base:        #0A0A0A;   /* Near-black canvas */
  --bg-surface:     #111111;   /* Card/panel background */
  --bg-elevated:    #1A1A1A;   /* Drawer, modal backgrounds */
  --bg-input:       #1F1F1F;   /* Input fields */

  /* Brand */
  --brand-primary:  #00FF88;   /* Electric green — DukaLive accent */
  --brand-dim:      #00CC6A;   /* Hover/active state of brand */

  /* Status */
  --status-verified: #00FF88;  /* Electric green — paid & verified */
  --status-fraud:    #FF2D2D;  /* Signal red — fraud / flagged */
  --status-review:   #FFB800;  /* Warning yellow — manual review */
  --status-pending:  #4A4A4A;  /* Neutral grey — awaiting payment */

  /* Text */
  --text-primary:   #F5F5F5;   /* Main readable text */
  --text-secondary: #888888;   /* Labels, metadata */
  --text-muted:     #444444;   /* Disabled, placeholders */

  /* Borders */
  --border-subtle:  #222222;
  --border-active:  #333333;

  /* Semantic */
  --destructive:    #FF2D2D;
  --success:        #00FF88;
  --warning:        #FFB800;
}
```

### 1.3 Typography
```css
/* Display font: Rajdhani — geometric, bold, military precision */
/* Body font: DM Mono — monospaced, technical, trustworthy for numbers */
/* Import via Google Fonts */

@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Mono:wght@400;500&display=swap');

--font-display: 'Rajdhani', sans-serif;   /* Headers, badges, amounts */
--font-body:    'DM Mono', monospace;     /* Labels, metadata, transaction codes */
```

### 1.4 Spacing Scale
```css
/* Base unit: 4px */
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
```

### 1.5 Border Radius
```css
--radius-sm:   6px;
--radius-md:   10px;
--radius-lg:   16px;
--radius-full: 9999px;
```

### 1.6 Status Badge System
Every order card carries exactly one status badge. Badges use the display font, uppercase, with a left border accent and subtle background tint.

| Status | Label | Color Token |
|--------|-------|-------------|
| VERIFIED | ✓ VERIFIED | `--status-verified` |
| FRAUD | ✗ FLAGGED | `--status-fraud` |
| REVIEW | ⚠ REVIEW | `--status-review` |
| PENDING | · PENDING | `--status-pending` |

### 1.7 Motion Principles
- New order cards slide in from the top with a 200ms ease-out translate + fade
- Drawer opens with 250ms ease-out from bottom
- Status badge updates pulse once (scale 1 → 1.08 → 1) over 300ms
- No looping animations — motion communicates events, not decoration
- Respect `prefers-reduced-motion`

---

## 2. Component Library

### 2.1 `<OrderCard />`
The primary unit of the live feed. Two states: **collapsed** (default) and **expanded** (drawer).

**Collapsed state — visible fields:**
```
┌─────────────────────────────────────┐
│ @TikTokHandle          [STATUS BADGE]│
│ 1x Asus Zephyrus G14                │
│ Ksh 180,000                [📞] [💬] │
└─────────────────────────────────────┘
```

- Left border: 3px solid, color = status color token
- Background: `--bg-surface`
- TikTok handle: `--font-display`, 600 weight, `--text-primary`
- Status badge: right-aligned, `--font-display`, uppercase, 12px
- Item + quantity: `--font-body`, `--text-secondary`
- Amount: `--font-display`, 700 weight, 20px, `--text-primary`
- Call button: icon only, `--status-verified`, links to `tel:{phone}`
- WhatsApp button: icon only, `#25D366`, links to `https://wa.me/{phone}?text=...`
- Tap anywhere on card → opens expanded drawer

**Expanded state — drawer slides up from bottom:**
```
┌─────────────────────────────────────┐
│ ── (drag handle)                    │
│ ORDER #0042                         │
│ @TikTokHandle          [STATUS BADGE]│
│ ─────────────────────────────────── │
│ Item:     1x Asus Zephyrus G14      │
│ Amount:   Ksh 180,000               │
│ Phone:    0712 345 678              │
│ Location: CBD, Nairobi              │
│ Time:     14:32:05                  │
│ ─────────────────────────────────── │
│ M-PESA TRACE                        │
│ [raw SMS text displayed here]       │
│ ─────────────────────────────────── │
│ [  📞 Call Buyer  ] [ 💬 WhatsApp ] │
│ [ ✓ Mark Fulfilled ] [Flag Manual] │
└─────────────────────────────────────┘
```

- Drawer background: `--bg-elevated`
- Section labels: `--font-body`, 11px, `--text-muted`, uppercase
- M-Pesa trace: `--font-body`, 13px, `--text-secondary`, monospace block with subtle border
- "Mark Fulfilled" button: full width, `--brand-primary` background, dark text
- "Flag Manual" button: outlined, `--status-review` border

**Props:**
```typescript
interface OrderCardProps {
  id: string;
  tiktok_handle: string;
  item_name: string;
  quantity: number;
  amount: number;
  phone: string;
  location: string;
  status: 'VERIFIED' | 'FRAUD' | 'REVIEW' | 'PENDING';
  mpesa_trace: string | null;
  created_at: string;
  seller_id: string;
}
```

---

### 2.2 `<LiveTicker />`
The scrolling feed container. Newest orders appear at the top.

- Background: `--bg-base`
- No pagination — all orders for the active session are loaded
- Empty state: centered text "Waiting for orders..." with a subtle pulsing dot
- New card entrance: slides down from top, 200ms ease-out
- Pull-to-refresh: disabled — Realtime handles updates

---

### 2.3 `<SessionHeader />`
Sticky header at the top of the live feed screen.

```
┌─────────────────────────────────────┐
│ DukaLive          🔴 LIVE  [End]    │
│ Session #12 · 14 orders · Ksh 42,000│
└─────────────────────────────────────┘
```

- "DukaLive": `--font-display`, 700, `--brand-primary`
- LIVE badge: red pulsing dot + "LIVE" text, only shown when session is active
- End button: outlined, `--status-fraud` color — opens confirmation modal
- Stats row: `--font-body`, 12px, `--text-secondary` — updates in real time
- Seller role only: stats row visible. Handyman role: stats row hidden.

---

### 2.4 `<HapticEngine />`
Not a visual component — a React hook `useHaptics()`.

```typescript
// Usage
const { pulse, alert } = useHaptics();
pulse();  // double pulse — new verified order
alert();  // long continuous — fraud detected

// Implementation
const pulse = () => navigator.vibrate([100, 50, 100]);
const alert = () => navigator.vibrate(600);
```

Called automatically by the Realtime subscription handler when new orders arrive.

---

### 2.5 `<SessionSummary />` — Seller only
Displayed after a session is ended. Replaces the live feed.

**Sections:**
1. **Revenue Block** — total confirmed revenue, large display type
2. **Stats Row** — total orders / verified / flagged / pending
3. **AOV** — Average Order Value = confirmed revenue ÷ paid orders count
4. **Bestseller Chart** — horizontal bar chart, items ranked by quantity sold (use Recharts)
5. **Fraud Interception** — count of flagged orders with percentage
6. **Order Log** — scrollable list of all orders with final status (for records/conflict resolution)
7. **Export Button** — downloads session data as CSV (seller only)

---

### 2.6 `<LoginScreen />`
Single screen for all users.

```
┌─────────────────────────────────────┐
│                                     │
│         DukaLive                    │
│    Order Management System          │
│                                     │
│  [Email input                    ]  │
│  [Password input                 ]  │
│                                     │
│  [      Sign In      ]              │
│                                     │
│  Forgot password?                   │
└─────────────────────────────────────┘
```

- No "Sign Up" on this screen — accounts are created by the seller (admin) for their Handyman
- After login: check `user.role` from Supabase → redirect accordingly
- Seller → `/dashboard/live`
- Handyman → `/dashboard/live`

---

### 2.7 `<SettingsScreen />` — Seller only
Four sections:

1. **Shop Profile** — shop name, seller TikTok handle, M-Pesa number
2. **Handyman Management** — invite handyman by email, revoke access
3. **SMS Forwarder Setup** — step-by-step guide with the seller's unique webhook URL displayed (copyable), and battery optimization instructions for common Android brands (Tecno, Infinix, Samsung)
4. **Session History** — list of past sessions, tap to view SessionSummary for any

---

### 2.8 `<ConfirmModal />`
Reusable modal for destructive actions (end session, flag order, revoke handyman).

- Backdrop: black 60% opacity
- Card: `--bg-elevated`, `--radius-lg`
- Two buttons: Confirm (destructive color) + Cancel

---

## 3. Screen Specifications

### 3.1 Login Screen `/login`
**Route:** `/login`  
**Access:** Public (unauthenticated only — redirect to `/dashboard/live` if already logged in)  
**Components:** `<LoginScreen />`  

---

### 3.2 Live Feed `/dashboard/live`
**Route:** `/dashboard/live`  
**Access:** Seller + Handyman  
**Components:** `<SessionHeader />`, `<LiveTicker />`, `<OrderCard />`  

**Page states:**
- `NO_ACTIVE_SESSION` — Seller sees "Start New Session" button. Handyman sees "No active session — contact your seller."
- `ACTIVE_SESSION` — Full live feed with realtime updates
- `SESSION_ENDED` — Seller is redirected to `/dashboard/session/:id`. Handyman sees "Session ended."

**Realtime behavior:**
- On mount: subscribe to Supabase Realtime on `orders` table filtered by `session_id = activeSession.id`
- On new INSERT: prepend card to feed + trigger haptics based on status
- On UPDATE (status change): update existing card in place with pulse animation
- On unmount: unsubscribe

**Seller-only UI elements on this screen:**
- Stats row in `<SessionHeader />`
- "End Session" button in `<SessionHeader />`

---

### 3.3 Session Summary `/dashboard/session/:id`
**Route:** `/dashboard/session/:id`  
**Access:** Seller only  
**Components:** `<SessionSummary />`  
**Data:** Fetched once on mount from `/api/sessions/:id` — no realtime needed

---

### 3.4 Settings `/dashboard/settings`
**Route:** `/dashboard/settings`  
**Access:** Seller only  
**Components:** `<SettingsScreen />`  

---

## 4. Navigation Structure

### Seller nav (bottom tab bar):
```
[ 🔴 Live ] [ 📊 Sessions ] [ ⚙ Settings ]
```

### Handyman nav (bottom tab bar):
```
[ 🔴 Live ]
```
(Single tab — no access to sessions or settings)

Bottom tab bar: fixed, `--bg-surface`, top border `--border-subtle`. Active tab uses `--brand-primary`.

---

## 5. PWA Configuration

```json
// manifest.json
{
  "name": "DukaLive",
  "short_name": "DukaLive",
  "theme_color": "#0A0A0A",
  "background_color": "#0A0A0A",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/dashboard/live"
}
```

- Service worker: cache app shell only. Do NOT cache order data — always fresh.
- Install prompt: show after 2nd login, not on first visit.

---

## 6. State Management

Use **React Context + useReducer** for global state. No Redux — overkill for this app.

### Global state shape:
```typescript
interface AppState {
  user: {
    id: string;
    email: string;
    role: 'seller' | 'handyman';
    shop_name: string;
  } | null;
  activeSession: {
    id: string;
    started_at: string;
    order_count: number;
    verified_revenue: number;
  } | null;
  orders: OrderCardProps[];
}
```

---

## 7. Key Technical Constraints

1. **No localStorage** — Supabase Auth handles session persistence via its own mechanism
2. **No polling** — all order updates via Supabase Realtime WebSocket only
3. **Haptics are best-effort** — always check `navigator.vibrate` exists before calling
4. **Deep links** — `tel:` and `wa.me` links must include country code: `+254`
5. **WhatsApp pre-fill message:** `"Hi, I placed an order on DukaLive. Please confirm delivery details."`
6. **All amounts** displayed as `Ksh {amount.toLocaleString()}` — never raw integers
7. **Phone numbers** stored with country code in DB (`+2547XXXXXXXX`), displayed formatted (`0712 345 678`)

---

## 8. File Structure

```
src/
├── components/
│   ├── OrderCard/
│   │   ├── OrderCard.tsx
│   │   └── OrderDrawer.tsx
│   ├── LiveTicker.tsx
│   ├── SessionHeader.tsx
│   ├── SessionSummary.tsx
│   ├── LoginScreen.tsx
│   ├── SettingsScreen.tsx
│   └── ConfirmModal.tsx
├── hooks/
│   ├── useHaptics.ts
│   ├── useRealtime.ts
│   └── useSession.ts
├── context/
│   └── AppContext.tsx
├── pages/
│   ├── Login.tsx
│   ├── LiveFeed.tsx
│   ├── SessionDetail.tsx
│   └── Settings.tsx
├── lib/
│   └── supabase.ts
├── types/
│   └── index.ts
└── App.tsx
```

---

*End of Frontend Specification v2.0*
