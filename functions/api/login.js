// POST /api/login — admin login
import * as auth from "./_lib/auth.js";

export async function onRequestPost({ request, env }) {
  try {
    const ip = auth.clientIp(request);
    if (!auth.rateLimit(`login:${ip}`, 8, 300)) {
      return auth.jsonError("Demasiadas tentativas. Tente novamente em alguns minutos.", 429);
    }

    const body = await auth.readJsonBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return auth.jsonError("Email e password obrigatórios.", 400);

    await auth.ensureAdminBootstrapped(env);

    const admin = await auth.getAdminByEmail(env, email);
    if (!admin) return auth.jsonError("Credenciais inválidas.", 401);

    const ok = await auth.verifyPassword(password, admin.password_hash);
    if (!ok) return auth.jsonError("Credenciais inválidas.", 401);

    const token = auth.signToken(env, { kind: "session", email: admin.email }, auth.SESSION_TTL_SECONDS);
    const cookie = auth.buildSessionCookie(token, auth.SESSION_TTL_SECONDS);

    return auth.jsonResponse(
      { ok: true, email: admin.email },
      { status: 200, headers: { "Set-Cookie": cookie } }
    );
  } catch (err) {
    console.error("[login]", err);
    return auth.jsonError("DEBUG2 " + (err && err.message ? err.message : String(err)), 500);
  }
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  return auth.jsonError("Method not allowed", 405);
}
