const auth = require("./_lib/auth");

module.exports = async function handler(req, res) {
  auth.setSecurityHeaders(res);
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = auth.requireSession(req);
  if (!session) return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });

  try {
    if (!auth.rateLimit(`change:${session.email}`, 10, 600)) {
      return res.status(429).json({ error: "Demasiadas tentativas. Tente novamente daqui a pouco." });
    }

    const body = await auth.readJsonBody(req);
    const current = String(body.currentPassword || "");
    const next = String(body.newPassword || "");
    if (!current || !next) return res.status(400).json({ error: "Password atual e nova obrigatórias." });
    if (next.length < 10) return res.status(400).json({ error: "Password nova precisa de pelo menos 10 caracteres." });
    if (next === current) return res.status(400).json({ error: "A nova password não pode ser igual à atual." });

    await auth.ensureAdminBootstrapped();

    const admin = await auth.getAdminByEmail(session.email);
    if (!admin) return res.status(404).json({ error: "Conta não encontrada." });
    if (!auth.verifyPassword(current, admin.password_hash)) {
      return res.status(401).json({ error: "Password atual incorreta." });
    }

    const newHash = auth.hashPassword(next);
    await auth.updateAdminPassword(admin.email, newHash);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[change-password]", err);
    return res.status(500).json({ error: "Erro interno. Tente novamente." });
  }
};
