# VibeSoko: AI Prompting Guide 🤖

Working with an AI coding assistant (like me) on VibeSoko is most efficient when you provide **Context + Constraint**. Here’s the best way to prompt for future features.

## 1. The "One Dimension" Rule 🎯
- **Avoid**: "Build a whole new delivery feature with riders and payments."
- **Better**: "Create a new route `POST /api/riders` in `backend/routes/riders.js`. It should take a `name` and `phone`, and include the `seller_id` IDOR check we used in `orders.js`."
- **Why**: AI works best when given one logical task at a time. It prevents "hallucinations" and keeps the code clean.

## 2. Leverage Existing Patterns 🧩
- **Pro-Tip**: Reference our existing "hardened" files.
- **Prompt**: "Add a new endpoint for `DELETE /api/sessions/:id`. Use the same authentication middleware and `shop_id` scoping logic found in `backend/routes/settings.js`."
- **Why**: This ensures new code matches the security and style of the existing "Senior Engineer" approved codebase.

## 3. Describe the "User Vibe" 🎨
- **Prompt**: "Update the 'Order Received' toast to feel more premium. Use a deep red and green gradient, add a subtle pop animation, and make it compatible with our existing VibeSoko branding."
- **Why**: AI is great at CSS, but it needs to know what "premium" means to *you*. Always specify colors and "feel."

## 4. The "Security First" Constraint 🔐
- **Always include this**: "Ensure the new endpoint has 100% IDOR prevention and uses `express-validator` for all inputs."
- **Why**: This reminds the AI to skip the "quick version" and go straight to the "production-grade" version.

## 5. Schema Maintenance 💾
- **Prompt**: "I need to add a `tracking_number` to the `orders` table. Create a new migration script in `backend/lib/database.js` using the same `ALTER TABLE` pattern used for `buyer_mpesa_name`."
- **Why**: This ensures database changes follow the safe, backward-compatible pattern already established in the project.

## 6. Component-First UI 🎨
- **Prompt**: "Create a new `StatusBadge` component. It should use the color tokens from `index.css` (e.g., `--color-status-verified`) and include a subtle hover scale animation."
- **Why**: Referencing our design tokens ensures the UI stays consistent and premium.

## 7. Handling Bugs 🐜
- **The Best Prompt**: "I'm getting a `ReferenceError: updated is not defined` in `settings.js` on line 48. Here is the current file content. Please fix the variable scoping."
- **Why**: Providing the exact error and the file content allows for a "surgical" fix.
