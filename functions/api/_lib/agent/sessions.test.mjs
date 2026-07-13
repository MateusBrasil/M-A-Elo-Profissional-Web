import assert from "node:assert/strict";
import { test } from "node:test";
import { makeSessionStore, makeDedupStore } from "./sessions.js";
import { startSession, handleMessage } from "./screening.js";

// Base de dados falsa em memoria que imita o wa_sessoes/wa_processados via o mesmo
// runQuery(sql, params). Modela a coluna `versao` e as clausulas RETURNING, para
// exercitar a guarda otimista de concorrencia e a reivindicacao do lead.
function makeFakeDb() {
  const sessoes = new Map(); // telefone -> { estado (obj), versao }
  const processados = new Set(); // wamid
  const calls = [];
  const runQuery = async (sql, params = []) => {
    const s = sql.trim();
    calls.push(s.split(/\s+/).slice(0, 2).join(" ").toUpperCase());

    if (/create table/i.test(s)) return { rows: [] };

    // --- wa_processados (dedup) ---
    if (/insert into wa_processados/i.test(s)) {
      const wamid = params[0];
      if (processados.has(wamid)) return { rows: [] }; // ON CONFLICT DO NOTHING
      processados.add(wamid);
      return { rows: [{ wamid }] };
    }
    if (/delete from wa_processados/i.test(s)) return { rows: [] };

    // --- wa_sessoes ---
    if (/^select/i.test(s)) {
      const row = sessoes.get(params[0]);
      return { rows: row ? [{ estado: row.estado, versao: row.versao }] : [] };
    }
    if (/insert into wa_sessoes/i.test(s)) {
      const [telefone, json] = params;
      if (sessoes.has(telefone)) return { rows: [] }; // ON CONFLICT DO NOTHING
      sessoes.set(telefone, { estado: JSON.parse(json), versao: 1 });
      return { rows: [{ telefone }] };
    }
    // claimLeadSave: jsonb_set -> 'true' com guarda COALESCE
    if (/update wa_sessoes/i.test(s) && /jsonb_set/i.test(s) && /'true'/.test(s)) {
      const row = sessoes.get(params[0]);
      if (!row || row.estado.leadSaved === true) return { rows: [] };
      row.estado = { ...row.estado, leadSaved: true };
      return { rows: [{ telefone: params[0] }] };
    }
    // releaseLeadSave: jsonb_set -> 'false'
    if (/update wa_sessoes/i.test(s) && /jsonb_set/i.test(s)) {
      const row = sessoes.get(params[0]);
      if (row) row.estado = { ...row.estado, leadSaved: false };
      return { rows: [] };
    }
    // save otimista: UPDATE ... WHERE telefone AND versao=$3
    if (/update wa_sessoes/i.test(s)) {
      const [telefone, json, expected] = params;
      const row = sessoes.get(telefone);
      if (!row || row.versao !== expected) return { rows: [] }; // conflito
      row.estado = JSON.parse(json);
      row.versao += 1;
      return { rows: [{ versao: row.versao }] };
    }
    if (/delete from wa_sessoes/i.test(s)) {
      sessoes.delete(params[0]);
      return { rows: [] };
    }
    return { rows: [] };
  };
  return { runQuery, sessoes, processados, calls };
}

test("load devolve null na primeira mensagem e a sessao depois de guardar", async () => {
  const { runQuery } = makeFakeDb();
  const store = makeSessionStore(runQuery);
  const tel = "351900000001";

  assert.equal(await store.load(tel), null);

  const first = handleMessage(startSession(), "ola");
  assert.equal(await store.save(tel, first.session), true);

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
});

test("cria a tabela uma so vez e remove apaga a sessao", async () => {
  const { runQuery, calls, sessoes } = makeFakeDb();
  const store = makeSessionStore(runQuery);
  const tel = "351900000003";

  await store.load(tel);
  await store.save(tel, { stage: "new" });
  await store.load(tel);
  assert.equal(calls.filter((c) => c === "CREATE TABLE").length, 1);

  await store.remove(tel);
  assert.equal(sessoes.has(tel), false);
});

test("save deteta conflito de concorrencia (versao mudou entretanto)", async () => {
  const { runQuery } = makeFakeDb();
  const a = makeSessionStore(runQuery);
  const b = makeSessionStore(runQuery); // outra invocacao serverless, mesma BD
  const tel = "351900000009";

  await a.save(tel, { stage: "in_progress", n: 0 }); // cria (versao 1)

  await a.load(tel); // ambas carregam a versao 1
  await b.load(tel);

  assert.equal(await a.save(tel, { stage: "in_progress", n: 1 }), true); // 1 -> 2
  assert.equal(await b.save(tel, { stage: "in_progress", n: 2 }), false); // versao velha: conflito
});

test("dedup: primeira vez reivindica, reentrega e ignorada", async () => {
  const { runQuery } = makeFakeDb();
  const dedup = makeDedupStore(runQuery);
  assert.equal(await dedup.claim("wamid.A"), true);
  assert.equal(await dedup.claim("wamid.A"), false); // reentrega da Meta
  assert.equal(await dedup.claim("wamid.B"), true);
  assert.equal(await dedup.claim(null), true); // sem id, processa sempre
});

test("claimLeadSave e atomico: so o primeiro grava; release permite tentar de novo", async () => {
  const { runQuery } = makeFakeDb();
  const store = makeSessionStore(runQuery);
  const tel = "351900000021";
  await store.save(tel, { stage: "completed", leadSaved: false });

  assert.equal(await store.claimLeadSave(tel), true); // ganha a corrida
  assert.equal(await store.claimLeadSave(tel), false); // ja gravado
  await store.releaseLeadSave(tel);
  assert.equal(await store.claimLeadSave(tel), true); // libertado: nova tentativa
});
