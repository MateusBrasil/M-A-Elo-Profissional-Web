import assert from "node:assert/strict";
import { test } from "node:test";
import { makeAiAgent, buildSystemPrompt, normalizeExtraction } from "./ai.js";

// Modelo falso: devolve extracoes/replies pre-programadas, sem gastar tokens.
function scriptedCaller(steps) {
  let i = 0;
  return async () => steps[Math.min(i++, steps.length - 1)];
}

test("continua a conversa enquanto falta informacao", async () => {
  const agent = makeAiAgent(scriptedCaller([
    { extraction: { role: "soldador" }, reply: "Boa! Tem documentos para trabalhar em Portugal?" },
  ]));
  const r = await agent.turn([{ role: "user", content: "faco soldadura" }]);
  assert.equal(r.done, false);
  assert.equal(r.decision.decision, "continue");
  assert.match(r.reply, /documentos/i);
  assert.equal(r.extraction.role, "soldador");
});

test("corta assim que percebe que nao ha documentos, mesmo a meio", async () => {
  const agent = makeAiAgent(scriptedCaller([
    { extraction: { role: "pintor", work_auth: "not_authorized" }, reply: "irrelevante" },
  ]));
  const r = await agent.turn([{ role: "user", content: "ainda nao tenho papeis" }]);
  assert.equal(r.done, true);
  assert.equal(r.decision.decision, "reject");
  assert.match(r.reply, /documentos/i);
});

test("conclui e envia o formulario da funcao certa quando tem as 4 respostas", async () => {
  const agent = makeAiAgent(scriptedCaller([
    {
      extraction: { role: "serralheiro", work_auth: "authorized", travel: true, housing_needed: false, experience: "4 anos" },
      reply: "Obrigado!",
    },
  ]));
  const r = await agent.turn([{ role: "user", content: "trabalho ha 4 anos" }]);
  assert.equal(r.done, true);
  assert.equal(r.decision.decision, "proceed");
  assert.equal(r.decision.roleKey, "serralheiro");
  assert.match(r.reply, /candidatura-serralheiro\.html/);
});

test("coage sim/nao e numeros soltos que a IA possa devolver", async () => {
  const agent = makeAiAgent(scriptedCaller([
    { extraction: { role: "soldador", work_auth: "authorized", travel: "sim", housing_needed: "nao", experience: "10" }, reply: "ok" },
  ]));
  const r = await agent.turn([{ role: "user", content: "sim, sem alojamento" }]);
  assert.equal(r.done, true);
  assert.equal(r.decision.decision, "proceed");
  assert.equal(r.decision.roleKey, "soldador");
});

test("extracao invalida cai em valores seguros (nao rebenta)", () => {
  const e = normalizeExtraction({ role: "cozinheiro", work_auth: "talvez", travel: "quem sabe", experience: 5 });
  assert.equal(e.role, null); // funcao desconhecida nao vira role
  assert.equal(e.work_auth, "unknown");
  assert.equal(e.travel, null);
  assert.equal(e.experience, "5");
});

test("o guiao inclui a empresa, as regioes e o formato JSON", () => {
  const p = buildSystemPrompt();
  assert.match(p, /M&A Elo/);
  assert.match(p, /Estarreja/);
  assert.match(p, /JSON/);
  assert.match(p, /work_auth/);
});
