// ═══════════════════════════════════════════════════════════
// Shared auth helpers — Cloudflare Pages Functions edition
// Porta do /api/_lib/auth.js (Vercel/Node) para Workers runtime.
// Requer `nodejs_compat` flag (wrangler.toml / Pages settings).
// ═══════════════════════════════════════════════════════════

import { Buffer } from "node:buffer";
import crypto from "node:crypto";

const PBKDF2_ITER = 100000; // máximo suportado pelo Web Crypto do Cloudflare Workers
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
export const RESET_TTL_SECONDS = 60 * 30; // 30 min
export const COOKIE_NAME = "ma_admin_session";

function getEnvVar(env, name, fallback) {
  const v = env && env[name];
  if (v === undefined || v === null || v === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export function getAdminEmail(env) {
  return getEnvVar(env, "ADMIN_EMAIL", "admin@maelo.pt").toLowerCase();
}

function getSessionSecret(env) {
  return getEnvVar(env, "SESSION_SECRET");
}

function getNeonConn(env) {
  return getEnvVar(env, "NEON_OWNER_CONN");
}

// PBKDF2 hashing — stored as "pbkdf2$<iter>$<saltB64>$<hashB64>"
// Usa Web Crypto (crypto.subtle), nativo e fiável no runtime Workers do Cloudflare.
// (crypto.pbkdf2Sync de node:crypto não é estável aqui — partia o login.)
async function pbkdf2Bits(password, salt, iterations, keyBytes) {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial, keyBytes * 8
  );
  return Buffer.from(new Uint8Array(bits));
}

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("password too short");
  }
  const salt = Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(16)));
  const derived = await pbkdf2Bits(password, salt, PBKDF2_ITER, PBKDF2_KEYLEN);
  return `pbkdf2$${PBKDF2_ITER}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iter = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], "base64");
  const expected = Buffer.from(parts[3], "base64");
  const derived = await pbkdf2Bits(password, salt, iter, expected.length);
  if (derived.length !== expected.length) return false;
  // comparação em tempo constante
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
  return diff === 0;
}

// Compact signed token — base64url(payload).base64url(sig). HMAC-SHA256 with SESSION_SECRET.
function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(str) {
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad), "base64");
}

export function signToken(env, payloadObj, ttlSeconds) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = { ...payloadObj, exp };
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", getSessionSecret(env)).update(body).digest();
  return `${body}.${b64url(sig)}`;
}

export function verifyToken(env, token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", getSessionSecret(env)).update(body).digest();
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

// --- Cookies (Web standard headers) ---
export function buildSessionCookie(token, maxAgeSeconds) {
  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function readSessionCookie(request) {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  const found = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE_NAME + "="));
  if (!found) return null;
  return found.substring(COOKIE_NAME.length + 1);
}

export function requireSession(env, request) {
  const token = readSessionCookie(request);
  const session = verifyToken(env, token);
  if (!session || session.kind !== "session") return null;
  return session;
}

// --- Neon SQL helper ---
export async function neonQuery(env, sql, params = []) {
  const connString = getNeonConn(env);
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

export async function ensureAdminTable(env) {
  await neonQuery(env, `
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await neonQuery(env, `
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

export async function ensureAdminBootstrapped(env) {
  await ensureAdminTable(env);
  const adminEmail = getAdminEmail(env);
  const initialHash = env.ADMIN_PASSWORD_HASH;
  if (!initialHash) return;
  const res = await neonQuery(env, "SELECT id FROM admin_users WHERE email = $1 LIMIT 1", [adminEmail]);
  if (res.rows && res.rows.length > 0) return;
  await neonQuery(env,
    "INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)",
    [adminEmail, initialHash]
  );
}

export async function getAdminByEmail(env, email) {
  const res = await neonQuery(env, "SELECT * FROM admin_users WHERE email = $1 LIMIT 1", [String(email).toLowerCase()]);
  return res.rows && res.rows[0];
}

export async function updateAdminPassword(env, email, newHash) {
  await neonQuery(env,
    "UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE email = $2",
    [newHash, String(email).toLowerCase()]
  );
}

// --- Reset tokens ---
function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createResetToken(env, email) {
  const token = crypto.randomBytes(24).toString("base64url");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_SECONDS * 1000).toISOString();
  await neonQuery(env,
    "INSERT INTO admin_password_resets (email, token_hash, expires_at) VALUES ($1, $2, $3)",
    [String(email).toLowerCase(), tokenHash, expiresAt]
  );
  return { token, expiresAt };
}

export async function consumeResetToken(env, email, token) {
  const tokenHash = hashResetToken(token);
  const res = await neonQuery(env,
    `SELECT id FROM admin_password_resets
     WHERE email = $1 AND token_hash = $2 AND used_at IS NULL AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [String(email).toLowerCase(), tokenHash]
  );
  const row = res.rows && res.rows[0];
  if (!row) return false;
  await neonQuery(env, "UPDATE admin_password_resets SET used_at = NOW() WHERE id = $1", [row.id]);
  return true;
}

// --- Rate limit (in-memory, por-isolate — para Workers ideal seria KV/Durable Objects) ---
const rateBuckets = new Map();
export function rateLimit(key, maxAttempts, windowSeconds) {
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

export function clientIp(request) {
  // Cloudflare-specific header (preferido)
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  // Fallback genérico
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

// --- JSON helpers (Web standard Response) ---
export function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function jsonError(message, status = 500, extraHeaders = {}) {
  return jsonResponse({ error: message }, { status, headers: extraHeaders });
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
