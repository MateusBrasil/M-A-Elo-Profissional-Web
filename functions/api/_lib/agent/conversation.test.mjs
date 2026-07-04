import assert from "node:assert/strict";
import { test } from "node:test";
import { makeConversation } from "./conversation.js";

function memStore() {
  const m = new Map();
  return {
    async load(t) { return m.get(t) || null; },
    async save(t, s) { m.set(t, JSON.parse(JSON.stringify(s))); },
    async remove(t) { m.delete(t); },
  };
}

function scriptedAgent(turns) {
  let i = 0;
  return { async turn() { return turns[Math.min(i++, turns.length - 1)]; } };
}

test("a abertura e do codigo (saudacao + consentimento + funcao), sem chamar a IA", async () => {
  let called = 0;
  const agent = { async turn() { called++; return {}; } };
  const convo = makeConversation({ store: memStore(), aiAgent: agent });

  const r = await convo.handle("351900000010", "ola");

  assert.equal(r.done, false);
  assert.match(r.reply, /M&A Elo/);
  assert.match(r.reply, /política de privacidade/i);
  assert.equal(called, 0);
});

test("a IA conduz a conversa e o codigo conclui com o formulario, persistindo o estado", async () => {
  const store = memStore();
  const agent = scriptedAgent([
    { reply: "Tem documentos para Portugal?", extraction: { role: "soldador" }, decision: { decision: "continue" }, done: false },
    { reply: "Consegue deslocar-se, sem alojamento?", extraction: { role: "soldador", work_auth: "authorized" }, decision: { decision: "continue" }, done: false },
    { reply: "Há quantos anos?", extraction: { role: "soldador", work_auth: "authorized", travel: true, housing_needed: false }, decision: { decision: "continue" }, done: false },
    { reply: "Aqui o formulário de soldador.", extraction: { role: "soldador", work_auth: "authorized", travel: true, housing_needed: false, experience: "5 anos" }, decision: { decision: "proceed", roleKey: "soldador" }, done: true },
  ]);
  const convo = makeConversation({ store, aiAgent: agent });
  const tel = "351900000011";

  await convo.handle(tel, "ola");
  await convo.handle(tel, "sou soldador");
  await convo.handle(tel, "sim tenho");
  await convo.handle(tel, "sim e sem alojamento");
  const last = await convo.handle(tel, "5 anos");

  assert.equal(last.done, true);
  assert.equal(last.decision.roleKey, "soldador");

  const saved = await store.load(tel);
  assert.equal(saved.stage, "completed");
  assert.ok(saved.history.length >= 8); // abertura + 4 turnos, ida e volta
});

test("depois de concluida, repete a ultima mensagem em vez de recomecar", async () => {
  const store = memStore();
  const agent = scriptedAgent([
    { reply: "Aqui o formulário de pintor.", extraction: { role: "pintor", work_auth: "authorized", travel: true, housing_needed: false, experience: "3" }, decision: { decision: "proceed", roleKey: "pintor" }, done: true },
  ]);
  const convo = makeConversation({ store, aiAgent: agent });
  const tel = "351900000012";

  await convo.handle(tel, "ola");
  await convo.handle(tel, "sou pintor com tudo tratado");
  const again = await convo.handle(tel, "ja enviei?");

  assert.equal(again.done, true);
  assert.match(again.reply, /formulário de pintor/i);
});
