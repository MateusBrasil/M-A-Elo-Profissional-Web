# Arranque do Agente de WhatsApp — guia técnico de ligação

Passo a passo para pôr o agente em produção quando a conta Meta estiver verificada.
O código já está feito e testado (`npm run test:agent`, 29 testes). Isto é só a
ligação: chaves, webhook, schema, deploy e teste.

O agente vive no projeto Cloudflare Pages `maelo-pt`, no endpoint
`/api/whatsapp-inbound`. Reutiliza o Neon e o painel admin do site.

---

## 0. Pré-requisitos (Fase 0, do lado do cliente)

- [ ] Conta Meta Business **verificada** e uma App no Meta for Developers com o produto **WhatsApp** adicionado.
- [ ] Número de telefone registado no WhatsApp Cloud API (o número dedicado do agente).
- [ ] Chave da API **Mistral** (console.mistral.ai → API Keys).
- [ ] Acesso ao dashboard **Cloudflare Pages** (projeto `maelo-pt`).
- [ ] Acesso ao **Neon** (para confirmar o schema da tabela `candidatos`).

---

## 1. Variáveis de ambiente (Cloudflare)

Cloudflare Dashboard → Pages → **maelo-pt** → Settings → Environment variables → **Production** (e Preview, se quiser testar em preview). Marcar como **secret/encrypted** as sensíveis.

| Variável | O que é / onde obter | Secret? |
|---|---|---|
| `WHATSAPP_TOKEN` | Token de acesso do WhatsApp. **Usar um token permanente** (Meta Business → System Users → criar um utilizador de sistema → gerar token com a permissão `whatsapp_business_messaging`). O token de 24h do painel só serve para testar. | Sim |
| `WHATSAPP_PHONE_ID` | Phone Number ID do número (Meta → App → WhatsApp → API Setup). Não é o número, é o ID. | Não |
| `WHATSAPP_VERIFY_TOKEN` | Uma string aleatória **inventada por nós** (ex.: gerar com `openssl rand -hex 16`). Tem de ser igual à que se põe no webhook da Meta (passo 3). | Sim |
| `WHATSAPP_APP_SECRET` | App Secret da App Meta (Meta → App → Settings → Basic → App Secret). Valida a assinatura dos webhooks. | Sim |
| `AI_API_KEY` | A chave da Mistral. | Sim |
| `AI_MODEL` | Opcional. Default `mistral-small-latest`. Mudar aqui para trocar de modelo sem tocar no código. | Não |

Já devem existir (do site): `NEON_OWNER_CONN`, `NEON_FORM_CONN`, `SESSION_SECRET`, etc. Não mexer.

> Depois de adicionar variáveis, **fazer um novo deploy** para elas ficarem ativas.

---

## 2. Schema da base de dados (Neon)

- **`wa_sessoes`** (estado das conversas): **não é preciso fazer nada**. O agente cria a tabela sozinho na primeira mensagem (`CREATE TABLE IF NOT EXISTS`). Para referência, o SQL é:
  ```sql
  CREATE TABLE IF NOT EXISTS wa_sessoes (
    telefone TEXT PRIMARY KEY,
    estado JSONB NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```

- **`candidatos`** (já existe, o formulário usa): **confirmar** que aceita o INSERT do agente. Correr no Neon SQL Editor e verificar que existem as colunas `nome, telefone, profissao, experiencia, disponibilidade, estado, mensagem`:
  ```sql
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'candidatos'
  ORDER BY ordinal_position;
  ```
  - Se `estado` tiver um CHECK constraint, confirmar que aceita `pendente`, `em_espera` e `rejeitado` (os que o agente usa).
  - Se faltar alguma coluna, ajustar `functions/api/_lib/agent/leads.js` para usar só as que existem. **Este é o único ponto do código ainda não validado contra o Neon real.**

---

## 3. Configurar o webhook na Meta

Meta for Developers → a App → **WhatsApp → Configuration → Webhook** → Edit:

