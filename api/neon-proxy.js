// Vercel API route — server-side proxy for Neon HTTP API
// Eliminates CORS issues: browser → /api/neon-proxy → Neon (server-to-server)
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Neon-Connection-String");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const connString = req.headers["neon-connection-string"];
  if (!connString) return res.status(400).json({ error: "Missing Neon-Connection-String" });

  const NEON_HOST = "ep-dry-term-alu2f51d.c-3.eu-central-1.aws.neon.tech";
  const neonRes = await fetch(`https://${NEON_HOST}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Neon-Connection-String": connString,
    },
    body: JSON.stringify(req.body),
  });

  const data = await neonRes.json();
  return res.status(neonRes.status).json(data);
};
