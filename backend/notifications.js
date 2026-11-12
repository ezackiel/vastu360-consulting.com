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
    "🧾 Payment receipt submitted — please verify the transfer",
    `Order: ${orderId}`,
    `Customer: ${booking.name || "—"}`,
    `Phone: ${booking.phone || "—"}`,
    `Package: ${packageLabel}`,
    `Receipt file: ${fileName || "—"}`,
    `Submitted at: ${booking.paidAt || new Date().toISOString()}`,
    "Check the receipt/bank statement in the admin dashboard. The report is held until you approve it (you'll get a separate WhatsApp with the review link)."
  ].join("\n");
}

async function notifyOwnerOfReceiptSubmitted(booking, orderId, fileName) {
  const message = formatReceiptSubmittedMessage(booking, orderId, fileName);
  await sendWhatsApp(message);
}


// ---- Report ready for owner review (sent right after payment) ----
function formatReportReadyMessage(booking, orderId, reviewUrl) {
  const packageLabel = PACKAGE_LABELS[booking.package] || booking.package || "—";
  return [
    "📄 New Vastu360 report — please review before it goes to the customer",
    `Order: ${orderId}`,
    `Customer: ${booking.name || "—"}`,
    `Phone: ${booking.phone || "—"}`,
    `Email: ${booking.email || "—"}`,
    `Package: ${packageLabel}`,
    `Paid at: ${booking.paidAt || new Date().toISOString()}`,
    "",
    "Open the report, check it, and tap Approve to release it to the customer:",
    reviewUrl
  ].join("\n");
}

async function notifyOwnerOfReportReady(booking, orderId, reviewUrl, pdfPath) {
  await sendWhatsApp(formatReportReadyMessage(booking, orderId, reviewUrl));
  if (pdfPath) await sendWhatsAppDocument(pdfPath, `vastu360-report-${orderId}.pdf`, `Report for ${booking.name || orderId} (${orderId})`);
}

// Attaches the PDF itself to WhatsApp (upload to Meta, then send as a document)
async function sendWhatsAppDocument(filePath, fileName, caption) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) return;
  try {
    const fs = require("fs");
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", "application/pdf");
    form.append("file", new Blob([fs.readFileSync(filePath)], { type: "application/pdf" }), fileName);
    const up = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      body: form
    });
    const upBody = await up.json().catch(() => ({}));
    if (!up.ok || !upBody.id) {
      console.error(`WhatsApp media upload failed (${up.status}):`, JSON.stringify(upBody));
      return;
    }
    const send = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: OWNER_WHATSAPP_NUMBER,
        type: "document",
        document: { id: upBody.id, filename: fileName, caption }
      })
    });
    const sendBody = await send.text().catch(() => "");
    if (!send.ok) {
      console.error(`WhatsApp document send FAILED (${send.status}) to ${OWNER_WHATSAPP_NUMBER}: ${sendBody}`);
    } else {
      console.log(`WhatsApp document accepted by Meta for ${OWNER_WHATSAPP_NUMBER}: ${sendBody}`);
    }
  } catch (err) {
    console.error("WhatsApp document ERROR (network/exception):", err);
  }
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

    const body = await response.text().catch(() => "");
    if (!response.ok) {
      // Meta rejected the request outright (bad token, bad number, etc).
      console.error(`WhatsApp notify FAILED (${response.status}) to ${OWNER_WHATSAPP_NUMBER}: ${body}`);
    } else {
      // Meta accepted the message for delivery. This does NOT guarantee it reached
      // the phone — WhatsApp silently drops free-form messages to numbers outside
      // the 24-hour customer-service window (i.e. the recipient hasn't messaged
      // your WhatsApp number in the last 24h). If delivery still doesn't show up,
      // that's almost always the cause, not a bug here.
      console.log(`WhatsApp notify accepted by Meta for ${OWNER_WHATSAPP_NUMBER}: ${body}`);
    }
  } catch (err) {
    // Never let a notification failure break the payment/report flow.
    console.error("WhatsApp notify ERROR (network/exception):", err);
  }
}

module.exports = {
  notifyOwnerOfPurchase,
  notifyOwnerOfBankTransferClaim,
  notifyOwnerOfReceiptSubmitted,
  notifyOwnerOfReportReady,
  formatPurchaseMessage,
  OWNER_WHATSAPP_NUMBER
};
