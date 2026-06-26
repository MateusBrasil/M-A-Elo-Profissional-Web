# Setup Cloudflare Pages — maelo.pt

Guia passo-a-passo para migrar `maelo.pt` de Vercel para Cloudflare Pages.

**Domínio**: `maelo.pt` (registado em Site.pt)
**Tempo estimado**: 1-2 horas
**Custo**: €0/mês (vs Vercel ToS-violation actual)

---

## Pré-requisitos

- [x] Domínio `maelo.pt` registado em Site.pt
- [x] Conta GitHub com o repositório `MateusBrasil/M-A-Elo-Profissional-Web`
- [ ] Conta Cloudflare (gratuita) → criar em https://dash.cloudflare.com/sign-up
- [ ] Acesso ao painel Site.pt (para mudar nameservers)
- [ ] Connection strings do Neon (já existentes — manter)

---

## Fase 1 — Cloudflare DNS (configurar nameservers)

### 1.1 Criar conta + adicionar site

1. Criar conta em https://dash.cloudflare.com/sign-up (grátis)
2. **Add a site** → escrever `maelo.pt` → seleccionar plano **Free**
3. Cloudflare scaneia DNS existente → ignorar (vamos configurar manualmente depois)
4. Cloudflare mostra **2 nameservers** (algo como `name1.ns.cloudflare.com` + `name2.ns.cloudflare.com`) → **copiar**

### 1.2 Trocar nameservers no Site.pt

1. Login em https://site.pt → área de cliente → **Meus Domínios** → `maelo.pt`
2. Procurar **DNS / Nameservers / Servidores de Nomes**
3. Substituir os nameservers actuais pelos 2 do Cloudflare
4. Guardar

**Propagação DNS**: 2-24 horas (geralmente <2h). Cloudflare envia email quando detecta.

### 1.3 Configurar SSL na Cloudflare

Após nameservers propagarem:
- **SSL/TLS** → **Overview** → mudar para **Full (strict)**
- **Edge Certificates** → activar:
  - **Always Use HTTPS** → ON
  - **Automatic HTTPS Rewrites** → ON
  - **Minimum TLS Version** → 1.2
  - **HSTS** → ON (max-age 6 meses, includeSubDomains, preload)

---

## Fase 2 — Cloudflare Pages (deploy do site)

### 2.1 Criar projecto Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Autorizar acesso ao repositório `MateusBrasil/M-A-Elo-Profissional-Web`
3. Configurações de build:
   ```
   Project name:           maelo-pt
   Production branch:      main
   Build command:          (vazio — site é HTML estático)
   Build output directory: /
   ```
4. **Environment variables** (Production) → adicionar tudo o que está em baixo (secção 2.2)
5. **Save and Deploy**

Primeiro deploy demora ~30s.

### 2.2 Environment Variables (CRÍTICO)

Adicionar em **Pages > maelo-pt > Settings > Environment variables**:

| Nome | Valor | Onde obter |
|---|---|---|
| `NEON_OWNER_CONN` | `postgresql://user:pass@host/db?sslmode=require` | Neon dashboard → **Connection details** (full access) |
| `NEON_FORM_CONN` | `postgresql://form_user:pass@host/db?sslmode=require` | Neon → criar role `form_user` com GRANT INSERT on candidatos + SELECT on formularios |
| `ADMIN_EMAIL` | `admin@maelo.pt` | (tua escolha) |
| `ADMIN_PASSWORD_HASH` | `pbkdf2$200000$<saltB64>$<hashB64>` | Gerar localmente (ver abaixo) |
| `SESSION_SECRET` | string random ≥32 caracteres | Gerar localmente (ver abaixo) |
| `PUBLIC_BASE_URL` | `https://maelo.pt` | (fixo) |
| `RESEND_API_KEY` | `re_xxxxx` | Resend.com → API Keys (opcional — sem isto, reset emails caem em logs) |
| `RESET_FROM_EMAIL` | `M&A Elo <noreply@maelo.pt>` | (opcional, formato RFC) |

**Gerar SESSION_SECRET** (terminal local):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Gerar ADMIN_PASSWORD_HASH** (substituir `A_TUA_PASSWORD` pela password real):
```bash
node -e "const c=require('crypto');const s=c.randomBytes(16);const d=c.pbkdf2Sync('A_TUA_PASSWORD',s,200000,32,'sha256');console.log('pbkdf2\$200000\$'+s.toString('base64')+'\$'+d.toString('base64'))"
```

> **Importante:** marcar todas estas variáveis como **Encrypted** (não Plaintext) excepto `PUBLIC_BASE_URL` e `ADMIN_EMAIL`.

