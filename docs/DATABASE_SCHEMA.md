# LiveSoko: Database Schema 💾

Complete data dictionary for `livesoko.db` (SQLite, WAL Mode).

## Entity Relationship Diagram

```mermaid
erDiagram
    profiles ||--o{ auth_tokens : "has"
    profiles ||--o{ sessions : "owns"
    profiles ||--o{ orders : "sells"
    profiles ||--o{ sms_logs : "receives"
    profiles ||--o{ profiles : "manages (handyman)"
    sessions ||--o{ orders : "contains"
    orders ||--o{ sms_logs : "matched_by"

    profiles {
        TEXT id PK "UUID"
        TEXT email UK "unique, required"
        TEXT password_hash "bcrypt cost 12"
        INT must_change_password "1 = force reset"
        TEXT role "seller | handyman"
        TEXT shop_name
        TEXT tiktok_handle
        TEXT mpesa_number
        TEXT seller_id FK "NULL for sellers, parent ID for handymen"
        TEXT webhook_token UK "tok_xxxxxxxxxxxx"
        TEXT sheet_url "Google Sheet integration"
        TEXT created_at
        TEXT updated_at
    }

    auth_tokens {
        TEXT token PK "crypto.randomBytes(32)"
        TEXT user_id FK "-> profiles.id"
        TEXT expires_at "7-day TTL, auto-renewed"
        TEXT created_at
    }

    sessions {
        TEXT id PK "UUID"
        TEXT seller_id FK "-> profiles.id (shop owner)"
        TEXT title "optional session label"
        TEXT status "active | ended"
        TEXT started_at
        TEXT ended_at
        TEXT created_at
    }

    orders {
        TEXT id PK "UUID"
        TEXT session_id FK "-> sessions.id"
        TEXT seller_id FK "-> profiles.id (IDOR scope)"
        TEXT buyer_name
        TEXT buyer_tiktok
        TEXT buyer_phone "normalized +254..."
        TEXT delivery_location
        TEXT coordinates
        TEXT item_name
        INT quantity "CHECK > 0"
        REAL unit_price
        REAL expected_amount "GENERATED: quantity * unit_price"
        TEXT payment_type "MPESA | COD"
        TEXT buyer_mpesa_name "expected MPESA sender"
        TEXT mpesa_sender_name "actual MPESA sender"
        REAL mpesa_amount
        TEXT mpesa_tx_code UK "unique transaction code"
        TEXT mpesa_raw_sms
        TEXT mpesa_received_at
        TEXT status "PENDING | COD_PENDING | VERIFIED | FRAUD | REVIEW | FULFILLED"
        TEXT status_reason
        TEXT fulfilled_at
        TEXT fulfilled_by FK "-> profiles.id"
        TEXT created_at
        TEXT updated_at
    }

    sms_logs {
        TEXT id PK "UUID"
        TEXT seller_id FK "-> profiles.id"
        TEXT raw_body "full SMS text"
        TEXT sender_number
        TEXT matched_order_id FK "-> orders.id (nullable)"
        TEXT match_status "MATCHED | UNMATCHED | DUPLICATE | PARSE_ERROR"
        TEXT received_at
    }
```

## Indexes

| Index Name | Table | Column(s) | Purpose |
|---|---|---|---|
| `idx_orders_session_id` | orders | session_id | Fast order lookup per session |
| `idx_orders_seller_id` | orders | seller_id | IDOR scoping (every query uses this) |
| `idx_orders_status` | orders | status | Filter by payment status |
| `idx_orders_mpesa_tx` | orders | mpesa_tx_code | Duplicate TX detection |
| `idx_sessions_seller_status` | sessions | seller_id, status | Find active session instantly |
| `idx_sessions_created` | sessions | created_at | Session history sorting |
| `idx_sms_logs_seller_id` | sms_logs | seller_id | SMS audit trail per seller |
| `idx_profiles_seller_id` | profiles | seller_id | Handyman → Seller lookup |
| `idx_auth_tokens_user` | auth_tokens | user_id | Token cleanup per user |

## Multi-Tenant Isolation

Every query that reads or writes `orders`, `sessions`, or `sms_logs` includes `WHERE seller_id = ?` scoped to `req.user.shop_id`. This prevents cross-tenant data leakage even if a user guesses another user's resource ID.

## Migrations

Migrations run automatically on startup in `database.js`. They use safe patterns:
1. **Simple column additions**: `ALTER TABLE ... ADD COLUMN` (e.g., `buyer_mpesa_name`, `expires_at`).
2. **Constraint changes**: CREATE new → COPY data → DROP old → RENAME (e.g., adding `COD_PENDING` status).
3. **FK corruption repair**: `PRAGMA foreign_key_check()` → rebuild if corrupted.
