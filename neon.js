// Neon PostgreSQL — HTTP SQL API
// Em localhost usa /neon-proxy (evita CORS); em produção faz fetch direto.

const NEON_HOST      = "ep-dry-term-alu2f51d-pooler.c-3.eu-central-1.aws.neon.tech";
const NEON_HTTP_HOST = "ep-dry-term-alu2f51d.c-3.eu-central-1.aws.neon.tech";
const NEON_DB        = "neondb";

const NEON_FORM_CONN = "postgresql://form_user:form_maelo_2026@" + NEON_HOST + "/" + NEON_DB + "?sslmode=require";

function _neonEndpoint() {
  const h = (typeof location !== 'undefined') ? location.hostname : '';
  return (h === 'localhost' || h === '127.0.0.1')
    ? '/neon-proxy'
    : '/api/neon-proxy';
}

async function neonQuery(connString, sql, params) {
  const endpoint = _neonEndpoint();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connString,
    },
    body: JSON.stringify({ query: sql, params: params || [] }),
  });

  let json;
  try { json = await res.json(); } catch { throw new Error("Resposta inválida da base de dados"); }
  if (!res.ok) throw new Error(json.message || json.error || "Erro DB (HTTP " + res.status + ")");
  return json;
}
