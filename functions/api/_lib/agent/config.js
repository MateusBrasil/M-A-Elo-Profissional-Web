// Guiao EDITAVEL da pre-triagem. Este e o ficheiro que se toca para afinar o
// agente com o feedback real: perguntas, mensagens, regioes, profissoes e o
// formulario de cada profissao. O motor (screening.js) e a IA (ai.js) leem daqui;
// nao ha logica de decisao neste ficheiro, so conteudo.

export const company = {
  name: "M&A Elo Profissional",
  whatsapp: "351936525992",
  privacyUrl: "https://maelo.pt/politica-de-privacidade.html",
  reviewSlaHours: 48,
};

// Base publica do site, para montar os links dos formularios.
// Em producao pode vir de env (PUBLIC_BASE_URL); aqui fica o fallback.
export const siteBaseUrl = "https://maelo.pt";

export const workRegions = [
  "Lisboa (Parque das Nações)",
  "Estarreja (Aveiro)",
  "Viana do Castelo",
];

// Profissoes reconhecidas + o formulario certo de cada uma (o agente envia este).
// aliases: como o candidato pode escrever a funcao (em minusculas, sem acento).
export const roles = {
  soldador: { label: "Soldador", aliases: ["soldador", "soldadura", "solda", "welder"], form: "/candidatura-soldador.html" },
  serralheiro: { label: "Serralheiro", aliases: ["serralheiro", "serralharia", "metalomecanica", "montador"], form: "/candidatura-serralheiro.html" },
  pintor: { label: "Pintor", aliases: ["pintor", "pintura", "acabamento", "jato", "jatista", "jateador", "decapagem"], form: "/candidatura-pintor.html" },
  tubista: { label: "Tubista", aliases: ["tubista", "tubagem", "tubos", "tubulacao", "encanador", "picheleiro", "canalizador"], form: "/candidatura-tubista.html" },
  caldeireiro: { label: "Caldeireiro", aliases: ["caldeireiro", "caldeiraria"], form: "/candidatura-caldeireiro.html" },
  mecanico: { label: "Mecânico", aliases: ["mecanico", "manutencao mecanica"], form: "/candidatura-mecanico.html" },
  ajudante: { label: "Ajudante", aliases: ["ajudante", "servente", "aprendiz", "auxiliar"], form: "/candidatura-ajudante.html" },
  geral: { label: "Candidatura geral", aliases: ["outro", "outra", "geral", "eletricista"], form: "/candidatura-geral.html" },
};

// Limites operacionais (custo e abuso). Editaveis sem tocar na logica.
//  - maxInputChars: corta respostas gigantes antes de guardar/enviar ao modelo.
//  - historyWindow: quantas mensagens recentes se enviam ao modelo por turno
//    (a extracao ja carrega o estado acumulado, nao e preciso o historico todo).
//  - maxTurns: teto de mensagens do candidato numa conversa; ao exceder, passa a
//    revisao humana em vez de continuar em loop.
export const limits = {
  maxInputChars: 1000,
  historyWindow: 12,
  maxTurns: 14,
};

// Retencao RGPD do estado das conversas (nao dos candidatos, que ficam em
// `candidatos`). Sessoes e wamids mais antigos do que isto sao apagados.
export const retention = {
  sessionDays: 90,
};

// As 4 perguntas essenciais da pre-triagem, por ordem. `key` e o campo que a
// resposta preenche. Editar/reordenar aqui reflete-se no motor e no guiao da IA.
export const questions = [
  { key: "role", text: "Para começar, que função procura? (por exemplo: soldador, serralheiro, pintor, tubista, caldeireiro, mecânico, ajudante ou outra)" },
  { key: "work_auth", text: "Tem documentos para trabalhar em Portugal?" },
  { key: "logistics", text: `Neste momento temos obras em ${workRegions.join(", ")}, e a empresa não disponibiliza alojamento. Tem disponibilidade para uma destas zonas e consegue avançar sem alojamento?` },
  { key: "experience", text: "Há quantos anos trabalha nessa função?" },
];

// Todas as mensagens que o agente pode enviar. Funcoes onde e preciso interpolar.
export const messages = {
  greeting: `Olá, tudo bem? Sou o assistente de recrutamento da ${company.name}. Vou fazer apenas algumas perguntas rápidas para perceber se o seu perfil encaixa nas obras atuais. Ao continuar, autoriza o tratamento dos seus dados para esta candidatura, conforme a nossa política de privacidade: ${company.privacyUrl}`,
  askRoleAgain: "Só para o direcionar bem: qual é a sua profissão principal? Por exemplo, soldador, serralheiro ou pintor.",
  clarifyLogistics: 'Só para confirmar: consegue deslocar-se a uma das zonas das obras (Lisboa, Estarreja ou Viana do Castelo) e avançar sem alojamento da empresa? Pode responder de forma simples, por exemplo "sim, consigo e não preciso de alojamento".',
  emptyMessage: "Pode escrever a sua resposta, por favor?",
  rejectedNoAuth: "Obrigado pela sinceridade. Neste momento as obras exigem documentos válidos para trabalhar em Portugal, por isso não conseguimos avançar já. Guardamos o seu contacto para quando a situação mudar.",
  rejectedTravel: "Obrigado por dizer. Como as obras são nestas zonas e não há alojamento, o seu perfil não encaixa nesta oportunidade. Guardamos o seu registo para obras mais perto de si no futuro.",
  rejectedHousing: "Obrigado pelas informações. Como a empresa não disponibiliza alojamento, não conseguimos avançar nesta obra. Guardamos o seu registo para oportunidades futuras.",
  alreadyDone: "A sua pré-triagem já foi feita, obrigado. Se ainda não preencheu o formulário, é por aí que a equipa continua o processo.",
  aiError: "Peço desculpa, tive um problema técnico neste momento. Pode reenviar a sua última mensagem, por favor?",
  handoff: "Obrigado pela conversa. Para não a atrasar mais, vou pedir a um colega da equipa para continuar consigo em breve.",
  formSent: (roleLabel, url) =>
    `Perfeito, o seu perfil faz sentido para avançarmos. Aqui está o formulário de ${roleLabel} para preencher: ${url}\n\nAssim que enviar, a nossa equipa analisa a candidatura e, se houver seguimento, entra em contacto em até ${company.reviewSlaHours} horas.`,
};
