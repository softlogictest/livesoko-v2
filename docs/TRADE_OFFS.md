# LiveSoko: Technical Trade-offs ⚖️

Every engineering decision involves trade-offs. Here is why we chose certain paths over others for LiveSoko.

## 1. SQLite (Local) vs. PostgreSQL (Cloud)
- **Decision**: Switched from Supabase (PostgreSQL) to SQLite.
- **Trade-off**:
  - **Pro**: Massive reduction in latency. No cloud subscription costs. 100% control over data.
  - **Con**: Does not scale to millions of concurrent users out of the box (requires vertical scaling).
  - **Why?**: LiveSoko is optimized for individual sellers doing high-velocity TikTok Lives. Fast, local response time is more valuable than "unlimited" cloud scale.

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
- **Decision**: Used Tailwind CSS with custom design tokens.
- **Trade-off**:
  - **Pro**: Rapid prototyping. Consistent utility classes. Easy theming via `tailwind.config.js`.
  - **Con**: Class names can get verbose. Requires build step.
  - **Why?**: Tailwind gave us the speed to iterate on the premium "dark mode" look while keeping the design system consistent across all components.

## 5. React Context vs. Redux
- **Decision**: Used React Context + `useReducer`.
- **Trade-off**:
  - **Pro**: Simple, built into React. Zero extra bundles.
  - **Con**: Can lead to unnecessary re-renders in extremely large component trees.
  - **Why?**: The LiveSoko dashboard is a single-page management tool. Context provides exactly the right amount of power without the boilerplate of Redux.

## 6. Token-Based Auth vs. Cookie Sessions
- **Decision**: Used bearer tokens stored in localStorage.
- **Trade-off**:
  - **Pro**: Simple, stateless on the client. Works seamlessly with SSE and mobile PWA.
  - **Con**: Vulnerable to XSS if inputs aren't sanitized (which we mitigate with express-validator and helmet).
  - **Why?**: Cookie-based sessions add CSRF complexity. Since LiveSoko is a PWA, localStorage tokens with 7-day auto-renewal provide a smoother mobile experience.

## 7. Global vs. Contextual Database Scoping (SaaS Migration)
- **Decision**: Separated `profiles` from `shops` to allow 1-to-N multi-shop ownership.
- **Trade-off**:
  - **Pro**: Massive scalability for enterprise clients. A single 'Owner' can effortlessly toggle between multiple shops securely.
  - **Con**: Added complexity to the backend API layer. All requests must now pass an active `x-shop-id` context header to ensure operations don't bleed across stores.
  - **Why?**: Essential for the Enterprise scaling phase.

## 8. Explicit Route Masking Avoidance
- **Lesson Learned (SaaS Phase)**: When combining public webhooks with protected global routes, Express reads middleware top-down. We learned the hard way that mounting `app.use('/api/orders')` before `app.post('/api/orders/webhook')` instantly masks the webhook with an HTTP 401. 
- **Production Paradigm**: Always mount explicit public unauthenticated webhooks *above* blanket authentication guard routes in the index architecture.

## 9. Strict CORS Security Headers
- **Lesson Learned (SaaS Phase)**: Moving to multi-tenant required moving the `x-shop-id` securely from the React frontend to the backend via a custom header. 
- **Production Paradigm**: The browser will silently KILL all HTTP requests via invisible CORS preflights (HTTP 204) if custom security headers are introduced to the stack but forgotten in the backend `cors({ allowedHeaders: [...] })` config. Always whitelist headers!
