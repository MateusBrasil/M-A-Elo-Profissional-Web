// Shared auth helpers for M&A Elo admin endpoints.
// Server-only — never expose secrets to the client.

const crypto = require("crypto");

const PBKDF2_ITER = 200000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const RESET_TTL_SECONDS = 60 * 30; // 30 min
const COOKIE_NAME = "ma_admin_session";

function getEnv(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === null || v === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function getNeonConn() {
  return getEnv("NEON_OWNER_CONN");
}

function getAdminEmail() {
  return getEnv("ADMIN_EMAIL", "admin@maelo.pt").toLowerCase();
}

function getSessionSecret() {
  return getEnv("SESSION_SECRET");
}

// PBKDF2 hashing — stored as "pbkdf2$<iter>$<saltB64>$<hashB64>"
function hashPassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("password too short");
  }
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(password, salt, PBKDF2_ITER, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `pbkdf2$${PBKDF2_ITER}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iter = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], "base64");
  const expected = Buffer.from(parts[3], "base64");
  const derived = crypto.pbkdf2Sync(password, salt, iter, expected.length, PBKDF2_DIGEST);
  return crypto.timingSafeEqual(derived, expected);
}

// Compact signed token — base64url(payload).base64url(sig). HMAC-SHA256 with SESSION_SECRET.
function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(str) {
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad), "base64");
}

function signToken(payloadObj, ttlSeconds) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = { ...payloadObj, exp };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", getSessionSecret()).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", getSessionSecret()).update(body).digest();
  const givenSig = fromB64url(sig);
  if (expectedSig.length !== givenSig.length) return null;
  if (!crypto.timingSafeEqual(expectedSig, givenSig)) return null;
  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- Cookies ---
function buildSessionCookie(token, maxAgeSeconds) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ];
  return parts.join("; ");
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function readSessionCookie(req) {
  const raw = req.headers && req.headers.cookie;
  if (!raw) return null;
  const found = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE_NAME + "="));
  if (!found) return null;
  return found.substring(COOKIE_NAME.length + 1);
}

function requireSession(req) {
  const token = readSessionCookie(req);
  const session = verifyToken(token);
  if (!session || session.kind !== "session") return null;
  return session;
}

// --- Neon SQL helper ---
async function neonQuery(sql, params = []) {
  const connString = getNeonConn();
  const url = new URL(connString);
  const host = url.host.replace("-pooler", "");
  const res = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connString,
    },
    body: JSON.stringify({ query: sql, params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Neon query failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function ensureAdminTable() {
  await neonQuery(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await neonQuery(`
    CREATE TABLE IF NOT EXISTS admin_password_resets (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensureAdminBootstrapped() {
  await ensureAdminTable();
  const adminEmail = getAdminEmail();
  const initialHash = process.env.ADMIN_PASSWORD_HASH;
  if (!initialHash) return; // nothing to bootstrap — admin must already exist
  const res = await neonQuery("SELECT id FROM admin_users WHERE email = $1 LIMIT 1", [adminEmail]);
  if (res.rows && res.rows.length > 0) return;
  await neonQuery(
    "INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)",
    [adminEmail, initialHash]
  );
}

async function getAdminByEmail(email) {
  const res = await neonQuery("SELECT * FROM admin_users WHERE email = $1 LIMIT 1", [String(email).toLowerCase()]);
  return res.rows && res.rows[0];
}

async function updateAdminPassword(email, newHash) {
  await neonQuery(
    "UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE email = $2",
    [newHash, String(email).toLowerCase()]
  );
}

// --- Reset tokens (stored as SHA-256 hash to avoid plaintext at rest) ---
function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createResetToken(email) {
  const token = crypto.randomBytes(24).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_SECONDS * 1000).toISOString();
  await neonQuery(
    "INSERT INTO admin_password_resets (email, token_hash, expires_at) VALUES ($1, $2, $3)",
    [String(email).toLowerCase(), tokenHash, expiresAt]
  );
  return { token, expiresAt };
}

async function consumeResetToken(email, token) {
  const tokenHash = hashResetToken(token);
  const res = await neonQuery(
    `SELECT id FROM admin_password_resets
     WHERE email = $1 AND token_hash = $2 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [String(email).toLowerCase(), tokenHash]
  );
  const row = res.rows && res.rows[0];
  if (!row) return false;
  await neonQuery("UPDATE admin_password_resets SET used_at = NOW() WHERE id = $1", [row.id]);
  return true;
}

// --- Rate limit (in-memory, per-instance) ---
const rateBuckets = new Map();
function rateLimit(key, maxAttempts, windowSeconds) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const entry = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  rateBuckets.set(key, entry);
  return entry.count <= maxAttempts;
}

function clientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
}

// --- Helpers ---
function setSecurityHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function setCookieHeader(res, cookie) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) res.setHeader("Set-Cookie", cookie);
  else if (Array.isArray(existing)) res.setHeader("Set-Cookie", [...existing, cookie]);
  else res.setHeader("Set-Cookie", [existing, cookie]);
}

function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_SECONDS,
  RESET_TTL_SECONDS,
  getAdminEmail,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  buildSessionCookie,
  clearSessionCookie,
  readSessionCookie,
  requireSession,
  neonQuery,
  ensureAdminTable,
  ensureAdminBootstrapped,
  getAdminByEmail,
  updateAdminPassword,
  createResetToken,
  consumeResetToken,
  rateLimit,
  clientIp,
  setSecurityHeaders,
  setCookieHeader,
  readJsonBody,
};
