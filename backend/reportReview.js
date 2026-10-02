// reportReview.js
// Report hold-and-review flow: after payment, the PDF is generated and saved
// to disk, the owner is alerted on WhatsApp, and the customer only gets the
// report once the owner approves it.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const REPORT_DIR = path.join(__dirname, "uploads", "reports");
fs.mkdirSync(REPORT_DIR, { recursive: true });

function reportFilePath(orderId) {
  return path.join(REPORT_DIR, `${String(orderId).replace(/[^A-Za-z0-9_-]/g, "")}.pdf`);
}

// Generates the PDF into a file (instead of streaming to the customer).
function generateReportToFile(generateReport, booking, scoring, orderId) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(reportFilePath(orderId));
    out.on("finish", () => resolve(reportFilePath(orderId)));
    out.on("error", reject);
    try {
      generateReport(booking, scoring, out);
    } catch (err) {
      reject(err);
    }
  });
}

// Signed token so the owner can open the review link from WhatsApp on a
// phone without logging in. Set REVIEW_SECRET in .env (falls back to ADMIN_PASSWORD).
function secret() {
  return process.env.REVIEW_SECRET || process.env.ADMIN_PASSWORD || "change-me";
}
function signReviewToken(orderId) {
  return crypto.createHmac("sha256", secret()).update(String(orderId)).digest("hex").slice(0, 32);
}
function verifyReviewToken(orderId, token) {
  if (!token) return false;
  const expected = Buffer.from(signReviewToken(orderId));
  const given = Buffer.from(String(token));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

module.exports = { reportFilePath, generateReportToFile, signReviewToken, verifyReviewToken };
