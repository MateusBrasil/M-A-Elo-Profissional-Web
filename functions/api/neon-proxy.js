// POST /api/neon-proxy — proxy autenticado para queries Neon (admin)
import * as auth from "./_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const session = auth.requireSession(env, request);
  if (!session) return auth.jsonError("Sessão expirada.", 401);

  try {
    const body = await auth.readJsonBody(request);
    if (!body || typeof body.query !== "string") {
      return auth.jsonError("Query inválida.", 400);
    }
    const result = await auth.neonQuery(env, body.query, Array.isArray(body.params) ? body.params : []);
    return auth.jsonResponse(result);
  } catch (err) {
    console.error("[neon-proxy]", err.message);
    return auth.jsonError("Erro ao executar query.", 500);
  }
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  return auth.jsonError("Method not allowed", 405);
}
