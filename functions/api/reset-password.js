// POST /api/reset-password — completa o flow de reset com token
import * as auth from "./_lib/auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const ip = auth.clientIp(request);
    if (!auth.rateLimit(`reset:${ip}`, 10, 600)) {
      return auth.jsonError("Demasiadas tentativas. Tente novamente daqui a pouco.", 429);
    }

    const body = await auth.readJsonBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const token = String(body.token || "");
    const next = String(body.newPassword || "");

    if (!email || !token || !next) return auth.jsonError("Pedido inválido.", 400);
    if (next.length < 10) return auth.jsonError("Password precisa de pelo menos 10 caracteres.", 400);

    await auth.ensureAdminBootstrapped(env);
    const admin = await auth.getAdminByEmail(env, email);
    if (!admin) return auth.jsonError("Link inválido ou expirado.", 400);

    const consumed = await auth.consumeResetToken(env, email, token);
    if (!consumed) return auth.jsonError("Link inválido ou expirado.", 400);

    const newHash = await auth.hashPassword(next);
    await auth.updateAdminPassword(env, email, newHash);

    return auth.jsonResponse({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return auth.jsonError("Erro interno. Tente novamente.", 500);
  }
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  return auth.jsonError("Method not allowed", 405);
}