### 2.3 Custom domain

1. **Pages > maelo-pt > Custom domains** → **Set up a custom domain**
2. Adicionar `maelo.pt` → Cloudflare configura automaticamente (CNAME + cert)
3. Adicionar `www.maelo.pt` → criar **Page Rule** para redirect `www.maelo.pt/*` → `https://maelo.pt/$1` (301)

---

## Fase 3 — Cloudflare Email Routing

Para criar `geral@maelo.pt`, `info@maelo.pt`, `admin@maelo.pt`, etc. com forward grátis:

1. Cloudflare → `maelo.pt` → **Email** → **Email Routing** → **Get started**
2. Cloudflare adiciona MX/TXT records automaticamente (clicar **Add records**)
3. **Routing rules**:
   - `geral@maelo.pt` → `vvgroup.ia@gmail.com`
   - `admin@maelo.pt` → `vvgroup.ia@gmail.com`
   - `info@maelo.pt` → `vvgroup.ia@gmail.com`
   - **Catch-all** (qualquer outro endereço) → `vvgroup.ia@gmail.com`
4. Verificar destination email (Gmail envia link de confirmação)

**Limitação**: Email Routing só **recebe** (forward). Para **enviar** com `geral@maelo.pt`, usar:
- **Gmail SMTP relay** (gratuito) — Settings → Accounts → "Send mail as" → adicionar `geral@maelo.pt` via SMTP
- Ou **Resend** (free 3000 emails/mês) — recomendado se o agente IA enviar emails

---

## Fase 4 — Cloudflare Web Analytics

1. Cloudflare → **Analytics & Logs** → **Web Analytics** → **Add a site**
2. Hostname: `maelo.pt`
3. **JavaScript snippet** opcional — para tracking client-side (page views, eventos). Sem snippet, Cloudflare ainda mostra request-level analytics.
4. Adicionar snippet ao `</body>` de todas as páginas se quiseres dados detalhados

**Sem cookies** = sem precisar de cookie consent banner para analytics.

---

## Fase 5 — Validação pós-deploy

Após Cloudflare Pages confirmar deploy + DNS propagar (verificar com `dig maelo.pt`):

### 5.1 Testes manuais

```bash
# DNS aponta para Cloudflare
dig maelo.pt +short
# → deve devolver IPs Cloudflare (104.x.x.x ou 172.x.x.x)

# HTTPS funciona
curl -I https://maelo.pt
# → HTTP/2 200 + headers de segurança

# Redirects 301 funcionam
curl -I https://maelo.pt/profissoes.html
# → HTTP/2 301, location: /competencias.html

curl -I https://maelo.pt/soldador.html
# → HTTP/2 301, location: /servicos.html

# API endpoint health (formulários públicos)
curl -X POST https://maelo.pt/api/public-form \
  -H "Content-Type: application/json" \
  -d '{"op":"loadForm","slug":"soldador"}'
# → JSON com o formulário "soldador" (ou erro 400 se slug não existir na DB)

# Admin endpoint requer sessão
curl -I https://maelo.pt/api/session
# → 200 com {"authenticated":false}
```

### 5.2 Validação browser

1. https://maelo.pt → carrega homepage com hero + mapa MapLibre
2. https://maelo.pt/empresa.html → carrega com mapa + secção Quem Somos
3. https://maelo.pt/candidatos.html → 8 perfis + WhatsApp RH visíveis
4. https://maelo.pt/admin.html → login form (testar com `ADMIN_EMAIL` + password)
5. **DevTools → Console** → 0 erros, 0 CSP violations
6. **DevTools → Network** → todos os assets `200` (sem `404`/`403`)
7. **Lighthouse audit** → Performance >85, SEO >95, A11y >90

### 5.3 Submeter sitemap

- **Google Search Console** → https://search.google.com/search-console → adicionar property `https://maelo.pt` → submeter `https://maelo.pt/sitemap.xml`
- **Bing Webmaster Tools** → análogo

---

## Fase 6 — Limpeza Vercel

**Só depois de Cloudflare estar 100% operacional ≥ 7 dias** (para confirmar zero regressões):

1. Vercel dashboard → projecto M-A-Elo-Profissional-Web → **Settings** → **Delete Project**
2. Confirmar com o nome do projecto

Mantém o repositório GitHub — Cloudflare continua a fazer auto-deploy a partir dele.

---

## Estrutura técnica criada para Cloudflare

