// email.js
// Sends the "report ready for review" alert by email, alongside WhatsApp.
//
// IMPORTANT: this uses the Resend HTTPS API (https://resend.com), NOT raw SMTP.
// Render blocks outbound SMTP ports (25/465/587) on its free/starter plans as
// an anti-abuse measure, so a direct connection to smtp.hostinger.com (or any
// SMTP server) will time out from here no matter how correct the credentials
// are. Resend's API runs over normal HTTPS (port 443), which is never blocked,
// so this works reliably from Render. Resend's free tier covers this volume
// easily (3,000 emails/month).
//
// Setup (see README/.env.example for the full walkthrough):
//   1. Create a free account at https://resend.com
//   2. Get an API key -> set RESEND_API_KEY
//   3. (Optional but recommended) verify vastu360.my as a sending domain in
//      Resend so the alert comes from info@vastu360.my -> set RESEND_FROM
//      once verified. Until then it sends from Resend's shared test address,
//      which still arrives fine at OWNER_EMAIL.

const fs = require("fs");

const PACKAGE_LABELS = {
  bronze: "Bronze (RM 250)",
  silver: "Silver (RM 500)",
  gold: "Gold (RM 1,500+)",
  commercial: "Commercial",
  factory: "Factory / Industrial"
};

function ownerEmail() {
  return process.env.OWNER_EMAIL || "info@vastu360.my";
}

function fromAddress() {
  // Once vastu360.my is verified in Resend, set RESEND_FROM=Vastu360 <info@vastu360.my>
  return process.env.RESEND_FROM || "Vastu360 Alerts <onboarding@resend.dev>";
}

function emailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

// Sends the owner an email when a report is ready for review, with the PDF
// attached (when available, base64-encoded as Resend's API requires) and a
// link to the review/approve page. Never throws.
async function notifyOwnerOfReportReadyEmail(booking, orderId, reviewUrl, pdfPath) {
  if (!emailConfigured()) {
    console.log("[Email notify — RESEND_API_KEY not configured, would have sent] to", ownerEmail(), "for order", orderId);
    return;
  }

  const packageLabel = PACKAGE_LABELS[booking.package] || booking.package || "—";
  const subject = `New Vastu360 report to review — ${booking.name || orderId} (${orderId})`;
  const text = [
    `A new report is ready for your review before it goes to the customer.`,
    ``,
    `Order: ${orderId}`,
    `Customer: ${booking.name || "—"}`,
    `Phone: ${booking.phone || "—"}`,
    `Email: ${booking.email || "—"}`,
    `Package: ${packageLabel}`,
    `Paid at: ${booking.paidAt || new Date().toISOString()}`,
    ``,
    `Open the report, check it, and approve it here:`,
    reviewUrl
  ].join("\n");
  const html = `
    <p>A new report is ready for your review before it goes to the customer.</p>
    <table cellpadding="4" style="border-collapse:collapse">
      <tr><td><b>Order</b></td><td>${orderId}</td></tr>
      <tr><td><b>Customer</b></td><td>${booking.name || "—"}</td></tr>
      <tr><td><b>Phone</b></td><td>${booking.phone || "—"}</td></tr>
      <tr><td><b>Email</b></td><td>${booking.email || "—"}</td></tr>
      <tr><td><b>Package</b></td><td>${packageLabel}</td></tr>
      <tr><td><b>Paid at</b></td><td>${booking.paidAt || new Date().toISOString()}</td></tr>
    </table>
    <p><a href="${reviewUrl}" style="display:inline-block;padding:12px 20px;background:#1a7f37;color:#fff;
       text-decoration:none;border-radius:8px">Open report &amp; approve</a></p>
    <p style="color:#888;font-size:13px">Or copy this link: ${reviewUrl}</p>
  `;

  const attachments = [];
  if (pdfPath && fs.existsSync(pdfPath)) {
    attachments.push({
      filename: `vastu360-report-${orderId}.pdf`,
      content: fs.readFileSync(pdfPath).toString("base64")
    });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [ownerEmail()],
        subject,
        text,
        html,
        attachments
      })
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`Email notify FAILED (${res.status}) for order ${orderId}: ${body}`);
    } else {
      console.log(`Email notify sent to ${ownerEmail()} for order ${orderId}: ${body}`);
    }
  } catch (err) {
    console.error(`Email notify ERROR for order ${orderId}:`, err.message || err);
  }
}

module.exports = { notifyOwnerOfReportReadyEmail, ownerEmail, emailConfigured };
