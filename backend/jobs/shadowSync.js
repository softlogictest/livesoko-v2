const cron = require('node-cron');
const { getDb } = require('../lib/database');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

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
  const db = getDb();
  console.log('[Shadow Sync] Starting daily market data extraction...');

  // Get orders from the last 24 hours that are VERIFIED
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const query = `
      SELECT 
        o.id, o.shop_id, o.item_name, o.unit_price, o.quantity, o.created_at, o.status,
        o.buyer_name, o.buyer_phone, o.delivery_location
      FROM orders o
      WHERE o.status = 'VERIFIED' AND o.created_at >= ?
    `;

    const rows = db.prepare(query).all(oneDayAgo);

    if (rows.length === 0) {
      console.log('[Shadow Sync] No verified orders in the last 24 hours. Skipping.');
      return;
    }

    // Anonymize the data (Predictive model training prep)
    const anonymizedData = rows.map(row => ({
      transaction_id: hashData(row.id),
      shop_hash: hashData(row.shop_id),
      item: row.item_name,           // Keep clear for market demand logic
      price: row.unit_price,        // Keep clear for pricing models
      qty: row.quantity,
      timestamp: row.created_at,
      location_hint: row.delivery_location ? row.delivery_location.substring(0, 10) : null,
      buyer_hash: hashData(row.buyer_phone)
    }));

    // Save to daily JSON file
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `dataset_${dateStr}.json`;
    const filePath = path.join(backupsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(anonymizedData, null, 2));
    console.log(`[Shadow Sync] Successfully extracted ${anonymizedData.length} records to ${filename}`);
    
  } catch (err) {
    console.error('[Shadow Sync] Critical extraction error:', err.message);
  }
};

const initShadowSync = () => {
  // Run every day at 3:00 AM EAT (00:00 UTC)
  cron.schedule('0 3 * * *', () => {
    runShadowSync();
  }, {
    scheduled: true,
    timezone: "Africa/Nairobi"
  });
  
  console.log('[Shadow Sync] Market logic job scheduled for 3:00 AM EAT daily.');
};

module.exports = { initShadowSync, runShadowSync };
