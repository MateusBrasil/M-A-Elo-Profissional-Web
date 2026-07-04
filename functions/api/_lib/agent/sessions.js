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

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS wa_sessoes (
    telefone TEXT PRIMARY KEY,
    estado JSONB NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

export function makeSessionStore(runQuery) {
  let ensured = false;

  async function ensureTable() {
    if (ensured) return;
    await runQuery(CREATE_TABLE, []);
    ensured = true;
  }

  return {
    // Devolve a sessao guardada para este numero, ou null se for a primeira mensagem.
    async load(telefone) {
      await ensureTable();
      const res = await runQuery("SELECT estado FROM wa_sessoes WHERE telefone = $1", [telefone]);
      const row = res?.rows?.[0];
      if (!row) return null;
      // jsonb pode chegar ja parseado (objeto) ou como texto, conforme o driver.
      return typeof row.estado === "string" ? JSON.parse(row.estado) : row.estado;
    },

    // Cria ou atualiza a sessao deste numero.
    async save(telefone, session) {
      await ensureTable();
      await runQuery(
        `INSERT INTO wa_sessoes (telefone, estado, atualizado_em)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (telefone) DO UPDATE SET estado = $2::jsonb, atualizado_em = now()`,
        [telefone, JSON.stringify(session)]
      );
    },

    // Apaga a sessao (util para recomecar ou para pedidos de eliminacao RGPD).
    async remove(telefone) {
      await ensureTable();
      await runQuery("DELETE FROM wa_sessoes WHERE telefone = $1", [telefone]);
    },
  };
}
