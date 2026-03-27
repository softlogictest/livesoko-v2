# VibeSoko — Railway Deployment Guide

This guide takes the VibeSoko code on your PC and puts it on the internet so you can use it entirely from your phone.

## Step 1: Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new)
2. Name it `vibesoko`
3. Leave it **Public** or **Private** (either works)
4. Click **Create repository**

1. **Generate a PAT**: Go to [github.com/settings/tokens](https://github.com/settings/tokens) directly. 
   - *Alternative path*: Click your **Profile Icon** (top-right) → **Settings** → Scroll to the **absolute bottom** of the left sidebar → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. Click **Generate new token (classic)** → check the **'repo'** box → **Generate token** → **COPY IT**.
3. **Push using the token**: Run this command (replace `YOUR_TOKEN_HERE` with the token you just copied):

```powershell
# Fix the link with your token
git remote set-url origin https://SoftLOGICtech:YOUR_TOKEN_HERE@github.com/SoftLOGICtech/vibesoko.git
git push -u origin main
```

> **Why the error?** Your computer thinks you are `mrhoonigan-web`, but the repo belongs to `SoftLOGICtech`. Using the token in the URL tells GitHub exactly which account to use.

---

## Step 3: Deploy to Railway
1. Go to [railway.app](https://railway.app) and log in with GitHub
2. Click **+ New Project** → **Deploy from GitHub repo**
3. Select your `vibesoko` repo
5. Go to the **Variables** tab → click **+ New Variable**.
   - **If PORT is not suggested**: Go to the **Settings** tab first, click **Generate Domain**, then go back to Variables. Now `PORT` should appear in the suggestions!
   - **Copy-paste friendly**: If you can't copy "production", just type it manually: `p` `r` `o` `d` `u` `c` `t` `i` `o` `n`.

---

1. In your Railway project, click **+ New** → **Volume**.
2. **Select your Backend service** in the dropdown.
3. Name it `vibesoko-data`.
4. Set **Mount Path** to `/data`.
5. Click **Save**.

### Step 5: Final Variables
Ensure these are set in your **Backend** service:
- `DB_PATH` = `/data/vibesoko.db`
- `NODE_ENV` = `production`
- `PORT` = `3000`

---

## Step 5: Get your URL
1. Click the **Settings** tab in your Railway service
2. Click **Generate Domain**
3. You now have a link like `https://vibesoko-production.up.railway.app`
4. Open this on your phone!

---

## Step 6: Update SMS Forwarder
In your SMS Forwarder Android app, change the destination URL to:
`https://your-app-name.up.railway.app/api/sms/YOUR_TOKEN`

---

## Note on "Phone Only"
The backend is now "always on" in the cloud. You never need to run `node index.js` on your PC again. Just open the URL on your phone and start selling!
