// Client → /api/public-form (server-side proxy for candidate forms).
// Credentials live in Vercel env vars; the browser never sees a Neon connection string.

async function publicFormCall(payload) {
  const res = await fetch("/api/public-form", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let json;
  try { json = await res.json(); } catch { throw new Error("Resposta inválida do servidor"); }
  if (!res.ok) throw new Error(json.error || "Erro ao contactar o servidor.");
  return json;
}

async function loadFormDefinition(slug) {
  return publicFormCall({ op: "loadForm", slug });
}

async function submitCandidate(data) {
  return publicFormCall({ op: "submitCandidate", data });
}

async function submitContact(data) {
  return publicFormCall({ op: "submitContact", data });
}

// Back-compat shim — old callers pass (connString, sql, params) and expect rows.
// We map the few known queries used by the public forms to the new whitelisted ops.
async function neonQuery(_connString, sql, params) {
  const raw = sql || "";
  const s = raw.toLowerCase();
  if (s.startsWith("select") && s.includes("from formularios") && s.includes("slug=")) {
    return loadFormDefinition(params[0]);
  }
  if (s.startsWith("insert into candidatos")) {
    const colsMatch = raw.match(/insert\s+into\s+candidatos\s*\(([^)]+)\)/i);
    const cols = colsMatch
      ? colsMatch[1].split(",").map((c) => c.trim())
      : ["profissao","nome","telefone","email","regiao","experiencia","disponibilidade","processos","mensagem"];
    const data = {};
    cols.forEach((c, i) => { data[c] = params[i]; });
    await submitCandidate(data);
    return { rows: [] };
  }
  throw new Error("Query não suportada pelo endpoint público.");
}

// Compat — old code expects this constant to exist; value is unused now.
const NEON_FORM_CONN = "server-managed";
