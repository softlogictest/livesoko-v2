# DukaLive — API Specification
**Version:** 2.0  
**Runtime:** Node.js + Express on Railway  
**Database:** Supabase (Postgres)  
**Auth:** Supabase JWT — all protected routes require `Authorization: Bearer {token}` header  

---

## Base URL
```
Production: https://dukalive-api.railway.app
Development: http://localhost:3000
```

---

## Auth Middleware
Every protected route runs this middleware first:
```javascript
// Verifies Supabase JWT and attaches user + role to req
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  req.user = { ...user, ...profile };
  next();
};

// Role guard — use after authenticate
const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
  next();
};
```

---

## Endpoints

---

### AUTH

#### `POST /api/auth/login`
Handled entirely by Supabase Auth client-side. Express does not need a login endpoint. The React app calls `supabase.auth.signInWithPassword()` directly.

#### `POST /api/auth/invite-handyman`
Invite a handyman by email. Creates a Supabase auth user with role = handyman.

**Access:** Seller only  
**Body:**
```json
{
  "email": "handyman@example.com"
}
```
**Response `201`:**
```json
{
  "message": "Invitation sent to handyman@example.com"
}
```
**Logic:**
1. Call `supabase.auth.admin.inviteUserByEmail(email)`
2. Create a `profiles` row: `{ id: newUser.id, role: 'handyman', seller_id: req.user.id }`

---

### SESSIONS

#### `POST /api/sessions`
Start a new live session.

**Access:** Seller only  
**Body:**
```json
{
  "title": "Friday Bags Live"
}
```
**Response `201`:**
```json
{
  "id": "uuid",
  "seller_id": "uuid",
  "title": "Friday Bags Live",
  "status": "active",
  "started_at": "2026-03-23T14:00:00Z"
}
```
**Logic:**
1. Check no existing session has `status = 'active'` for this seller — return `409` if so
2. Insert into `sessions`
3. Return new session

---

#### `PATCH /api/sessions/:id/end`
End the active session.

**Access:** Seller only  
**Body:** none  
**Response `200`:**
```json
{
  "id": "uuid",
  "status": "ended",
  "ended_at": "2026-03-23T16:30:00Z"
}
```
**Logic:**
1. Verify session belongs to `req.user.id`
2. Update `status = 'ended'`, `ended_at = NOW()`
3. Any orders still `PENDING` remain as-is for manual review

---

#### `GET /api/sessions`
List all past sessions for the seller.

**Access:** Seller only  
**Query params:** `?limit=20&offset=0`  
**Response `200`:**
```json
[
  {
    "id": "uuid",
    "title": "Friday Bags Live",
    "status": "ended",
    "started_at": "2026-03-23T14:00:00Z",
    "ended_at": "2026-03-23T16:30:00Z",
    "order_count": 24,
    "verified_revenue": 42000
  }
]
```
**Logic:** JOIN sessions with aggregate counts from orders

---

#### `GET /api/sessions/:id/summary`
Full post-live analytics for one session.

**Access:** Seller only  
**Response `200`:**
```json
{
  "id": "uuid",
  "title": "Friday Bags Live",
  "started_at": "2026-03-23T14:00:00Z",
  "ended_at": "2026-03-23T16:30:00Z",
  "stats": {
    "total_orders": 24,
    "verified": 19,
    "fraud": 2,
    "review": 1,
    "pending": 2,
    "fulfilled": 15,
    "confirmed_revenue": 42000,
    "average_order_value": 2210.53,
    "fraud_interception_rate": 0.083
  },
  "bestsellers": [
    { "item_name": "Terinkin Bag Black", "quantity_sold": 8, "revenue": 16000 },
    { "item_name": "Terinkin Bag Brown", "quantity_sold": 6, "revenue": 12000 }
  ],
  "orders": [ /* full order objects array */ ]
}
```

---

### ORDERS

#### `POST /api/orders`
Create a new order from Google Form submission.

