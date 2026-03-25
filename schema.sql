-- DukaLive v2.0 schema
-- Use this script in the Supabase SQL Editor to set up your tables.

-- --------------------------------------------------------------------------------------
-- 0. Clean up (Optional: Uncomment if you want to wipe existing data for a fresh start)
-- --------------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS sms_logs CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Ensure we can use UUID and Crypto generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------------------------
-- 1. profiles
-- Extends Supabase's built-in auth.users. Created automatically when a user signs up.
-- --------------------------------------------------------------------------------------
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

-- --------------------------------------------------------------------------------------
-- 2. sessions
-- Each TikTok Live broadcast is one session. Orders belong to a session.
-- --------------------------------------------------------------------------------------
CREATE TABLE sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT,                          -- Optional e.g. "Friday Bags Live"
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,                   -- NULL while session is active
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------------------
-- 3. orders
-- The core table. Every buyer submission creates one order row.
-- --------------------------------------------------------------------------------------
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seller_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Buyer information (from Google Form)
  buyer_name        TEXT NOT NULL,               -- Full name as typed by buyer
  buyer_tiktok      TEXT NOT NULL,               -- TikTok handle e.g. "@leon"
  buyer_phone       TEXT NOT NULL,               -- With country code e.g. "+254712345678"
  delivery_location TEXT NOT NULL,               -- Free text from buyer
  coordinates       TEXT,                        -- "lat,lng" -- nullable, added manually or future auto

  -- Order details (from Google Form)
  item_name         TEXT NOT NULL,               -- Free text as announced on TikTok Live
  quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price        NUMERIC(10,2) NOT NULL,       -- Set by seller, not buyer
  expected_amount   NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- M-Pesa verification (populated by SMS forwarder)
  mpesa_sender_name TEXT,                        -- Name from M-Pesa SMS e.g. "JOHN KAMAU"
  mpesa_amount      NUMERIC(10,2),               -- Amount extracted from SMS
  mpesa_tx_code     TEXT UNIQUE,                 -- 10-digit transaction code -- UNIQUE prevents duplicates
  mpesa_raw_sms     TEXT,                        -- Full raw SMS text for audit/manual review
  mpesa_received_at TIMESTAMPTZ,                 -- Timestamp from SMS

  -- Status
  status            TEXT NOT NULL DEFAULT 'PENDING' CHECK (
                      status IN ('PENDING', 'VERIFIED', 'FRAUD', 'REVIEW', 'FULFILLED')
                    ),
  status_reason     TEXT,                        -- Why it was flagged
  
  -- Fulfillment
  fulfilled_at      TIMESTAMPTZ,                 -- When handyman marked as fulfilled
  fulfilled_by      UUID REFERENCES profiles(id),-- Which handyman fulfilled it

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------------------------------------
-- 4. sms_logs
-- Every raw SMS forwarded to the endpoint is logged here before matching.
-- --------------------------------------------------------------------------------------
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

-- --------------------------------------------------------------------------------------
-- 5. Indexes
-- --------------------------------------------------------------------------------------
CREATE INDEX idx_orders_session_id ON orders(session_id);
CREATE INDEX idx_orders_seller_id ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_sessions_seller_status ON sessions(seller_id, status);
CREATE INDEX idx_sms_logs_seller_id ON sms_logs(seller_id);
CREATE INDEX idx_profiles_seller_id ON profiles(seller_id);

-- --------------------------------------------------------------------------------------
-- 6. Row Level Security Enable
-- --------------------------------------------------------------------------------------
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs  ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------------------
-- 7. RLS Policies for Profiles
-- --------------------------------------------------------------------------------------
CREATE POLICY "Users can read their own profile" 
ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Sellers can see their own handymen" 
ON profiles FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Sellers can create handymen" 
ON profiles FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can delete handymen" 
ON profiles FOR DELETE USING (seller_id = auth.uid());

-- --------------------------------------------------------------------------------------
-- 8. RLS Policies for Sessions
-- --------------------------------------------------------------------------------------
CREATE POLICY "Sellers can CRUD their own sessions" 
ON sessions FOR ALL 
USING (seller_id = auth.uid());

CREATE POLICY "Handymen can SELECT sessions of their seller" 
ON sessions FOR SELECT 
USING (seller_id = (SELECT seller_id FROM profiles WHERE id = auth.uid()));

-- --------------------------------------------------------------------------------------
-- 9. RLS Policies for Orders
-- --------------------------------------------------------------------------------------
CREATE POLICY "Sellers can CRUD their own orders" 
ON orders FOR ALL 
USING (seller_id = auth.uid());

CREATE POLICY "Handymen can SELECT orders of their seller" 
ON orders FOR SELECT 
USING (seller_id = (SELECT seller_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Handymen can update status of orders of their seller" 
ON orders FOR UPDATE 
USING (seller_id = (SELECT seller_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (seller_id = (SELECT seller_id FROM profiles WHERE id = auth.uid()));

-- --------------------------------------------------------------------------------------
-- 10. RLS Policies for SMS Logs
-- --------------------------------------------------------------------------------------
CREATE POLICY "Sellers can SELECT their own SMS logs" 
ON sms_logs FOR SELECT 
USING (seller_id = auth.uid());

CREATE POLICY "Sellers can INSERT SMS logs via backend" 
ON sms_logs FOR INSERT 
WITH CHECK (seller_id = auth.uid());

-- --------------------------------------------------------------------------------------
-- 12. Auto-Profile Trigger
-- Automatically create a profile row when a new user is created via Supabase Auth.
-- --------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, webhook_token, shop_name)
  VALUES (
    NEW.id, 
    'seller', 
    'tok_' || substring(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    'My Duka'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime Publication (safe for re-runs)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Publication already includes orders or does not exist: %', SQLERRM;
END $$;

-- Ensure PostgREST can introspect our schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
