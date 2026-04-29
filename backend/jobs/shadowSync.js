const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '../livesoko.db');
const backupsDir = path.resolve(__dirname, '../backups/ai_datasets');

// Ensure backup directory exists
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Function to hash sensitive PII (Phone numbers, exact names)
const hashData = (data) => {
  if (!data) return null;
  return crypto.createHash('sha256').update(data.toString()).digest('hex');
};

const runShadowSync = () => {
  const db = new sqlite3.Database(dbPath);
  console.log('[Shadow Sync] Starting daily AI dataset extraction...');

  // Get orders from the last 24 hours that are VERIFIED
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const query = `
    SELECT 
      o.id, o.shop_id, o.item_description, o.total_price, o.created_at, o.status,
      o.buyer_name, o.buyer_phone, o.buyer_location
    FROM orders o
    WHERE o.status = 'VERIFIED' AND o.created_at >= ?
  `;

  db.all(query, [oneDayAgo], (err, rows) => {
    if (err) {
      console.error('[Shadow Sync] Error extracting data:', err.message);
      db.close();
      return;
    }

    if (rows.length === 0) {
      console.log('[Shadow Sync] No verified orders in the last 24 hours. Skipping.');
      db.close();
      return;
    }

    // Anonymize the data
    const anonymizedData = rows.map(row => ({
      transaction_id: hashData(row.id),
      shop_hash: hashData(row.shop_id),
      item: row.item_description, // Keep item clear for AI to learn market demand
      price: row.total_price,     // Keep price clear for pricing trends
      timestamp: row.created_at,  // Keep time clear for velocity trends
      location_hint: row.buyer_location ? row.buyer_location.substring(0, 10) : null, // Rough location, not exact
      buyer_hash: hashData(row.buyer_phone) // Unique buyer identifier without exposing phone
    }));

    // Save to daily JSON file
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `dataset_${dateStr}.json`;
    const filePath = path.join(backupsDir, filename);

    fs.writeFile(filePath, JSON.stringify(anonymizedData, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('[Shadow Sync] Failed to write dataset file:', writeErr);
      } else {
        console.log(`[Shadow Sync] Successfully extracted ${anonymizedData.length} records to ${filename}`);
      }
      db.close();
    });
  });
};

const initShadowSync = () => {
  // Run every day at 3:00 AM EAT (00:00 UTC)
  cron.schedule('0 3 * * *', () => {
    runShadowSync();
  }, {
    scheduled: true,
    timezone: "Africa/Nairobi"
  });
  
  console.log('[Shadow Sync] Cron job scheduled for 3:00 AM EAT daily.');
};

module.exports = { initShadowSync, runShadowSync };