**Access:** Public (no auth) — secured by `seller_webhook_token` in body  
**Body:**
```json
{
  "webhook_token": "tok_abc123",
  "buyer_name": "John Kamau",
  "buyer_tiktok": "@johnkamau",
  "buyer_phone": "0712345678",
  "delivery_location": "CBD, Nairobi",
  "item_name": "Terinkin Bag Black",
  "quantity": 2,
  "unit_price": 2000
}
```
**Response `201`:**
```json
{
  "id": "uuid",
  "status": "PENDING",
  "expected_amount": 4000,
  "message": "Order received. Please complete M-Pesa payment of Ksh 4,000."
}
```
**Logic:**
1. Look up seller by `webhook_token` — return `404` if not found
2. Find seller's active session — return `400` if no active session
3. Normalize `buyer_phone` to `+254` format
4. Insert order with `status = 'PENDING'`
5. Supabase Realtime automatically notifies dashboard via WebSocket

---

#### `GET /api/orders`
Get all orders for the active session (used on initial dashboard load).

**Access:** Seller + Handyman  
**Query params:** `?session_id=uuid`  
**Response `200`:**
```json
[
  {
    "id": "uuid",
    "buyer_name": "John Kamau",
    "buyer_tiktok": "@johnkamau",
    "buyer_phone": "+254712345678",
    "delivery_location": "CBD, Nairobi",
    "coordinates": null,
    "item_name": "Terinkin Bag Black",
    "quantity": 2,
    "unit_price": 2000,
    "expected_amount": 4000,
    "mpesa_sender_name": "JOHN KAMAU",
    "mpesa_amount": 4000,
    "mpesa_tx_code": "RGH7X2K9PQ",
    "mpesa_raw_sms": "RGH7X2K9PQ Confirmed...",
    "status": "VERIFIED",
    "status_reason": null,
    "fulfilled_at": null,
    "fulfilled_by": null,
    "created_at": "2026-03-23T14:05:00Z"
  }
]
```

---

#### `PATCH /api/orders/:id/fulfill`
Mark an order as fulfilled.

**Access:** Seller + Handyman  
**Body:** none  
**Response `200`:**
```json
{
  "id": "uuid",
  "status": "FULFILLED",
  "fulfilled_at": "2026-03-23T15:22:00Z",
  "fulfilled_by": "uuid"
}
```
**Logic:**
1. Verify order belongs to req.user's seller scope
2. Check current status is `VERIFIED` — cannot fulfill PENDING/FRAUD/REVIEW
3. Update `status = 'FULFILLED'`, `fulfilled_at = NOW()`, `fulfilled_by = req.user.id`

---

#### `PATCH /api/orders/:id/flag`
Manually flag an order for review.

**Access:** Seller + Handyman  
**Body:**
```json
{
  "reason": "Buyer confirmed payment but SMS not received yet"
}
```
**Response `200`:**
```json
{
  "id": "uuid",
  "status": "REVIEW",
  "status_reason": "Buyer confirmed payment but SMS not received yet"
}
```

---

### SMS FORWARDER

#### `POST /api/sms/:webhook_token`
Receives forwarded M-Pesa SMS from the seller's phone.

**Access:** Public — secured by `webhook_token` URL param  
**Body:**
```json
{
  "message": "RGH7X2K9PQ Confirmed. Ksh2,000.00 received from JOHN KAMAU 0712345678 on 23/3/26 at 2:05 PM. New M-PESA balance is Ksh5,432.00. Transaction cost, Ksh0.00."
}
```
**Response `200`:**
```json
{
  "match_status": "MATCHED",
  "order_id": "uuid"
}
```

**Logic (the matching engine):**
```
1. Look up seller by webhook_token — 404 if not found
2. Log raw SMS to sms_logs immediately (always, before any processing)
3. Parse SMS:
   a. Extract TX_CODE — regex: /[A-Z0-9]{10}/
   b. Extract Amount — regex: /Ksh([\d,]+\.?\d*)/  → strip commas → parseFloat
   c. Extract Sender Name — regex: /received from ([A-Z ]+) \d{10}/
   d. Extract Date — regex: /(\d{1,2})\/(\d{1,2})\/(\d{2})/
4. If parse fails → log match_status = 'PARSE_ERROR' → return 200 (don't crash)
5. Check TX_CODE uniqueness in orders table:
   → If exists → log 'DUPLICATE' → update order status to FRAUD → return 200
6. Find seller's active session
   → If no active session → log 'UNMATCHED' → return 200
7. Find PENDING orders where expected_amount = parsed_amount AND session_id = active session
   a. Zero matches → log 'UNMATCHED' → return 200
   b. One match → proceed to verify (step 8)
   c. Multiple matches → pick most recent created_at, flag others as REVIEW
8. Verify date: extracted day/month must match TODAY in EAT (UTC+3)
   → Date mismatch → status = FRAUD, reason = "Payment date mismatch"
9. Update matched order:
   - mpesa_tx_code, mpesa_amount, mpesa_sender_name, mpesa_raw_sms, mpesa_received_at
   - status = VERIFIED
   - status_reason = null
10. Update sms_log: matched_order_id, match_status = MATCHED
11. Supabase Realtime pushes update to dashboard automatically
```

