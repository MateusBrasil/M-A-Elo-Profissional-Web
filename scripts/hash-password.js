#!/usr/bin/env node
// Generates a PBKDF2 hash for the admin password.
// Usage:  node scripts/hash-password.js "your-strong-password"
// Output: pbkdf2$200000$<saltB64>$<hashB64>  ← paste into ADMIN_PASSWORD_HASH

const crypto = require("crypto");

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error("ERROR: provide a password of at least 10 characters.");
  console.error('Usage: node scripts/hash-password.js "your-strong-password"');
  process.exit(1);
}

const ITER = 200000;
const KEYLEN = 32;
const salt = crypto.randomBytes(16);
const derived = crypto.pbkdf2Sync(password, salt, ITER, KEYLEN, "sha256");
const out = `pbkdf2$${ITER}$${salt.toString("base64")}$${derived.toString("base64")}`;

console.log(out);
