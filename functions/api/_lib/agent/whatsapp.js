// Ligacao a Meta WhatsApp Cloud API: traduzir o que chega, validar que veio mesmo
// da Meta, e enviar respostas. Usa Web Crypto (igual ao resto do projeto) para
// correr no runtime Cloudflare e nos testes Node sem dependencias extra.

const GRAPH_VERSION = "v21.0";

function enc(str) {
  return new TextEncoder().encode(String(str));
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Comparacao em tempo constante (evita timing attacks na assinatura).
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Confirma que o corpo foi mesmo assinado pela Meta com o App Secret.
// A Meta envia o header `X-Hub-Signature-256: sha256=<hmac>` sobre o corpo cru.
export async function verifySignature(appSecret, rawBody, signatureHeader) {
  if (!appSecret) return true; // sem secret configurado (dev local), nao bloqueia
  if (!signatureHeader) return false;
  const expected = String(signatureHeader).replace(/^sha256=/, "");
  const key = await crypto.subtle.importKey("raw", enc(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc(rawBody));
  return safeEqual(toHex(sig), expected);
}

// Extrai a mensagem de texto util do payload da Meta. Devolve { from, text, name }
// ou null quando o webhook nao traz uma mensagem de texto (ex: status de entrega,
// ou tipos que ainda nao tratamos como imagem/audio).
export function parseInbound(body) {
  const change = body?.entry?.[0]?.changes?.[0]?.value;
  const message = change?.messages?.[0];
  if (!message) return null;
  if (message.type !== "text") {
    // Nao e texto (imagem, audio, botao...). Devolve o remetente mas sem texto,
    // para o orquestrador poder pedir texto de volta.
    return { from: message.from, text: "", name: contactName(change), unsupportedType: message.type };
  }
  return { from: message.from, text: message.text?.body || "", name: contactName(change) };
}

function contactName(change) {
  return change?.contacts?.[0]?.profile?.name || "";
}

// Envia uma mensagem de texto para um numero via Graph API.
export async function sendMessage(env, to, text) {
  const phoneId = env.WHATSAPP_PHONE_ID;
  const token = env.WHATSAPP_TOKEN;
  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp send failed (${res.status}): ${await res.text()}`);
  return res.json();
}
