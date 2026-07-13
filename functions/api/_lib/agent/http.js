// fetch com timeout (AbortController) e retry com backoff para erros transitorios.
//
// Sem isto, uma chamada a Mistral ou a Graph API que fique pendurada bloqueia o
// processamento em background ate ao limite da plataforma, e uma falha 429/5xx
// (rate limit, indisponibilidade momentanea) perde o candidato a primeira. Com
// isto, o agente falha depressa e tenta de novo antes de desistir.
//
// Le o CORPO dentro da janela do timeout e devolve { ok, status, text } — se so
// os headers chegassem e o corpo estagnasse, o timeout nao o apanhava. Quem chama
// faz JSON.parse(text) se precisar. fetchImpl e injetavel para os testes.

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchResilient(url, options = {}, {
  timeoutMs = 10000,
  retries = 2,
  backoffMs = 300,
  retryOn = RETRYABLE,
  fetchImpl = fetch,
} = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { ...options, signal: controller.signal });
      // Consumir o corpo AINDA dentro da janela do timeout (o abort continua ativo).
      const text = typeof res.text === "function" ? await res.text() : "";
      clearTimeout(timer);
      // Erro transitorio com tentativas em reserva: espera e repete.
      if (retryOn.has(res.status) && attempt < retries) {
        await sleep(backoffMs * (attempt + 1));
        continue;
      }
      return { ok: res.ok, status: res.status, text };
    } catch (err) {
      clearTimeout(timer);
      lastErr = err; // timeout (abort) ou falha de rede
      if (attempt < retries) {
        await sleep(backoffMs * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
