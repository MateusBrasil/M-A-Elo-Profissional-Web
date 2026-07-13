// Motor da pre-triagem. Duas partes propositadamente separadas:
//
//  1. REGRAS DE DECISAO (evaluatePreScreen) - puras, deterministicas, auditaveis.
//     Recebem as respostas ja extraidas e decidem: proceed / reject / review.
//     Sao reutilizadas TANTO pela maquina de estados (Fase 1, sem IA) COMO pela
//     camada de IA (Fase 4). A IA conduz a conversa mas NAO decide; quem decide
//     e sempre isto. E o que mantem o resultado previsivel e conforme o RGPD.
//
//  2. CONDUCAO DA CONVERSA (startSession + handleMessage) - a maquina de estados
//     simples que pergunta uma coisa de cada vez. Na Fase 4 a IA substitui esta
//     parte; a Parte 1 fica igual.

import { roles, questions, messages, siteBaseUrl } from "./config.js";
import {
  normalizeText,
  travelAvailabilityFromText,
  needsHousingFromText,
  workAuthorizationFromText,
} from "./text.js";

// --- Utilitarios de profissao ---

export function detectRole(text) {
  const n = normalizeText(text);
  // "ajudante/auxiliar/servente de soldador" e um AJUDANTE, nao um soldador. Sem
  // isto, a iteracao apanharia "soldador" primeiro e enviaria o formulario errado.
  if (/\b(ajudante|auxiliar|servente|aprendiz)\b/.test(n)) return "ajudante";
  for (const [key, role] of Object.entries(roles)) {
    if (key === "geral") continue; // geral e o fallback, nao se deteta por alias primeiro
    if (role.aliases.some((alias) => n.includes(normalizeText(alias)))) return key;
  }
  // eletricista e outras funcoes soltas caem em geral
  if (roles.geral.aliases.some((alias) => n.includes(normalizeText(alias)))) return "geral";
  return null;
}

export function formUrl(roleKey) {
  const role = roles[roleKey] || roles.geral;
  return `${siteBaseUrl}${role.form}`;
}

// --- PARTE 1: regras de decisao (puras) ---

// data: { role, work_auth: 'authorized'|'pending'|'not_authorized'|'unknown',
//         travel: true|false|null, housing_needed: true|false|null, experience }

// Regras eliminatorias. Podem disparar com dados parciais (ex: logo que se sabe
// que nao ha documentos). Devolve a decisao de corte, ou null se nada corta.
export function checkCutoffs(data = {}) {
  if (data.work_auth === "not_authorized") {
    return { decision: "reject", reason: "Sem documentos para trabalhar em Portugal.", message: messages.rejectedNoAuth };
  }
  if (data.travel === false) {
    return { decision: "reject", reason: "Sem disponibilidade para as zonas das obras.", message: messages.rejectedTravel };
  }
  if (data.housing_needed === true) {
    return { decision: "reject", reason: "Precisa de alojamento, que a empresa nao disponibiliza.", message: messages.rejectedHousing };
  }
  return null;
}

// Ja se sabe o suficiente para concluir a pre-triagem? (as 4 respostas)
export function isComplete(data = {}) {
  return Boolean(
    data.role &&
    data.work_auth && data.work_auth !== "unknown" &&
    data.travel !== null && data.travel !== undefined &&
    data.housing_needed !== null && data.housing_needed !== undefined &&
    String(data.experience || "").trim()
  );
}

// Decisao final: aplica os cortes; se passa, devolve o formulario da funcao certa.
export function evaluatePreScreen(data = {}) {
  const cut = checkCutoffs(data);
  if (cut) return cut;

  // Passa. Documentos em regularizacao seguem, mas ficam assinalados para revisao humana.
  const roleKey = data.role && roles[data.role] ? data.role : "geral";
  const url = formUrl(roleKey);
  const label = roles[roleKey].label;
  const review = data.work_auth === "pending";
  return {
    decision: "proceed",
    review,
    roleKey,
    reason: review ? "Documentos em regularizacao, validar na revisao humana." : "Passou na pre-triagem.",
    message: messages.formSent(label, url),
  };
}

// --- PARTE 2: conducao da conversa (maquina de estados) ---

export function startSession() {
  return { stage: "new", data: {}, retries: {}, consentAt: null, lastMessage: null };
}

// Recebe a sessao atual e o texto do candidato. Devolve { session, reply, done, decision }.
// Nao muta a sessao recebida (devolve uma nova), para ser seguro em ambiente serverless.
export function handleMessage(session, rawText) {
  const s = cloneSession(session || startSession());
  const text = String(rawText || "").trim();

  if (!text) return say(s, messages.emptyMessage);

  switch (s.stage) {
    case "new":
      s.stage = "awaiting_role";
      return say(s, `${messages.greeting}\n\n${questions[0].text}`);

    case "awaiting_role": {
      if (!s.consentAt) s.consentAt = nowIso(); // continuar apos o aviso = consentimento
      const role = detectRole(text);
      if (!role) {
        s.retries.role = (s.retries.role || 0) + 1;
        if (s.retries.role <= 1) return say(s, messages.askRoleAgain);
        s.data.role = "geral"; // depois de insistir, segue como geral
      } else {
        s.data.role = role;
      }
      s.stage = "awaiting_auth";
      return say(s, questions[1].text);
    }

    case "awaiting_auth": {
      s.data.work_auth = workAuthorizationFromText(text);
      if (s.data.work_auth === "not_authorized") return finish(s, evaluatePreScreen(s.data));
      s.stage = "awaiting_logistics";
      return say(s, questions[2].text);
    }

    case "awaiting_logistics": {
      s.data.travel = travelAvailabilityFromText(text);
      s.data.housing_needed = needsHousingFromText(text);
      if (s.data.travel === false || s.data.housing_needed === true) {
        return finish(s, evaluatePreScreen(s.data));
      }
      if (s.data.travel === null || s.data.housing_needed === null) {
        s.retries.logistics = (s.retries.logistics || 0) + 1;
        if (s.retries.logistics <= 1) return say(s, messages.clarifyLogistics);
        // ambiguo depois de insistir: assume o caminho positivo mas deixa registado
        if (s.data.travel === null) s.data.travel = true;
        if (s.data.housing_needed === null) s.data.housing_needed = false;
      }
      s.stage = "awaiting_experience";
      return say(s, questions[3].text);
    }

    case "awaiting_experience":
      s.data.experience = text;
      return finish(s, evaluatePreScreen(s.data));

    case "completed":
      return say(s, s.lastMessage || messages.alreadyDone);

    default:
      return handleMessage(startSession(), text);
  }
}

// --- helpers internos ---

function cloneSession(session) {
  return {
    ...session,
    data: { ...(session.data || {}) },
    retries: { ...(session.retries || {}) },
  };
}

function nowIso() {
  return new Date().toISOString();
}

function say(session, message) {
  session.lastMessage = message;
  return { session, reply: message, done: false, decision: null };
}

function finish(session, decision) {
  session.stage = "completed";
  session.decision = decision.decision;
  session.review = decision.review || false;
  session.reason = decision.reason;
  session.lastMessage = decision.message;
  return { session, reply: decision.message, done: true, decision };
}
