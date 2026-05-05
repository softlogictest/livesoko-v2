# LiveSoko Sync — Build & Install Guide 📲

Build the tiny, bulletproof native Android SMS forwarder to auto-verify M-Pesa payments.

## Prerequisites
- **GitHub Account**: Your code is already set up to build via GitHub Actions.
- **Android Phone**: Running Android 7.0 (SDK 24) or higher.

## 1. Build the APK (Remote)
We use **GitHub Actions** to build the APK so you don't need to install any heavy software on your laptop.

1. **Push your code**:
   ```powershell
   git push origin main
   ```
2. **Go to GitHub**: Open your repository on GitHub.com.
3. **Actions Tab**: Click the **Actions** tab at the top.
4. **Select Workflow**: Click on **"Build and Release Android APK"** on the left sidebar.
5. **Download Artifact**:
   - Click on the most recent green (successful) run.
   - Scroll down to the **Artifacts** section.
   - Click **`livesoko-sync-apk`** to download the ZIP file.
6. **Extract**: Unzip the file to get the `livesoko-sync.apk`.

## 2. Install the App
1. **Transfer to Phone**: Send the `livesoko-sync.apk` to the M-Pesa phone (via WhatsApp, USB, or Telegram).
2. **Open APK**: Tap the file on the phone to install.
3. **Permission**: If Android warns about "Unknown Sources", tap **Settings** and toggle **"Allow from this source"**.
4. **Install**: Complete the installation.

## 3. Configuration
1. **Open LiveSoko Sync** on the phone.
2. **Get Webhook URL**:
   - On your laptop, open the LiveSoko Dashboard.
   - Go to **Settings** → **Config**.
   - Copy the **Webhook URL** (e.g., `http://192.168.1.10:5001/api/sms/TOKEN`).
3. **Paste & Save**:
   - Paste the URL into the app's input field.
   - Tap **SAVE URL & START LISTENING**.
4. **Permissions**: Android will ask for SMS permissions. Tap **ALLOW**.
5. **Verify**: The status text should turn **Green** and say "Configured. Listening for M-Pesa SMS...".

## 4. How It Works
1. **Detection**: The app uses a native `BroadcastReceiver`. It wakes up the moment an SMS arrives.
2. **Filter**: It only processes messages containing the word **"MPESA"**.
3. **Forwarding**: It sends a JSON POST request to your laptop:
   ```json
   {
     "sender_number": "MPESA",
     "message": "QC345678 Confirmed. Ksh 500 received from..."
   }
   ```
4. **Verification**: Your backend matches this to an order and updates the dashboard instantly.

## 5. Reliability Tips
To ensure Android doesn't "sleep" the app during long idle periods:
1. Long-press the **LiveSoko Sync** icon on the phone home screen.
2. Tap **App Info** (ⓘ icon).
3. Go to **Battery** or **Battery Optimization**.
4. Select **"Unrestricted"** or **"Don't Optimize"**.

## Architecture
```
┌─────────────────────┐     WiFi     ┌──────────────┐     WiFi     ┌─────────────────────┐
│  M-Pesa Phone       │ ──────────→  │  Laptop      │ ←──────────  │  Dashboard Phone    │
│  (Native Kotlin)    │              │  (Node.js)   │              │  (Browser/PWA)      │
│                     │              │              │              │                     │
│  Listens for SMS    │  POST /sms   │  Matches     │  SSE push    │  Shows verified     │
│  Forwards to server │ ──────────→  │  to orders   │ ──────────→  │  orders in real-time │
└─────────────────────┘              └──────────────┘              └─────────────────────┘
```
