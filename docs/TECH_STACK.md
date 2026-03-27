# VibeSoko: Technical Stack 🛠️

VibeSoko is built using a modern, lightweight, and local-first architecture designed for maximum reliability in high-pressure sales environments (like TikTok Live).

## 1. Core Frameworks
- **Frontend**: [React 18](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/). Chosen for its robust state management and type safety.
- **Backend**: [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/). A lightweight, unopinionated web framework for handling API requests.
- **Real-time**: [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events). Used for live order updates. SSE was chosen over WebSockets for its simplicity and automatic reconnection handling.

## 2. Database & Storage
- **Primary Database**: [SQLite](https://www.sqlite.org/index.html) (via `better-sqlite3`).
  - **Why?**: Zero-configuration, file-based, and incredibly fast. It eliminates the latency and cost of a hosted cloud database like Supabase or RDS.
  - **Optimization**: Running in **WAL (Write-Ahead Logging)** mode for concurrent read/write performance.
- **State Management**: [React Context API](https://reactjs.org/docs/context.html). Provides global access to orders, sessions, and user information without the overhead of Redux.

## 3. Security Infrastructure
- **Authentication**: JWT-based (stored in LocalStorage) with 7-day silent renewal logic.
- **Hashing**: [Bcryptjs](https://www.npmjs.com/package/bcryptjs) (Cost 12) for secure password storage.
- **Protection Middleware**:
  - `helmet`: Secure HTTP headers.
  - `express-rate-limit`: Prevents brute-force and API abuse.
  - `express-validator`: Strict input sanitization.

## 4. Third-Party Integrations
- **Order Intake**: [Google Forms](https://www.google.com/forms/about/) + [Google Apps Script](https://developers.google.com/apps-script). This allows sellers to use a familiar interface for data collection, which then pushes data directly to the VibeSoko API via a custom webhook.
- **Hosting/Deployment**: [Railway](https://railway.app/). Chosen for its seamless GitHub integration and persistent volume support for the SQLite database.

## 5. PWA (Progressive Web App)
- **Manifest**: Custom `manifest.json` for "Add to Home Screen" support on iOS and Android.
- **Service Worker**: Custom `sw.js` for basic offline caching and PWA installation prompts.
