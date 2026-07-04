// Camada de IA da conversa. Torna a pre-triagem natural (entende contexto e
// erros de escrita) SEM deixar a IA decidir quem passa: a IA conduz e extrai,
// o codigo aplica os cortes e a decisao (screening.js). Assim a conversa parece
// humana mas o resultado continua previsivel e auditavel (RGPD).
//
// O modelo entra por uma funcao injetada `callModel({ system, history })` que
// devolve { extraction, reply }. Isso deixa o modelo TROCAVEL (Mistral hoje,
// outro amanha) e este modulo testavel sem gastar tokens.

import { checkCutoffs, isComplete, evaluatePreScreen } from "./screening.js";
import { company, roles, workRegions } from "./config.js";

const ROLE_KEYS = Object.keys(roles);

// O guiao passado a IA como regras. Sai da config, por isso afina-se num so sitio.
export function buildSystemPrompt() {
  const roleList = ROLE_KEYS.filter((k) => k !== "geral").join(", ");
  return [
    `És o assistente de recrutamento da ${company.name}, uma empresa portuguesa de serviços técnicos industriais.`,
    `Fazes uma pré-triagem rápida e simpática no WhatsApp, em português europeu, com frases curtas e um tom humano (nunca robótico).`,
    ``,
    `Precisas de descobrir quatro coisas, uma de cada vez, sem parecer um interrogatório:`,
    `1. Que função a pessoa procura (${roleList}, ou outra).`,
    `2. Se tem documentos para trabalhar em Portugal.`,
    `3. Se tem disponibilidade para as obras em ${workRegions.join(", ")} e aceita trabalhar sem alojamento (a empresa não fornece alojamento).`,
    `4. Há quantos anos trabalha nessa função.`,
    ``,
    `Regras:`,
    `- Entende respostas informais ou com erros de escrita. Se não perceberes, pede para reformular com gentileza.`,
    `- NÃO faças perguntas técnicas detalhadas (processos de soldadura, certificados, etc.): isso fica para um formulário mais tarde.`,
    `- NÃO prometas colocação, nem fales de salários, horários ou contratos.`,
    `- Uma pergunta de cada vez.`,
    ``,
    `Responde SEMPRE apenas com um JSON válido, sem nada fora do JSON, nesta forma:`,
    `{`,
    `  "extraction": {`,
    `    "role": "uma de [${ROLE_KEYS.join(", ")}] ou null",`,
    `    "work_auth": "authorized | pending | not_authorized | unknown",`,
    `    "travel": true | false | null,`,
    `    "housing_needed": true | false | null,`,
    `    "experience": "anos/experiência em texto, ou null"`,
    `  },`,
    `  "reply": "a tua próxima mensagem para o candidato, curta e natural"`,
    `}`,
    ``,
    `A "extraction" reflete tudo o que já percebeste da conversa até agora, não só a última mensagem. work_auth: "authorized" se tem documentos, "pending" se está em processo/regularização, "not_authorized" se não tem. Quando já souberes as quatro coisas, a "reply" pode ser só um agradecimento breve: o sistema envia o formulário a seguir.`,
  ].join("\n");
}

function toBool(v) {
  if (v === true || v === false) return v;
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (["sim", "true", "yes", "s"].includes(s)) return true;
  if (["nao", "não", "false", "no", "n"].includes(s)) return false;
  return null;
}

// Defensivo: a IA pode devolver formatos ligeiramente diferentes. Coage para o
// formato que as regras esperam, sem confiar cegamente no modelo.
export function normalizeExtraction(raw = {}) {
  const authValues = ["authorized", "pending", "not_authorized", "unknown"];
  return {
    role: raw.role && roles[raw.role] ? raw.role : null,
    work_auth: authValues.includes(raw.work_auth) ? raw.work_auth : "unknown",
    travel: toBool(raw.travel),
    housing_needed: toBool(raw.housing_needed),
    experience: raw.experience ? String(raw.experience) : null,
  };
}

export function makeAiAgent(callModel) {
  return {
    buildSystemPrompt,
    // history: [{ role: 'user'|'assistant', content }]. Devolve o proximo passo.
    async turn(history) {
      const out = await callModel({ system: buildSystemPrompt(), history });
      const extraction = normalizeExtraction(out?.extraction);

      // 1. Corta assim que uma eliminatoria aparece, mesmo a meio da conversa.
      const cut = checkCutoffs(extraction);
      if (cut) return { reply: cut.message, extraction, decision: cut, done: true };

      // 2. Se ja tem as 4 respostas, conclui (formulario certo, controlado pelo codigo).
      if (isComplete(extraction)) {
        const decision = evaluatePreScreen(extraction);
        return { reply: decision.message, extraction, decision, done: true };
      }

      // 3. Ainda falta algo: deixa a IA continuar a conversa naturalmente.
      return {
        reply: String(out?.reply || "Pode contar-me um pouco mais, por favor?"),
        extraction,
        decision: { decision: "continue" },
        done: false,
      };
    },
  };
}

// Caller de producao: Mistral (processamento na UE). Trocavel por outro modelo,
// basta uma funcao com a mesma assinatura. Modelo/endpoint/chave vem do env.
export function mistralCaller(env) {
  const endpoint = env.AI_ENDPOINT || "https://api.mistral.ai/v1/chat/completions";
  const model = env.AI_MODEL || "mistral-small-latest";
  return async ({ system, history }) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, ...history],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 400,
      }),
    });
    if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    return JSON.parse(content);
  };
}
