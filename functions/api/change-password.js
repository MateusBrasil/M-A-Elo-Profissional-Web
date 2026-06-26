// POST /api/change-password — admin altera própria password
import * as auth from "./_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const session = auth.requireSession(env, request);
  if (!session) return auth.jsonError("Sessão expirada. Faça login novamente.", 401);

  try {
    if (!auth.rateLimit(`change:${session.email}`, 10, 600)) {
      return auth.jsonError("Demasiadas tentativas. Tente novamente daqui a pouco.", 429);
    }

    const body = await auth.readJsonBody(request);
    const current = String(body.currentPassword || "");
    const next = String(body.newPassword || "");
    if (!current || !next) return auth.jsonError("Password atual e nova obrigatórias.", 400);
    if (next.length < 10) return auth.jsonError("Password nova precisa de pelo menos 10 caracteres.", 400);
    if (next === current) return auth.jsonError("A nova password não pode ser igual à atual.", 400);

    await auth.ensureAdminBootstrapped(env);

    const admin = await auth.getAdminByEmail(env, session.email);
    if (!admin) return auth.jsonError("Conta não encontrada.", 404);
    if (!auth.verifyPassword(current, admin.password_hash)) {
      return auth.jsonError("Password atual incorreta.", 401);
    }

    const newHash = auth.hashPassword(next);
    await auth.updateAdminPassword(env, admin.email, newHash);

    return auth.jsonResponse({ ok: true });
  } catch (err) {
    console.error("[change-password]", err);
    return auth.jsonError("Erro interno. Tente novamente.", 500);
  }
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  return auth.jsonError("Method not allowed", 405);
}
