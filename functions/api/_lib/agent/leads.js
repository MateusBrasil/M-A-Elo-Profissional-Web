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
