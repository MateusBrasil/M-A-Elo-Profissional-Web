#!/usr/bin/env node
// Interactive .env.local generator for the M&A Elo admin panel.
// Run:  node scripts/setup-env.js
// Output: .env.local (gitignored) — ready to import in Vercel → Settings → Environment Variables → "Import .env"

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ENV_PATH = path.join(__dirname, "..", ".env.local");

// Old credentials previously hardcoded in the source — used as defaults so the
// migration can complete without rotating immediately (but you should rotate after).
const DEFAULTS = {
  NEON_OWNER_CONN: "postgresql://neondb_owner:npg_ZNntQdzXOC23@ep-dry-term-alu2f51d-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  NEON_FORM_CONN:  "postgresql://form_user:form_maelo_2026@ep-dry-term-alu2f51d-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  ADMIN_EMAIL: "admin@maelo.pt",
  PUBLIC_BASE_URL: "https://m-a-elo-profissional-web.vercel.app",
};

function hashPassword(password) {
  const ITER = 200000;
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(password, salt, ITER, 32, "sha256");
  return `pbkdf2$${ITER}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

function randomSecret(bytes = 48) {
  return crypto.randomBytes(bytes).toString("base64url");
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, opts = {}) {
  return new Promise((resolve) => {
    if (opts.hidden) {
      // hide typed characters
      const out = rl.output;
      const orig = out.write.bind(out);
      rl.question(question, (answer) => {
        out.write = orig;
        out.write("\n");
        resolve(answer);
      });
      out.write = (chunk, enc, cb) => {
        if (typeof chunk === "string" && (chunk.endsWith("\n") || chunk === question || chunk.startsWith(question))) {
          return orig(chunk, enc, cb);
        }
        return orig("*", enc, cb);
      };
    } else {
      rl.question(question, (answer) => resolve(answer));
    }
  });
}

function withDefault(value, fallback) {
  const v = (value || "").trim();
  return v === "" ? fallback : v;
}

(async () => {
  console.log("");
  console.log("══════════════════════════════════════════════════════════");
  console.log("  M&A Elo Profissional — gerador de .env.local");
  console.log("══════════════════════════════════════════════════════════");
  console.log("");
  console.log("Este script vai gerar um ficheiro .env.local pronto para");
  console.log("importar no Vercel (Settings → Environment Variables → Import .env).");
  console.log("");

  // 1. Admin password
  let pw1, pw2;
  while (true) {
    pw1 = await ask("Password do admin (mín. 10 caracteres): ", { hidden: true });
    if (pw1.length < 10) { console.log("  ✗ Demasiado curta. Tenta de novo.\n"); continue; }
    pw2 = await ask("Confirma a password: ", { hidden: true });
    if (pw1 !== pw2) { console.log("  ✗ Não bate. Tenta de novo.\n"); continue; }
    break;
  }
  const passwordHash = hashPassword(pw1);

  // 2. Admin email
  const email = withDefault(
    await ask(`Email do admin [${DEFAULTS.ADMIN_EMAIL}]: `),
    DEFAULTS.ADMIN_EMAIL
  );

  // 3. Neon connections
  console.log("\nConnection strings Neon (Enter para usar as do projeto atual):");
  const ownerConn = withDefault(
    await ask(`  NEON_OWNER_CONN [usar antiga]: `),
    DEFAULTS.NEON_OWNER_CONN
  );
  const formConn = withDefault(
    await ask(`  NEON_FORM_CONN  [usar antiga]: `),
    DEFAULTS.NEON_FORM_CONN
  );

  // 4. Resend (optional)
  console.log("\nResend (para enviar email de reset de password):");
  const resendKey = (await ask("  RESEND_API_KEY (Enter para saltar): ")).trim();
  let resendFrom = "";
  if (resendKey) {
    resendFrom = withDefault(
      await ask("  RESET_FROM_EMAIL (ex: M&A Elo <noreply@maelo.pt>): "),
      ""
    );
  }

  // 5. Public base URL
  const baseUrl = withDefault(
    await ask(`\nPUBLIC_BASE_URL [${DEFAULTS.PUBLIC_BASE_URL}]: `),
    DEFAULTS.PUBLIC_BASE_URL
  );

  // 6. Session secret (auto)
  const sessionSecret = randomSecret(48);

  rl.close();

  // Build .env.local
  const lines = [
    "# M&A Elo Profissional — gerado por scripts/setup-env.js",
    `# Gerado em ${new Date().toISOString()}`,
    "# NÃO commitar este ficheiro. Já está incluído no .gitignore.",
    "",
    "# Neon — owner connection (admin endpoints)",
    `NEON_OWNER_CONN=${ownerConn}`,
    "",
    "# Neon — low privilege connection (public form submissions)",
    `NEON_FORM_CONN=${formConn}`,
    "",
    "# Admin authentication",
    `ADMIN_EMAIL=${email}`,
    `ADMIN_PASSWORD_HASH=${passwordHash}`,
    `SESSION_SECRET=${sessionSecret}`,
    "",
    "# Public base URL",
    `PUBLIC_BASE_URL=${baseUrl}`,
    "",
  ];
  if (resendKey) {
    lines.push("# Email delivery (Resend)");
    lines.push(`RESEND_API_KEY=${resendKey}`);
    if (resendFrom) lines.push(`RESET_FROM_EMAIL=${resendFrom}`);
    lines.push("");
  } else {
    lines.push("# Email delivery — Resend not configured (reset links go to Vercel logs)");
    lines.push("# RESEND_API_KEY=");
    lines.push("# RESET_FROM_EMAIL=");
    lines.push("");
  }

  fs.writeFileSync(ENV_PATH, lines.join("\n"), "utf8");

  console.log("");
  console.log("══════════════════════════════════════════════════════════");
  console.log("  ✓ .env.local gerado em:");
  console.log("    " + ENV_PATH);
  console.log("══════════════════════════════════════════════════════════");
  console.log("");
  console.log("Próximo passo — importar no Vercel:");
  console.log("  1. Abre o teu projeto no Vercel");
  console.log("  2. Settings → Environment Variables");
  console.log("  3. Clica em 'Import .env'");
  console.log("  4. Arrasta o ficheiro .env.local OU cola o conteúdo");
  console.log("  5. Marca Production + Preview + Development");
  console.log("  6. Save → faz um novo deploy");
  console.log("");
  console.log("Depois disso, podes entrar em /admin.html com:");
  console.log("  Email:    " + email);
  console.log("  Password: (a que acabaste de definir)");
  console.log("");
  console.log("⚠ Lembra-te: as connection strings Neon que estavam no");
  console.log("  código fonte estiveram expostas. Roda-as no painel do Neon");
  console.log("  quando puderes e gera um novo .env.local com as novas.");
  console.log("");
})().catch((e) => {
  console.error("Erro:", e);
  rl.close();
  process.exit(1);
});
