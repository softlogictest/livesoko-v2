# VibeSoko: Technical Trade-offs ⚖️

Every engineering decision involves trade-offs. Here is why we chose certain paths over others for VibeSoko.

## 1. SQLite (Local) vs. PostgreSQL (Cloud)
- **Decision**: Switched from Supabase (PostgreSQL) to SQLite.
- **Trade-off**:
  - **Pro**: Massive reduction in latency. No cloud subscription costs. 100% control over data.
  - **Con**: Does not scale to millions of concurrent users out of the box (requires vertical scaling).
  - **Why?**: VibeSoko is optimized for individual sellers doing high-velocity TikTok Lives. Fast, local response time is more valuable than "unlimited" cloud scale.

## 2. SSE vs. WebSockets
- **Decision**: Chose Server-Sent Events (SSE) for real-time updates.
- **Trade-off**:
  - **Pro**: Lower overhead. Native browser support with automatic reconnection. Easier to debug.
  - **Con**: One-way communication only (Server -> Client).
  - **Why?**: The dashboard primarily needs to show *new* orders as they arrive. Sellers interact with the API via standard POST/PATCH requests, so two-way WebSockets were unnecessary complexity.

## 3. Google Forms vs. Custom React Intake
- **Decision**: Kept Google Forms as the primary customer intake method.
- **Trade-off**:
  - **Pro**: Zero dev time for the "Customer UI." Familiar and trusted by users. Great spam protection.
  - **Con**: Less control over the design/experience. Requires an Apps Script middleman.
  - **Why?**: Speed to market. Sellers already know how to use Google Forms. Our focus was on the *Seller Dashboard* and security, not rebuilding a form engine.

## 4. Vanilla CSS vs. Tailwind
- **Decision**: Used Vanilla CSS with premium design tokens.
- **Trade-off**:
  - **Pro**: Maximum artistic control. Zero build-time bloat for styles. No "Tailwind look."
  - **Con**: Slightly slower to build complex layouts compared to utility classes.
  - **Why?**: The user requested a "Wow" factor and premium feel. Custom CSS allowed us to create the glassmorphism and animations that feel unique to VibeSoko.

## 5. React Context vs. Redux
- **Decision**: Used React Context + `useReducer`.
- **Trade-off**:
  - **Pro**: Simple, built into React. Zero extra bundles.
  - **Con**: Can lead to unnecessary re-renders in extremely large component trees.
  - **Why?**: The VibeSoko dashboard is a single-page management tool. Context provides exactly the right amount of power without the boilerplate of Redux.
