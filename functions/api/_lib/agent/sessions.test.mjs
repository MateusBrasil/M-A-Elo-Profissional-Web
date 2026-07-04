import assert from "node:assert/strict";
import { test } from "node:test";
import { makeSessionStore } from "./sessions.js";
import { startSession, handleMessage } from "./screening.js";

// Base de dados falsa em memoria que imita o wa_sessoes via o mesmo runQuery(sql, params).
function makeFakeDb() {
  const table = new Map();
  const calls = [];
  const runQuery = async (sql, params = []) => {
    calls.push(sql.trim().split(/\s+/).slice(0, 2).join(" ").toUpperCase());
    if (/create table/i.test(sql)) return { rows: [] };
    if (/^\s*select/i.test(sql)) {
      const row = table.get(params[0]);
      return { rows: row ? [{ estado: row }] : [] };
    }
    if (/^\s*insert/i.test(sql)) {
      table.set(params[0], JSON.parse(params[1]));
      return { rows: [] };
    }
    if (/^\s*delete/i.test(sql)) {
      table.delete(params[0]);
      return { rows: [] };
    }
    return { rows: [] };
  };
  return { runQuery, table, calls };
}

test("load devolve null na primeira mensagem e a sessao depois de guardar", async () => {
  const { runQuery } = makeFakeDb();
  const store = makeSessionStore(runQuery);
  const tel = "351900000001";

  assert.equal(await store.load(tel), null);

  const first = handleMessage(startSession(), "ola");
  await store.save(tel, first.session);

  const loaded = await store.load(tel);
  assert.equal(loaded.stage, "awaiting_role");
});

test("o estado persiste entre mensagens separadas (nao recomeca)", async () => {
  const { runQuery } = makeFakeDb();
  const store = makeSessionStore(runQuery);
  const tel = "351900000002";
  const inputs = ["ola", "sou soldador", "sim tenho documentos", "sim e nao preciso de alojamento", "5 anos"];

  let last;
  for (const msg of inputs) {
    // cada volta simula um pedido novo: carrega, processa, guarda
    const session = (await store.load(tel)) || startSession();
    last = handleMessage(session, msg);
    await store.save(tel, last.session);
  }

  assert.equal(last.done, true);
  assert.equal(last.decision.roleKey, "soldador");
  // se o estado nao persistisse, cada mensagem recomecava e nunca chegava ao fim
});

test("cria a tabela uma so vez e remove apaga a sessao", async () => {
  const { runQuery, calls, table } = makeFakeDb();
  const store = makeSessionStore(runQuery);
  const tel = "351900000003";

  await store.load(tel);
  await store.save(tel, { stage: "new" });
  await store.load(tel);
  assert.equal(calls.filter((c) => c === "CREATE TABLE").length, 1);

  await store.remove(tel);
  assert.equal(table.has(tel), false);
});
