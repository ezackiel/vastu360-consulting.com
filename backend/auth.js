// auth.js
// Lightweight email/password auth for customer accounts — no external auth
// library required. Passwords are hashed with Node's built-in scrypt; session
// tokens are random opaque strings held server-side (swap these Maps for
// Postgres/Redis/etc. when you move off in-memory storage — see database.js).

const crypto = require("crypto");

const SESSION_TTL_DAYS = 30;

// ---------- Storage ----------
const usersByEmail = new Map(); // email (lowercase) -> user record
const usersById = new Map();    // id -> user record
const sessions = new Map();     // token -> { userId, expiresAt }

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`;
}

// ---------- Password hashing (scrypt, no external deps) ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  // constant-time compare
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(check, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------- Users ----------
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role || "customer", createdAt: user.createdAt };
}

function createUser({ name, email, password, role }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (usersByEmail.has(normalizedEmail)) {
    const err = new Error("An account with this email already exists.");
    err.status = 409;
    throw err;
  }
  const user = {
    id: newId("usr"),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role: role || "customer",
    createdAt: new Date().toISOString()
  };
  usersByEmail.set(normalizedEmail, user);
  usersById.set(user.id, user);
  return user;
}

function listUsers() {
  return [...usersById.values()];
}

// Creates the admin account from env vars on boot, if configured and not
// already present. Lets you log into /admin with ADMIN_EMAIL/ADMIN_PASSWORD
// without exposing an open admin-signup endpoint.
function ensureAdminFromEnv() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) return;

  const existing = usersByEmail.get(email);
  if (existing) {
    if (existing.role !== "admin") {
      existing.role = "admin";
      usersByEmail.set(email, existing);
      usersById.set(existing.id, existing);
    }
    return;
  }
  createUser({ name: "Admin", email, password, role: "admin" });
  console.log(`Admin account ready: ${email}`);
}

function authenticate(email, password) {
  const user = usersByEmail.get((email || "").trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) {
    const err = new Error("Incorrect email or password.");
    err.status = 401;
    throw err;
  }
  return user;
}

function getUserById(id) {
  return usersById.get(id) || null;
}

// ---------- Sessions ----------
function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  sessions.set(token, { userId, expiresAt });
  return token;
}

function destroySession(token) {
  sessions.delete(token);
}

function getUserFromToken(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return getUserById(session.userId);
}

function tokenFromHeader(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" ? token : null;
}

// Attaches req.user if a valid session token is present; never blocks the request.
function optionalAuth(req, res, next) {
  const token = tokenFromHeader(req);
  req.user = getUserFromToken(token) || null;
  next();
}

// Blocks the request with 401 unless a valid session token is present.
function requireAuth(req, res, next) {
  const token = tokenFromHeader(req);
  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ message: "Please log in to continue." });
  req.user = user;
  next();
}

// Blocks the request with 401/403 unless the caller is a logged-in admin.
function requireAdmin(req, res, next) {
  const token = tokenFromHeader(req);
  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ message: "Please log in to continue." });
  if (user.role !== "admin") return res.status(403).json({ message: "Admin access only." });
  req.user = user;
  next();
}

const MIN_PASSWORD_LENGTH = 8;

function validateSignupInput({ name, email, password }) {
  if (!name || !name.trim()) return "Please enter your name.";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  if (!password || password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  return null;
}

module.exports = {
  createUser,
  authenticate,
  getUserById,
  listUsers,
  ensureAdminFromEnv,
  createSession,
  destroySession,
  getUserFromToken,
  optionalAuth,
  requireAuth,
  requireAdmin,
  validateSignupInput,
  publicUser
};
