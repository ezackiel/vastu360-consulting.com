// server.js
// Vastu360 backend: receives bookings, starts payment, confirms via callback,
// then generates the PDF report on demand.
//
// Requires: npm install express cors pdfkit
// (swap the in-memory Map for your real database when ready)

require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { calculateScore } = require("./vastuLogic");
const { EXPECTED_ROOM_IDS } = require("./questionSets");
const generateReport = require("./pdfGenerator");
const { generateReply, generatePublicReply } = require("./chatEngine");
const { analyzeFloorPlan, ROOM_VOCABULARY, DIRECTIONS } = require("./floorPlanVision");
const auth = require("./auth");
const { notifyOwnerOfPurchase, notifyOwnerOfBankTransferClaim, notifyOwnerOfReceiptSubmitted } = require("./notifications");

const app = express();
app.use(cors());
app.use(express.json());

auth.ensureAdminFromEnv(); // creates/refreshes the admin login from ADMIN_EMAIL / ADMIN_PASSWORD

const CHAT_WINDOW_DAYS = 30; // every package includes 30 days of chat access after payment
const PUBLIC_CHAT_MAX_MESSAGES = 40; // cap per browser session to keep the free widget from being abused

// ---------- Storage (replace with Postgres/etc. — see database.js) ----------
const bookings = new Map();
const chatThreads = new Map(); // orderId -> [{ role, content, timestamp }]
const publicChatThreads = new Map(); // sessionId -> [{ role, content, timestamp }]
const floorPlans = new Map(); // orderId -> [{ id, originalName, storedName, mimeType, size, uploadedAt, reviewStatus }]
const reviews = new Map(); // reviewId -> { id, orderId, name, rating, comment, package, createdAt, status }
const paymentReceipts = new Map(); // orderId -> [{ id, originalName, storedName, mimeType, size, uploadedAt }]

// ---------- Floor plan upload ----------
// NOTE: this stores files on local disk, fine for a single server / early
// testing. Move to S3 (or similar) before production — local disk won't
// survive redeploys and won't work if you ever run more than one server
// instance. Swap the multer `diskStorage` below for a multer-s3 storage
// engine when you're ready; nothing else in this file needs to change.
const UPLOAD_DIR = path.join(__dirname, "uploads", "floorplans");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_UPLOAD_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB — floor plan scans/blueprints can be large

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10);
      cb(null, `${crypto.randomBytes(16).toString("hex")}${ext}`);
    }
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      return cb(new Error("Only PDF, PNG, JPEG, or WEBP files are accepted."));
    }
    cb(null, true);
  }
});

function newOrderId() {
  return "VAS-" + Date.now().toString(36).toUpperCase();
}

// ---------- Step 1: customer submits the booking form ----------
app.post("/submit", auth.optionalAuth, async (req, res) => {
  const booking = req.body; // { name, email, phone, propertyType, package, q_entrance, q_kitchen, ... }
  const orderId = newOrderId();
  bookings.set(orderId, {
    ...booking,
    status: "pending_payment",
    userId: req.user ? req.user.id : null,
    createdAt: new Date().toISOString()
  });

  // Commercial/industrial bookings don't have a package price — skip payment.
  const requiresPayment = booking.propertyType === "residential" && !!booking.package;
  const amount = requiresPayment ? PACKAGE_PRICES[booking.package] || 0 : 0;
  res.json({ orderId, requiresPayment, amount });
});

// Upload a floor plan / blueprint against an existing order. Accepts one
// file per request under field name "floorPlan"; call multiple times for
// multiple pages/files. Files are queued for manual review by the
// Vastu360 team by default. Customers can optionally trigger AI analysis
// on an uploaded file via POST .../analyze below — that never replaces
// manual review, and never writes into the booking until the customer
// explicitly confirms via POST .../apply.
app.post("/order/:orderId/floor-plan", auth.optionalAuth, (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found." });
  if (booking.userId && (!req.user || req.user.id !== booking.userId)) {
    return res.status(401).json({ message: "Please log in to the account that made this booking." });
  }

  upload.single("floorPlan")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed." });
    if (!req.file) return res.status(400).json({ message: "No file received." });

    const record = {
      id: crypto.randomBytes(8).toString("hex"),
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      reviewStatus: "pending" // "pending" | "reviewed" — set by the team, not the customer
    };
    const list = floorPlans.get(req.params.orderId) || [];
    list.push(record);
    floorPlans.set(req.params.orderId, list);

    notifyOwnerOfPurchase(
      { ...booking, floorPlanUploaded: record.originalName },
      req.params.orderId
    ); // reuse the existing notify hook so the team knows a plan needs review

    res.status(201).json({ file: { id: record.id, originalName: record.originalName, uploadedAt: record.uploadedAt, reviewStatus: record.reviewStatus } });
  });
});

