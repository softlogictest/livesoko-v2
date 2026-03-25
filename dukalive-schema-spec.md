# DukaLive — Database Schema Specification
**Version:** 2.0  
**Database:** PostgreSQL via Supabase  
**Auth:** Supabase Auth (built-in `auth.users` table)  

---

## Design Principles

1. **Every table has `id` as a UUID primary key** — never use integers as public identifiers
2. **Every table has `created_at`** — automatically set by Supabase
3. **Soft deletes where data has financial significance** — use `deleted_at` instead of DELETE
4. **Row Level Security (RLS) on every table** — sellers never see each other's data
5. **`seller_id` foreign key on every operational table** — the anchor for all RLS policies
6. **No orphaned records** — all foreign keys have ON DELETE CASCADE or RESTRICT as appropriate

---

## Tables

---

### 1. `profiles`
Extends Supabase's built-in `auth.users`. Created automatically when a user signs up or is invited.

```sql
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('seller', 'handyman')),
  shop_name       TEXT,                          -- Seller only, NULL for handyman
  tiktok_handle   TEXT,                          -- Seller's TikTok handle e.g. "@dukanyangu"
  mpesa_number    TEXT,                          -- Seller's M-Pesa number e.g. "+254712345678"
  seller_id       UUID REFERENCES profiles(id),  -- For handyman: points to their seller. NULL if seller.
  webhook_token   TEXT UNIQUE,                   -- Unique token for SMS forwarder URL e.g. "tok_abc123"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- A seller's `seller_id` is NULL — they are the root account
- A handyman's `seller_id` points to the seller who invited them
- `webhook_token` is generated on seller account creation — used to build their unique SMS endpoint URL: `POST /api/sms/{webhook_token}`
- `shop_name` and `tiktok_handle` power the buyer-facing Google Form header
- `mpesa_number` is what the SMS forwarder is listening for payments to

**RLS Policies:**
- Users can read and update their own profile only
- Sellers can read profiles where `seller_id = auth.uid()` (to see their handymen)

---

### 2. `sessions`
Each TikTok Live broadcast is one session. Orders belong to a session.

```sql
CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT,                          -- Optional e.g. "Friday Bags Live"
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,                   -- NULL while session is active
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- Only one session per seller can have `status = 'active'` at a time — enforced at application level in the backend, not DB constraint (to avoid complexity)
- When `status` is set to `'ended'`, `ended_at` is written simultaneously
- The SessionSummary screen queries aggregate data from `orders` WHERE `session_id = id`
- Past sessions are accessed via `status = 'ended'` for the session history list

**RLS Policies:**
- Sellers can CRUD their own sessions (`seller_id = auth.uid()`)
- Handymen can SELECT sessions where `seller_id = (their seller_id from profiles)`

---

### 3. `orders`
The core table. Every buyer submission creates one order row.

```sql
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seller_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Buyer information (from Google Form)
  buyer_name        TEXT NOT NULL,               -- Full name as typed by buyer
  buyer_tiktok      TEXT NOT NULL,               -- TikTok handle e.g. "@leon"
  buyer_phone       TEXT NOT NULL,               -- With country code e.g. "+254712345678"
  delivery_location TEXT NOT NULL,               -- Free text from buyer
  coordinates       TEXT,                        -- "lat,lng" — nullable, added manually or future auto

  -- Order details (from Google Form)
  item_name         TEXT NOT NULL,               -- Free text as announced on TikTok Live
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price        NUMERIC(10,2) NOT NULL,       -- Set by seller, not buyer
  expected_amount   NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- M-Pesa verification (populated by SMS forwarder)
  mpesa_sender_name TEXT,                        -- Name from M-Pesa SMS e.g. "JOHN KAMAU"
  mpesa_amount      NUMERIC(10,2),               -- Amount extracted from SMS
  mpesa_tx_code     TEXT UNIQUE,                 -- 10-digit transaction code — UNIQUE prevents duplicates
  mpesa_raw_sms     TEXT,                        -- Full raw SMS text for audit/manual review
  mpesa_received_at TIMESTAMPTZ,                 -- Timestamp from SMS

  -- Status
  status            TEXT NOT NULL DEFAULT 'PENDING' CHECK (
                      status IN ('PENDING', 'VERIFIED', 'FRAUD', 'REVIEW', 'FULFILLED')
                    ),
  status_reason     TEXT,                        -- Why it was flagged e.g. "Amount mismatch: expected 500, got 450"

  -- Fulfillment
  fulfilled_at      TIMESTAMPTZ,                 -- When handyman marked as fulfilled
  fulfilled_by      UUID REFERENCES profiles(id),-- Which handyman fulfilled it

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- `expected_amount` is a **generated column** — automatically calculated from `quantity * unit_price`. It cannot be manually set. This prevents the backend from ever using wrong math.
- `mpesa_tx_code` has a `UNIQUE` constraint — if the same transaction code is submitted twice, Postgres rejects the second insert at the database level. This is the idempotency guarantee.
- `unit_price` is set by the backend when the order is created — it comes from the seller's current price for that item (manually specified in the form config, not from a catalog yet)
- `status_reason` gives the Handyman context on REVIEW and FRAUD cards without needing to read the raw SMS
- `coordinates` stores `"lat,lng"` as text for simplicity — e.g. `"-1.2921,36.8219"`. Frontend generates a Google Maps deep link: `https://maps.google.com/?q={coordinates}`

