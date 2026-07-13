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

// Agente de IA só usado na etapa da logística; devolve um turno já programado.
function aiConcludes(reply, decision) {
  return {
    async turn(history, data) {
      return { reply, extraction: { ...data, travel: true, housing_needed: false }, decision, done: true };
    },
  };
}

test("a abertura e do codigo (lista com saudacao + consentimento), sem chamar a IA", async () => {
  let called = 0;
  const convo = makeConversation({ store: memStore(), aiAgent: { async turn() { called++; return {}; } } });
  const r = await convo.handle("351900000104", "ola");
  assert.equal(r.done, false);
  assert.ok(r.interactive, "a abertura envia uma lista interativa");
  assert.match(r.interactive.body, /M&A Elo/);
  assert.match(r.interactive.body, /política de privacidade/i);
  assert.equal(called, 0);
});

test("fluxo por toques: funcao (lista) -> documentos (botoes) -> logistica (IA) -> formulario", async () => {
  const store = memStore();
  const aiAgent = aiConcludes(
    "Aqui está o formulário de soldador: https://maelo.pt/candidatura-soldador.html",
    { decision: "proceed", roleKey: "soldador", review: false }
  );
  const convo = makeConversation({ store, aiAgent });
  const tel = "351900000100";

  const open = await convo.handle(tel, "olá");
  assert.ok(open.interactive);

  const afterRole = await convo.handle(tel, "Soldador", { buttonId: "soldador" });
  assert.equal(afterRole.interactive.type, "buttons"); // pergunta de documentos

  const afterAuth = await convo.handle(tel, "Tenho documentos", { buttonId: "authorized" });
  assert.equal(afterAuth.done, false);
  assert.match(afterAuth.reply, /alojamento/i); // logistica em texto

  const done = await convo.handle(tel, "sim consigo e tenho onde ficar");
  assert.equal(done.done, true);
  assert.equal(done.decision.roleKey, "soldador");
  assert.match(done.reply, /candidatura-soldador/);
});

test("botao 'Nao tenho' documentos corta de imediato, sem chamar a IA", async () => {
  const store = memStore();
  let aiCalled = 0;
  const convo = makeConversation({ store, aiAgent: { async turn() { aiCalled++; return {}; } } });
  const tel = "351900000101";

  await convo.handle(tel, "olá");
  await convo.handle(tel, "Soldador", { buttonId: "soldador" });
  const r = await convo.handle(tel, "Não tenho", { buttonId: "not_authorized" });

  assert.equal(r.done, true);
  assert.equal(r.decision.decision, "reject");
  assert.equal(r.decision.roleKey, "soldador"); // o reject mantem a funcao conhecida
  assert.equal(aiCalled, 0);
});

test("funcao por texto livre (sem tocar na lista) avanca para os documentos", async () => {
  const store = memStore();
  const convo = makeConversation({ store, aiAgent: { async turn() { return {}; } } });
  const tel = "351900000102";

  await convo.handle(tel, "olá");
  const r = await convo.handle(tel, "faço soldadura");
  assert.equal(r.interactive.type, "buttons"); // documentos
});

test("depois de concluida, repete a ultima mensagem", async () => {
  const store = memStore();
  const aiAgent = aiConcludes(
    "Formulário de pintor: https://maelo.pt/candidatura-pintor.html",
    { decision: "proceed", roleKey: "pintor", review: false }
  );
  const convo = makeConversation({ store, aiAgent });
  const tel = "351900000103";

  await convo.handle(tel, "olá");
  await convo.handle(tel, "Pintor", { buttonId: "pintor" });
  await convo.handle(tel, "Tenho", { buttonId: "authorized" });
  await convo.handle(tel, "sim consigo, tenho casa");
  const again = await convo.handle(tel, "já enviei?");

  assert.equal(again.done, true);
  assert.match(again.reply, /candidatura-pintor/);
});

test("candidato rejeitado que responde REVER e reaberto para revisao humana (RGPD Art. 22)", async () => {
  const store = memStore();
  const convo = makeConversation({ store, aiAgent: { async turn() { return {}; } } });
  const tel = "351900000107";

  await convo.handle(tel, "olá");
  await convo.handle(tel, "Soldador", { buttonId: "soldador" });
  const rej = await convo.handle(tel, "Não tenho", { buttonId: "not_authorized" });
  assert.equal(rej.decision.decision, "reject");
  assert.match(rej.reply, /REVER/); // a mensagem de rejeicao oferece o recurso

  const rev = await convo.handle(tel, "REVER");
  assert.equal(rev.done, true);
  assert.equal(rev.decision.decision, "review_request");
  assert.match(rev.reply, /revisão/i);

  const again = await convo.handle(tel, "rever outra vez");
  assert.notEqual(again.decision && again.decision.decision, "review_request"); // so uma vez
});

test("teto de turnos: passa a revisao humana em vez de continuar em loop", async () => {
  const store = memStore();
  const convo = makeConversation({ store, aiAgent: { async turn() { return { reply: "x", extraction: {}, decision: { decision: "continue" }, done: false }; } } });
  const tel = "351900000105";

  await convo.handle(tel, "olá"); // abertura
  let last;
  for (let i = 0; i < 20; i += 1) last = await convo.handle(tel, "zzz" + i); // texto que nao resolve funcao

  assert.equal(last.done, true);
  assert.equal(last.decision.review, true);
  assert.match(last.reply, /colega/i);
});

test("propaga saved=false quando o store deteta conflito de concorrencia", async () => {
  const store = {
    async load() { return { stage: "awaiting_logistics", data: { role: "soldador", work_auth: "authorized" }, history: [{ role: "assistant", content: "logística?" }] }; },
    async save() { return false; },
    async remove() {},
  };
  const aiAgent = { async turn() { return { reply: "ok", extraction: { role: "soldador", work_auth: "authorized", travel: null, housing_needed: null }, decision: { decision: "continue" }, done: false }; } };
  const convo = makeConversation({ store, aiAgent });

  const r = await convo.handle("351900000106", "talvez");
  assert.equal(r.saved, false);
});