// List floor plans attached to an order (metadata only, no raw file access)
app.get("/order/:orderId/floor-plan", auth.optionalAuth, (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found." });
  if (booking.userId && (!req.user || req.user.id !== booking.userId)) {
    return res.status(401).json({ message: "Please log in to the account that made this booking." });
  }
  const list = (floorPlans.get(req.params.orderId) || []).map(f => ({
    id: f.id, originalName: f.originalName, uploadedAt: f.uploadedAt, reviewStatus: f.reviewStatus,
    aiAnalysis: f.aiAnalysis || null
  }));
  res.json({ files: list });
});

// Run AI vision analysis on an already-uploaded floor plan file. This is a
// DRAFT only — see the module header in floorPlanVision.js for why the
// output should never be trusted blindly. Nothing here writes into the
// booking; that only happens if the customer confirms via .../apply below.
const ANALYZE_RATE_LIMIT_MS = 10_000; // per-file cooldown, cheap guard against accidental repeat clicks
app.post("/order/:orderId/floor-plan/:fileId/analyze", auth.optionalAuth, async (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found." });
  if (booking.userId && (!req.user || req.user.id !== booking.userId)) {
    return res.status(401).json({ message: "Please log in to the account that made this booking." });
  }
  const list = floorPlans.get(req.params.orderId) || [];
  const file = list.find(f => f.id === req.params.fileId);
  if (!file) return res.status(404).json({ message: "File not found." });

  if (file.aiAnalysis && Date.now() - new Date(file.aiAnalysis.analyzedAt).getTime() < ANALYZE_RATE_LIMIT_MS) {
    return res.json({ analysis: file.aiAnalysis, cached: true });
  }

  try {
    const fileBuffer = fs.readFileSync(path.join(UPLOAD_DIR, file.storedName));
    const analysis = await analyzeFloorPlan(fileBuffer, file.mimeType);
    file.aiAnalysis = analysis;
    res.json({ analysis, cached: false });
  } catch (err) {
    res.status(502).json({ message: err.message || "AI analysis failed. Please try manual input instead." });
  }
});

// Customer confirms (and may have edited) the AI-detected rooms — this is
// the ONLY point where floor-plan-derived data gets written into the
// booking, and it writes into exactly the same q_<roomId> / q_<roomId>_width
// / q_<roomId>_length fields the manual DirectionQuestions form produces,
// so every downstream calculation (scoring, Ayadi, Dosha, PDF) works
// completely unchanged regardless of which path the data came from.
app.post("/order/:orderId/floor-plan/:fileId/apply", auth.optionalAuth, (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found." });
  if (booking.userId && (!req.user || req.user.id !== booking.userId)) {
    return res.status(401).json({ message: "Please log in to the account that made this booking." });
  }

  const { rooms } = req.body || {};
  if (!Array.isArray(rooms) || rooms.length === 0) {
    return res.status(400).json({ message: "No rooms to apply." });
  }

  let applied = 0;
  rooms.forEach(r => {
    if (!ROOM_VOCABULARY.includes(r.roomId)) return; // skip anything not mapped to a real room id
    if (r.direction && DIRECTIONS.includes(r.direction)) {
      booking[`q_${r.roomId}`] = r.direction;
      applied++;
    }
    if (r.widthFeet) booking[`q_${r.roomId}_width`] = String(r.widthFeet);
    if (r.lengthFeet) booking[`q_${r.roomId}_length`] = String(r.lengthFeet);
  });

  res.json({ ok: true, roomsApplied: applied });
});

// ---------- Customer reviews ----------
// One review per completed order. New submissions start "pending" and only
// show on the public site once an admin approves them (see /admin/reviews)
// — this keeps the public Trust section genuine rather than auto-publishing
// unmoderated text.
function reviewForOrder(orderId) {
  for (const r of reviews.values()) if (r.orderId === orderId) return r;
  return null;
}

