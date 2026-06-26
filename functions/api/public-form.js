// POST /api/public-form — endpoint público dos formulários de candidatura
// Usa NEON_FORM_CONN (baixo privilégio: INSERT candidatos + SELECT formularios).
import * as auth from "./_lib/auth.js";

async function formQuery(env, sql, params) {
  const connString = env.NEON_FORM_CONN;
  if (!connString) throw new Error("Missing NEON_FORM_CONN env var");
  const url = new URL(connString);
  const host = url.host.replace("-pooler", "");
  const res = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connString,
    },
    body: JSON.stringify({ query: sql, params: params || [] }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Neon query failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function onRequestPost({ request, env }) {
  try {
    const ip = auth.clientIp(request);
    if (!auth.rateLimit(`public-form:${ip}`, 30, 60)) {
      return auth.jsonError("Demasiados pedidos. Tenta novamente em alguns segundos.", 429);
    }

    const body = await auth.readJsonBody(request);
    const op = String(body.op || "");

    if (op === "loadForm") {
      const slug = String(body.slug || "").trim();
      if (!slug) return auth.jsonError("slug obrigatório", 400);
      const r = await formQuery(env,
        "SELECT slug, nome, descricao, campos, ativo FROM formularios WHERE slug=$1 AND ativo=true LIMIT 1",
        [slug]
      );
      return auth.jsonResponse(r);
    }

    if (op === "submitCandidate") {
      const data = body.data || {};
      const ALLOWED = {
        profissao:        { max: 32,   default: "geral", slug: true },
        nome:             { max: 200,  required: true },
        telefone:         { max: 64,   required: true },
        email:            { max: 200 },
        regiao:           { max: 500 },
        experiencia:      { max: 64 },
        disponibilidade:  { type: "bool" },
        processos:        { max: 1000 },
        certificacoes:    { max: 1000 },
        tipo_pintura:     { max: 1000 },
        equipamentos:     { max: 1000 },
        tipo_trabalhos:   { max: 1000 },
        le_medidas:       { max: 16 },
        mensagem:         { max: 5000 },
      };

      const columns = [];
      const values = [];
      for (const [key, spec] of Object.entries(ALLOWED)) {
        let v = data[key];
        if (v === undefined || v === null || v === "") {
          if (spec.required) return auth.jsonError(`Campo '${key}' obrigatório.`, 400);
          if (spec.default !== undefined) v = spec.default;
          else continue;
        }
        if (spec.type === "bool") v = !!v;
        else {
          v = String(v).slice(0, spec.max || 5000);
          if (spec.slug) v = v.toLowerCase().replace(/[^a-z0-9_-]/g, "") || spec.default;
        }
        columns.push(key);
        values.push(v);
      }

      const placeholders = columns.map((_, i) => `$${i + 1}`).join(",");
      const sql = `INSERT INTO candidatos (${columns.join(",")}) VALUES (${placeholders})`;
      await formQuery(env, sql, values);
      return auth.jsonResponse({ ok: true });
    }

    return auth.jsonError("Operação desconhecida.", 400);
  } catch (err) {
    console.error("[public-form]", err.message);
    return auth.jsonError("Erro ao processar pedido.", 500);
  }
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  return auth.jsonError("Method not allowed", 405);
}
