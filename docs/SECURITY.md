# LiveSoko: Security Architecture 🛡️

LiveSoko follows the **"Pillars of Hardening"** model, transforming the application from a simple prototype into a production-grade, multi-tenant platform.

## Pillar 1: Secure Authentication 🔑
- **Strong Hashing**: Passwords are never stored in plain text. We use `bcrypt` with a cost factor of **12** to prevent brute-force recovery.
- **Complexity Policy**: Passwords must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters. This blocks "vibe-coded" (weak) passwords like `123456`.
- **Session Lifecycles**: Tokens live for 7 days but automatically renew if the user is active within the last 24 hours of expiry.

## Pillar 2: IDOR (Insecure Direct Object Reference) Prevention 🚫
- **Strict Ownership**: Every database query that interacts with orders, sessions, or profiles includes a `WHERE seller_id = ?` or `WHERE shop_id = ?` clause.
- **The Result**: Even if a malicious user knows your Order ID, they cannot view, modify, or delete it because the system verifies they do not own that specific "Shop ID".

## Pillar 3: Input Sanitization 🧼
- **Express Validator**: Every API route uses a validation middleware.
- **Whitelist Filtering**: Only expected fields are processed (e.g., `shop_name`, `email`). Extra or malicious fields are automatically discarded.
- **XSS Protection**: Inputs are escaped to prevent Cross-Site Scripting (XSS) attacks in order notes or profile fields.

## Pillar 4: Secrets Management 🔐
- **Environment Variables**: API keys, Database paths, and default admin credentials are kept in `.env` files (ignored by git) and Railway environment variables.
- **Zero Exposure**: No hardcoded credentials exist in the frontend or backend codebase.

## Pillar 5: Abuse Protection 🛑
- **Rate Limiting**:
  - **Global**: 100 requests per 15 minutes.
  - **Login**: 5 attempts per 15 minutes (blocks brute-force).
  - **Registration**: 3 accounts per hour (blocks bot spam).
  - **Webhook**: 50 orders per 15 minutes (prevents DB flood).
  - **SMS**: 200 messages per 15 minutes (high limit for batch intake).
- **Helmet Headers**: Automatically hides "X-Powered-By" (identifying Node.js) and sets security headers like `X-Frame-Options` to prevent clickjacking.

## Pillar 6: Multi-Tenant Data Isolation 🏘️
- **Logical Separation**: While all sellers share the same database, the logic ensures they inhabit "silos".
- **Real-time Privacy**: The SSE (Server-Sent Events) feed is filtered by `shop_id`. You only see the notifications for your own livestreams.