app.post("/order/:orderId/review", auth.optionalAuth, (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found." });
  if (booking.userId && (!req.user || req.user.id !== booking.userId)) {
    return res.status(401).json({ message: "Please log in to the account that made this booking." });
  }
  if (booking.status !== "paid") {
    return res.status(403).json({ message: "Reviews can only be left on a completed order." });
  }

  const { rating, comment, name } = req.body || {};
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ message: "Rating must be a whole number from 1 to 5." });
  }
  if (!comment || !comment.trim()) {
    return res.status(400).json({ message: "Please add a few words about your experience." });
  }
  if (comment.length > 1000) {
    return res.status(400).json({ message: "Review is too long — please keep it under 1000 characters." });
  }

  const existing = reviewForOrder(req.params.orderId);
  const record = {
    id: existing ? existing.id : crypto.randomBytes(8).toString("hex"),
    orderId: req.params.orderId,
    name: (name || booking.name || "Vastu360 customer").trim().slice(0, 80),
    rating: numericRating,
    comment: comment.trim(),
    package: booking.package || null,
    propertyType: booking.propertyType || null,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "pending" // editing an existing review also sends it back for re-approval
  };
  reviews.set(record.id, record);

  res.status(existing ? 200 : 201).json({
    review: { id: record.id, rating: record.rating, comment: record.comment, status: record.status }
  });
});

app.get("/order/:orderId/review", auth.optionalAuth, (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found." });
  if (booking.userId && (!req.user || req.user.id !== booking.userId)) {
    return res.status(401).json({ message: "Please log in to the account that made this booking." });
  }
  const existing = reviewForOrder(req.params.orderId);
  res.json({ review: existing ? { id: existing.id, rating: existing.rating, comment: existing.comment, status: existing.status } : null });
});

// Public — only approved reviews, and only the fields safe to show publicly
app.get("/reviews", (req, res) => {
  const approved = [...reviews.values()]
    .filter(r => r.status === "approved")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30)
    .map(r => ({ name: r.name, rating: r.rating, comment: r.comment, package: r.package, propertyType: r.propertyType, createdAt: r.createdAt }));
  res.json({ reviews: approved });
});

// Gold is advertised as "RM 1,500+" since a site visit can add cost — 1500
// is charged online as the starting amount; any overage is arranged
// directly with the customer, same as commercial/industrial custom quotes.
const PACKAGE_PRICES = { bronze: 250, silver: 500, gold: 1500 };
const MOCK_PAYMENT = process.env.MOCK_PAYMENT !== "false"; // default true until real TNG creds are set

