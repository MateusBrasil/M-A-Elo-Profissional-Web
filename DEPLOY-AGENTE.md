# Arranque do Agente de WhatsApp — guia técnico de ligação

Passo a passo para pôr o agente em produção quando a conta Meta estiver verificada.
O código já está feito, endurecido e testado (`npm run test:agent`, 52 testes). Isto
é só a ligação: chaves, webhook, schema, deploy e teste.

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

Já devem existir (do site): `NEON_OWNER_CONN`, `NEON_FORM_CONN`, `SESSION_SECRET`, etc. Não mexer. O agente usa a `NEON_OWNER_CONN` para as tabelas `wa_*` e a `NEON_FORM_CONN` (baixo privilégio) para gravar o lead em `candidatos`.

> **Segurança (fail-closed):** em produção **não** definir `AGENT_ALLOW_UNSIGNED`. Sem o `WHATSAPP_APP_SECRET` configurado, o webhook **rejeita** todos os POST (não se consegue validar a assinatura). A variável `AGENT_ALLOW_UNSIGNED=true` só serve para testes locais sem assinatura e nunca deve estar em Production.

> Depois de adicionar variáveis, **fazer um novo deploy** para elas ficarem ativas.

---

## 2. Schema da base de dados (Neon)

- **`wa_sessoes`** (estado das conversas), **`wa_processados`** (dedup por wamid) e **`wa_erros`** (registo de falhas): **não é preciso fazer nada**. O agente cria-as sozinho na primeira mensagem (`CREATE TABLE IF NOT EXISTS`). Para referência, `wa_sessoes` é:
  ```sql
  CREATE TABLE IF NOT EXISTS wa_sessoes (
    telefone TEXT PRIMARY KEY,
    estado JSONB NOT NULL,
    versao INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ```
  A coluna `versao` dá a guarda de concorrência (evita que duas mensagens quase simultâneas se sobreponham). `wa_processados` guarda os `wamid` já tratados (a Meta reentrega mensagens; sem isto duplicaria respostas e leads). `wa_erros` regista as falhas para serem vistas no painel (ver secção 6).

- **`candidatos`** (já existe, o formulário usa): **confirmar** que aceita o INSERT do agente. Correr no Neon SQL Editor e verificar que existem as colunas `nome, telefone, profissao, experiencia, disponibilidade, estado, mensagem`:
  ```sql
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'candidatos'
  ORDER BY ordinal_position;
  ```
  - Se `estado` tiver um CHECK constraint, confirmar que aceita `pendente`, `em_espera` e `rejeitado` (os que o agente usa).
  - Se faltar alguma coluna, ajustar `functions/api/_lib/agent/leads.js` para usar só as que existem. **Este é o único ponto do código ainda não validado contra o Neon real.**
  - **Grant da `NEON_FORM_CONN`:** o lead é gravado pela ligação de baixo privilégio (a mesma do formulário do site). Se o GRANT desse role for **por colunas** e não incluir `estado`, o INSERT do agente falha sempre. Confirmar que o role tem INSERT em `candidatos` a cobrir também `estado`, `profissao`, `experiencia`, `disponibilidade` e `mensagem`:
    ```sql
    SELECT privilege_type, column_name
    FROM information_schema.column_privileges
    WHERE table_name='candidatos' AND grantee = current_user;
    ```
    Se faltar, correr com o role owner: `GRANT INSERT (nome, telefone, profissao, experiencia, disponibilidade, estado, mensagem) ON candidatos TO <role_do_form>;` (ou `GRANT INSERT ON candidatos` para todas as colunas).

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
- **Limites de custo/abuso:** em `config.js`, o objeto `limits` (`maxInputChars`, `historyWindow`, `maxTurns`) trava respostas gigantes, envia só a janela recente ao modelo e passa conversas demasiado longas a revisão humana. Baixar `historyWindow` reduz o custo por turno.
- **Ver o que correu mal:** no painel admin → Definições → **Agente WhatsApp — diagnóstico**: lista os erros recentes (tabela `wa_erros`) e as conversas presas há mais de 24h. O histórico completo de uma conversa continua em `wa_sessoes.estado.history` (consultar no Neon por telefone).

---

## 7. Notas e troubleshooting

- **Versão da Graph API:** o default é `v21.0`, mas pode ser mudado sem tocar no código pela env **`WHATSAPP_GRAPH_VERSION`** (ex.: `v23.0`). A v21.0 aproxima-se do fim de vida (~out 2026); definir uma versão corrente evita que os envios comecem a falhar.
- **A Meta reenvia se não receber 200.** O endpoint responde 200 de imediato e processa em background (`waitUntil`), por isso não deve haver reenvios.
- **Não responde nada:** conferir `WHATSAPP_TOKEN` (permanente e com a permissão certa) e `WHATSAPP_PHONE_ID`; ver os logs.
- **Webhook recusa mensagens:** conferir `WHATSAPP_APP_SECRET` (a assinatura) e a subscrição ao campo `messages`.
- **Lead não grava:** conferir o schema de `candidatos` e o **grant da `NEON_FORM_CONN`** (passo 2) — o lead é gravado por essa ligação de baixo privilégio, não pela `NEON_OWNER_CONN`. As tabelas `wa_sessoes`/`wa_processados`/`wa_erros` é que usam a owner.
- **RGPD:** o consentimento é apresentado na abertura (o aviso vai no corpo da lista de funções) e registado quando o candidato responde; os dados de IA são processados na UE (Mistral); as conversas ficam em `wa_sessoes`. A **retenção é automática**: sessões e wamids mais antigos do que `retention.sessionDays` (default **90 dias**, editável em `config.js`) são apagados por limpeza oportunista. Para um **pedido de eliminação** de um número, apagar a linha (`DELETE FROM wa_sessoes WHERE telefone=…`); os dados do candidato vivem em `candidatos` e são geridos no painel.
- **Direito de recurso (Art. 22.º RGPD):** toda a rejeição automatizada termina com "responda REVER…". Se o candidato responder **REVER**, o agente reabre o lead (`rejeitado` → `em_espera`) para revisão humana no painel — o corte automático deixa de ser final. Os candidatos com estado `rejeitado` na tabela `candidatos` não têm purga automática (são registos do negócio); definir um prazo de conservação e limpá-los no painel conforme a política (ex.: 12 meses).
- **"A escrever…" e leitura:** ao receber uma mensagem, o agente marca-a como lida e mostra o indicador de digitação enquanto a IA responde. São mensagens de serviço **não faturáveis**; se falharem, não afetam a resposta.
