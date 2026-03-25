const { getDb } = require('./database');
const { broadcast } = require('../routes/events');
const crypto = require('crypto');

let pollingInterval = null;
let lastRowCount = 0;

// Parse a published Google Sheet CSV into rows
function parseCSV(csv) {
  const lines = csv.split('\n').filter(l => l.trim());
  if (lines.length < 2) return []; // header + at least 1 data row

  // Parse header (first line)
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

// Handle CSV fields that may contain commas inside quotes
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

// Normalize phone number to +254XXXXXXXXX
function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('07') || cleaned.startsWith('01')) {
    cleaned = '+254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+254' + cleaned;
  }
  return cleaned;
}

// Map Google Sheet column headers to our DB fields
// Flexible matching by checking if header contains keywords
function mapRow(row) {
  let mapped = {};
  for (const [key, value] of Object.entries(row)) {
    const k = key.toLowerCase();
    if ((k.includes('mpesa') || k.includes('safaricom') || k.includes('m-pesa')) && k.includes('name')) mapped.buyer_mpesa_name = value;
    else if (k.includes('name') && !k.includes('tiktok') && !k.includes('item')) mapped.buyer_name = value;
    else if (k.includes('tiktok') || k.includes('handle')) mapped.buyer_tiktok = value;
    else if (k.includes('phone') || k.includes('number') || k.includes('tel')) mapped.buyer_phone = value;
    else if (k.includes('location') || k.includes('delivery') || k.includes('address')) mapped.delivery_location = value;
    else if (k.includes('item') || k.includes('product')) mapped.item_name = value;
    else if (k.includes('quantity') || k.includes('qty')) mapped.quantity = value;
    else if (k.includes('price') || k.includes('amount')) mapped.unit_price = value;
  }
  return mapped;
}

// Parse "Red Heels — Ksh 1500" or "Red Heels - 1500" into { itemName, unitPrice }
function parseItemAndPrice(raw) {
  if (!raw) return { itemName: '', unitPrice: 0 };
  // Match patterns like: "Item — Ksh 1500", "Item - Ksh 1,500", "Item (Ksh 1500)", "Item 1500"
  const priceMatch = raw.match(/(?:ksh|kes|ksh\.)\s*([\d,]+)/i) || raw.match(/[-\u2014(]\s*([\d,]+)/);
  if (priceMatch) {
    const unitPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
    // Item name is everything before the separator
    const itemName = raw.split(/\s*(?:[-\u2014(]|ksh|kes)\s*/i)[0].trim();
    return { itemName: itemName || raw.trim(), unitPrice };
  }
  return { itemName: raw.trim(), unitPrice: 0 };
}

async function pollSheet(sheetUrl, sellerId, sessionId) {
  try {
    const response = await fetch(sheetUrl);
    if (!response.ok) {
      console.error(`Sheet poll failed (${response.status}), backing off...`);
      return;
    }

    const csv = await response.text();
    const rows = parseCSV(csv);

    if (rows.length <= lastRowCount) return; // No new rows

    const db = getDb();
    const newRows = rows.slice(lastRowCount);
    lastRowCount = rows.length;

    for (const row of newRows) {
      const mapped = mapRow(row);

      // Skip rows with missing required fields
      if (!mapped.buyer_name || !mapped.item_name) continue;

      const id = crypto.randomUUID();
      const phone = normalizePhone(mapped.buyer_phone || '');
      const quantity = parseInt(mapped.quantity) || 1;

      // Parse price from dropdown format "Item — Ksh 1500", or fall back to explicit price column
      const { itemName, unitPrice: parsedPrice } = parseItemAndPrice(mapped.item_name);
      const unitPrice = parsedPrice || parseFloat(mapped.unit_price) || 0;
      const finalItemName = itemName || mapped.item_name;

      try {
        db.prepare(`
          INSERT INTO orders (id, session_id, seller_id, buyer_name, buyer_tiktok, buyer_phone, delivery_location, item_name, quantity, unit_price, buyer_mpesa_name, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `).run(
          id, sessionId, sellerId,
          mapped.buyer_name,
          mapped.buyer_tiktok || '@unknown',
          phone,
          mapped.delivery_location || 'Not specified',
          finalItemName,
          quantity,
          unitPrice,
          mapped.buyer_mpesa_name || mapped.buyer_name || null
        );

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
        broadcast('order:new', order);
        console.log(`📦 New order from sheet: ${mapped.buyer_name} — ${finalItemName} × ${quantity} @ Ksh ${unitPrice}`);
      } catch (err) {
        // Likely duplicate, skip
        if (!err.message.includes('UNIQUE')) {
          console.error('Error inserting sheet order:', err.message);
        }
      }
    }
  } catch (err) {
    console.error('Sheet poll error:', err.message);
  }
}

function startPolling(sheetUrl, sellerId, sessionId) {
  if (pollingInterval) stopPolling();

  // Baseline poll: set lastRowCount to current sheet size WITHOUT processing any rows.
  // This ensures old submissions from before this session are never re-ingested.
  lastRowCount = 0;
  fetch(sheetUrl)
    .then(r => r.text())
    .then(csv => {
      const rows = parseCSV(csv);
      lastRowCount = rows.length; // skip everything up to now
      console.log(`📋 Sheet baseline: ${lastRowCount} existing rows skipped`);
    })
    .catch(() => { lastRowCount = 0; });

  // Then poll every 5 seconds for NEW rows only
  pollingInterval = setInterval(() => {
    pollSheet(sheetUrl, sellerId, sessionId);
  }, 5000);

  console.log('📋 Google Sheet polling started (every 5s)');
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    lastRowCount = 0;
    console.log('📋 Google Sheet polling stopped');
  }
}

module.exports = { startPolling, stopPolling };
