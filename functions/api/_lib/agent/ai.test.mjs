import assert from "node:assert/strict";
import { test } from "node:test";
import { makeAiAgent, buildSystemPrompt, normalizeExtraction, parseModelJson, mergeExtraction, resolveRole } from "./ai.js";

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

test("parseModelJson tolera JSON puro, cercas ```json e texto a volta", () => {
  assert.deepEqual(parseModelJson('{"a":1}'), { a: 1 });
  assert.deepEqual(parseModelJson("```json\n{\"a\":2}\n```"), { a: 2 });
  assert.deepEqual(parseModelJson('Claro! {"a":3} pronto'), { a: 3 });
  assert.throws(() => parseModelJson("sem json aqui"));
});

test("turn envia so a janela recente do historico ao modelo (custo O(1) por turno)", async () => {
  let received;
  const agent = makeAiAgent(async ({ history }) => { received = history; return { extraction: {}, reply: "ok" }; });
  const big = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "m" + i }));
  await agent.turn(big);
  assert.ok(received.length <= 12, "envia no maximo a janela configurada");
  assert.equal(received[received.length - 1].content, "m39"); // mantem as mais recentes
});

test("mergeExtraction nao deixa um turno mau apagar factos ja confirmados", () => {
  const prev = { role: "soldador", work_auth: "authorized", travel: true, housing_needed: false, experience: "10 anos" };
  const next = { role: null, work_auth: "unknown", travel: null, housing_needed: null, experience: null };
  const m = mergeExtraction(prev, next);
  assert.deepEqual(m, prev); // nada regride
});

test("mergeExtraction aceita correcao (valor novo conhecido substitui o antigo)", () => {
  const m = mergeExtraction(
    { role: "soldador", work_auth: "unknown", travel: null, housing_needed: null, experience: null },
    { role: "serralheiro", work_auth: "authorized", travel: null, housing_needed: null, experience: null }
  );
  assert.equal(m.role, "serralheiro");
  assert.equal(m.work_auth, "authorized");
});

test("resolveRole tolera maiusculas/acentos e aliases (incl. termos BR)", () => {
  assert.equal(resolveRole("Soldador"), "soldador");
  assert.equal(resolveRole("SOLDADOR"), "soldador");
  assert.equal(resolveRole("encanador"), "tubista");
  assert.equal(resolveRole("tubulação"), "tubista");
  assert.equal(resolveRole("auxiliar"), "ajudante");
  assert.equal(resolveRole("ajudante de soldador"), "ajudante"); // nao vira soldador
  assert.equal(resolveRole("cozinheiro"), null);
});

test("turn mantem o role ja conhecido mesmo que o modelo o esqueca num turno", async () => {
  const agent = makeAiAgent(scriptedCaller([
    { extraction: { work_auth: "authorized" }, reply: "e a disponibilidade?" }, // sem role
  ]));
  const r = await agent.turn(
    [{ role: "user", content: "sim, tenho documentos" }],
    { role: "soldador", work_auth: "unknown", travel: null, housing_needed: null, experience: null }
  );
  assert.equal(r.extraction.role, "soldador"); // nao regrediu para null
  assert.equal(r.extraction.work_auth, "authorized");
});

test("buildSystemPrompt injeta os dados ja confirmados e omite-os quando vazio", () => {
  const p = buildSystemPrompt({ role: "soldador", work_auth: "authorized" });
  assert.match(p, /DADOS JÁ CONFIRMADOS/);
  assert.match(p, /soldador/);
  assert.doesNotMatch(buildSystemPrompt(), /DADOS JÁ CONFIRMADOS/);
});