async function createTngPayment(orderId, booking) {
  const amount = PACKAGE_PRICES[booking.package] || 0;

  // ---- Mock mode: lets you develop/test the full flow with no TNG account ----
  if (MOCK_PAYMENT) {
    // Auto-confirms the order as paid, same as a real TNG callback would.
    const record = bookings.get(orderId);
    record.status = "paid";
    record.paidAt = new Date().toISOString();
    bookings.set(orderId, record);
    notifyOwnerOfPurchase(record, orderId); // fire-and-forget; never blocks the payment flow
    return `${process.env.APP_URL || "http://localhost:3000"}/payment/mock-success?orderId=${orderId}`;
  }

  // ---- Real TNG Digital request ----
  // NOTE: this follows TNG Digital's published request-signing shape (RSA256
  // signature header, merchant/client IDs, JSON body) but has not been tested
  // against their live gateway — you'll need your TNG sandbox credentials and
  // to confirm exact field names/endpoint against your onboarding docs before
  // going live. See https://open.tngdigital.com.my (merchant portal) for the
  // authoritative spec.
  if (!process.env.TNG_MERCHANT_ID || !process.env.TNG_CLIENT_ID || !process.env.TNG_PRIVATE_KEY_PATH) {
    throw new Error("TNG Digital credentials missing — set TNG_MERCHANT_ID, TNG_CLIENT_ID and TNG_PRIVATE_KEY_PATH, or set MOCK_PAYMENT=true for local testing.");
  }

  const payload = {
    merchantId: process.env.TNG_MERCHANT_ID,
    clientId: process.env.TNG_CLIENT_ID,
    orderId,
    amount: amount.toFixed(2),
    currency: "MYR",
    subject: `Vastu360 ${booking.package} report`,
    paymentReturnUrl: `${process.env.APP_URL}/payment/return?orderId=${orderId}`,
    paymentNotifyUrl: `${process.env.APP_URL}/payment/tng-callback`
  };

  const signature = signTngRequest(payload);

  const response = await fetch(process.env.TNG_PAYMENT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": process.env.TNG_CLIENT_ID,
      Signature: signature
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`TNG payment request failed (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const redirectUrl = data?.actionForm?.redirectionUrl;
  if (!redirectUrl) throw new Error("TNG response did not include a redirect URL — check the response shape against your API docs.");
  return redirectUrl;
}

// Signs a payload per TNG Digital's RSA256 signature scheme (algorithm=RSA256).
// Confirm the exact string-to-sign construction against your merchant docs —
// TNG signs a canonicalized request (method + path + timestamp + body digest),
// which this simplified version approximates by signing the JSON body directly.
function signTngRequest(payload) {
  const privateKey = fs.readFileSync(process.env.TNG_PRIVATE_KEY_PATH, "utf8");
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(JSON.stringify(payload));
  signer.end();
  const signatureValue = signer.sign(privateKey, "base64");
  return `algorithm=RSA256,keyVersion=1,signature=${signatureValue}`;
}

// ---------- Mock payment success page (only used when MOCK_PAYMENT=true) ----------
app.get("/payment/mock-success", (req, res) => {
  const { orderId } = req.query;
  res.send(`<h2>Mock payment successful</h2><p>Order ${orderId} is now marked as paid.</p>
    <p>MOCK_PAYMENT is on — set MOCK_PAYMENT=false with real TNG credentials to go live.</p>
    <p><a href="/report/${orderId}">Download report</a></p>`);
});

// ---------- Step 2: TNG calls this once payment completes ----------
app.post("/payment/tng-callback", async (req, res) => {
  // TODO: verify the request's signature/authenticity per TNG's callback spec
  // before trusting anything in the body — don't mark an order paid otherwise.
  const { orderId, status } = req.body; // exact field names depend on TNG's real payload

  const booking = bookings.get(orderId);
  if (!booking) return res.status(404).json({ message: "Order not found" });

  if (status === "SUCCESS") {
    booking.status = "paid";
    booking.paidAt = new Date().toISOString();
    bookings.set(orderId, booking);
    notifyOwnerOfPurchase(booking, orderId); // fire-and-forget; never blocks the callback response
    // Optionally: email the report to booking.email here instead of
    // waiting for them to visit /report/:orderId.
  }

  res.json({ received: true });
});

// ---------- Bank transfer / DuitNow QR (incl. via Touch 'n Go eWallet) ----------
// No live gateway — customer scans the DuitNow QR or transfers manually to
// this account, then uploads a receipt (below) to unlock their report.
// FPX/TNG online banking has been removed in favor of this simpler flow.
const BANK_TRANSFER_DETAILS = {
  bank: "RHB Bank Berhad",
  accountNumber: "11413800368700",
  // Must match the name on the bank statement / DuitNow QR exactly.
  accountName: process.env.BANK_TRANSFER_ACCOUNT_NAME || "Ellaijah A/L Nadrarasan"
};

app.get("/payment/bank-transfer/details", (req, res) => res.json(BANK_TRANSFER_DETAILS));

// Kept for backward compatibility with any old client still calling it —
// just flags the order for manual verification without a receipt attached.
// The receipt-upload flow below is the primary path now.
app.post("/payment/bank-transfer/confirm", async (req, res) => {
  const { orderId } = req.body || {};
  const booking = bookings.get(orderId);
  if (!booking) return res.status(404).json({ message: "Order not found." });

  booking.status = "pending_verification";
  booking.paymentMethod = booking.paymentMethod || "Bank Transfer (RHB)";
  booking.transferClaimedAt = new Date().toISOString();
  bookings.set(orderId, booking);
  notifyOwnerOfBankTransferClaim(booking, orderId); // fire-and-forget
  res.json({ ok: true });
});

// ---------- Payment receipt upload ----------
// Customer uploads a screenshot/PDF of their DuitNow QR or bank transfer
// receipt. Submitting a receipt immediately marks the order "paid" so the
// report unlocks right away — the team still verifies the actual transfer
// against the bank statement afterward (via the WhatsApp alert below, or
// the admin dashboard) and can reverse the order's status if a receipt
// turns out to be invalid.
const RECEIPT_UPLOAD_DIR = path.join(__dirname, "uploads", "receipts");
fs.mkdirSync(RECEIPT_UPLOAD_DIR, { recursive: true });

const uploadReceipt = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, RECEIPT_UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10);
      cb(null, `${crypto.randomBytes(16).toString("hex")}${ext}`);
    }
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      return cb(new Error("Only PDF, PNG, JPEG, or WEBP files are accepted."));
    }
    cb(null, true);
  }
});

app.post("/order/:orderId/receipt", auth.optionalAuth, (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found." });
  if (booking.userId && (!req.user || req.user.id !== booking.userId)) {
    return res.status(401).json({ message: "Please log in to the account that made this booking." });
  }

  uploadReceipt.single("receipt")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed." });
    if (!req.file) return res.status(400).json({ message: "No receipt file received." });

    const record = {
      id: crypto.randomBytes(8).toString("hex"),
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };
    const list = paymentReceipts.get(req.params.orderId) || [];
    list.push(record);
    paymentReceipts.set(req.params.orderId, list);

    booking.status = "paid";
    booking.paidAt = booking.paidAt || new Date().toISOString();
    booking.paymentMethod = "DuitNow QR / Bank Transfer (RHB)";
    bookings.set(req.params.orderId, booking);

    notifyOwnerOfReceiptSubmitted(booking, req.params.orderId, record.originalName); // fire-and-forget

    res.status(201).json({ ok: true, status: booking.status });
  });
});

// Stream an uploaded receipt so the team can verify it against the bank statement
app.get("/admin/receipt/:orderId/:fileId/file", auth.requireAdmin, (req, res) => {
  const list = paymentReceipts.get(req.params.orderId);
  const file = list && list.find(f => f.id === req.params.fileId);
  if (!file) return res.status(404).json({ message: "Receipt not found." });
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${file.originalName}"`);
  fs.createReadStream(path.join(RECEIPT_UPLOAD_DIR, file.storedName)).pipe(res);
});

