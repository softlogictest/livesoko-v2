package com.softlogictech.livesokosync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class SmsReceiver : BroadcastReceiver() {
    
    private val TAG = "LiveSokoSmsReceiver"
    private val executor = Executors.newSingleThreadExecutor()

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val prefs = context.getSharedPreferences("LiveSokoPrefs", Context.MODE_PRIVATE)
        val webhookUrl = prefs.getString("webhookUrl", "")

        if (webhookUrl.isNullOrEmpty()) {
            Log.w(TAG, "No webhook URL configured. Ignoring SMS.")
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        for (sms in messages) {
            val sender = sms.originatingAddress ?: ""
            val body = sms.messageBody ?: ""

            // Strict filter to only forward M-Pesa messages
            if (sender.contains("MPESA", ignoreCase = true) || body.contains("MPESA", ignoreCase = true)) {
                Log.d(TAG, "M-Pesa SMS detected! Forwarding to $webhookUrl")
                forwardSms(webhookUrl, sender, body)
            }
        }
    }

    private fun forwardSms(urlStr: String, sender: String, body: String) {
        executor.execute {
            try {
                val url = URL(urlStr)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Accept", "application/json")
                conn.doOutput = true
                conn.connectTimeout = 10000
                conn.readTimeout = 10000

                // Escape quotes simply to avoid JSON parser errors
                val safeBody = body.replace("\"", "\\\"").replace("\n", "\\n")
                val safeSender = sender.replace("\"", "\\\"")

                val jsonPayload = """
                    {
                        "sender_number": "$safeSender",
                        "message": "$safeBody"
                    }
                """.trimIndent()

                val out = OutputStreamWriter(conn.outputStream)
                out.write(jsonPayload)
                out.flush()
                out.close()

                val responseCode = conn.responseCode
                Log.i(TAG, "Forwarded to $urlStr. Response Code: $responseCode")
                
                if (responseCode in 200..299) {
                    Log.i(TAG, "Successfully synced M-Pesa message.")
                } else {
                    Log.e(TAG, "Failed to sync. Server returned code $responseCode")
                }
                
                conn.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Error forwarding SMS: ${e.message}", e)
            }
        }
    }
}