---

### SETTINGS

#### `GET /api/settings`
Get seller's profile and settings.

**Access:** Seller only  
**Response `200`:**
```json
{
  "id": "uuid",
  "shop_name": "Terinkin Collections",
  "tiktok_handle": "@terinkin",
  "mpesa_number": "+254712345678",
  "webhook_token": "tok_abc123",
  "webhook_url": "https://dukalive-api.railway.app/api/sms/tok_abc123",
  "handymen": [
    {
      "id": "uuid",
      "email": "handyman@example.com",
      "created_at": "2026-03-01T10:00:00Z"
    }
  ]
}
```

---

#### `PATCH /api/settings`
Update seller profile.

**Access:** Seller only  
**Body:**
```json
{
  "shop_name": "Terinkin Collections",
  "tiktok_handle": "@terinkin",
  "mpesa_number": "+254712345678"
}
```
**Response `200`:** Updated profile object

---

#### `DELETE /api/settings/handymen/:id`
Revoke a handyman's access.

**Access:** Seller only  
**Response `200`:**
```json
{ "message": "Handyman access revoked" }
```
**Logic:**
1. Verify handyman's `seller_id = req.user.id`
2. Delete from `profiles` → cascades to Supabase auth user

---

## Error Response Format
All errors return this shape:
```json
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

Common codes:
```
UNAUTHORIZED        — No token or invalid token
FORBIDDEN           — Valid token but wrong role
NOT_FOUND           — Resource doesn't exist or doesn't belong to user
CONFLICT            — e.g. active session already exists
VALIDATION_ERROR    — Missing or invalid request body fields
PARSE_ERROR         — SMS could not be parsed
```

---

## Google Form → API Bridge

Since Google Forms has no native webhook, a minimal Apps Script is attached to the form. Its only job is to forward the submission to the Express API. It does zero logic.

```javascript
// Google Apps Script — attached to the seller's Google Form
// This is the ONLY Apps Script in the entire system
function onFormSubmit(e) {
  const response = e.namedValues;
  const payload = {
    webhook_token: "tok_abc123", // hardcoded per seller's form
    buyer_name: response["Full Name"][0],
    buyer_tiktok: response["TikTok Handle"][0],
    buyer_phone: response["Phone Number"][0],
    delivery_location: response["Delivery Location"][0],
    item_name: response["Item Name"][0],
    quantity: parseInt(response["Quantity"][0]),
    unit_price: parseFloat(response["Unit Price"][0])
  };
  UrlFetchApp.fetch("https://dukalive-api.railway.app/api/orders", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}
```

**Notes:**
- Each seller has their own Google Form with their own `webhook_token` hardcoded
- The `unit_price` field is hidden in the form — pre-filled by the seller when they set up the form
- If Apps Script fails, the order is simply not created — no cascading failure in the backend

---

## SMS Forwarder Setup (Android)

Recommended app: **SMS Forwarder** (open source, available on F-Droid and Play Store)

Seller configuration:
1. Install SMS Forwarder on the Android phone that receives M-Pesa SMS
2. Set forward rule: **Filter** = "M-PESA" (matches all Safaricom M-Pesa messages)
3. **Forward to URL:** `https://dukalive-api.railway.app/api/sms/{seller_webhook_token}`
4. **Method:** POST
5. **Body template:** `{"message": "%sms_body%"}`
6. **Battery optimization:** Disable battery optimization for SMS Forwarder in Android settings
7. Test by sending a dummy M-Pesa payment and checking the dashboard

---

## Environment Variables (Railway)

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Service role — has admin access, never expose to frontend
PORT=3000
NODE_ENV=production
EAT_OFFSET=3                        # East Africa Time = UTC+3
```

---

*End of API Specification v2.0*
