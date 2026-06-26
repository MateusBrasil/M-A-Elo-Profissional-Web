// POST /api/logout — admin logout
import * as auth from "./_lib/auth.js";

export async function onRequestPost() {
  return auth.jsonResponse(
    { ok: true },
    { status: 200, headers: { "Set-Cookie": auth.clearSessionCookie() } }
  );
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  return auth.jsonError("Method not allowed", 405);
}
