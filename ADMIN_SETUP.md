# Setup do Painel de Administração

Este guia documenta como configurar a autenticação do painel admin após a migração para Vercel Functions.

## 1. Variáveis de ambiente (Vercel)

Vai a **Vercel → Project → Settings → Environment Variables** e adiciona estas variáveis (Production e Preview):

| Variável | Origem | Exemplo |
|---|---|---|
| `NEON_OWNER_CONN` | Connection string Neon `neondb_owner` | `postgresql://neondb_owner:…@ep-…/neondb?sslmode=require` |
| `NEON_FORM_CONN` | Connection string Neon `form_user` (low priv) | `postgresql://form_user:…@ep-…/neondb?sslmode=require` |
| `ADMIN_EMAIL` | Email autorizado | `admin@maelo.pt` |
| `ADMIN_PASSWORD_HASH` | Hash PBKDF2 da password inicial — ver passo 2 | `pbkdf2$200000$abc…$xyz…` |
| `SESSION_SECRET` | Chave aleatória 64+ chars | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `RESEND_API_KEY` *(opcional)* | API key Resend para envio de email | `re_xxx` |
| `RESET_FROM_EMAIL` *(opcional)* | Remetente verificado no Resend | `M&A Elo <noreply@maelo.pt>` |
| `PUBLIC_BASE_URL` *(opcional)* | URL pública do site | `https://m-a-elo-profissional-web.vercel.app` |

Sem `RESEND_API_KEY` o reset de password funciona, mas o link aparece nos **logs do Vercel** em vez de ser enviado por email — útil para arrancar antes de ter o domínio configurado no Resend.

## 2. Gerar o hash da password inicial

No terminal, na raiz do projeto:

```bash
node scripts/hash-password.js "a-password-que-queres"
```

Copia a linha que sai (formato `pbkdf2$200000$…$…`) e cola no `ADMIN_PASSWORD_HASH` no Vercel.

> ⚠️ Mínimo 10 caracteres. Recomendado misturar letras, números e símbolos.

## 3. Bootstrap automático

Na primeira chamada ao endpoint `/api/login`, o servidor verifica se existe linha na tabela `admin_users`. Se não existir, cria a tabela e insere o utilizador com o `ADMIN_PASSWORD_HASH` que configuraste.

Depois de criada, alterações de password feitas pelo painel (Settings → Alterar password) sobrescrevem a linha na DB — `ADMIN_PASSWORD_HASH` deixa de ser usado.

## 4. Como funciona o reset por email

1. Utilizador clica em **"Esqueceu-se da password?"** no login.
2. Indica o email autorizado.
3. `/api/forgot-password` gera um token aleatório (24 bytes), guarda o hash SHA-256 do token na tabela `admin_password_resets` e envia email via Resend com o link.
4. Link aponta para `/admin-reset.html?token=…&email=…` — válido 30 minutos, uso único.
5. Página valida e chama `/api/reset-password` que actualiza o hash.

## 5. Onde estão as credenciais agora

| Antes | Agora |
|---|---|
| `ADMIN_PW` hardcoded em `admin.html` | env var `ADMIN_PASSWORD_HASH` (só servidor) |
| `OWNER_CONN` exposto em `admin.html` | env var `NEON_OWNER_CONN` (só servidor) |
| `NEON_FORM_CONN` exposto em `neon.js` | env var `NEON_FORM_CONN` (só servidor) |
| Browser falava direto com `*.neon.tech` | Browser fala só com `/api/*` (Vercel Functions) |

A CSP foi apertada para `connect-src 'self'` — o browser perde a capacidade de chegar diretamente ao Neon, o que é o que queremos.

## 6. Endpoints

| Endpoint | Quem usa | Função |
|---|---|---|
| `POST /api/login` | tela de login | autentica e devolve cookie HttpOnly |
| `POST /api/logout` | botão "Terminar sessão" | limpa cookie |
| `GET /api/session` | boot do painel | verifica se cookie é válido |
| `POST /api/change-password` | Settings → Alterar password | autenticado |
| `POST /api/forgot-password` | "Esqueceu password" | envia email com link |
| `POST /api/reset-password` | admin-reset.html | valida token e atualiza |
| `POST /api/neon-proxy` | queries do painel | autenticado (cookie) |
| `POST /api/public-form` | formulários públicos | whitelist de operações |

## 7. Rate limiting

Em memória, por instância Vercel — bom o suficiente para um painel single-admin:

- Login: 8 tentativas / 5 min por IP
- Forgot password: 5 / 10 min por IP
- Reset password: 10 / 10 min por IP
- Change password: 10 / 10 min por email

## 8. Checklist de migração

- [ ] Adicionar 6 env vars no Vercel (Production + Preview)
- [ ] Configurar Resend e adicionar `RESEND_API_KEY` (opcional, mas recomendado)
- [ ] Fazer deploy
- [ ] Testar login com a password que geraste
- [ ] Trocar a password pelo painel (Settings → Alterar password)
- [ ] Confirmar que `admin_users` tem 1 linha em produção
- [ ] (Opcional) Rotacionar a connection string `neondb_owner` no Neon, já que ela estava exposta no Git histórico

## 9. Limites conhecidos

- A `neonQuery` que sobreviveu em `neon.js` continua a aceitar SQL via `_buildFromDB` para os formulários públicos — mas agora vai para `/api/public-form` que só aceita 2 operações fixas. Qualquer outra query (por exemplo num form-app.js antigo) precisa ser portada para uma operação nova nesse endpoint.
- O `crypto.pbkdf2Sync` no `_lib/auth.js` corre durante o login (~50ms). Se isto se tornar visível, migrar para `pbkdf2` async.
