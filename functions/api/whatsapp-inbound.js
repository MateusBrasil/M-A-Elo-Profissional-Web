// Endpoint publico do agente: /api/whatsapp-inbound
//
// GET  -> handshake de verificacao do webhook da Meta.
// POST -> mensagem recebida. Valida a assinatura, responde 200 a Meta de imediato
//         e processa em background (conduz a conversa, envia a resposta, grava o lead).
//
// Nao usa a sessao de admin (requireSession): quem chama e a Meta, nao um humano
// com cookie. A autenticidade e garantida pela assinatura HMAC (App Secret).

import * as auth from "./_lib/auth.js";
import { makeSessionStore } from "./_lib/agent/sessions.js";
import { makeAiAgent, mistralCaller } from "./_lib/agent/ai.js";
import { makeConversation } from "./_lib/agent/conversation.js";
import { makeLeadStore } from "./_lib/agent/leads.js";
import { parseInbound, verifySignature, sendMessage } from "./_lib/agent/whatsapp.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge || "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const raw = await request.text();

  const signature = request.headers.get("x-hub-signature-256");
  const authentic = await verifySignature(env.WHATSAPP_APP_SECRET, raw, signature);
  if (!authentic) return new Response("Invalid signature", { status: 401 });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const msg = parseInbound(body);
  if (msg && msg.from) {
    // Processa em background: a Meta recebe o 200 ja, sem esperar pela IA.
    const work = processMessage(env, msg).catch((err) => console.error("whatsapp-agent error:", err));
    if (typeof context.waitUntil === "function") context.waitUntil(work);
    else await work;
  }

  return new Response("OK", { status: 200 });
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  return new Response("Method not allowed", { status: 405 });
}

async function processMessage(env, msg) {
  // Tipos nao-texto (imagem, audio): pede texto de volta.
  if (!msg.text) {
    await sendMessage(env, msg.from, "De momento só consigo ler mensagens de texto. Pode escrever a sua resposta, por favor?");
    return;
  }

  const runQuery = (sql, params) => auth.neonQuery(env, sql, params);
  const store = makeSessionStore(runQuery);
  const aiAgent = makeAiAgent(mistralCaller(env));
  const convo = makeConversation({ store, aiAgent });

  const result = await convo.handle(msg.from, msg.text);
  await sendMessage(env, msg.from, result.reply);

  // Fase 6: ao concluir, grava o lead no painel admin (tabela candidatos).
  const d = result.decision;
  if (result.done && d && (d.decision === "proceed" || d.decision === "reject")) {
    const leads = makeLeadStore(runQuery);
    await leads.saveFromScreening(msg.from, {
      roleKey: d.roleKey,
      decision: d.decision,
      review: d.review,
      extraction: result.data,
      name: msg.name,
    });
  }
}
