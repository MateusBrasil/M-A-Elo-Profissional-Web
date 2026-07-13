// Fase 6: escreve o resultado da pre-triagem na tabela `candidatos` (a MESMA do
// formulario do site), para o lead aparecer no painel admin que ja existe. Nao se
// constroi painel novo. Os estados sao os que o admin.html ja mostra:
// pendente / em_espera / rejeitado (o "aprovado" e atribuido pelo humano no painel).
//
// runQuery e injetado (em producao: auth.neonQuery(env, ...)) para ser testavel.

function fmtBool(v) {
  if (v === true) return "sim";
  if (v === false) return "não";
  return "não indicado";
}

export function screeningToEstado(decision, review) {
  if (decision === "reject") return "rejeitado";
  if (review) return "em_espera";
  return "pendente";
}

export function makeLeadStore(runQuery) {
  return {
    async saveFromScreening(telefone, { roleKey, decision, review, extraction = {}, name } = {}) {
      const estado = screeningToEstado(decision, review);
      const profissao = roleKey || "geral";
      const resumo = [
        "[Pré-triagem WhatsApp]",
        `documentos: ${extraction.work_auth || "não indicado"}`,
        `desloca-se: ${fmtBool(extraction.travel)}`,
        `precisa de alojamento: ${fmtBool(extraction.housing_needed)}`,
        `experiência: ${extraction.experience || "não indicada"}`,
      ].join(" · ");

      await runQuery(
        `INSERT INTO candidatos (nome, telefone, profissao, experiencia, disponibilidade, estado, mensagem)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          name || "(candidato via WhatsApp)",
          telefone,
          profissao,
          extraction.experience || "",
          extraction.travel === true,
          estado,
          resumo,
        ]
      );
    },
  };
}

// Recurso RGPD (Art. 22): o candidato pediu revisao humana de uma rejeicao.
// Reabre o lead (rejeitado -> em_espera) para o humano o ver e decidir no painel.
// Usa a ligacao OWNER (tem UPDATE), ao contrario da gravacao do lead.
export async function reviewByPhone(runQuery, telefone) {
  await runQuery(
    `UPDATE candidatos
     SET estado = 'em_espera',
         mensagem = COALESCE(mensagem, '') || ' · [Pedido de revisão do candidato via WhatsApp]'
     WHERE telefone = $1 AND estado = 'rejeitado'`,
    [telefone]
  );
}
