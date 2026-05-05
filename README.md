# LiveSoko 

LiveSoko is a premium, high-speed, and secure platform for TikTok Live sellers. It streamlines the flow from customer purchase to rider dispatch with real-time updates and enterprise-grade data isolation.

## 🚀 Quick Start
1. **Backend**: `cd backend && npm install && node index.js`
2. **Frontend**: `cd frontend && npm install && npm run build`
3. **Database**: SQLite database (`livesoko.db`) initializes automatically on first run.
4. **Access**: Open `http://localhost:3000` on this PC, or the WiFi/LAN URL shown in the console on your phone.

> **Note**: Frontend is built to `frontend/dist` and served by the backend. No separate frontend dev server needed for testing.

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
- [**SMS Forwarder Guide**](docs/guides/SMS_FORWARDER.md): Build and setup the native Android sync app.
- [**Railway Deployment**](docs/guides/RAILWAY_DEPLOYMENT.md): How to host LiveSoko in the cloud.

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

## 🏗️ Architecture
- **Local-First**: Node.js backend + SQLite (no cloud DB dependency).
- **Single Server**: Backend serves both the API and the built React frontend.
- **LAN Access**: Automatically detects WiFi IP so phones on the same network can access the app.
- **Public Order Page**: Buyers visit `/shop/<slug>` to place orders — no login required.
- **Manual Orders**: Sellers can add orders directly via "Add Order Info" on the Live tab.

## ✨ Current Version (v2.4.0 — Stability Release)
- **🔧 FK Migration Fix**: Automatic repair of orders table foreign key corruption.
- **📋 Clipboard Fallback**: Copy URL works on mobile HTTP (no HTTPS required).
- **🗑️ Delete Order Fix**: Orders now remove from UI immediately on delete.
- **💰 Agreed Price Field**: Buyers enter the seller-quoted price on the public order form.
- **📝 User-Friendly Settings**: Removed legacy sections (Google Sheets, SMS Forwarder URL, broken APK download). Tutorial and FAQ rewritten for real users.
- **🔗 Reliable Routing**: Public order page uses `/shop/:slug` (no more broken `/@` routes).

---
Built by **SoftLOGICtech** 
*Version 2.4.0 — "Stability First"*
