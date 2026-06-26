// GET /api/session — verifica sessão activa
import * as auth from "./_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const session = auth.requireSession(env, request);
  if (!session) return auth.jsonResponse({ authenticated: false });
  return auth.jsonResponse({ authenticated: true, email: session.email });
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  return auth.jsonError("Method not allowed", 405);
}
