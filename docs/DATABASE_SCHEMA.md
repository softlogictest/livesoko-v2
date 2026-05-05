# LiveSoko: Database Schema 💾

Complete data dictionary for `livesoko.db` (SQLite, WAL Mode).

## Entity Relationship Diagram

```mermaid
erDiagram
    profiles ||--o{ auth_tokens : "has"
    profiles ||--o{ shop_users : "member_of"
    shops ||--o{ shop_users : "has_members"
    shops ||--o{ sessions : "contains"
    shops ||--o{ orders : "processed"
    shops ||--o{ sms_logs : "receives"
    sessions ||--o{ orders : "contains"
    orders ||--o{ sms_logs : "matched_by"

    profiles {
        TEXT id PK "UUID"
        TEXT email UK "unique, required"
        TEXT password_hash "bcrypt cost 12"
        INT must_change_password "1 = force reset"
        TEXT role "global role (admin/user)"
        TEXT created_at
        TEXT updated_at
    }

    shops {
        TEXT id PK "UUID"
        TEXT owner_id FK "-> profiles.id"
        TEXT name
        TEXT slug UK "url-friendly name"
        TEXT color_scheme "acid-green | royal-blue | etc"
        TEXT webhook_token UK
        TEXT sheet_url
        TEXT tier "trial | shop | suite"
        TEXT status "active | suspended"
        TEXT created_at
        TEXT updated_at
    }

    shop_users {
        TEXT shop_id PK, FK "-> shops.id"
        TEXT user_id PK, FK "-> profiles.id"
        TEXT role "owner | manager | seller"
    }

    auth_tokens {
        TEXT token PK
        TEXT user_id FK
        TEXT expires_at
        TEXT created_at
    }

    sessions {
        TEXT id PK
        TEXT shop_id FK "-> shops.id"
        TEXT title
        TEXT status "active | ended"
        TEXT started_at
        TEXT ended_at
        TEXT created_at
    }

    orders {
        TEXT id PK
        TEXT session_id FK "-> sessions.id"
        TEXT shop_id FK "-> shops.id"
        TEXT buyer_name
        TEXT buyer_tiktok
        TEXT buyer_phone
        TEXT delivery_location
        TEXT coordinates
        TEXT item_name
        INT quantity
        REAL unit_price
        REAL expected_amount "GENERATED: quantity * unit_price"
        TEXT payment_type "MPESA | COD"
        TEXT buyer_mpesa_name
        TEXT mpesa_sender_name
        REAL mpesa_amount
        TEXT mpesa_tx_code UK
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
        TEXT id PK
        TEXT shop_id FK "-> shops.id"
        TEXT raw_body
        TEXT sender_number
        TEXT matched_order_id FK
        TEXT match_status
        TEXT received_at
    }
```

## Indexes

| Index Name | Table | Column(s) | Purpose |
|---|---|---|---|
| `idx_orders_session_id` | orders | session_id | Fast order lookup per session |
| `idx_orders_shop_id` | orders | shop_id | IDOR scoping (every query uses this) |
| `idx_orders_status` | orders | status | Filter by payment status |
| `idx_orders_mpesa_tx` | orders | mpesa_tx_code | Duplicate TX detection |
| `idx_sessions_shop_status` | sessions | shop_id, status | Find active session instantly |
| `idx_sessions_created` | sessions | created_at | Session history sorting |
| `idx_sms_logs_shop_id` | sms_logs | shop_id | SMS audit trail per shop |
| `idx_auth_tokens_user` | auth_tokens | user_id | Token cleanup per user |

## Multi-Tenant Isolation

Every query that reads or writes `orders`, `sessions`, or `sms_logs` includes `WHERE shop_id = ?` scoped to `req.user.shop_id`. This prevents cross-tenant data leakage even if a user guesses another user's resource ID.

## Migrations

Migrations run automatically on startup in `database.js`. They use safe patterns:
1. **Simple column additions**: `ALTER TABLE ... ADD COLUMN` (e.g., `buyer_mpesa_name`, `expires_at`).
2. **Constraint changes (Phase 2)**: CREATE new → COPY data → DROP old → RENAME (e.g., adding `COD_PENDING` status, fixing sessions FK).
3. **FK corruption repair (Phase 3)**: Detects `orders.shop_id` wrongly referencing `profiles(id)` instead of `shops(id)` and rebuilds with correct FK.
4. **Detection**: Uses `PRAGMA foreign_key_list()` to check if FKs point to the correct tables before running the migration.