```
maelo.pt/
├── _headers                       ← Security + cache rules (substitui vercel.json "headers")
├── _redirects                     ← 11 redirects 301 (substitui vercel.json "redirects")
├── wrangler.toml                  ← Config Pages + nodejs_compat flag
├── functions/
│   └── api/
│       ├── _lib/
│       │   ├── auth.js            ← PBKDF2, HMAC, Neon SQL helpers, JSON Response
│       │   └── mail.js            ← Resend integration + fallback logs
│       ├── login.js               ← POST  /api/login
│       ├── logout.js              ← POST  /api/logout
│       ├── session.js             ← GET   /api/session
│       ├── change-password.js     ← POST  /api/change-password
│       ├── forgot-password.js     ← POST  /api/forgot-password
│       ├── reset-password.js      ← POST  /api/reset-password
│       ├── neon-proxy.js          ← POST  /api/neon-proxy (admin)
│       └── public-form.js         ← POST  /api/public-form (público, rate-limited)
├── api/                           ← Vercel functions antigas (KEEP for now — Cloudflare ignora)
│                                    Apagar APENAS após Vercel ser eliminado.
└── ...resto do site estático
```

### Como Cloudflare Functions resolvem URLs

- `functions/api/login.js` exporta `onRequestPost` → responde em `https://maelo.pt/api/login`
- `functions/api/_lib/auth.js` é **interno** (não exposto publicamente — pasta `_lib` é privada)
- `nodejs_compat` flag (em `wrangler.toml`) activa `node:crypto`, `node:buffer` etc.

---

## Comandos úteis (após setup)

```bash
# Wrangler CLI (opcional, para dev local + tail logs)
npm install -g wrangler

# Login Cloudflare
wrangler login

# Ver logs em real-time (debugging Functions)
wrangler pages deployment tail --project-name=maelo-pt

# Deploy manual (normalmente é automático via Git push)
wrangler pages deploy . --project-name=maelo-pt
```

---

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `502 Bad Gateway` em `/api/*` | Env var ausente (Neon/Session secret) | Verificar Settings > Environment variables, redeploy |
| `Module not found: node:crypto` | `nodejs_compat` flag não activo | Verificar `wrangler.toml` + Settings > Functions > Compatibility |
| CSP violation no console | Header CSP não inclui novo domínio | Editar `_headers`, secção `Content-Security-Policy` |
| Redirect não funciona | Linha em `_redirects` mal formatada | Cada redirect numa linha: `<source> <dest> <code>` (3 fields separated by spaces) |
| Admin login falha | `ADMIN_PASSWORD_HASH` mal gerado | Regenerar com comando da secção 2.2 |
| Email reset não chega | `RESEND_API_KEY` ausente | Reset URL aparece nos logs (Cloudflare > Pages > Logs) |
| `cf-connecting-ip` vazio | Pedido não vem de Cloudflare proxy | Verificar DNS está laranja (proxied) na Cloudflare |

---

## Custo total

| Serviço | Free tier | Custo Ano 1 |
|---|---|---|
| Domínio Site.pt | — | €8,95 (renova €14,95/ano) |
| Cloudflare Pages | Unlimited bandwidth, 500 builds/mês | €0 |
| Cloudflare Functions | 100K req/dia | €0 |
| Cloudflare Email Routing | Forwards ilimitados | €0 |
| Cloudflare Web Analytics | Sem cookies | €0 |
| Cloudflare DNS | Unlimited queries | €0 |
| Neon Free | 0.5 GB storage | €0 (~5 anos sem agente IA) |
| Resend Free | 3000 emails/mês, 100/dia | €0 |
| **TOTAL Ano 1** | | **€8,95** |

vs. proposta original do PDF (€63,95) → **poupa €55**.

Quando o agente IA WhatsApp entrar em produção:
- Upgrade Neon Free → Launch ($5/mês = ~€55/ano)
- Total Ano 2+ com IA: **€69,95**

---

## Próximos passos depois deste setup

1. **Activar paragrafo IA WhatsApp** em `candidatos.html`, `faq.html`, `politica-de-privacidade.html` (PDF do CEO tem o texto exacto — só descomentar)
2. **Integrar agente IA** no WhatsApp RH `+351 936 525 992`
3. **Form backend** — confirmar que `/api/public-form` insere correctamente em `candidatos` table (rodar SQL: `SELECT count(*) FROM candidatos`)
4. **Dashboard admin** — verificar `admin.html` mostra candidaturas (usa `/api/neon-proxy`)

---

*Documento gerado: 26 Jun 2026. Domain: maelo.pt. Stack: Cloudflare Pages + Functions + OpenFreeMap + Neon.*
