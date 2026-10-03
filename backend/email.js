// email.js
// Sends the "report ready for review" alert by email as well as WhatsApp,
// using plain SMTP (works with Hostinger's built-in email hosting, or any
// other mailbox) via nodemailer. Never throws — a failed email should never
// break the payment/report flow.

const nodemailer = require("nodemailer");
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

function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let _transporter = null;
function transporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    // true for port 465 (implicit TLS), false for 587/25 (STARTTLS)
    secure: String(process.env.SMTP_PORT || "465") === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return _transporter;
}

// Sends the owner an email when a report is ready for review, with the PDF
// attached (when available) and a link to the review/approve page.
async function notifyOwnerOfReportReadyEmail(booking, orderId, reviewUrl, pdfPath) {
  if (!smtpConfigured()) {
    console.log("[Email notify — SMTP not configured, would have sent] to", ownerEmail(), "for order", orderId);
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
    attachments.push({ filename: `vastu360-report-${orderId}.pdf`, path: pdfPath });
  }

  try {
    const info = await transporter().sendMail({
      from: `"Vastu360" <${process.env.SMTP_USER}>`,
      to: ownerEmail(),
      subject,
      text,
      html,
      attachments
    });
    console.log(`Email notify sent to ${ownerEmail()} for order ${orderId}: ${info.messageId}`);
  } catch (err) {
    console.error(`Email notify FAILED for order ${orderId}:`, err.message || err);
  }
}

module.exports = { notifyOwnerOfReportReadyEmail, ownerEmail, smtpConfigured };
