// ============================================================
// DukaLive — Google Apps Script
// Attach to your Google Form via Extensions > Apps Script
// Trigger: onFormSubmit (Form Submit event)
// ============================================================

const DUKALIVE_URL = "http://192.168.0.101:3000/api/orders"; // Your LAN IP (check DukaLive banner)
const WEBHOOK_TOKEN = "tok_dba7e8c11c4b"; // From DukaLive Settings tab

function onFormSubmit(e) {
  const r = e.namedValues;

  const get = (keys) => {
    for (const k of keys) {
      const found = Object.keys(r).find(key => key.toLowerCase().includes(k.toLowerCase()));
      if (found && r[found][0]) return r[found][0].trim();
    }
    return '';
  };

  const payload = {
    webhook_token: WEBHOOK_TOKEN,
    buyer_name:        get(["full name", "name"]),
    buyer_tiktok:      get(["tiktok", "handle", "social"]) || "@unknown",
    buyer_phone:       get(["phone", "number", "tel", "whatsapp"]),
    delivery_location: get(["location", "delivery", "address", "area"]),
    item_name:         get(["item", "product", "what", "order"]),
    quantity:          parseInt(get(["quantity", "qty", "how many"])) || 1,
    unit_price:        parseFloat(get(["price", "amount", "cost"])) || 0,
    buyer_mpesa_name:  get(["mpesa name", "safaricom name", "m-pesa name", "mpesa"]),
    payment_type:      get(["payment", "pay"]).toUpperCase().includes("COD") ? "COD" : "MPESA",
  };

  try {
    const res = UrlFetchApp.fetch(DUKALIVE_URL, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    Logger.log("DukaLive response: " + res.getResponseCode() + " — " + res.getContentText());
  } catch (err) {
    Logger.log("DukaLive error: " + err.toString());
  }
}