// ---------- Step 3: serve the generated PDF once payment is confirmed ----------
const downloadTokens = new Map(); // token -> { orderId, expiresAt }
const DOWNLOAD_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes — plenty for a click-through download

// A plain <a href> can't carry an Authorization header, so account-linked
// reports are downloaded via a short-lived, single-purpose token instead.
app.post("/report/:orderId/download-token", auth.optionalAuth, (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found." });
  if (booking.status !== "paid") return res.status(402).json({ message: "Payment not completed yet." });

  if (booking.userId && (!req.user || req.user.id !== booking.userId)) {
    return res.status(401).json({ message: "Please log in to the account that made this purchase." });
  }

  const dlToken = crypto.randomBytes(24).toString("hex");
  downloadTokens.set(dlToken, { orderId: req.params.orderId, expiresAt: Date.now() + DOWNLOAD_TOKEN_TTL_MS });
  res.json({ url: `/report/${req.params.orderId}?dl=${dlToken}` });
});

app.get("/report/:orderId", auth.optionalAuth, (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).send("Order not found.");
  if (booking.status !== "paid") return res.status(402).send("Payment not completed yet.");

  const dlToken = req.query.dl;
  const tokenRecord = dlToken ? downloadTokens.get(dlToken) : null;
  const hasValidDownloadToken =
    tokenRecord && tokenRecord.orderId === req.params.orderId && Date.now() < tokenRecord.expiresAt;
  if (dlToken) downloadTokens.delete(dlToken); // single use

  // Orders placed while logged in are private to that account. A valid
  // one-time download token (see above) also grants access, since that's
  // how the account dashboard's plain download link authenticates itself.
  // Guest orders (no account attached) stay accessible by orderId alone,
  // same as before, so the post-payment return page keeps working.
  if (booking.userId && !hasValidDownloadToken && (!req.user || req.user.id !== booking.userId)) {
    return res.status(401).send("Please log in to the account that made this purchase to download this report.");
  }

  const scoring = calculateScore(extractAnswers(booking), EXPECTED_ROOM_IDS[booking.package]);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="vastu360-report-${req.params.orderId}.pdf"`);
  generateReport(booking, scoring, res);
});

// Pull out q_<room> direction answers, ignoring their _width/_length/_floor/_toFloor companions
function extractAnswers(booking) {
  const answers = {};
  Object.keys(booking).forEach(key => {
    if (key.startsWith("q_") && !key.endsWith("_width") && !key.endsWith("_length") && !key.endsWith("_floor") && !key.endsWith("_toFloor")) {
      answers[key.replace("q_", "")] = booking[key];
    }
  });
  return answers;
}

// ---------- Status check (handy for the frontend's payment-return page) ----------
app.get("/order/:orderId/status", (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found" });
  res.json({ status: booking.status });
});

// ---------- Chat inbox: unlocked for every package, 30 days from payment ----------
function getChatAccess(booking) {
  if (!booking || booking.status !== "paid" || !booking.paidAt) {
    return { allowed: false, reason: "not_paid" };
  }
  const paidAt = new Date(booking.paidAt);
  const expiresAt = new Date(paidAt.getTime() + CHAT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();

  if (now > expiresAt) {
    return { allowed: false, reason: "expired", expiresAt: expiresAt.toISOString() };
  }
  const daysRemaining = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
  return { allowed: true, expiresAt: expiresAt.toISOString(), daysRemaining };
}

// Check whether chat is unlocked for this order, and how long is left
app.get("/chat/:orderId/access", (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found" });
  res.json(getChatAccess(booking));
});

// Fetch the conversation so far
app.get("/chat/:orderId/messages", (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found" });

  const access = getChatAccess(booking);
  if (!access.allowed) return res.status(403).json({ message: "Chat is not available for this order.", access });

  res.json({ messages: chatThreads.get(req.params.orderId) || [], access });
});

// Client sends a question; auto-reply is generated and stored
app.post("/chat/:orderId/message", async (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found" });

  const access = getChatAccess(booking);
  if (!access.allowed) return res.status(403).json({ message: "Chat is not available for this order.", access });

  const userMessage = (req.body.message || "").trim();
  if (!userMessage) return res.status(400).json({ message: "Message cannot be empty." });

  const thread = chatThreads.get(req.params.orderId) || [];
  const scoring = calculateScore(extractAnswers(booking), EXPECTED_ROOM_IDS[booking.package]);

  thread.push({ role: "user", content: userMessage, timestamp: new Date().toISOString() });

  try {
    const replyText = await generateReply(booking, scoring, thread, userMessage);
    thread.push({ role: "assistant", content: replyText, timestamp: new Date().toISOString() });
    chatThreads.set(req.params.orderId, thread);
    res.json({ messages: thread, access });
  } catch (err) {
    console.error("Chat reply failed:", err);
    // Keep the user's message saved even if the AI reply failed
    chatThreads.set(req.params.orderId, thread);
    res.status(500).json({
      message: "Our assistant isn't available right now — the AI integration is still being finalised. Your question has been saved and the team will follow up.",
      messages: thread,
      access
    });
  }
});

// ---------- Public pre-sales chat widget (no booking required) ----------
// The frontend generates a random sessionId per browser (stored in
// localStorage) the first time the widget is opened, and reuses it for the
// life of that browser so the visitor's conversation persists across visits.

// Fetch the conversation so far for this browser session
app.get("/public-chat/:sessionId/messages", (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ message: "Missing sessionId." });
  res.json({ messages: publicChatThreads.get(sessionId) || [] });
});

// Visitor sends a general Vastu question; auto-reply is generated and stored
app.post("/public-chat/:sessionId/message", async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ message: "Missing sessionId." });

  const userMessage = (req.body.message || "").trim();
  if (!userMessage) return res.status(400).json({ message: "Message cannot be empty." });
  if (userMessage.length > 1000) return res.status(400).json({ message: "Message is too long." });

  const thread = publicChatThreads.get(sessionId) || [];

  if (thread.length >= PUBLIC_CHAT_MAX_MESSAGES) {
    return res.status(429).json({
      message: "This chat session has reached its question limit. Please start a booking or WhatsApp us to continue.",
      messages: thread
    });
  }

  thread.push({ role: "user", content: userMessage, timestamp: new Date().toISOString() });

  try {
    const replyText = await generatePublicReply(thread, userMessage);
    thread.push({ role: "assistant", content: replyText, timestamp: new Date().toISOString() });
    publicChatThreads.set(sessionId, thread);
    res.json({ messages: thread });
  } catch (err) {
    console.error("Public chat reply failed:", err);
    // Keep the visitor's message saved even if the AI reply failed
    publicChatThreads.set(sessionId, thread);
    res.status(500).json({
      message: "Our assistant isn't available right now. Please try again shortly, or WhatsApp us directly.",
      messages: thread
    });
  }
});

// ---------- Customer accounts ----------
app.post("/auth/signup", (req, res) => {
  const { name, email, password } = req.body || {};
  const validationError = auth.validateSignupInput({ name, email, password });
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const user = auth.createUser({ name, email, password });
    const token = auth.createSession(user.id);
    res.status(201).json({ token, user: auth.publicUser(user) });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Could not create account." });
  }
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Please enter your email and password." });

  try {
    const user = auth.authenticate(email, password);
    const token = auth.createSession(user.id);
    res.json({ token, user: auth.publicUser(user) });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message || "Could not log in." });
  }
});

app.post("/auth/logout", auth.optionalAuth, (req, res) => {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (token) auth.destroySession(token);
  res.json({ ok: true });
});

app.get("/auth/me", auth.requireAuth, (req, res) => {
  res.json({ user: auth.publicUser(req.user) });
});

// A logged-in customer's paid reports, most recent first
app.get("/account/orders", auth.requireAuth, (req, res) => {
  const orders = [...bookings.entries()]
    .filter(([, booking]) => booking.userId === req.user.id && booking.status === "paid")
    .map(([orderId, booking]) => {
      const review = reviewForOrder(orderId);
      return {
        orderId,
        propertyType: booking.propertyType,
        residentialType: booking.residentialType || null,
        package: booking.package,
        paidAt: booking.paidAt,
        review: review ? { rating: review.rating, comment: review.comment, status: review.status } : null
      };
    })
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));

  res.json({ orders });
});

// ---------- Admin dashboard API ----------
// Everything below is read/managed by the team via the /admin frontend.
// Log in at /admin with the ADMIN_EMAIL / ADMIN_PASSWORD from .env.

function bookingSummary(orderId, booking) {
  const files = floorPlans.get(orderId) || [];
  return {
    orderId,
    name: booking.name || null,
    email: booking.email || null,
    phone: booking.phone || null,
    propertyType: booking.propertyType || null,
    residentialType: booking.residentialType || null,
    package: booking.package || null,
    status: booking.status,
    amount: PACKAGE_PRICES[booking.package] || 0,
    hasAccount: !!booking.userId,
    floorPlanCount: files.length,
    floorPlanPending: files.filter(f => f.reviewStatus === "pending").length,
    chatMessageCount: (chatThreads.get(orderId) || []).length,
    createdAt: booking.createdAt,
    paidAt: booking.paidAt || null
  };
}

// High-level counters for the dashboard's overview cards + charts
app.get("/admin/stats", auth.requireAdmin, (req, res) => {
  const all = [...bookings.values()];
  const paid = all.filter(b => b.status === "paid");

  const byPackage = { bronze: 0, silver: 0, gold: 0 };
  let revenue = 0;
  paid.forEach(b => {
    if (byPackage[b.package] !== undefined) byPackage[b.package]++;
    revenue += PACKAGE_PRICES[b.package] || 0;
  });

  const byPropertyType = {};
  all.forEach(b => {
    const key = b.propertyType || "unknown";
    byPropertyType[key] = (byPropertyType[key] || 0) + 1;
  });

  // Bookings per day for the last 14 days, oldest first — powers a small trend chart
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d);
  }
  const trend = days.map(d => {
    const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    const count = all.filter(b => {
      const created = new Date(b.createdAt);
      return created >= d && created < next;
    }).length;
    return { date: d.toISOString().slice(0, 10), count };
  });

  const pendingReviews = [...floorPlans.values()]
    .flat()
    .filter(f => f.reviewStatus === "pending").length;

  const pendingCustomerReviews = [...reviews.values()].filter(r => r.status === "pending").length;

  res.json({
    totals: {
      bookings: all.length,
      paid: paid.length,
      pendingPayment: all.filter(b => b.status === "pending_payment").length,
      pendingVerification: all.filter(b => b.status === "pending_verification").length,
      revenue,
      customers: auth.listUsers().filter(u => u.role !== "admin").length,
      pendingFloorPlanReviews: pendingReviews,
      pendingCustomerReviews
    },
    byPackage,
    byPropertyType,
    trend
  });
});

// Paginated, searchable, filterable booking list
app.get("/admin/bookings", auth.requireAdmin, (req, res) => {
  const { status, package: pkg, search, page = "1", pageSize = "20" } = req.query;

  let rows = [...bookings.entries()];
  if (status) rows = rows.filter(([, b]) => b.status === status);
  if (pkg) rows = rows.filter(([, b]) => b.package === pkg);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter(([orderId, b]) =>
      orderId.toLowerCase().includes(q) ||
      (b.name || "").toLowerCase().includes(q) ||
      (b.email || "").toLowerCase().includes(q) ||
      (b.phone || "").toLowerCase().includes(q)
    );
  }
  rows.sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));

  const total = rows.length;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const start = (pageNum - 1) * size;
  const paged = rows.slice(start, start + size).map(([orderId, b]) => bookingSummary(orderId, b));

  res.json({ bookings: paged, total, page: pageNum, pageSize: size });
});

// Full detail for one order: booking fields, Vastu score, chat log, floor plans
app.get("/admin/bookings/:orderId", auth.requireAdmin, (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found." });

  let scoring = null;
  try {
    scoring = calculateScore(extractAnswers(booking), EXPECTED_ROOM_IDS[booking.package]);
  } catch {
    scoring = null; // e.g. commercial/industrial bookings without the residential question set
  }

  res.json({
    orderId: req.params.orderId,
    booking,
    scoring,
    chat: chatThreads.get(req.params.orderId) || [],
    floorPlans: floorPlans.get(req.params.orderId) || [],
    paymentReceipts: paymentReceipts.get(req.params.orderId) || []
  });
});

// Manually correct an order's status (e.g. confirming an offline/bank transfer payment)
app.patch("/admin/bookings/:orderId/status", auth.requireAdmin, (req, res) => {
  const booking = bookings.get(req.params.orderId);
  if (!booking) return res.status(404).json({ message: "Order not found." });

  const { status } = req.body || {};
  const allowed = ["pending_payment", "pending_verification", "paid", "cancelled"];
  if (!allowed.includes(status)) return res.status(400).json({ message: `Status must be one of: ${allowed.join(", ")}` });

  booking.status = status;
  if (status === "paid" && !booking.paidAt) booking.paidAt = new Date().toISOString();
  bookings.set(req.params.orderId, booking);
  res.json({ ok: true, booking: bookingSummary(req.params.orderId, booking) });
});

// Mark an uploaded floor plan as reviewed (or back to pending)
app.patch("/admin/floor-plan/:orderId/:fileId", auth.requireAdmin, (req, res) => {
  const list = floorPlans.get(req.params.orderId);
  const file = list && list.find(f => f.id === req.params.fileId);
  if (!file) return res.status(404).json({ message: "Floor plan not found." });

  const { reviewStatus } = req.body || {};
  if (!["pending", "reviewed"].includes(reviewStatus)) {
    return res.status(400).json({ message: "reviewStatus must be 'pending' or 'reviewed'." });
  }
  file.reviewStatus = reviewStatus;
  res.json({ ok: true, file });
});

// Stream the actual uploaded floor plan file so the team can review it
app.get("/admin/floor-plan/:orderId/:fileId/file", auth.requireAdmin, (req, res) => {
  const list = floorPlans.get(req.params.orderId);
  const file = list && list.find(f => f.id === req.params.fileId);
  if (!file) return res.status(404).json({ message: "Floor plan not found." });
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${file.originalName}"`);
  fs.createReadStream(path.join(UPLOAD_DIR, file.storedName)).pipe(res);
});

