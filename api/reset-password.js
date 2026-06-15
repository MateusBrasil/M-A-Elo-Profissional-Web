const auth = require("./_lib/auth");

module.exports = async function handler(req, res) {
  auth.setSecurityHeaders(res);
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const ip = auth.clientIp(req);
    if (!auth.rateLimit(`reset:${ip}`, 10, 600)) {
      return res.status(429).json({ error: "Demasiadas tentativas. Tente novamente daqui a pouco." });
    }

    const body = await auth.readJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const token = String(body.token || "");
    const next = String(body.newPassword || "");

    if (!email || !token || !next) return res.status(400).json({ error: "Pedido inválido." });
    if (next.length < 10) return res.status(400).json({ error: "Password precisa de pelo menos 10 caracteres." });

    await auth.ensureAdminBootstrapped();
    const admin = await auth.getAdminByEmail(email);
    if (!admin) return res.status(400).json({ error: "Link inválido ou expirado." });

    const consumed = await auth.consumeResetToken(email, token);
    if (!consumed) return res.status(400).json({ error: "Link inválido ou expirado." });

    const newHash = auth.hashPassword(next);
    await auth.updateAdminPassword(email, newHash);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return res.status(500).json({ error: "Erro interno. Tente novamente." });
  }
};
