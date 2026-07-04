// Orquestrador da conversa: a unica entrada que junta tudo.
// Carrega a sessao do numero, conduz o turno e guarda de volta.
//
// A primeira mensagem e sempre respondida pelo CODIGO (saudacao + consentimento
// RGPD + a primeira pergunta), para o consentimento ser explicito e auditavel.
// A partir dai a IA conduz a conversa, e o codigo continua a decidir os cortes e
// a conclusao (ver ai.js + screening.js).

import { messages, questions } from "./config.js";

function nowIso() {
  return new Date().toISOString();
}

export function makeConversation({ store, aiAgent }) {
  return {
    async handle(telefone, rawText) {
      const text = String(rawText || "").trim();
      let session = (await store.load(telefone)) || { stage: "new", history: [], data: {} };

      if (!text) {
        return { reply: messages.emptyMessage, done: false };
      }

      // Ja concluida: repete a ultima mensagem util (o link do formulario, ou o corte).
      if (session.stage === "completed") {
        return { reply: session.lastMessage || messages.alreadyDone, done: true };
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
        await store.save(telefone, session);
        return { reply: opening, done: false };
      }

      // Conversa a decorrer: a IA conduz, o codigo decide.
      session.history = session.history || [];
      session.history.push({ role: "user", content: text });

      const turn = await aiAgent.turn(session.history);

      session.history.push({ role: "assistant", content: turn.reply });
      session.data = turn.extraction;

      if (turn.done) {
        session.stage = "completed";
        session.decision = turn.decision.decision;
        session.review = turn.decision.review || false;
        session.roleKey = turn.decision.roleKey || null;
        session.reason = turn.decision.reason || null;
        session.lastMessage = turn.reply;
      }

      await store.save(telefone, session);
      return { reply: turn.reply, done: turn.done, decision: turn.done ? turn.decision : null };
    },
  };
}
