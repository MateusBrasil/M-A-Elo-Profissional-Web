// Persistencia da sessao de conversa no Neon.
//
// Cloudflare Functions nao guardam estado entre pedidos: cada mensagem do
// WhatsApp e um pedido novo. Por isso o estado da conversa (a que pergunta vai,
// o que ja foi respondido) tem de viver na base de dados, indexado pelo numero.
//
// A ligacao ao Neon e injetada como `runQuery(sql, params)` (em producao vem de
// auth.neonQuery(env, ...), ver whatsapp-inbound.js). Isso mantem este modulo
// testavel sem base de dados real. Segue o padrao do auth.js, que tambem cria as
// suas tabelas com CREATE TABLE IF NOT EXISTS na primeira utilizacao.
//
// A coluna `versao` da uma guarda otimista de concorrencia: quando o mesmo numero
// manda mensagens quase ao mesmo tempo (comum no WhatsApp), evita que uma
// gravacao sobreponha silenciosamente a outra (last-write-wins). Em conflito, o
// save devolve `false` e quem chama decide (aqui: regista e ignora esse turno, em
// vez de corromper o historico).

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS wa_sessoes (
    telefone TEXT PRIMARY KEY,
    estado JSONB NOT NULL,
    versao INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

function rowsOf(res) {
  return (res && res.rows) || [];
}

export function makeSessionStore(runQuery) {
  let ensured = false;
  // Versao carregada por numero, para o save conseguir fazer a guarda otimista.
  const versoes = new Map();

  async function ensureTable() {
    if (ensured) return;
    await runQuery(CREATE_TABLE, []);
    // Migracao: uma wa_sessoes criada por um deploy anterior nao tem a coluna
    // `versao` (CREATE IF NOT EXISTS nao a acrescenta) -> sem isto, todo o load()
    // rebentava e nenhum candidato era atendido.
    await runQuery("ALTER TABLE wa_sessoes ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 0", []);
    // Backfill: sessoes ja concluidas pelo codigo antigo (sem a chave leadSaved)
    // ja tiveram o lead gravado; marca-las evita um lead duplicado quando o
    // candidato voltar a escrever. Idempotente (afeta 0 linhas depois da 1a vez).
    await runQuery(
      "UPDATE wa_sessoes SET estado = jsonb_set(estado, '{leadSaved}', 'true') WHERE estado->>'stage' = 'completed' AND NOT jsonb_exists(estado, 'leadSaved')",
      []
    );
    ensured = true;
  }

  return {
    // Devolve a sessao guardada para este numero, ou null se for a primeira mensagem.
    async load(telefone) {
      await ensureTable();
      const res = await runQuery("SELECT estado, versao FROM wa_sessoes WHERE telefone = $1", [telefone]);
      const row = rowsOf(res)[0];
      if (!row) {
        versoes.set(telefone, null); // ainda nao existe: o save fara INSERT
        return null;
      }
      versoes.set(telefone, row.versao == null ? 0 : row.versao);
      // jsonb pode chegar ja parseado (objeto) ou como texto, conforme o driver.
      return typeof row.estado === "string" ? JSON.parse(row.estado) : row.estado;
    },

    // Cria ou atualiza a sessao. Devolve true se gravou, false em conflito de
    // concorrencia (outra invocacao gravou entretanto). A guarda usa a `versao`
    // carregada no load; sem load previo assume-se INSERT de sessao nova.
    async save(telefone, session) {
      await ensureTable();
      const expected = versoes.get(telefone);
      const json = JSON.stringify(session);

      if (expected === null || expected === undefined) {
        // Sessao nova: so cria se ninguem a criou entretanto.
        const res = await runQuery(
          `INSERT INTO wa_sessoes (telefone, estado, versao)
           VALUES ($1, $2::jsonb, 1)
           ON CONFLICT (telefone) DO NOTHING
           RETURNING telefone`,
          [telefone, json]
        );
        if (rowsOf(res).length) {
          versoes.set(telefone, 1);
          return true;
        }
        return false; // ja existia: conflito
      }

      const res = await runQuery(
        `UPDATE wa_sessoes
         SET estado = $2::jsonb, versao = versao + 1, atualizado_em = now()
         WHERE telefone = $1 AND versao = $3
         RETURNING versao`,
        [telefone, json, expected]
      );
      const row = rowsOf(res)[0];
      if (!row) return false; // versao ja tinha mudado: conflito
      versoes.set(telefone, row.versao == null ? expected + 1 : row.versao);
      return true;
    },

    // Reivindica atomicamente a gravacao do lead: marca leadSaved=true e devolve
    // true apenas a quem venceu a corrida. Assim mensagens simultaneas (ou o
    // candidato a insistir depois de concluir) nao geram leads duplicados.
    async claimLeadSave(telefone) {
      await ensureTable();
      const res = await runQuery(
        `UPDATE wa_sessoes
         SET estado = jsonb_set(estado, '{leadSaved}', 'true'), atualizado_em = now()
         WHERE telefone = $1 AND COALESCE(estado->>'leadSaved', 'false') <> 'true'
         RETURNING telefone`,
        [telefone]
      );
      return rowsOf(res).length > 0;
    },

    // Liberta a reivindicacao (usado quando o INSERT do lead falha, para uma
    // mensagem seguinte poder tentar de novo em vez de perder o lead).
    async releaseLeadSave(telefone) {
      await ensureTable();
      await runQuery(
        `UPDATE wa_sessoes SET estado = jsonb_set(estado, '{leadSaved}', 'false') WHERE telefone = $1`,
        [telefone]
      );
    },

    // Apaga a sessao (util para recomecar ou para pedidos de eliminacao RGPD).
    async remove(telefone) {
      await ensureTable();
      versoes.delete(telefone);
      await runQuery("DELETE FROM wa_sessoes WHERE telefone = $1", [telefone]);
    },
  };
}

// Deduplicacao por wamid: a Meta entrega os webhooks pelo menos uma vez, por isso
// a mesma mensagem pode chegar varias vezes. Sem isto, cada reentrega custaria
// outra chamada a IA, outra resposta e outro lead. O INSERT ... ON CONFLICT torna
// a reivindicacao atomica (resistente a reentregas concorrentes).
const CREATE_PROCESSED = `
  CREATE TABLE IF NOT EXISTS wa_processados (
    wamid TEXT PRIMARY KEY,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

export function makeDedupStore(runQuery) {
  let ensured = false;

  async function ensureTable() {
    if (ensured) return;
    await runQuery(CREATE_PROCESSED, []);
    ensured = true;
  }

  return {
    // true  => wamid novo, deve processar-se.
    // false => wamid ja visto (reentrega), deve ignorar-se.
    // Sem wamid, processa-se sempre (nao ha como deduplicar).
    async claim(wamid) {
      if (!wamid) return true;
      await ensureTable();
      const res = await runQuery(
        "INSERT INTO wa_processados (wamid) VALUES ($1) ON CONFLICT (wamid) DO NOTHING RETURNING wamid",
        [wamid]
      );
      return rowsOf(res).length > 0;
    },
  };
}

// Retencao RGPD: apaga sessoes e wamids mais antigos do que `days`. Best-effort,
// chamado oportunisticamente (nao e um passo critico do fluxo). Usa a mesma
// ligacao owner das tabelas wa_*.
export async function purgeOldData(runQuery, days) {
  const n = Number(days) || 90;
  await runQuery(`DELETE FROM wa_sessoes WHERE atualizado_em < now() - ($1::int * interval '1 day')`, [n]);
  await runQuery(`DELETE FROM wa_processados WHERE criado_em < now() - ($1::int * interval '1 day')`, [n]);
}
