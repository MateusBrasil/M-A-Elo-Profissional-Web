const auth = require("./_lib/auth");

module.exports = async function handler(req, res) {
  auth.setSecurityHeaders(res);
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const session = auth.requireSession(req);
  if (!session) return res.status(200).json({ authenticated: false });
  return res.status(200).json({ authenticated: true, email: session.email });
};
