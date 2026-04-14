# LiveSoko: API Reference 📡

All endpoints for the LiveSoko backend. Base URL: `http://localhost:3000` (dev) or your Railway domain (prod).

## Authentication

All protected routes require a `Authorization: Bearer <token>` header. Tokens are obtained from the login or register endpoints and expire after 7 days (auto-renewed if active within 24h of expiry).

---

## Auth Routes (`/api/auth`)

### `POST /api/auth/register`
Create a new seller account.

| Field | Type | Required | Rules |
|---|---|---|---|
| email | string | ✅ | Valid email |
| password | string | ✅ | 8+ chars, upper + lower + number + special (@$!%*?&) |
| shop_name | string | ✅ | Max 50 chars |

**Rate Limit**: 3 per hour.
**Response**: `{ token, user: { id, email, role, shop_name } }`

---

### `POST /api/auth/login`
Log in to an existing account.

| Field | Type | Required |
|---|---|---|
| email | string | ✅ |
| password | string | ✅ |

**Rate Limit**: 5 per 15 minutes.
**Response**: `{ token, user: { id, email, role, shop_name, ... } }`

---

### `POST /api/auth/change-password`
Change the current user's password. 🔒 Requires `Authorization` header.

| Field | Type | Required | Rules |
|---|---|---|---|
| new_password | string | ✅ | Same complexity rules as register |

---

### `POST /api/auth/logout`
Revoke the current session token. 🔒 Requires `Authorization` header.

---

## Orders Routes (`/api/orders`) 🔒 Protected

### `GET /api/orders`
List orders for the authenticated seller's shop.

| Query Param | Type | Optional | Description |
|---|---|---|---|
| session_id | string | ✅ | Filter by session |
| status | string | ✅ | Filter by status (PENDING, VERIFIED, etc.) |

---

### `POST /api/orders`
Create a new order. Can be called with auth token (manual entry) OR `webhook_token` in body (Google Form intake).

| Field | Type | Required | Notes |
|---|---|---|---|
| buyer_name | string | ✅ | |
| buyer_phone | string | ✅ | Auto-normalized to +254... |
| item_name | string | ✅ | |
| quantity | integer | ✅ | Min 1 |
| unit_price | number | ✅ | Min 0 |
| buyer_tiktok | string | ❌ | Defaults to @unknown |
| delivery_location | string | ❌ | Defaults to "Not specified" |
| payment_type | string | ❌ | "MPESA" (default) or "COD" |
| buyer_mpesa_name | string | ❌ | Expected MPESA sender name |
| webhook_token | string | ❌ | For unauthenticated form intake |

**Response**: `201` with the created order object.

---

### `PATCH /api/orders/:id`
Update order details (buyer info, item, price).

### `PATCH /api/orders/:id/fulfill`
Mark order as FULFILLED. Only works on VERIFIED or COD_PENDING orders.

### `PATCH /api/orders/:id/flag`
Flag order as FRAUD or REVIEW.

| Field | Type | Required |
|---|---|---|
| status | string | ✅ ("REVIEW" or "FRAUD") |
| reason | string | ❌ |

### `PATCH /api/orders/:id/unflag`
Restore a flagged order back to PENDING.

### `POST /api/orders/:id/verify`
Manually mark an order as VERIFIED.

### `DELETE /api/orders/:id`
Permanently delete an order.

---

## Sessions Routes (`/api/sessions`) 🔒 Protected

### `POST /api/sessions`
Start a new live selling session. Only one active session allowed per seller.

| Field | Type | Required |
|---|---|---|
| title | string | ❌ (max 100 chars) |

### `GET /api/sessions`
List all sessions with aggregated order count and revenue.

### `PATCH /api/sessions/:id/end`
End an active session.

### `GET /api/sessions/:id/summary`
Detailed analytics for a session: order breakdown, bestsellers, revenue, fraud rate.

---

## Settings Routes (`/api/settings`) 🔒 Protected

### `GET /api/settings`
Get seller profile and list of handymen.

### `PATCH /api/settings`
Update shop settings.

| Field | Type | Rules |
|---|---|---|
| shop_name | string | Max 50 chars |
| tiktok_handle | string | Max 30 chars |
| mpesa_number | string | Max 15 chars |
| sheet_url | string | Must be valid URL |

### `POST /api/settings/handymen`
Create a handyman (staff) account. 🔒 Seller role only.

| Field | Type | Required | Rules |
|---|---|---|---|
| email | string | ✅ | Valid email |
| password | string | ✅ | 8+ chars |

---

## SMS Routes (`/api/sms`) — Public (webhook-token authenticated)

### `POST /api/sms/:webhook_token`
Receive an MPESA SMS from SMS Forwarder. Auto-matches to pending orders.

| Field | Type | Required |
|---|---|---|
| message | string | ✅ (raw SMS text) |
| sender_number | string | ❌ |

**Rate Limit**: 200 per 15 minutes.
**Matching Logic**:
1. Parse SMS for amount, TX code, sender name.
2. Check for duplicate TX code (UNIQUE constraint).
3. Find PENDING orders within ±Ksh 50 of the parsed amount.
4. Auto-verify the closest match. Flag others as REVIEW if multiple matches.

---

## SSE Events (`/api/events`) — Public (token-query authenticated)

### `GET /api/events?token=<auth_token>`
Opens a Server-Sent Events stream for real-time order updates.

**Events emitted**:
| Event | Payload | Trigger |
|---|---|---|
| `connected` | `{ status: "ok" }` | On connection |
| `order:new` | Full order object | New order created |
| `order:updated` | Full order object | Order status changed |
| `order:deleted` | `{ id }` | Order removed |

---

## Health Check

### `GET /api/health`
Returns `{ status: "ok", name: "LiveSoko v2.2.0", mode: "local" }`