- [ ] **Callback URL:** `https://maelo.pt/api/whatsapp-inbound`
- [ ] **Verify token:** o mesmo valor de `WHATSAPP_VERIFY_TOKEN`.
- [ ] Clicar **Verify and Save**. A Meta faz um GET ao endpoint; se o token bater, fica verde.
- [ ] Em **Webhook fields**, subscrever ao campo **`messages`**.

Se falhar a verificação: o `WHATSAPP_VERIFY_TOKEN` no Cloudflare e na Meta têm de ser exatamente iguais, e o deploy com essa variável já tem de estar no ar.

---

## 4. Deploy

- [ ] Garantir que as variáveis do passo 1 estão em Production.
- [ ] Fazer merge/deploy da branch `feat/whatsapp-agent` (o Cloudflare Pages faz deploy no push para a branch de produção, conforme a configuração do projeto).
- [ ] Confirmar que `https://maelo.pt/api/whatsapp-inbound` responde (um GET sem parâmetros dá `403 Forbidden`, o que é correto: só passa com o handshake certo).

---

## 5. Testar (pronto = a funcionar, não só no ar)

Enviar mensagens reais para o número do agente e confirmar:

- [ ] **Abertura:** primeira mensagem devolve a saudação + consentimento RGPD + a pergunta da função.
- [ ] **Fluxo aprovado:** função → documentos → disponibilidade/alojamento → anos → recebe o **formulário certo** da profissão (ex.: serralheiro recebe `candidatura-serralheiro.html`).
- [ ] **Corte por alojamento:** dizer que precisa de alojamento → mensagem educada de fim, sem formulário.
- [ ] **Corte por documentos:** dizer que não tem documentos → fim educado.
- [ ] **Naturalidade:** responder com erros de escrita / de forma informal e confirmar que a IA entende.
- [ ] **Lead no admin:** o candidato aparece em `admin.html` com o estado certo.
- [ ] **Custo:** conferir no console da Mistral e na faturação da Meta o custo de algumas conversas (deve ser cêntimos).

Ver logs em tempo real: Cloudflare → Pages → maelo-pt → Functions → Real-time logs (ou `wrangler pages deployment tail`).

---

## 6. Afinar depois (a filosofia de iterar)

- **Perguntas, mensagens, formulários:** editar `functions/api/_lib/agent/config.js` e voltar a fazer deploy. É o único ficheiro a tocar para mudar o guião.
- **Modelo "burro" ou "esperto demais":** mudar `AI_MODEL` no dashboard (ex.: outro modelo Mistral) e redeploy. A lógica não muda.
- **Menos/mais mensagens:** ajustar as perguntas no `config.js` (tirar ou juntar perguntas reduz trocas e custo).
- **Ver o que correu mal numa conversa:** o histórico fica em `wa_sessoes.estado.history` (consultar no Neon, ou adicionar uma vista no admin, opcional).

---

## 7. Notas e troubleshooting

- **Versão da Graph API:** o código usa `v21.0` (`functions/api/_lib/agent/whatsapp.js`). Se a Meta pedir outra, mudar aí.
- **A Meta reenvia se não receber 200.** O endpoint responde 200 de imediato e processa em background (`waitUntil`), por isso não deve haver reenvios.
- **Não responde nada:** conferir `WHATSAPP_TOKEN` (permanente e com a permissão certa) e `WHATSAPP_PHONE_ID`; ver os logs.
- **Webhook recusa mensagens:** conferir `WHATSAPP_APP_SECRET` (a assinatura) e a subscrição ao campo `messages`.
- **Lead não grava:** conferir o schema de `candidatos` (passo 2) e `NEON_OWNER_CONN`.
- **RGPD:** o consentimento é pedido na primeira mensagem; os dados de IA são processados na UE (Mistral); as conversas ficam em `wa_sessoes` (definir prazo de retenção e limpeza conforme a política).
