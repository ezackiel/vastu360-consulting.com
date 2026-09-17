// notifications.js
// Notifies the Vastu360 team by WhatsApp whenever a booking is paid, using
// the WhatsApp Cloud API (Meta). Falls back to a console log if the
// integration isn't configured yet, so local development never breaks.
//
// Setup (see .env.example):
//   WHATSAPP_TOKEN            - permanent/system-user access token from Meta
//   WHATSAPP_PHONE_NUMBER_ID  - the "Phone number ID" of your WhatsApp Business sender
//   OWNER_WHATSAPP_NUMBER     - where alerts are sent, in international format
//                               (default: 60127005081, i.e. 012-700 5081 Malaysia)
//
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages

const OWNER_WHATSAPP_NUMBER = process.env.OWNER_WHATSAPP_NUMBER || "60127005081";
const PACKAGE_LABELS = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

function formatPurchaseMessage(booking, orderId) {
  const packageLabel = PACKAGE_LABELS[booking.package] || booking.package || "—";
  const lines = [
    "🛎️ New Vastu360 purchase",
    `Order: ${orderId}`,
    `Customer: ${booking.name || "—"}`,
    `Phone: ${booking.phone || "—"}`,
    `Email: ${booking.email || "—"}`,
    `Property type: ${booking.propertyType || "—"}${booking.residentialType ? ` (${booking.residentialType})` : ""}`,
    `Package: ${packageLabel}`,
    `Paid at: ${booking.paidAt || new Date().toISOString()}`
  ];
  return lines.join("\n");
}

async function notifyOwnerOfPurchase(booking, orderId) {
  const message = formatPurchaseMessage(booking, orderId);
  await sendWhatsApp(message);
}

function formatBankTransferClaimMessage(booking, orderId) {
  const packageLabel = PACKAGE_LABELS[booking.package] || booking.package || "—";
  return [
    "🏦 Bank transfer claimed — needs verification",
    `Order: ${orderId}`,
    `Customer: ${booking.name || "—"}`,
    `Phone: ${booking.phone || "—"}`,
    `Package: ${packageLabel}`,
    `Claimed at: ${booking.transferClaimedAt || new Date().toISOString()}`,
    "Check the RHB account for a matching transfer, then mark this order Paid in the admin dashboard."
  ].join("\n");
}

async function notifyOwnerOfBankTransferClaim(booking, orderId) {
  const message = formatBankTransferClaimMessage(booking, orderId);
  await sendWhatsApp(message);
}

function formatReceiptSubmittedMessage(booking, orderId, fileName) {
  const packageLabel = PACKAGE_LABELS[booking.package] || booking.package || "—";
  return [
    "🧾 Payment receipt submitted — report already released, please verify",
    `Order: ${orderId}`,
    `Customer: ${booking.name || "—"}`,
    `Phone: ${booking.phone || "—"}`,
    `Package: ${packageLabel}`,
    `Receipt file: ${fileName || "—"}`,
    `Submitted at: ${booking.paidAt || new Date().toISOString()}`,
    "The customer's report has already unlocked. Check the receipt/bank statement in the admin dashboard and update the order status if it doesn't check out."
  ].join("\n");
}

async function notifyOwnerOfReceiptSubmitted(booking, orderId, fileName) {
  const message = formatReceiptSubmittedMessage(booking, orderId, fileName);
  await sendWhatsApp(message);
}

async function sendWhatsApp(message) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    // Not configured yet — log instead of failing the payment flow.
    console.log("[WhatsApp notify — not configured, would have sent]\n" + message);
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: OWNER_WHATSAPP_NUMBER,
          type: "text",
          text: { body: message }
        })
      }
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      console.error(`WhatsApp notify failed (${response.status}): ${errBody}`);
    }
  } catch (err) {
    // Never let a notification failure break the payment/report flow.
    console.error("WhatsApp notify error:", err);
  }
}

module.exports = {
  notifyOwnerOfPurchase,
  notifyOwnerOfBankTransferClaim,
  notifyOwnerOfReceiptSubmitted,
  formatPurchaseMessage,
  OWNER_WHATSAPP_NUMBER
};
