# SMS Forwarder Setup Guide

This guide will show you how to set up the Android SMS Forwarder application so that every time you receive an M-Pesa payment, it is automatically forwarded to LiveSoko for real-time order matching.

## Prerequisites
- An Android Device that receives M-Pesa SMS messages.
- The **SMS Forwarder** application. You can download this from the Google Play Store or F-Droid.

## Setup Instructions

### 1. Create a New Forwarding Rule
Open the SMS Forwarder App and tap the **+ Add Rule** button in the bottom right corner.

### 2. Configure the Condition (The Filter)
We only want to forward M-Pesa messages, not your personal messages.
- **Match Field**: Select **Sender**.
- **Match Pattern**: Select **Is**.
- **Value**: Type exactly **M-PESA** (All caps).

### 3. Configure the Action (The Destination)
We need to send the message to the LiveSoko Backend.
- **Type**: Select **Webhook** or **Web**.
- **URL**: Paste your unique Webhook URL here from your LiveSoko Settings page.
  *(e.g., `https://livesoko-api.railway.app/api/sms/tok_abc123`)*
- **Method**: Select **POST**.
- **Content Type**: `application/json`
- **Body Template**: 
  ```json
  {
    "message": "%sms_body%"
  }
  ```

### 4. Save and Test
- Hit **Save**.
- Tap **Test Rule** or send yourself a dummy message from "M-PESA" to verify your LiveSoko dashboard flashes green.

## Crucial: Battery Optimization Settings
Android aggressively closes apps running in the background. If you do not change these settings, your phone will stop forwarding SMS messages when LiveSoko is closed.
- **Samsung**: Settings > Apps > SMS Forwarder > Battery > Select "Unrestricted".
- **Tecno / Infinix**: Open "Phone Master" > App Management > Auto-start Management > Allow SMS Forwarder. Additionally, go to Settings > App Management > App Settings > SMS Forwarder > Battery > "Don't optimize".
- **Xiaomi (MIUI)**: Settings > Apps > Manage Apps > SMS Forwarder > Turn on "AutoStart". Battery Saver > Select "No restrictions".

*Once configured, your TikTok Live store is fully automated!*
