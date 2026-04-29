package com.softlogictech.livesokosync

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import android.util.Log
import android.widget.Toast
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class SmsReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val prefs = context.getSharedPreferences("LiveSokoPrefs", Context.MODE_PRIVATE)
        val webhookUrl = prefs.getString("webhook_url", "")

        if (webhookUrl.isNullOrEmpty()) {
            Log.w(TAG, "No webhook URL configured. Ignoring SMS.")
            return
        }

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        for (sms in messages) {
            val sender = sms.originatingAddress ?: ""
            val body = sms.messageBody ?: ""

            // Production filter: Only forward if it looks like an M-Pesa message
            if (sender.contains("MPESA", ignoreCase = true) || body.contains("MPESA", ignoreCase = true) || body.contains("M-PESA", ignoreCase = true)) {
                Log.d(TAG, "M-PESA SMS detected! Forwarding to $webhookUrl")
                forwardSms(context, webhookUrl, sender, body)
            } else {
                Log.d(TAG, "Ignored non-MPESA message from $sender")
            }
        }
    }

    companion object {
        private const val TAG = "LiveSokoSmsReceiver"
        private val executor = Executors.newSingleThreadExecutor()

        fun forwardSms(context: Context, urlStr: String, sender: String, body: String) {
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
                    
                    Handler(Looper.getMainLooper()).post {
                        if (responseCode in 200..299) {
                            Toast.makeText(context, "Sync Worked ✅", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(context, "Server Error: $responseCode", Toast.LENGTH_LONG).show()
                        }
                    }
                    
                    conn.disconnect()
                } catch (e: Exception) {
                    Log.e(TAG, "Error forwarding SMS: ${e.message}", e)
                    Handler(Looper.getMainLooper()).post {
                        Toast.makeText(context, "Network Error: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }
}
