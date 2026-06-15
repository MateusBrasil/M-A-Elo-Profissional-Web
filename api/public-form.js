// Public endpoint for the candidate forms — strictly whitelisted operations.
// Uses a low-privilege NEON_FORM_CONN connection (INSERT into candidatos + SELECT from formularios).

const auth = require("./_lib/auth");

function getFormConn() {
  const v = process.env.NEON_FORM_CONN;
  if (!v) throw new Error("Missing NEON_FORM_CONN env var");
  return v;
}

async function formQuery(sql, params) {
  const connString = getFormConn();
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

module.exports = async function handler(req, res) {
  auth.setSecurityHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const ip = auth.clientIp(req);
    if (!auth.rateLimit(`public-form:${ip}`, 30, 60)) {
      return res.status(429).json({ error: "Demasiados pedidos. Tenta novamente em alguns segundos." });
    }

    const body = await auth.readJsonBody(req);
    const op = String(body.op || "");

    if (op === "loadForm") {
      const slug = String(body.slug || "").trim();
      if (!slug) return res.status(400).json({ error: "slug obrigatório" });
      const r = await formQuery(
        "SELECT slug, nome, descricao, campos, ativo FROM formularios WHERE slug=$1 AND ativo=true LIMIT 1",
        [slug]
      );
      return res.status(200).json(r);
    }

    if (op === "submitCandidate") {
      const data = body.data || {};
      const ALLOWED = {
        profissao:        { max: 32,   default: "geral" },
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
          if (spec.required) return res.status(400).json({ error: `Campo '${key}' obrigatório.` });
          if (spec.default !== undefined) v = spec.default;
          else continue;
        }
        if (spec.type === "bool") v = !!v;
        else v = String(v).slice(0, spec.max || 5000);
        columns.push(key);
        values.push(v);
      }

      const placeholders = columns.map((_, i) => `$${i + 1}`).join(",");
      const sql = `INSERT INTO candidatos (${columns.join(",")}) VALUES (${placeholders})`;
      await formQuery(sql, values);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Operação desconhecida." });
  } catch (err) {
    console.error("[public-form]", err.message);
    return res.status(500).json({ error: "Erro ao processar pedido." });
  }
};
