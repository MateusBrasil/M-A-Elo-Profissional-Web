// Ligacao a Meta WhatsApp Cloud API: traduzir o que chega, validar que veio mesmo
// da Meta, e enviar respostas. Usa Web Crypto (igual ao resto do projeto) para
// correr no runtime Cloudflare e nos testes Node sem dependencias extra.

import { fetchResilient } from "./http.js";

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
//
// FAIL-CLOSED: sem App Secret nao se consegue verificar, por isso REJEITA-SE por
// omissao. So se permite passar sem assinatura quando `allowUnsigned` e explicito
// (modo de desenvolvimento local). Em producao, sem secret => todos os POST 401.
export async function verifySignature(appSecret, rawBody, signatureHeader, { allowUnsigned = false } = {}) {
  if (!appSecret) return allowUnsigned === true;
  if (!signatureHeader) return false;
  const expected = String(signatureHeader).replace(/^sha256=/, "");
  const key = await crypto.subtle.importKey("raw", enc(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc(rawBody));
  return safeEqual(toHex(sig), expected);
}

// Traduz UMA mensagem da Meta para a forma que o agente usa, ou null se for para
// ignorar (reactions nao devem disparar resposta; statuses nem chegam aqui).
function mapMessage(message, change) {
  if (!message || message.type === "reaction") return null;
  const base = { from: message.from, name: contactName(change), wamid: message.id || null };
  if (message.type !== "text") {
    // Nao e texto (imagem, audio, botao...). Sem texto, para o orquestrador pedir texto.
    return { ...base, text: "", unsupportedType: message.type };
  }
  return { ...base, text: message.text?.body || "" };
}

// Extrai TODAS as mensagens uteis do payload da Meta (a Meta pode agrupar varias
// num so webhook, e varios entry/changes). Ignora statuses e reactions.
export function parseInboundAll(body) {
  const out = [];
  for (const entry of body?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      for (const message of value?.messages || []) {
        const m = mapMessage(message, value);
        if (m && m.from) out.push(m);
      }
    }
  }
  return out;
}

// Compatibilidade: a primeira mensagem util, ou null. Mantido para chamadas e
// testes que so esperam uma mensagem.
export function parseInbound(body) {
  return parseInboundAll(body)[0] || null;
}

function contactName(change) {
  return change?.contacts?.[0]?.profile?.name || "";
}

// Envia uma mensagem de texto para um numero via Graph API.
// Usa fetchResilient: timeout + retry em 429/5xx, para nao perder a resposta ao
// candidato num soluco momentaneo da Meta.
export async function sendMessage(env, to, text) {
  const phoneId = env.WHATSAPP_PHONE_ID;
  const token = env.WHATSAPP_TOKEN;
  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`;
  const res = await fetchResilient(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  }, { timeoutMs: 8000, retries: 2 });
  if (!res.ok) throw new Error(`WhatsApp send failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// Marca a mensagem como lida e mostra o indicador "a escrever…" enquanto a IA
// pensa. Sao mensagens de servico (NAO faturaveis) e melhoram muito a perceicao
// de resposta durante os segundos de espera. Best-effort: nunca lanca.
export async function markReadAndTyping(env, messageId) {
  if (!messageId || !env.WHATSAPP_PHONE_ID || !env.WHATSAPP_TOKEN) return;
  const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/${env.WHATSAPP_PHONE_ID}/messages`;
  try {
    await fetchResilient(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: { type: "text" },
      }),
    }, { timeoutMs: 5000, retries: 1 });
  } catch (e) {
    console.error("[whatsapp] markReadAndTyping falhou:", e && e.message);
  }
}
