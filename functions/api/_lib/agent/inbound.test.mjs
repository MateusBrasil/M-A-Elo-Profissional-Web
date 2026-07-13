import assert from "node:assert/strict";
import { test } from "node:test";
import { processOne } from "../../whatsapp-inbound.js";
import { messages } from "./config.js";

// Fakes injetados via ctx: exercitam o caminho critico (dedup, fallback da IA,
// lead antes do envio) sem rede real nem base de dados.
function baseCtx(over = {}) {
  return {
    store: { claimLeadSave: async () => true, releaseLeadSave: async () => {} },
    dedup: { claim: async () => true },
    errorLog: { record: async () => {} },
    convo: { handle: async () => ({ reply: "resposta", done: false, saved: true }) },
    leads: { saveFromScreening: async () => {} },
    send: async () => {},
    typing: () => {},
    ...over,
  };
}

test("caminho feliz: envia a resposta conduzida pela conversa", async () => {
  const sent = [];
  const ctx = baseCtx({ send: async (to, text) => sent.push({ to, text }) });
  await processOne({ from: "351900000001", wamid: "w1", text: "ola" }, ctx);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].text, "resposta");
});

test("reentrega (wamid ja visto) e ignorada: nao chama a IA nem envia", async () => {
  let handled = 0; let sent = 0;
  const ctx = baseCtx({
    dedup: { claim: async () => false },
    convo: { handle: async () => { handled += 1; return { reply: "x", saved: true }; } },
    send: async () => { sent += 1; },
  });
  await processOne({ from: "351900000002", wamid: "dup", text: "ola" }, ctx);
  assert.equal(handled, 0);
  assert.equal(sent, 0);
});

test("se a IA falhar, envia desculpa em vez de silencio (e regista o erro)", async () => {
  const sent = []; const errors = [];
  const ctx = baseCtx({
    convo: { handle: async () => { throw new Error("Mistral 429"); } },
    errorLog: { record: async (e) => errors.push(e) },
    send: async (to, text) => sent.push(text),
  });
  await processOne({ from: "351900000003", wamid: "w3", text: "ola de novo" }, ctx);
  assert.equal(sent.length, 1);
  assert.equal(sent[0], messages.aiError);
  assert.ok(errors.some((e) => e.etapa === "conversa"));
});

test("grava o lead ANTES de depender do envio (nao perde candidato qualificado)", async () => {
  const leadsSaved = []; const errors = [];
  const ctx = baseCtx({
    convo: { handle: async () => ({
      reply: "Aqui o formulário.", done: true,
      decision: { decision: "proceed", roleKey: "soldador", review: false },
      data: { experience: "5" }, saved: true,
    }) },
    leads: { saveFromScreening: async (tel, d) => leadsSaved.push({ tel, d }) },
    errorLog: { record: async (e) => errors.push(e) },
    send: async () => { throw new Error("Graph 500"); }, // envio falha DEPOIS do lead
  });
  await processOne({ from: "351900000004", wamid: "w4", text: "5 anos" }, ctx);
  assert.equal(leadsSaved.length, 1);
  assert.equal(leadsSaved[0].d.roleKey, "soldador");
  assert.ok(errors.some((e) => e.etapa === "envio")); // envio falhou, mas ficou registado
});

test("nao duplica o lead quando ja foi gravado (claim atomico devolve false)", async () => {
  let saves = 0;
  const ctx = baseCtx({
    store: { claimLeadSave: async () => false, releaseLeadSave: async () => {} },
    convo: { handle: async () => ({
      reply: "repetido", done: true,
      decision: { decision: "proceed", roleKey: "pintor" }, data: {}, saved: true,
    }) },
    leads: { saveFromScreening: async () => { saves += 1; } },
  });
  await processOne({ from: "351900000005", wamid: "w5", text: "ja enviei?" }, ctx);
  assert.equal(saves, 0);
});

test("conflito de concorrencia: nao envia esse turno", async () => {
  let sent = 0; const errors = [];
  const ctx = baseCtx({
    convo: { handle: async () => ({ reply: "x", done: false, saved: false }) },
    errorLog: { record: async (e) => errors.push(e) },
    send: async () => { sent += 1; },
  });
  await processOne({ from: "351900000006", wamid: "w6", text: "ola" }, ctx);
  assert.equal(sent, 0);
  assert.ok(errors.some((e) => e.etapa === "concorrencia"));
});

test("mensagem nao-texto: pede texto de volta, sem chamar a IA", async () => {
  const sent = [];
  const ctx = baseCtx({
    convo: { handle: async () => { throw new Error("nao devia ser chamado"); } },
    send: async (to, text) => sent.push(text),
  });
  await processOne({ from: "351900000007", wamid: "w7", text: "", unsupportedType: "image" }, ctx);
  assert.equal(sent.length, 1);
  assert.match(sent[0], /texto/i);
});
