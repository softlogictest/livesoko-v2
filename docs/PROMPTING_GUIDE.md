# LiveSoko: AI Prompting Guide 🤖

Working with an AI coding assistant on LiveSoko is most efficient when you provide **Context + Constraint**. Here's the best way to prompt for future features.

## 1. The "One Dimension" Rule 🎯
- **Avoid**: "Build a whole new delivery feature with riders and payments."
- **Better**: "Create a new route `POST /api/riders` in `backend/routes/riders.js`. It should take a `name` and `phone`, and include the `shop_id` IDOR check we used in `orders.js`. Check the existing `orders.js` POST handler for the pattern."
- **Why**: AI works best when given one logical task at a time. It prevents "hallucinations" and keeps the code clean.

## 2. Leverage Existing Patterns 🧩
- **Pro-Tip**: Reference our existing "hardened" files.
- **Prompt**: "Add a new endpoint for `DELETE /api/sessions/:id`. Use the same authentication middleware and `shop_id` scoping logic found in `backend/routes/settings.js`. Make sure the broadcast includes `shop_id`."
- **Why**: This ensures new code matches the security and style of the existing codebase.

## 3. Describe the "User Vibe" 🎨
- **Prompt**: "Update the 'Order Received' toast to feel more premium. Use a deep red and green gradient, add a subtle pop animation, and make it compatible with our existing LiveSoko branding."
- **Why**: AI is great at CSS, but it needs to know what "premium" means to *you*. Always specify colors and "feel."

## 4. The "Security First" Constraint 🔐
- **Always include this**: "Ensure the new endpoint has 100% IDOR prevention and uses `express-validator` for all inputs."
- **Why**: This reminds the AI to skip the "quick version" and go straight to the "production-grade" version.

## 5. Schema Maintenance 💾
- **Prompt**: "I need to add a `tracking_number` to the `orders` table. Create a new migration in `backend/lib/database.js` using the Phase 3 FK repair pattern (CREATE new → COPY → DROP → RENAME)."
- **Why**: Simple `ALTER TABLE ADD COLUMN` works for new columns. But for constraint or FK changes, always use the rebuild pattern. Check `database.js` Phase 2 and Phase 3 for examples.

## 6. Component-First UI 🎨
- **Prompt**: "Create a new `StatusBadge` component. It should use the color tokens from `index.css` (e.g., `--color-status-verified`) and include a subtle hover scale animation."
- **Why**: Referencing our design tokens ensures the UI stays consistent and premium.

## 7. Handling Bugs 🐜
- **The Best Prompt**: "I'm getting a `FOREIGN KEY constraint failed` error when creating orders. Here is the server log output. Please check the FK references in the orders table schema."
- **Why**: Providing the exact error from the **server logs** (not just the frontend) allows for a "surgical" fix. Always check `node index.js` console output.

## 8. The "Don't Rely on SSE" Rule 🔌
- **Prompt**: "When I add an order, it should appear immediately — don't rely on SSE. Dispatch `ADD_ORDER` directly from the response, then SSE handles multi-client sync."
- **Why**: SSE is for broadcasting to *other* clients. The client that made the action should update its own state immediately from the API response.

## 9. Frontend State Updates 📱
- **Always check `res.ok`** before closing modals or updating state.
- **Always dispatch to context** from the response data, not just from SSE events.
- **Pattern**: `const res = await fetchWithAuth(...); if (!res.ok) { alert(error); return; } const data = await res.json(); dispatch({ type: 'ADD_ORDER', payload: data });`
