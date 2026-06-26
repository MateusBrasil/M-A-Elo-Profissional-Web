// Email sender — Cloudflare Functions edition
// Usa Resend se RESEND_API_KEY estiver definido; senão devolve fallback (link visível nos logs).
// Retorna { sent: boolean, fallback: boolean, error?: string }.

export async function sendPasswordResetEmail(env, { to, resetUrl, expiresInMinutes = 30 }) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.RESET_FROM_EMAIL || "M&A Elo <onboarding@resend.dev>";
  const subject = "Repor password — M&A Elo Profissional";

  const html = `<!doctype html>
<html lang="pt-PT"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#0d0f12;font-family:-apple-system,Segoe UI,sans-serif;color:#e8e6e1">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 16px;background:#0d0f12">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:32px 28px">
        <tr><td>
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#F07814">M&amp;A Elo Profissional</p>
          <h1 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:28px;color:#fff">Repor a sua password</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.7)">
            Recebemos um pedido de reposi&ccedil;&atilde;o de password para a conta de administra&ccedil;&atilde;o.
            Clique no bot&atilde;o abaixo para definir uma nova password. O link expira em ${expiresInMinutes} minutos.
          </p>
          <p style="margin:0 0 24px"><a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#F07814,#C95F08);color:#fff;text-decoration:none;padding:13px 26px;border-radius:10px;font-weight:600;font-size:14px">Definir nova password</a></p>
          <p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:rgba(255,255,255,0.5)">
            Se o bot&atilde;o n&atilde;o funcionar, copia este link:<br>
            <span style="color:#F07814;word-break:break-all">${resetUrl}</span>
          </p>
          <p style="margin:28px 0 0;font-size:11px;line-height:1.6;color:rgba(255,255,255,0.4);border-top:1px solid rgba(255,255,255,0.08);padding-top:18px">
            Se n&atilde;o pediu este reset, ignore este email. A sua password n&atilde;o ser&aacute; alterada.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  if (!apiKey) {
    console.log("[mail.js] RESEND_API_KEY not set — printing reset link in logs.");
    console.log("[mail.js] To:", to);
    console.log("[mail.js] Reset URL:", resetUrl);
    return { sent: false, fallback: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[mail.js] Resend error:", res.status, text);
      console.log("[mail.js] Fallback reset URL:", resetUrl);
      return { sent: false, fallback: true, error: text };
    }
    return { sent: true, fallback: false };
  } catch (err) {
    console.error("[mail.js] Resend exception:", err.message);
    console.log("[mail.js] Fallback reset URL:", resetUrl);
    return { sent: false, fallback: true, error: err.message };
  }
}