// Customer list with their order counts — read-only CRM view
app.get("/admin/users", auth.requireAdmin, (req, res) => {
  const all = [...bookings.values()];
  const users = auth.listUsers()
    .filter(u => u.role !== "admin")
    .map(u => {
      const orders = all.filter(b => b.userId === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        orderCount: orders.length,
        paidOrderCount: orders.filter(b => b.status === "paid").length
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ users });
});

// ---------- Admin: review moderation ----------
app.get("/admin/reviews", auth.requireAdmin, (req, res) => {
  const { status } = req.query;
  let list = [...reviews.values()];
  if (status) list = list.filter(r => r.status === status);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ reviews: list });
});

app.patch("/admin/reviews/:reviewId", auth.requireAdmin, (req, res) => {
  const record = reviews.get(req.params.reviewId);
  if (!record) return res.status(404).json({ message: "Review not found." });
  const { status } = req.body || {};
  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ message: "Status must be approved, rejected, or pending." });
  }
  record.status = status;
  res.json({ review: record });
});

app.delete("/admin/reviews/:reviewId", auth.requireAdmin, (req, res) => {
  if (!reviews.has(req.params.reviewId)) return res.status(404).json({ message: "Review not found." });
  reviews.delete(req.params.reviewId);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Vastu360 backend running on port ${PORT}`));
