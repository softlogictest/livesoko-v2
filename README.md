# VibeSoko 🎉📱🚀

VibeSoko is a premium, high-speed, and secure platform for TikTok Live sellers. It streamlines the flow from customer purchase to rider dispatch with real-time updates and enterprise-grade isolation.

## 🚀 Quick Start
1. **Frontend**: `cd frontend && npm install && npm run dev`
2. **Backend**: `cd backend && npm install && node index.js`
3. **Database**: SQLite database (`vibesoko.db`) initializes automatically on first run.

## 📖 Technical Documentation
Explore our detailed guides in the `/docs` folder:
- [**Technical Stack**](docs/TECH_STACK.md): The core technologies powering VibeSoko.
- [**Security Architecture**](docs/SECURITY.md): How we protect your data with the 6 Hardening Pillars.
- [**Architecture Flow**](docs/ARCHITECTURE_FLOW.md): How data moves from TikTok to your Dashboard.
- [**Lessons Learned**](docs/LESSONS_LEARNED.md): Technical hurdles we fixed and "What Works".
- [**AI Prompting Guide**](docs/PROMPTING_GUIDE.md): Best practices for future development with AI.

## 📱 PWA Features
- **Installable**: Full "Add to Home Screen" support for a native mobile experience.
- **Offline Aware**: Basic offline handling for high-latency environments.
- **Real-time**: Live order broadcasts via Server-Sent Events (SSE).

## 🛡️ Security Highlights
- 100% IDOR Prevention (Resource-level scoping).
- Global Input Sanitization via `express-validator`.
- Strong Hashing (Bcrypt Cost 12) & Brute-force Protection.
- Environment-based Secrets Management.

---
Built by **SoftLOGICtech** 🛡️🚀🏆
