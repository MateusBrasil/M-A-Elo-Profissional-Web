const auth = require("./_lib/auth");

module.exports = async function handler(req, res) {
  auth.setSecurityHeaders(res);
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  auth.setCookieHeader(res, auth.clearSessionCookie());
  return res.status(200).json({ ok: true });
};
