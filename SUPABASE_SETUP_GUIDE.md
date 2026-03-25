# DukaLive Supabase Setup Guide

A complete beginner's guide to setting up the backend database for DukaLive v2.0 using Supabase.

## Let's get your database running!

Since you want me to guide you through the backend setup, here are the step-by-step instructions. **Do not worry about the code, we are just pressing buttons in Supabase right now.**

### 1. Create your Supabase Project
1. Go to [database.new](https://database.new) and sign in.
2. Click **New Project**.
3. Choose your organization, set the Name to **"DukaLive"**, and enter a secure Database Password.
4. Select a region closest to you.
5. Wait ~2 minutes for the database to provision.

### 2. Run the SQL Schema
I have already generated all the database table configurations for you.
1. In your workspace on your computer, locate the file named `schema.sql`.
2. Open your Supabase Dashboard for the `DukaLive` project.
3. On the left-hand sidebar, click the **SQL Editor** menu item (it looks like a `>_` symbol).
4. Click **New query**.
5. Copy the entire contents of the `schema.sql` file and paste it into the editor.
6. Click the green **Run** button at the bottom right.
7. You should see "Success. No rows returned". This means all 4 tables (`profiles`, `sessions`, `orders`, `sms_logs`) and the security policies have been created!

### 3. Verify Realtime is ON
We need to ensure WebSockets are fully active for the `orders` table so the frontend updates instantly without page refreshing.
1. On the left sidebar, click **Database** (looks like a stack of coins).
2. Click **Publications** in the second menu.
3. You should see `supabase_realtime`. It should say it's active for `Public` `orders` table.

### 4. Note down your API Keys
We will need these keys for the Node.js Express server to talk to Supabase.
1. Go to **Project Settings** (the gear icon at the bottom of the left sidebar).
2. Click **API** under Configuration.
3. Copy these 3 values and paste them somewhere safe (like a notepad):
   * **Project URL** (e.g. `https://xxxx.supabase.co`)
   * **anon** `public` API Key.
   * **service_role** `secret` API Key. *(Warning: Never share this! It can bypass all security rules)*

### 5. Allow Email Logins
1. Go to **Authentication** (the people icon).
2. Under Configuration, click **Providers**.
3. Ensure **Email** is Enabled and **Confirm email** is toggled OFF. (For this project, we want sellers to just log in without clicking email links to verify every time they start).

Once you've completed this guide, tell me and we will proceed to writing the Express Backend!
