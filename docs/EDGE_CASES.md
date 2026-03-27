# VibeSoko: Edge Cases & Resilience 🛡️

VibeSoko is built to handle the "chaos" of a live selling session. Here is how we handle critical edge cases.

## 1. Duplicate MPESA Codes 📋
- **Case**: A user tries to submit an order with a transaction code that was already used.
- **Fix**: The `mpesa_tx_code` column in the `orders` table has a `UNIQUE` constraint. The database will reject the second attempt immediately, preventing double-fulfillment.

## 2. Concurrent Order Arrival 🌪️
- **Case**: 50 people submit a Google Form at the exact same second.
- **Fix**: SQLite's **WAL (Write-Ahead Logging)** mode allows the database to handle concurrent writes safely. The Apps Script intake queue handles retries if the server is momentarily busy.

## 3. Network Connection Drops 🌐
- **Case**: Your phone loses internet while the dashboard is open.
- **Fix**: The SSE (Server-Sent Events) listener in the frontend automatically reconnects as soon as the signal returns. The dashboard then performs a "fresh fetch" of all active orders to ensure no data was missed during the outage.

## 4. Rapid PWA Installation 📱
- **Case**: User installs, uninstalls, and reinstalls the app quickly.
- **Fix**: Our `sw.js` (Service Worker) uses a versioned cache (`vibesoko-pwa-v1`). When we update the app, we increment the version to force a clean cache wipe, preventing "stuck" UI versions.

## 5. Non-Standard Phone Numbers 📞
- **Case**: Users entering numbers with spaces, dashes, or missing country codes.
- **Fix**: Our `express-validator` logic normalizes numbers to a standard format (e.g., KES format) to ensure SMS matching works reliably.

## 6. Large Data Volumes (Cleanup) 🧹
- **Case**: Seller has 10,000+ orders after months of use.
- **Fix**: We've added indexes on `seller_id`, `created_at`, and `status`. This keeps lookups sub-millisecond even as the database grows into the tens of megabytes.
