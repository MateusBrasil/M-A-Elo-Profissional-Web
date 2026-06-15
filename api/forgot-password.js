const auth = require("./_lib/auth");
const { sendPasswordResetEmail } = require("./_lib/mail");

function originFromReq(req) {
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return `${proto}://${host}`;
}

module.exports = async function handler(req, res) {
  auth.setSecurityHeaders(res);
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const ip = auth.clientIp(req);
    if (!auth.rateLimit(`forgot:${ip}`, 5, 600)) {
      return res.status(429).json({ error: "Demasiadas tentativas. Tente novamente daqui a pouco." });
    }

    const body = await auth.readJsonBody(req);
    const email = String(body.email || "").trim().toLowerCase();

    // Sempre responde 200 para não revelar se um email existe.
    const generic = { ok: true, message: "Se o email existir, recebe instruções para repor a password." };

    if (!email) return res.status(200).json(generic);
    if (email !== auth.getAdminEmail()) return res.status(200).json(generic);

    await auth.ensureAdminBootstrapped();
    const admin = await auth.getAdminByEmail(email);
    if (!admin) return res.status(200).json(generic);

    const { token } = await auth.createResetToken(email);
    const base = originFromReq(req);
    const resetUrl = `${base}/admin-reset.html?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    const expiresInMinutes = Math.floor(auth.RESET_TTL_SECONDS / 60);

    const mail = await sendPasswordResetEmail({ to: email, resetUrl, expiresInMinutes });

    return res.status(200).json({
      ...generic,
      delivered: mail.sent ? "email" : "fallback",
    });
  } catch (err) {
    console.error("[forgot-password]", err);
    return res.status(500).json({ error: "Erro interno. Tente novamente." });
  }
};
