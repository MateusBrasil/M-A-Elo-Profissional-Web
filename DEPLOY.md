# Deploy — M&A Elo Profissional

Este projeto tem duas camadas separadas:

1. **Website institucional estático**
   - Pasta: `C:\Users\mateu\Desktop\Nova pasta`
   - Arquivos principais: páginas `.html`, `styles.css`, `design-tokens.css`, `main.js`, `animations.js`, `assets/`, `robots.txt`, `sitemap.xml` e `_headers`.
   - Pode ir para Netlify, Vercel, Cloudflare Pages ou hospedagem estática.

2. **Agente/formulários de candidatura**
   - Pasta: `C:\Users\mateu\Desktop\Projetos\ma-elo-profissional\ma-elo-recruitment-agent`
   - Runtime Node.
   - Deve ficar em subdomínio próprio para evitar conflito de assets com o site institucional.

## Modelo recomendado

Publicar o site institucional em:

```text
https://maelo.pt/
```

Publicar o agente de candidaturas em:

```text
https://candidaturas.maelo.pt/
```

Links usados pelo site:

```text
https://candidaturas.maelo.pt/apply/soldador
https://candidaturas.maelo.pt/apply/serralheiro
https://candidaturas.maelo.pt/apply/pintor
https://candidaturas.maelo.pt/apply/generic
```

Este modelo evita que o agente tente carregar `/styles.css` ou `/app.js` no domínio do site institucional.

## Alternativa com proxy

Se for obrigatório manter `/apply/*` dentro de `maelo.pt`, usar `_redirects.example` como base e validar:

- `GET /apply/soldador`
- `GET /apply/serralheiro`
- `GET /apply/pintor`
- `GET /apply/generic`
- `GET /forms`
- `GET /forms/soldador`
- `POST /forms/submissions`
- carregamento correto de CSS e JS do agente

Antes de usar proxy, prefira prefixar os assets do agente ou manter tudo no subdomínio.

## Variáveis do agente

No projeto `ma-elo-recruitment-agent`, copiar `.env.example` para `.env` e preencher:

- `PORT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CANDIDATE_FORM_SOLDADOR_URL`
- `CANDIDATE_FORM_SERRALHEIRO_URL`
- `CANDIDATE_FORM_PINTOR_URL`
- `CANDIDATE_FORM_GENERIC_URL`
- `WEBHOOK_SECRET` para webhook WhatsApp, não para formulário público

## Checklist de segurança antes de produção

- Corrigir RLS do Supabase para impedir leitura pública de dados pessoais.
- Separar autenticação do webhook `/whatsapp/inbound` da submissão pública `/forms/submissions`.
- Adicionar limite de payload no backend.
- Validar ficheiros enviados por tipo, tamanho e necessidade real.
- Evitar guardar anexos base64 diretamente em JSON em produção; preferir storage com limites.
- Testar submissão real com Supabase configurado.

## Arquivos para publicar

Usar apenas a allowlist em [PRODUCTION-FILES.md](PRODUCTION-FILES.md). Não publicar a pasta inteira do workspace, porque ela contém referências, relatórios de auditoria e ferramentas locais.

## Comandos

Website:

```bash
cd "C:\Users\mateu\Desktop\Nova pasta"
python -m http.server 4174
```

Agente:

```bash
cd "C:\Users\mateu\Desktop\Projetos\ma-elo-profissional\ma-elo-recruitment-agent"
npm.cmd test
npm.cmd start
```

## Antes de publicar

- Confirmar DNS de `maelo.pt`.
- Confirmar DNS de `candidaturas.maelo.pt`.
- Rodar Lighthouse na home, em `candidatos.html`, em `profissoes.html` e numa página de profissão.
- Testar todos os CTAs de candidatura no subdomínio.
- Enviar `sitemap.xml` no Search Console.