**Order Lifecycle:**
```
Form submitted → PENDING
SMS matched, amount correct → VERIFIED
SMS matched, amount wrong → REVIEW (status_reason explains discrepancy)
Duplicate TX code → FRAUD
No SMS match after session ends → stays PENDING (seller reviews)
Handyman taps "Mark Fulfilled" → FULFILLED (fulfilled_at + fulfilled_by written)
```

**RLS Policies:**
- Sellers can CRUD orders where `seller_id = auth.uid()`
- Handymen can SELECT and UPDATE (status only) orders where `seller_id = (their seller_id)`
- Handymen cannot DELETE orders
- No user can update `mpesa_tx_code` after it is set (enforced in backend, not DB)

---

### 4. `sms_logs`
Every raw SMS forwarded to the endpoint is logged here before matching. Audit trail.

```sql
CREATE TABLE sms_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  raw_body        TEXT NOT NULL,                 -- Full raw SMS as received
  sender_number   TEXT,                          -- Phone number that sent the SMS (Safaricom shortcode)
  matched_order_id UUID REFERENCES orders(id),   -- NULL if no match was found
  match_status    TEXT NOT NULL CHECK (
                    match_status IN ('MATCHED', 'UNMATCHED', 'DUPLICATE', 'PARSE_ERROR')
                  ),
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Notes:**
- Every SMS is logged regardless of whether it matches an order
- `match_status = 'UNMATCHED'` means the amount didn't correspond to any pending order — could be a tip, wrong number, or payment from a previous session
- `match_status = 'DUPLICATE'` means the TX code already exists in `orders.mpesa_tx_code`
- `match_status = 'PARSE_ERROR'` means the regex couldn't extract amount/TX code — SMS format was unexpected
- This table is the backend's debugging tool — when a seller says "I got paid but the order didn't verify", you check here first

**RLS Policies:**
- Sellers can SELECT their own logs (`seller_id = auth.uid()`)
- Handymen have no access to this table

---

## Indexes

```sql
-- Orders: most common query is "all orders for this session"
CREATE INDEX idx_orders_session_id ON orders(session_id);

-- Orders: seller dashboard needs all orders by seller
CREATE INDEX idx_orders_seller_id ON orders(seller_id);

-- Orders: status filtering for live feed
CREATE INDEX idx_orders_status ON orders(status);

-- Sessions: active session lookup
CREATE INDEX idx_sessions_seller_status ON sessions(seller_id, status);

-- SMS logs: debugging by seller
CREATE INDEX idx_sms_logs_seller_id ON sms_logs(seller_id);

-- Profiles: handyman → seller lookup
CREATE INDEX idx_profiles_seller_id ON profiles(seller_id);
```

---

## Row Level Security — Summary

Enable RLS on all tables:
```sql
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs  ENABLE ROW LEVEL SECURITY;
```

Core policy pattern — seller sees only their data:
```sql
-- Example for orders table
CREATE POLICY "Sellers see own orders"
  ON orders FOR ALL
  USING (seller_id = auth.uid());

CREATE POLICY "Handymen see their seller's orders"
  ON orders FOR SELECT
  USING (
    seller_id = (
      SELECT seller_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Handymen can update order status only"
  ON orders FOR UPDATE
  USING (
    seller_id = (
      SELECT seller_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    seller_id = (
      SELECT seller_id FROM profiles WHERE id = auth.uid()
    )
  );
```

---

## Supabase Realtime Configuration

Enable Realtime on the `orders` table only:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

The dashboard subscribes filtered by `session_id`:
```javascript
supabase
  .channel('orders')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
    filter: `session_id=eq.${activeSession.id}`
  }, handleOrderChange)
  .subscribe();
```

---

## Future-Proofing Notes

These columns/tables are NOT in the MVP but the schema is designed to accommodate them without migration pain:

1. **Product catalog** — add a `products` table with `(id, seller_id, name, price, sku)`. Add `product_id UUID REFERENCES products(id)` as a nullable column on `orders`. Existing free-text orders are unaffected.
2. **Delivery zones** — add a `delivery_zones` table with `(id, seller_id, name, coordinates_polygon)`. Add `zone_id` nullable FK on `orders`.
3. **Multiple handymen per seller** — already supported. `profiles.seller_id` is a FK to profiles, so a seller can have unlimited handymen.
4. **Multi-session analytics** — `sessions` table already stores `seller_id` and timestamps. Cross-session queries are straightforward aggregations.

---

*End of Database Schema Specification v2.0*
