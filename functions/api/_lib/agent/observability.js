// Registo de erros do agente numa tabela consultavel no painel admin.
//
// Em Cloudflare Pages Functions os logs de consola sao efemeros: uma falha as 3h
// desaparece. Sem um registo persistente, o dono so descobre um problema quando um
// candidato reclama. Esta tabela (escrita no catch de topo) torna as falhas
// visiveis no admin.html, que ja corre SQL autenticado. Zero infraestrutura nova.
//
// record() nunca lanca: registar um erro nao pode, ele proprio, rebentar o fluxo.

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS wa_erros (
    id BIGSERIAL PRIMARY KEY,
    telefone TEXT,
    wamid TEXT,
    etapa TEXT,
    erro TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

export function makeErrorLog(runQuery) {
  let ensured = false;

  async function ensureTable() {
    if (ensured) return;
    await runQuery(CREATE_TABLE, []);
    ensured = true;
  }

  return {
    async record({ telefone = null, wamid = null, etapa = "desconhecida", erro = "" } = {}) {
      try {
        await ensureTable();
        await runQuery(
          "INSERT INTO wa_erros (telefone, wamid, etapa, erro) VALUES ($1, $2, $3, $4)",
          [telefone, wamid, etapa, String(erro && erro.message ? erro.message : erro).slice(0, 2000)]
        );
      } catch (e) {
        // Best-effort: se ate o registo falhar, resta a consola (efemera) e seguimos.
        console.error("[wa_erros] falha ao registar erro:", e && e.message);
      }
    },
  };
}
