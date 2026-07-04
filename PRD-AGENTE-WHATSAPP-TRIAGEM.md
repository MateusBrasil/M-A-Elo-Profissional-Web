# PRD — Agente de IA de Triagem de Candidaturas no WhatsApp

**Projeto:** M&A Elo Profissional, Unipessoal, Lda.
**Documento:** Especificação do produto (v1 — rascunho)
**Estado:** Planeamento (aguarda 3 decisões-chave — ver §11)
**Idioma do agente (face ao candidato):** Português europeu (pt-PT)

---

## 1. Objetivo

Construir um agente de IA que atua no **WhatsApp** e faz a **pré-qualificação automática** de candidatos.
Não é atendimento geral. A função é restrita a:

1. Verificar se o lead tem o **perfil mínimo** para a candidatura.
2. **Decidir** automaticamente se é qualificado ou não.
3. Enviar o **formulário de candidatura correto** conforme a função/respostas.

Resultado: triagem sem depender de atendimento manual a tempo inteiro; a equipa só entra nos leads que interessam.

---

## 2. Contexto — o que já existe e será reutilizado

| Ativo existente | Reuso no agente |
|---|---|
| Neon (Postgres): `candidatos`, `formularios` (8 formulários × 15 campos) | Persistência de conversas, estado da triagem, lead final |
| Formulários por função (`candidatura-soldador.html`, `form.html?role=X`, etc.) | O agente envia o **link do formulário certo** |
| Backend Cloudflare Pages Functions | Possível runtime do agente (webhook) |
| Painel admin (lista candidatos/contactos) | Onde a equipa vê os leads triados |
| WhatsApp RH: +351 936 525 992 | Canal atual (ver decisão sobre número — §11) |
| Política de Privacidade / RGPD | Base legal para consentimento no chat |

Princípio: o agente é uma **camada nova** sobre a infra atual, não um sistema isolado.

---

## 3. Escopo

**Dentro (v1):**
- Conversa de triagem inbound (candidato inicia).
- Identificação da função pretendida.
- 4–6 perguntas-chave de triagem.
- Decisão qualificado / não qualificado por **regras determinísticas**.
- Envio do link do formulário correto.
- Registo de tudo no banco + visível no admin.
- Handoff para humano quando necessário.

**Fora (v1):**
- Atendimento geral / FAQ extensa.
- Entrevistas aprofundadas.
- Agendamento automático.
- Multi-idioma (só pt-PT na v1).

---

## 4. Fluxo funcional

```
Candidato → "Olá, vi a vaga"
   │
   1. Saudação + consentimento RGPD (na 1ª interação)
   2. "Para que função se candidata?"  → identifica profissão (slug)
   3. 4–6 perguntas de triagem, uma a uma, em linguagem natural
   4. Motor de regras avalia → QUALIFICADO | NÃO QUALIFICADO
   │
   ├─ QUALIFICADO → envia link do formulário correto
   │                (ex.: maelo.pt/candidatura-soldador.html)
   │                + grava lead "qualificado"
   │
   └─ NÃO QUALIFICADO → mensagem educada + grava "não qualificado"
                        (perfil guardado para oportunidades futuras)
   │
   5. Conversa registada no admin → equipa pode assumir a qualquer momento
```

**Regra de arquitetura (importante):**
- A **decisão** de qualificação é **determinística** (regras explícitas que a empresa define).
- O **LLM** cuida apenas da **conversa** (interpretar respostas em pt-PT, ser humano, reformular).
- A IA **não inventa** critérios de negócio → agente previsível e auditável.

---

## 5. Regras de qualificação (A PREENCHER PELA EMPRESA)

> Esta é a peça central. Sem isto, o agente não pode ser construído.

**Perguntas de triagem (rascunho — validar):**
1. Para que função se candidata? *(soldador / serralheiro / pintor / tubista / caldeireiro / mecânico / ajudante / outra)*
2. Tem documentos para trabalhar legalmente em Portugal? *(sim / em processo / não)*
3. Quantos anos de experiência na função? *(<1 / 1–3 / 3–5 / +5)*
4. Tem disponibilidade para se deslocar a obras noutras regiões? *(sim / só a minha região)*
5. *(específica por função — ex.: soldador → que processos domina?)*

**Critérios de aprovação (rascunho — validar):**
- Reprovar/segurar se: sem documentos legais **e** sem processo de regularização.
- *(definir mínimos de experiência por função, se houver)*
- *(definir se "só a minha região" desqualifica ou só sinaliza)*

