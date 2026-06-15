const auth = require("./_lib/auth");

module.exports = async function handler(req, res) {
  auth.setSecurityHeaders(res);
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const ip = auth.clientIp(req);
    if (!auth.rateLimit(`login:${ip}`, 8, 300)) {
      return res.status(429).json({ error: "Demasiadas tentativas. Tente novamente em alguns minutos." });
    }

    const body = await auth.readJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) return res.status(400).json({ error: "Email e password obrigatórios." });

    await auth.ensureAdminBootstrapped();

    const admin = await auth.getAdminByEmail(email);
    if (!admin) return res.status(401).json({ error: "Credenciais inválidas." });

    const ok = auth.verifyPassword(password, admin.password_hash);
    if (!ok) return res.status(401).json({ error: "Credenciais inválidas." });

    const token = auth.signToken({ kind: "session", email: admin.email }, auth.SESSION_TTL_SECONDS);
    auth.setCookieHeader(res, auth.buildSessionCookie(token, auth.SESSION_TTL_SECONDS));
    return res.status(200).json({ ok: true, email: admin.email });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({ error: "Erro interno. Tente novamente." });
  }
};
