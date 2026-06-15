// Vercel API route — proxies authenticated admin requests to Neon.
// Public traffic goes to /api/public-form for the candidate forms (no auth required, but limited SQL).
const auth = require("./_lib/auth");

module.exports = async function handler(req, res) {
  auth.setSecurityHeaders(res);
  res.setHeader("Access-Control-Allow-Origin", "");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = auth.requireSession(req);
  if (!session) return res.status(401).json({ error: "Sessão expirada." });

  try {
    const body = await auth.readJsonBody(req);
    if (!body || typeof body.query !== "string") {
      return res.status(400).json({ error: "Query inválida." });
    }
    const result = await auth.neonQuery(body.query, Array.isArray(body.params) ? body.params : []);
    return res.status(200).json(result);
  } catch (err) {
    console.error("[neon-proxy]", err.message);
    return res.status(500).json({ error: "Erro ao executar query." });
  }
};
