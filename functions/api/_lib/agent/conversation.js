// Orquestrador da conversa: a unica entrada que junta tudo.
// Carrega a sessao do numero, conduz o turno e guarda de volta.
//
// A primeira mensagem e sempre respondida pelo CODIGO (saudacao + consentimento
// RGPD + a primeira pergunta), para o consentimento ser explicito e auditavel.
// A partir dai a IA conduz a conversa, e o codigo continua a decidir os cortes e
// a conclusao (ver ai.js + screening.js).
//
// Devolve sempre `saved` (resultado do store.save): em conflito de concorrencia
// o save devolve false e o inbound trata isso (regista e nao envia esse turno).

import { messages, questions, limits } from "./config.js";

function nowIso() {
  return new Date().toISOString();
}

// Marca a sessao como concluida e guarda o que o inbound precisa para (re)gravar
// o lead. leadSaved=false: o inbound reivindica-o atomicamente depois.
function finalizeSession(session, decision, lastMessage) {
  session.stage = "completed";
  session.decision = decision.decision;
  session.review = decision.review || false;
  session.roleKey = decision.roleKey || null;
  session.reason = decision.reason || null;
  session.lastMessage = lastMessage;
  session.leadSaved = false;
}

// Reconstroi a decisao a partir de uma sessao ja concluida (branch de repeticao).
function decisionFromSession(session) {
  if (!session.decision) return null;
  return {
    decision: session.decision,
    review: session.review || false,
    roleKey: session.roleKey || null,
    reason: session.reason || null,
  };
}

export function makeConversation({ store, aiAgent }) {
  return {
    async handle(telefone, rawText) {
      // Trunca respostas gigantes: uma resposta de triagem e curta, e isto trava
      // o custo (input enorme) e o abuso.
      const text = String(rawText || "").trim().slice(0, limits.maxInputChars);
      let session = (await store.load(telefone)) || { stage: "new", history: [], data: {} };

      if (!text) {
        return { reply: messages.emptyMessage, done: false, saved: true };
      }

      // Ja concluida: repete a ultima mensagem util e devolve a decisao, para o
      // inbound poder gravar o lead caso a gravacao anterior tenha falhado.
      if (session.stage === "completed") {
        return {
          reply: session.lastMessage || messages.alreadyDone,
          done: true,
          decision: decisionFromSession(session),
          data: session.data || {},
          saved: true,
        };
      }

      // Primeira mensagem: abertura controlada pelo codigo (consentimento + 1a pergunta).
      if (session.stage === "new") {
        const opening = `${messages.greeting}\n\n${questions[0].text}`;
        session = {
          stage: "in_progress",
          consentAt: nowIso(),
          data: {},
          history: [
            { role: "user", content: text },
            { role: "assistant", content: opening },
          ],
        };
        const saved = await store.save(telefone, session);
        return { reply: opening, done: false, saved };
      }

      // Conversa a decorrer: a IA conduz, o codigo decide.
      session.history = session.history || [];
      session.history.push({ role: "user", content: text });

      // Teto de turnos: se a conversa se arrasta (ou alguem esta a abusar), em vez
      // de continuar em loop (custo), passa a revisao humana e fecha.
      const userTurns = session.history.filter((m) => m.role === "user").length;
      if (userTurns > limits.maxTurns) {
        const decision = {
          decision: "proceed",
          review: true,
          roleKey: (session.data && session.data.role) || "geral",
          reason: "Conversa excedeu o limite de mensagens; revisao humana.",
        };
        session.history.push({ role: "assistant", content: messages.handoff });
        finalizeSession(session, decision, messages.handoff);
        const saved = await store.save(telefone, session);
        return { reply: messages.handoff, done: true, decision, data: session.data, saved };
      }

      const turn = await aiAgent.turn(session.history, session.data || {});

      session.history.push({ role: "assistant", content: turn.reply });
      session.data = turn.extraction;

      if (turn.done) {
        finalizeSession(session, turn.decision, turn.reply);
      }

      const saved = await store.save(telefone, session);
      return {
        reply: turn.reply,
        done: turn.done,
        decision: turn.done ? turn.decision : null,
        data: session.data,
        saved,
      };
    },
  };
}
