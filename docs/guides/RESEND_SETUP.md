# Connecting Resend to LiveSoko 📧

This guide explains how to set up **Resend** for production email delivery (verification links and password resets) on Railway.

---

## 1. Create a Resend Account
1. Go to [resend.com](https://resend.com) and sign up for a free account.
2. In the dashboard, go to the **API Keys** tab.
3. Click **Create API Key**.
   - **Name:** `LiveSoko Production`
   - **Permission:** `Full Access`
4. **Copy the key immediately** (it starts with `re_`). You will need this for Railway.

---

## 2. Verify Your Domain (Crucial for Production)
**Note:** If you don't have a custom domain yet (e.g. you are using `xxx.up.railway.app`), you can skip this for now, but you will be in **Onboarding Mode**.

### Option A: I have a custom domain (Production)
1. In Resend, go to the **Domains** tab.
2. Click **Add Domain** and enter your domain (e.g., `livesoko.shop`).
3. Add the provided DNS records to your domain provider (Namecheap, etc.).
4. Click **Verify**. This allows you to send emails to **anyone**.

### Option B: I don't have a domain yet (Testing Only)
If you are using a Railway subdomain like `livesoko-v2-production.up.railway.app`:
- You **cannot** verify the `.up.railway.app` domain.
- Resend will put you in **Onboarding Mode**.
- You can **ONLY** send emails to the address you used to sign up for Resend.
- Use `onboarding@resend.dev` as your `FROM_EMAIL`.
- **Recommendation:** Buy a cheap domain (e.g. `.xyz` or `.shop`) as soon as possible to enable full email features for your users.

---

## 3. Configure Railway Environment Variables
Once your domain is verified, you need to tell LiveSoko to use it.

1. Open your **Railway Dashboard**.
2. Select your `backend` service.
3. Go to the **Variables** tab and add the following:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | `re_your_api_key` | The key you copied in Step 1. |
| `APP_URL` | `https://livesoko-v2-production.up.railway.app` | Your public backend URL. |
| `FROM_EMAIL` | `LiveSoko <onboarding@resend.dev>` | Use `onboarding@resend.dev` if you have no domain. |

---

## 4. Local Development (Testing)
You don't need an API key for local development. 
- If `RESEND_API_KEY` is missing, LiveSoko will print the email content (and the verification link) directly to your **Terminal console**.
- You can copy the link from the terminal and paste it into your browser to test the flow without sending actual emails.

---

## 5. Summary Checklist
- [ ] Created Resend API Key.
- [ ] Added `RESEND_API_KEY` to Railway.
- [ ] Added `APP_URL` to Railway.
- [ ] Verified domain in Resend dashboard.
- [ ] Added `FROM_EMAIL` to Railway (matching verified domain).

> [!TIP]
> If you are just testing, you can leave `FROM_EMAIL` blank and Resend will attempt to send from `onboarding@resend.dev`, but this will **only** work if you are sending to the same email address you used to sign up for Resend. Verify a domain for the best experience.
