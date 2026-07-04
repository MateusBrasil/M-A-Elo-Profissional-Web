import assert from "node:assert/strict";
import { test } from "node:test";
import { makeLeadStore, screeningToEstado } from "./leads.js";

test("mapeia a decisao da pre-triagem para o estado do admin", () => {
  assert.equal(screeningToEstado("reject", false), "rejeitado");
  assert.equal(screeningToEstado("proceed", true), "em_espera");
  assert.equal(screeningToEstado("proceed", false), "pendente");
});

test("grava o lead na tabela candidatos com os campos certos", async () => {
  let captured;
  const runQuery = async (sql, params) => { captured = { sql, params }; return { rows: [] }; };
  const store = makeLeadStore(runQuery);

  await store.saveFromScreening("351911111111", {
    roleKey: "soldador",
    decision: "proceed",
    review: false,
    extraction: { work_auth: "authorized", travel: true, housing_needed: false, experience: "5 anos" },
    name: "João Silva",
  });

  assert.match(captured.sql, /INSERT INTO candidatos/i);
  assert.equal(captured.params[0], "João Silva");
  assert.equal(captured.params[1], "351911111111");
  assert.equal(captured.params[2], "soldador");
  assert.equal(captured.params[4], true); // disponibilidade
  assert.equal(captured.params[5], "pendente");
  assert.match(captured.params[6], /Pré-triagem WhatsApp/);
  assert.match(captured.params[6], /experiência: 5 anos/);
});

test("um lead rejeitado fica com estado rejeitado e nome de fallback", async () => {
  let captured;
  const store = makeLeadStore(async (sql, params) => { captured = params; return { rows: [] }; });
  await store.saveFromScreening("351922222222", {
    roleKey: "pintor",
    decision: "reject",
    extraction: { work_auth: "not_authorized" },
  });
  assert.equal(captured[0], "(candidato via WhatsApp)");
  assert.equal(captured[5], "rejeitado");
});