**Mensagem ao não qualificado (rascunho):**
> "Obrigado pelo interesse! De momento não temos uma vaga compatível com o seu perfil, mas guardámos o seu contacto para oportunidades futuras."

---

## 6. Arquitetura técnica

```
WhatsApp (candidato)
      │  webhook (mensagem recebida)
      ▼
Orquestrador  ──►  LLM (Claude Haiku)  → entende a resposta
   │                                       e formula a próxima pergunta
   ├──►  Motor de regras (código)  → decide qualificado/não
   ├──►  Neon (estado da conversa + lead)
   └──►  WhatsApp Cloud API (envia resposta / link do formulário)
```

**Stack recomendada (rota pragmática):**
- **WhatsApp:** Meta Cloud API (oficial — evitar bibliotecas não-oficiais por risco de banimento de um número de empresa real).
- **Orquestração:** n8n (visual, já no toolkit) **ou** Cloudflare Worker (mais integrado ao stack atual).
- **LLM:** Claude Haiku (triagem é simples; custo mínimo).
- **Estado/dados:** Neon (já existe).
- **Formulários:** os atuais.

---

## 7. Modelo de dados (novas tabelas Neon)

```sql
-- Sessão de conversa por número de WhatsApp
CREATE TABLE wa_sessoes (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  telefone    TEXT NOT NULL,
  estado      TEXT DEFAULT 'novo',      -- novo | em_triagem | qualificado | nao_qualificado | humano
  funcao      TEXT,                     -- slug da profissão
  respostas   JSONB DEFAULT '{}',       -- respostas de triagem
  consentimento BOOLEAN DEFAULT false,
  criado_em   TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Log de mensagens (auditoria + contexto do LLM)
CREATE TABLE wa_mensagens (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sessao_id   TEXT REFERENCES wa_sessoes(id),
  direcao     TEXT,                     -- in | out
  texto       TEXT,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);
```
*(GRANTs mínimos para a role de serviço, como já se faz com `candidatos`.)*

---

## 8. RGPD / Legal (empresa PT/UE)

- **Consentimento** explícito no início da conversa (tratamento de dados via WhatsApp).
- Link para a **Política de Privacidade** (já existe).
- **Retenção**: definir prazo (ex.: 12 meses para perfis não qualificados).
- Direito a **eliminação** mediante pedido.
- Dados sensíveis: não recolher mais do que o necessário para a triagem.

---

## 9. Handoff humano

- Comando/intenção de falar com pessoa → marca sessão como `humano` e notifica a equipa.
- Casos ambíguos que as regras não resolvem → escala automaticamente.
- A equipa vê a conversa completa no admin antes de assumir.

---

## 10. Roadmap e estimativa

| Fase | Entrega | Tempo |
|---|---|---|
| 0 | Setup Meta Business + verificação do número | 1–2 semanas (espera Meta) |
| 1 | Workshop: critérios + perguntas + tom de voz | 2–3 dias |
| 2 | Desenvolvimento (conversa, regras, Neon, formulários) | 1.5–3 semanas |
| 3 | Testes, ajuste de tom, casos de borda | ~1 semana |
| **MVP no ar** | | **≈ 4–6 semanas** (trabalho efetivo ~2–3) |

---

## 11. Custos (aprox. 2026 — confirmar na contratação)

**Manutenção mensal (rota pragmática):**

| Item | €/mês |
|---|---|
| WhatsApp Cloud API (triagem inbound = conversas de serviço gratuitas na janela 24h) | ≈ 0 |
| Claude Haiku (~5–10k tokens/conversa) — 1.000 candidatos/mês | 2–5 |
| Hospedagem (Cloudflare Worker já existe; ou n8n self-hosted VPS) | 0–10 |
| Neon (free tier) | 0 |
| **Total operacional** | **≈ €5–15/mês** |

O investimento real é o **desenvolvimento inicial** (tempo), não a operação.

---

## 12. Decisões-chave em aberto (destravam o início)

1. **Número de WhatsApp:** novo dedicado ao bot (recomendado) **ou** migrar o atual (+351 936 525 992, que deixaria de funcionar no app normal)?
2. **Critérios de qualificação:** definição exata pela empresa (§5).
3. **Rota de stack:** n8n (visual) **ou** Cloudflare Worker (código integrado)?

---

## 13. Métricas de sucesso

- % de candidatos triados sem intervenção humana.
- Taxa de qualificados → formulário concluído.
- Tempo médio de triagem.
- Redução de tempo da equipa de RH em leads não qualificados.

---

*Documento gerado como planeamento. Próximo passo: fechar §12 e abrir o ciclo de desenvolvimento (dev-squad + n8n).*
