// POST /api/forgot-password — admin pede reset por email
import * as auth from "./_lib/auth.js";
import { sendPasswordResetEmail } from "./_lib/mail.js";

function originFromRequest(env, request) {
  const explicit = env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function onRequestPost({ request, env }) {
  try {
    const ip = auth.clientIp(request);
    if (!auth.rateLimit(`forgot:${ip}`, 5, 600)) {
      return auth.jsonError("Demasiadas tentativas. Tente novamente daqui a pouco.", 429);
    }

    const body = await auth.readJsonBody(request);
    const email = String(body.email || "").trim().toLowerCase();

    // Sempre 200 para não revelar se um email existe.
    const generic = { ok: true, message: "Se o email existir, recebe instruções para repor a password." };

    if (!email) return auth.jsonResponse(generic);
    if (email !== auth.getAdminEmail(env)) return auth.jsonResponse(generic);

    await auth.ensureAdminBootstrapped(env);
    const admin = await auth.getAdminByEmail(env, email);
    if (!admin) return auth.jsonResponse(generic);

    const { token } = await auth.createResetToken(env, email);
    const base = originFromRequest(env, request);
    const resetUrl = `${base}/admin-reset.html?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    const expiresInMinutes = Math.floor(auth.RESET_TTL_SECONDS / 60);

    const mail = await sendPasswordResetEmail(env, { to: email, resetUrl, expiresInMinutes });

    return auth.jsonResponse({ ...generic, delivered: mail.sent ? "email" : "fallback" });
  } catch (err) {
    console.error("[forgot-password]", err);
    return auth.jsonError("Erro interno. Tente novamente.", 500);
  }
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  return auth.jsonError("Method not allowed", 405);
}
