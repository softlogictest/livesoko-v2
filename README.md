# LiveSoko 🎉📱🚀

LiveSoko is a premium, high-speed, and secure platform for TikTok Live sellers. It streamlines the flow from customer purchase to rider dispatch with real-time updates and enterprise-grade data isolation.

## 🚀 Quick Start
1. **Backend**: `cd backend && npm install && node index.js`
2. **Frontend**: `cd frontend && npm install && npm run dev`
3. **Database**: SQLite database (`livesoko.db`) initializes automatically on first run.

## 📖 Technical Documentation
Explore our detailed guides in the `/docs` folder:
- [**Technical Stack**](docs/TECH_STACK.md): The core technologies powering LiveSoko.
- [**Security Architecture**](docs/SECURITY.md): How we protect your data with the 6 Hardening Pillars.
- [**Architecture Flow**](docs/ARCHITECTURE_FLOW.md): How data moves from TikTok to your Dashboard.
- [**Database Schema**](docs/DATABASE_SCHEMA.md): Complete data dictionary for `livesoko.db`.
- [**API Reference**](docs/API_REFERENCE.md): All endpoints, auth requirements, and example payloads.
- [**Lessons Learned**](docs/LESSONS_LEARNED.md): Technical hurdles we fixed and "What Works."
- [**Trade-offs**](docs/TRADE_OFFS.md): Why we chose SQLite and SSE over alternatives.
- [**Edge Cases**](docs/EDGE_CASES.md): How the system handles duplicates and network drops.
- [**Public Repo Security**](docs/REPO_SECURITY.md): How to keep your source code safe on GitHub.
- [**AI Prompting Guide**](docs/PROMPTING_GUIDE.md): Best practices for future development.

## 📱 PWA Features
- **Installable**: Full "Add to Home Screen" support for a native mobile experience.
- **Offline Aware**: Basic offline handling for high-latency environments.
- **Real-time**: Live order broadcasts via Server-Sent Events (SSE).

## 🛡️ Security Highlights
- 100% IDOR Prevention (Resource-level scoping).
- Global Input Sanitization via `express-validator`.
- Strong Hashing (Bcrypt Cost 12) & Brute-force Protection.
- Environment-based Secrets Management.
- Granular Rate Limiting (Login, Register, Webhook, SMS, Global).

## ✨ What's New (Enterprise Update v2.3.0)
- **🔊 LiveSoko Senses**: Synthesized audio feedback for verified orders and unmatched payments.
- **📊 Market Hero Dashboard**: Lifetime revenue, total orders, and AOV analytics on the History page.
- **🛡️ Multi-Tenant 2.0**: Secure shop isolation with Owner/Manager/Seller role hierarchies.
- **💰 Floating Cash System**: Robust "Catch-all" engine for unmatched M-Pesa payments.
- **📱 LiveSoko Sync**: Dedicated Android app for background SMS verification.

---
Built by **SoftLOGICtech** 🛡️🚀🏆
*Version 2.3.0 — "The Enterprise Grand Finale"*
