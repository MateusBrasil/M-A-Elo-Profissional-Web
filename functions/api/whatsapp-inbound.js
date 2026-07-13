// Endpoint publico do agente: /api/whatsapp-inbound
//
// GET  -> handshake de verificacao do webhook da Meta.
// POST -> mensagem recebida. Valida a assinatura, responde 200 a Meta de imediato
//         e processa em background (conduz a conversa, envia a resposta, grava o lead).
//
// Nao usa a sessao de admin (requireSession): quem chama e a Meta, nao um humano
// com cookie. A autenticidade e garantida pela assinatura HMAC (App Secret).
//
// Robustez (ver auditoria): dedup por wamid, indicador "a escrever", fallback
// gracioso se a IA falhar, lead gravado independentemente do envio, e todos os
// erros registados numa tabela consultavel no admin (nao so na consola efemera).

import * as auth from "./_lib/auth.js";
import { makeSessionStore, makeDedupStore, purgeOldData } from "./_lib/agent/sessions.js";
import { makeAiAgent, mistralCaller } from "./_lib/agent/ai.js";
import { makeConversation } from "./_lib/agent/conversation.js";
import { makeLeadStore } from "./_lib/agent/leads.js";
import { makeErrorLog } from "./_lib/agent/observability.js";
import { parseInboundAll, verifySignature, sendMessage, markReadAndTyping } from "./_lib/agent/whatsapp.js";
import { messages, retention } from "./_lib/agent/config.js";

// Neon SQL com a ligacao de baixo privilegio (so INSERT candidatos), tal como o
// public-form.js. O lead vai por aqui; as tabelas wa_* usam a ligacao owner.
async function formQuery(env, sql, params) {
  const connString = env.NEON_FORM_CONN;
  if (!connString) throw new Error("Missing NEON_FORM_CONN env var");
  const url = new URL(connString);
  const host = url.host.replace("-pooler", "");
  const res = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": connString },
    body: JSON.stringify({ query: sql, params: params || [] }),
  });
  if (!res.ok) throw new Error(`Neon query failed (${res.status}): ${await res.text()}`);
  return res.json();
}

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
  const allowUnsigned = env.AGENT_ALLOW_UNSIGNED === "true"; // so em dev explicito
  const authentic = await verifySignature(env.WHATSAPP_APP_SECRET, raw, signature, { allowUnsigned });
  if (!authentic) return new Response("Invalid signature", { status: 401 });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const inbound = parseInboundAll(body);
  if (inbound.length) {
    // Processa em background: a Meta recebe o 200 ja, sem esperar pela IA.
    const work = processInbound(env, inbound).catch((err) => console.error("whatsapp-agent error:", err));
    if (typeof context.waitUntil === "function") context.waitUntil(work);
    else await work;
  }

  return new Response("OK", { status: 200 });
}

export async function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  return new Response("Method not allowed", { status: 405 });
}

async function processInbound(env, inbound) {
  const runQuery = (sql, params) => auth.neonQuery(env, sql, params); // owner: tabelas wa_*
  const runFormQuery = (sql, params) => formQuery(env, sql, params); // baixo privilegio: candidatos
  const store = makeSessionStore(runQuery);
  const ctx = {
    store,
    dedup: makeDedupStore(runQuery),
    errorLog: makeErrorLog(runQuery),
    convo: makeConversation({ store, aiAgent: makeAiAgent(mistralCaller(env)) }),
    leads: makeLeadStore(runFormQuery),
    send: (to, text) => sendMessage(env, to, text),
    typing: (wamid) => markReadAndTyping(env, wamid),
  };

  for (const msg of inbound) {
    await processOne(msg, ctx);
  }

  // Retencao RGPD: limpeza oportunista, best-effort, fora do caminho critico.
  try {
    if (Math.random() < 0.02) await purgeOldData(runQuery, retention.sessionDays);
  } catch (e) {
    console.error("[purge]", e && e.message);
  }
}

// Processa UMA mensagem. ctx traz tudo injetado (store, dedup, errorLog, convo,
// leads, send, typing), o que torna este caminho critico testavel sem rede real.
export async function processOne(msg, ctx) {
  const { store, dedup, errorLog, convo, leads, send, typing } = ctx;

  // Dedup: reentregas da Meta (garantidas) nao se reprocessam.
  let fresh = true;
  try {
    fresh = await dedup.claim(msg.wamid);
  } catch (e) {
    await errorLog.record({ telefone: msg.from, wamid: msg.wamid, etapa: "dedup", erro: e });
  }
  if (!fresh) return;

  // Marca como lida + "a escrever" enquanto a IA pensa (nao faturavel, best-effort).
  if (typing) typing(msg.wamid);

  // Tipos nao-texto (imagem, audio): pede texto de volta.
  if (!msg.text) {
    await safeSend(ctx, msg.from, "De momento só consigo ler mensagens de texto. Pode escrever a sua resposta, por favor?", msg);
    return;
  }

  // Conduz o turno. Se a IA falhar, responde com desculpa em vez de silencio total.
  let result;
  try {
    result = await convo.handle(msg.from, msg.text);
  } catch (err) {
    await errorLog.record({ telefone: msg.from, wamid: msg.wamid, etapa: "conversa", erro: err });
    await safeSend(ctx, msg.from, messages.aiError, msg);
    return;
  }

  // Conflito de concorrencia: nao envia esse turno (evita respostas contraditorias).
  if (result.saved === false) {
    await errorLog.record({ telefone: msg.from, wamid: msg.wamid, etapa: "concorrencia", erro: "save em conflito; turno ignorado" });
    return;
  }

  // Grava o lead ANTES de depender do envio. Reivindicacao atomica evita
  // duplicados; se o INSERT falhar, liberta para a proxima mensagem tentar.
  const d = result.decision;
  if (result.done && d && (d.decision === "proceed" || d.decision === "reject")) {
    await saveLead(store, leads, msg, d, result.data, errorLog);
  }

  // Envia a resposta ao candidato (com retry interno). O lead ja esta seguro.
  await safeSend(ctx, msg.from, result.reply, msg);
}

async function saveLead(store, leads, msg, decision, data, errorLog) {
  let claimed = false;
  try {
    claimed = await store.claimLeadSave(msg.from);
  } catch (e) {
    await errorLog.record({ telefone: msg.from, wamid: msg.wamid, etapa: "claim-lead", erro: e });
    return;
  }
  if (!claimed) return; // ja gravado por outro turno

  try {
    await leads.saveFromScreening(msg.from, {
      roleKey: decision.roleKey,
      decision: decision.decision,
      review: decision.review,
      extraction: data,
      name: msg.name,
    });
  } catch (err) {
    // Liberta a reivindicacao para uma mensagem seguinte poder tentar de novo.
    await store.releaseLeadSave(msg.from).catch(() => {});
    await errorLog.record({ telefone: msg.from, wamid: msg.wamid, etapa: "lead", erro: err });
  }
}

async function safeSend(ctx, to, text, msg) {
  try {
    await ctx.send(to, text);
  } catch (err) {
    await ctx.errorLog.record({ telefone: to, wamid: msg && msg.wamid, etapa: "envio", erro: err });
  }
}
