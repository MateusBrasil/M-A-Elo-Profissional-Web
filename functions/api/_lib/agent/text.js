// Interpretacao de texto livre em portugues (pt-PT e pt-BR), sem dependencias.
// Usado na pre-triagem deterministica e como apoio de validacao a extracao da IA.
// Roda igual em Node (testes) e no runtime Cloudflare Workers.

export function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function cleanPhone(value = "") {
  return String(value).replace(/\D/g, "");
}

const YES = /\b(sim|claro|tenho|posso|aceito|consigo|disponivel|disponibilidade|ok|pode ser|com certeza|certamente)\b/i;
const NO = /\b(nao|impossivel|sem disponibilidade|nao posso|nao consigo|negativo)\b/i;
const HOUSING_NEED = /\b(alojamento|moradia|dormir|casa|quarto|estadia|onde ficar|preciso de sitio)\b/i;
const NO_HOUSING_NEED = /\b(nao preciso de alojamento|nao preciso|sem alojamento|tenho onde ficar|tenho alojamento|nao e problema|nao seria problema|dispenso alojamento)\b/i;

// true / false / null (quando ambiguo). null pede reformulacao.
export function yesNoFromText(text) {
  const n = normalizeText(text);
  if (NO.test(n)) return false;
  if (YES.test(n)) return true;
  return null;
}

// Disponibilidade para deslocacao as obras.
export function travelAvailabilityFromText(text) {
  const n = normalizeText(text);
  if (/\b(sem disponibilidade|nao posso|nao consigo|impossivel|nao tenho disponibilidade|nao me consigo deslocar|so na minha zona|so perto de casa)\b/i.test(n)) {
    return false;
  }
  if (NO_HOUSING_NEED.test(n) && YES.test(n)) return true;
  return yesNoFromText(n);
}

// Precisa de alojamento fornecido pela empresa? true = precisa (corta).
export function needsHousingFromText(text) {
  const n = normalizeText(text);
  if (NO_HOUSING_NEED.test(n)) return false;
  if (HOUSING_NEED.test(n)) return true;
  return null;
}

// Estado dos documentos para trabalhar em Portugal.
export function workAuthorizationFromText(text) {
  const n = normalizeText(text);
  if (!n) return "unknown";
  if (/\b(nao tenho|nao possuo|sem documentos|sem autorizacao|ilegal|nao estou legal)\b/.test(n)) return "not_authorized";
  if (/\b(regularizar|em processo|a tratar|pendente|manifestacao|a aguardar|estou a legalizar|a legalizar)\b/.test(n)) return "pending";
  if (/\b(tenho|autorizado|documentos|titulo|residencia|cidadao|cidadania|cartao|regularizado|passaporte)\b/.test(n)) return "authorized";
  return "unknown";
}

// Certificacao obtida FORA de Portugal (assinala revisao humana no formulario).
// Deteta a CERTIFICACAO, nunca a nacionalidade da pessoa: usar a origem/nacionalidade
// como sinal de triagem seria discriminatorio e contrario ao RGPD.
export function mentionsForeignCertification(text) {
  const n = normalizeText(text);
  return /\bfbts\b|\bsinete\b|equivalencia|certificad[oa]s? (no brasil|estrangeir|fora de portugal)|qualificacao (estrangeira|fora de portugal|de outro pais)/.test(n);
}
