package com.softlogictech.livesokosync

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private val SMS_PERMISSION_CODE = 100

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val etWebhookUrl = findViewById<EditText>(R.id.etWebhookUrl)
        val btnSave = findViewById<Button>(R.id.btnSave)
        val tvStatus = findViewById<TextView>(R.id.tvStatus)

        // Load existing URL
        val prefs = getSharedPreferences("LiveSokoPrefs", Context.MODE_PRIVATE)
        val savedUrl = prefs.getString("webhookUrl", "")
        etWebhookUrl.setText(savedUrl)

        if (savedUrl?.isNotEmpty() == true) {
            tvStatus.text = "Configured. Listening for M-Pesa SMS..."
            tvStatus.setTextColor(android.graphics.Color.parseColor("#4CAF50")) // Green
        }

        btnSave.setOnClickListener {
            val url = etWebhookUrl.text.toString().trim()
            if (url.isEmpty()) {
                Toast.makeText(this, "Please enter a valid Webhook URL", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            prefs.edit().putString("webhookUrl", url).apply()
            
            checkPermissionAndStart(tvStatus)
        }
        
        // Auto check permission on start if URL exists
        if (savedUrl?.isNotEmpty() == true) {
            checkPermissionAndStart(tvStatus)
        }
    }

    private fun checkPermissionAndStart(tvStatus: TextView) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            
            ActivityCompat.requestPermissions(this, arrayOf(
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS
            ), SMS_PERMISSION_CODE)
            
            tvStatus.text = "Waiting for SMS Permissions..."
            tvStatus.setTextColor(android.graphics.Color.parseColor("#FF9800")) // Orange
        } else {
            Toast.makeText(this, "Configuration Saved & Listening!", Toast.LENGTH_SHORT).show()
            tvStatus.text = "Configured. Listening for M-Pesa SMS..."
            tvStatus.setTextColor(android.graphics.Color.parseColor("#4CAF50"))
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val tvStatus = findViewById<TextView>(R.id.tvStatus)
        if (requestCode == SMS_PERMISSION_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Permission Granted!", Toast.LENGTH_SHORT).show()
                tvStatus.text = "Configured. Listening for M-Pesa SMS..."
                tvStatus.setTextColor(android.graphics.Color.parseColor("#4CAF50"))
            } else {
                Toast.makeText(this, "SMS Permission is required!", Toast.LENGTH_LONG).show()
                tvStatus.text = "Permission Denied. Cannot listen."
                tvStatus.setTextColor(android.graphics.Color.parseColor("#F44336")) // Red
            }
        }
    }
}
