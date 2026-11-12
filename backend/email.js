// email.js
// Email alerts via SMTP (nodemailer):
//   1. Owner gets the finished report (PDF attached) + a link to review/edit/approve it.
//   2. Customer gets a "your report is ready" email once the owner approves.
// Sending order of preference:
//   1. Resend (HTTPS API)  - set RESEND_API_KEY. Works on Render's free plan,
//      which blocks SMTP ports 25/465/587.
//   2. SMTP (nodemailer)   - set SMTP_HOST, SMTP_USER, SMTP_PASS.
//   3. Console log         - when neither is configured (local development).
//
// .env: RESEND_API_KEY, SMTP_FROM (e.g. "Vastu360 <info@vastu360.my>"), OWNER_EMAIL
//       (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS only if you use SMTP)

const nodemailer = require("nodemailer");

const PACKAGE_LABELS = { bronze: "Bronze", silver: "Silver", gold: "Gold" };
const esc = v => String(v ?? "-").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function configured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport = null;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transport;
}

async function sendViaResend({ to, subject, text, html, attachments }) {
  const fs = require("fs");
  const body = {
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM,
    to: [to],
    subject, text, html
  };
  if (!body.from) throw new Error("Set SMTP_FROM (e.g. \"Vastu360 <info@vastu360.my>\") to send with Resend.");
  if (attachments && attachments.length) {
    body.attachments = attachments.map(a => ({
      filename: a.filename,
      content: fs.readFileSync(a.path).toString("base64")
    }));
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function send({ to, subject, text, html, attachments }) {
  if (!to) { console.log(`[email] No recipient for "${subject}" - set OWNER_EMAIL / customer email.`); return; }
  if (process.env.RESEND_API_KEY) return sendViaResend({ to, subject, text, html, attachments });
  if (!configured()) {
    console.log(`[email - SMTP not configured] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await getTransport().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to, subject, text, html, attachments
  });
}

// Owner: new report waiting for review
async function emailOwnerReportReady(booking, orderId, reviewUrl, pdfPath) {
  const pkg = PACKAGE_LABELS[booking.package] || booking.package || "-";
  const text = [
    "A new Vastu360 report is ready for your review.",
    "",
    `Order: ${orderId}`,
    `Customer: ${booking.name || "-"}`,
    `Phone: ${booking.phone || "-"}`,
    `Email: ${booking.email || "-"}`,
    `Package: ${pkg}`,
    "",
    "Open this link to read the report, edit it, and approve it:",
    reviewUrl,
    "",
    "The customer cannot see the report until you approve it."
  ].join("\n");
  const html = `<p>A new Vastu360 report is ready for your review.</p>
<p><b>Order:</b> ${esc(orderId)}<br><b>Customer:</b> ${esc(booking.name)}<br><b>Phone:</b> ${esc(booking.phone)}<br>
<b>Email:</b> ${esc(booking.email)}<br><b>Package:</b> ${esc(pkg)}</p>
<p><a href="${esc(reviewUrl)}" style="background:#8a5a2b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Review, edit &amp; approve</a></p>
<p style="color:#777">The customer cannot see the report until you approve it.</p>`;
  await send({
    to: process.env.OWNER_EMAIL,
    subject: `Vastu360 report to review - ${booking.name || orderId} (${pkg})`,
    text, html,
    attachments: pdfPath ? [{ filename: `vastu360-report-${orderId}.pdf`, path: pdfPath }] : []
  });
}

// Customer: report approved
async function emailCustomerReportApproved(booking, orderId) {
  const appUrl = process.env.APP_URL || "";
  const link = booking.userId
    ? `${appUrl}/` // account orders: log in and open "My reports"
    : `${process.env.BACKEND_PUBLIC_URL || appUrl}/report/${orderId}`;
  const how = booking.userId
    ? "Log in to your Vastu360 account and open your reports to download it."
    : "Use the link below to download it.";
  const text = `Hi ${booking.name || ""},\n\nYour Vastu360 audit report (order ${orderId}) has been checked by our team and is ready.\n${how}\n${link}\n\nThank you for choosing Vastu360.`;
  const html = `<p>Hi ${esc(booking.name || "")},</p><p>Your Vastu360 audit report (order <b>${esc(orderId)}</b>) has been checked by our team and is ready.</p>
<p>${esc(how)}</p><p><a href="${esc(link)}" style="background:#8a5a2b;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Get my report</a></p><p>Thank you for choosing Vastu360.</p>`;
  await send({ to: booking.email, subject: "Your Vastu360 report is ready", text, html });
}

module.exports = { emailOwnerReportReady, emailCustomerReportApproved };
