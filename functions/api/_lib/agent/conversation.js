// Orquestrador da conversa (fluxo hibrido).
//
// As duas perguntas fechadas mais sensiveis sao tratadas por CODIGO com mensagens
// interativas do WhatsApp (fiaveis, sem erros de escrita, sem gastar o modelo):
//   - funcao  -> lista de opcoes (config.interactive.role)
//   - documentos -> botoes (config.interactive.work_auth)
// A logistica (deslocacao + alojamento) e nuancada, por isso e a IA que interpreta.
// Quem prefere escrever em vez de tocar tambem e entendido (parsers de text.js na
// funcao/documentos; a IA na logistica). A DECISAO continua deterministica
// (screening.js), auditavel e conforme RGPD.
//
// handle() devolve OU { reply } (texto) OU { interactive } (spec de lista/botoes),
// mais sempre `saved` (resultado do store.save; false = conflito de concorrencia).

import { messages, questions, limits, interactive, roles } from "./config.js";
import { detectRole, checkCutoffs } from "./screening.js";
import { workAuthorizationFromText } from "./text.js";

const AUTH_VALUES = ["authorized", "pending", "not_authorized"];

function nowIso() {
  return new Date().toISOString();
}

function finalizeSession(session, decision, lastMessage) {
  session.stage = "completed";
  session.decision = decision.decision;
  session.review = decision.review || false;
  session.roleKey = decision.roleKey || null;
  session.reason = decision.reason || null;
  session.lastMessage = lastMessage;
  session.leadSaved = false;
}

function decisionFromSession(session) {
  if (!session.decision) return null;
  return {
    decision: session.decision,
    review: session.review || false,
    roleKey: session.roleKey || null,
    reason: session.reason || null,
  };
}

// Lista de re-pergunta da funcao (corpo curto, sem repetir a saudacao longa).
const roleReask = {
  type: "list",
  body: messages.askRoleAgain,
  button: interactive.role.button,
  rows: interactive.role.rows,
};

export function makeConversation({ store, aiAgent }) {
  // Conclusao deterministica (corte ou formulario decididos pelas regras).
  async function conclude(telefone, session, decision) {
    const enriched = { ...decision, roleKey: decision.roleKey || session.data.role || null };
    finalizeSession(session, enriched, enriched.message);
    const saved = await store.save(telefone, session);
    return { reply: enriched.message, done: true, decision: enriched, data: session.data, saved };
  }

  async function ask(telefone, session, payload) {
    const saved = await store.save(telefone, session);
    return { ...payload, done: false, saved };
  }

  // Etapa da funcao: tap na lista ou texto livre (detectRole). Aproveita para
  // captar os documentos se o texto ja os revelar.
  async function handleRole(telefone, session, text, buttonId) {
    let role = null;
    if (buttonId && roles[buttonId]) role = buttonId;
    else if (text) role = detectRole(text);
    if (!role) return ask(telefone, session, { interactive: roleReask });

    session.data.role = role;
    if (text) {
      const auth = workAuthorizationFromText(text);
      if (auth && auth !== "unknown") session.data.work_auth = auth;
    }
    const cut = checkCutoffs(session.data);
    if (cut) return conclude(telefone, session, cut);

    if (session.data.work_auth && session.data.work_auth !== "unknown") {
      // Documentos ja conhecidos: salta para a logistica.
      session.stage = "awaiting_logistics";
      session.history.push({ role: "assistant", content: questions[2].text });
      return ask(telefone, session, { reply: questions[2].text });
    }
    session.stage = "awaiting_auth";
    session.history.push({ role: "assistant", content: interactive.work_auth.body });
    return ask(telefone, session, { interactive: interactive.work_auth });
  }

  // Etapa dos documentos: tap nos botoes ou texto livre (workAuthorizationFromText).
  async function handleAuth(telefone, session, text, buttonId) {
    let auth = null;
    if (buttonId && AUTH_VALUES.includes(buttonId)) auth = buttonId;
    else if (text) auth = workAuthorizationFromText(text);
    if (!auth || auth === "unknown") {
      return ask(telefone, session, { interactive: interactive.work_auth });
    }
    session.data.work_auth = auth;
    const cut = checkCutoffs(session.data);
    if (cut) return conclude(telefone, session, cut);

    session.stage = "awaiting_logistics";
    session.history.push({ role: "assistant", content: questions[2].text });
    return ask(telefone, session, { reply: questions[2].text });
  }

  // Etapa da logistica (e fallback): a IA interpreta a resposta nuancada.
  async function handleLogistics(telefone, session, text) {
    const turn = await aiAgent.turn(session.history, session.data);
    session.history.push({ role: "assistant", content: turn.reply });
    session.data = turn.extraction;
    if (turn.done) {
      finalizeSession(session, turn.decision, turn.reply);
      const saved = await store.save(telefone, session);
      return { reply: turn.reply, done: true, decision: turn.decision, data: session.data, saved };
    }
    const saved = await store.save(telefone, session);
    return { reply: turn.reply, done: false, decision: null, data: session.data, saved };
  }

  return {
    async handle(telefone, rawText, opts = {}) {
      const buttonId = opts.buttonId || null;
      const text = String(rawText || "").trim().slice(0, limits.maxInputChars);
      let session = (await store.load(telefone)) || { stage: "new", data: {}, history: [] };

      if (!text && !buttonId) {
        return { reply: messages.emptyMessage, done: false, saved: true };
      }

      // Ja concluida: repete a ultima mensagem e devolve a decisao (para o inbound
      // poder (re)gravar o lead se a gravacao anterior falhou).
      if (session.stage === "completed") {
        return {
          reply: session.lastMessage || messages.alreadyDone,
          done: true,
          decision: decisionFromSession(session),
          data: session.data || {},
          saved: true,
        };
      }

      // Primeira mensagem: abertura com a LISTA de funcoes (saudacao + consentimento
      // no corpo). O consentimento so se carimba quando o candidato RESPONDER.
      if (session.stage === "new") {
        session = { stage: "awaiting_role", data: {}, history: [] };
        const saved = await store.save(telefone, session);
        return { interactive: interactive.role, done: false, saved };
      }

      // A partir daqui houve consentimento (viu o aviso na abertura e respondeu).
      if (!session.consentAt) session.consentAt = nowIso();
      session.data = session.data || {};
      session.history = session.history || [];
      session.history.push({ role: "user", content: text || `[${buttonId}]` });

      // Teto de turnos: passa a revisao humana em vez de continuar em loop.
      const userTurns = session.history.filter((m) => m.role === "user").length;
      if (userTurns > limits.maxTurns) {
        const decision = {
          decision: "proceed",
          review: true,
          roleKey: session.data.role || "geral",
          reason: "Conversa excedeu o limite de mensagens; revisao humana.",
        };
        finalizeSession(session, decision, messages.handoff);
        const saved = await store.save(telefone, session);
        return { reply: messages.handoff, done: true, decision, data: session.data, saved };
      }

      if (session.stage === "awaiting_role") return handleRole(telefone, session, text, buttonId);
      if (session.stage === "awaiting_auth") return handleAuth(telefone, session, text, buttonId);
      return handleLogistics(telefone, session, text); // awaiting_logistics + fallback
    },
  };
}
