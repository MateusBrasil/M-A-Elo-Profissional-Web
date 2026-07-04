import assert from "node:assert/strict";
import { test } from "node:test";
import { startSession, handleMessage, evaluatePreScreen, detectRole } from "./screening.js";

// Ajuda: corre uma conversa inteira, devolvendo o ultimo resultado.
function conversation(messages) {
  let session = startSession();
  let result;
  for (const msg of messages) {
    result = handleMessage(session, msg);
    session = result.session;
  }
  return result;
}

test("fluxo aprovado envia o formulario da funcao certa (soldador)", () => {
  const r = conversation([
    "ola",
    "sou soldador e moro em Braga",
    "sim, tenho documentos para trabalhar em Portugal",
    "sim, consigo deslocar-me e nao preciso de alojamento",
    "5 anos",
  ]);
  assert.equal(r.done, true);
  assert.equal(r.decision.decision, "proceed");
  assert.equal(r.decision.roleKey, "soldador");
  assert.match(r.reply, /candidatura-soldador\.html/);
});

test("serralheiro recebe o formulario de serralheiro, nao o de soldador", () => {
  const r = conversation([
    "boa tarde",
    "serralheiro",
    "tenho residencia",
    "sim e nao preciso de alojamento",
    "3 anos",
  ]);
  assert.equal(r.decision.roleKey, "serralheiro");
  assert.match(r.reply, /candidatura-serralheiro\.html/);
  assert.doesNotMatch(r.reply, /soldador/);
});

test("corta quem precisa de alojamento", () => {
  const r = conversation([
    "ola",
    "sou pintor",
    "sim tenho documentos",
    "tenho disponibilidade mas preciso de alojamento",
  ]);
  assert.equal(r.done, true);
  assert.equal(r.decision.decision, "reject");
  assert.match(r.reply, /alojamento/i);
  assert.match(r.decision.reason, /alojamento/i);
});

test("corta quem nao tem documentos para Portugal", () => {
  const r = conversation([
    "ola",
    "soldador",
    "nao tenho documentos para trabalhar em Portugal",
  ]);
  assert.equal(r.done, true);
  assert.equal(r.decision.decision, "reject");
  assert.match(r.decision.reason, /Portugal/i);
});

test("corta quem nao tem disponibilidade para as obras", () => {
  const r = conversation([
    "ola",
    "tubista",
    "sim tenho documentos",
    "nao consigo deslocar-me, so trabalho perto de casa",
  ]);
  assert.equal(r.done, true);
  assert.equal(r.decision.decision, "reject");
  assert.match(r.decision.reason, /disponibilidade/i);
});

test("documentos em regularizacao passam mas ficam para revisao humana", () => {
  const decision = evaluatePreScreen({
    role: "serralheiro",
    work_auth: "pending",
    travel: true,
    housing_needed: false,
  });
  assert.equal(decision.decision, "proceed");
  assert.equal(decision.review, true);
});

test("primeira mensagem apresenta a empresa e pede a funcao", () => {
  const r = handleMessage(startSession(), "ola");
  assert.equal(r.done, false);
  assert.match(r.reply, /M&A Elo/);
  assert.match(r.reply, /função/i);
});

test("deteta a funcao por sinonimos e cai em geral quando desconhecida", () => {
  assert.equal(detectRole("faço soldadura mig"), "soldador");
  assert.equal(detectRole("trabalho em metalomecanica"), "serralheiro");
  assert.equal(detectRole("sou cozinheiro"), null);
  assert.equal(detectRole("sou eletricista"), "geral");
});
