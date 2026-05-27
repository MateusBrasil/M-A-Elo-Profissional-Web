# Contexto completo — Website M&A Elo Profissional

Data do handoff: 2026-05-10  
Workspace principal do website: `C:\Users\mateu\Desktop\Nova pasta`  
Projeto dos formulários/agente: `C:\Users\mateu\Desktop\Projetos\ma-elo-profissional\ma-elo-recruitment-agent`

## 1. Objetivo do projeto

Criar um website institucional premium para:

**M&A Elo Profissional, Unipessoal, Lda.**

Dados confirmados:

- País: Portugal
- Cidade: Miranda do Douro
- NIF: 518954170
- Morada: Rua 1.º de Maio, N.º 37, 5210-191 Miranda do Douro, Portugal
- WhatsApp confirmado: +351 936 525 992
- Email oficial: não confirmado

O objetivo principal do site é gerar confiança institucional para empresas, parceiros e clientes.  
O canal de candidaturas existe, mas é secundário e não deve transformar o site em portal de vagas.

## 2. Posicionamento correto da empresa

Resumo aprovado para orientar o conteúdo:

> A M&A Elo Profissional é uma empresa portuguesa de serviços profissionais e apoio operacional para empresas, obras, indústria e metalomecânica. Atua com seriedade, organização e ligação entre projetos e profissionais qualificados quando aplicável. O site deve ser institucional, não um portal de vagas. A área de candidaturas existe como canal secundário para oportunidades em funções como soldador, serralheiro, pintor industrial e outras funções ligadas a obra/indústria, conforme obras em curso.

Comunicar com segurança:

- Apoio operacional
- Organização
- Encaminhamento de profissionais/candidatos quando aplicável
- Triagem e organização de candidaturas
- Análise humana
- Obras, indústria, metalúrgica/metalomecânica
- Atuação em Portugal conforme projetos e obras em curso

Evitar sem validação:

- “Outsourcing”
- “Recrutamento completo”
- “Coordenação de equipas”
- “Cobertura nacional fixa”
- “Portugal inteiro” como promessa
- Naval, energia ou logística
- Salários
- Benefícios
- Horários
- Contratos
- Contratação garantida
- Colocação imediata
- Alojamento fornecido

## 3. Profissões e candidaturas

Funções confirmadas para comunicação:

- Soldador
- Serralheiro
- Pintor Industrial

Outras funções:

- Usar a expressão “outras funções ligadas a obra, indústria e metalomecânica”.
- Exemplos como ajudante, montador, eletricista e tubista aparecem no formulário geral, mas devem ser tratados como exemplos, não confirmação oficial permanente.

Regras da área de candidatos:

- A candidatura é canal secundário.
- Sempre dizer que há análise humana.
- Não prometer colocação.
- Não inventar salário, horário ou contrato.
- Aviso obrigatório: a empresa não disponibiliza alojamento.
- Candidato deve ter disponibilidade real de deslocação para a região da obra.

## 4. Regiões

Regiões atuais confirmadas:

- Parque das Nações — Lisboa
- Estarreja — Aveiro
- Viana do Castelo

Comunicação recomendada:

> Atuação em Portugal conforme projetos e obras em curso, incluindo Lisboa, Estarreja/Aveiro e Viana do Castelo.

Não comunicar cobertura fixa em Portugal inteiro.

## 5. Direção visual

Referência desejada pelo usuário:

- Minimalista e premium
- Institucional europeu
- Editorial
- Sério
- Sóbrio
- Industrial/construção
- Similar em nível visual ao print enviado pelo usuário: navegação clara, hero fotográfico grande, tipografia serifada forte, layout premium sem cara de template

Evitar:

- Visual SaaS
- Gradientes neon
- Roxo/azul brilhante
- Dashboard
- Ícones infantis
- Cards genéricos de startup
- Imagens sem sentido, especialmente terminal/código

Paleta/tom atual:

- Fundo claro editorial no site principal
- Nav clara + topbar escura
- Hero fotográfico escuro
- Acento cobre
- Tipografia principal serifada institucional

## 6. Arquivos principais atuais

No workspace `C:\Users\mateu\Desktop\Nova pasta`:

- `index.html` — homepage institucional
- `empresa.html` — página institucional da empresa
- `servicos.html` — serviços e limites de atuação
- `para-empresas.html` — funil B2B para empresas/parceiros
- `profissoes.html` — profissões recorrentes e links para formulários
- `soldador.html` — página específica de soldador
- `serralheiro.html` — página específica de serralheiro
- `pintor-industrial.html` — página específica de pintor industrial
- `candidatos.html` — processo de candidatura e links para formulários
- `regioes.html` — regiões conforme obras em curso
- `faq.html` — perguntas frequentes para empresas e candidatos
- `contacto.html` — contacto institucional, empresas e candidatos
- `privacidade.html` — política de privacidade resumida
- `404.html` — página premium de erro
- `DEPLOY.md` — instruções de deploy do site estático + agente de formulários
- `_headers` — headers de segurança/cache para deploy estático compatível com Netlify
- `_redirects.example` — exemplo de proxy para `/apply/*` e `/forms/*` se o agente ficar em subdomínio/serviço separado
- `design-tokens.css` — tokens de cor, tipografia, espaçamento
- `styles.css` — CSS principal, mobile-first, visual premium
- `main.js` — navbar, menu mobile, scroll/âncoras
- `animations.js` — GSAP/Lenis/ScrollTrigger carregados sob intenção de interação
- `robots.txt`
- `sitemap.xml`
- `FORMULARIOS-INTEGRACAO.md`
- `CONTEXTO-PROJETO-MA-ELO.md` — este documento

Assets relevantes:

- `assets/hero-construction.webp`
- `assets/hero-construction.jpg`
- `assets/metal-bending.webp`
- `assets/metal-bending.jpg`
- `assets/factory-worker.webp`
- `assets/factory-worker.jpg`
- `assets/welder-field.webp`
- `assets/welder-field.jpg`

Assets antigos/não usados ainda existem:

- `assets/applications-industrial.*`
- `assets/partners-structure.*`

Esses não são referenciados no site atual.

## 7. O que já foi feito

### Visual e frontend

- Criado website institucional premium sem React/Vue/Tailwind.
- HTML5 semântico.
- CSS puro com tokens.
- JavaScript puro.
- GSAP/ScrollTrigger/Lenis via CDN em `animations.js`.
- Smooth scroll e animações ativados sob intenção de interação para preservar performance.
- Hero fotográfico premium.
- Imagens industriais coerentes.
- Removida imagem sem sentido de terminal/código.
- Adicionadas imagens nas secções de capacidade, regiões e candidaturas.
- Criada linha cobre editorial no hero.
- Ajustada navegação desktop/mobile.
- Criado menu mobile fullscreen.
- Focus states visíveis.
- Suporte a `prefers-reduced-motion`.
- Skip-link.
- Touch targets adequados.

### Conteúdo

- Conteúdo reescrito para tom institucional e prudente.
- Removidas promessas fortes.
- Ajustada comunicação para “atuação em Portugal conforme projetos e obras em curso”.
- Ajustada linguagem de profissões para não confirmar funções não validadas.
- Candidaturas tratadas como canal secundário.
- Incluída política de privacidade própria.
- Criadas subpáginas estáticas reais.
- Criadas páginas específicas para as profissões confirmadas: soldador, serralheiro e pintor industrial.
- Criada página de FAQ.
- Criada página 404.
- Criado `DEPLOY.md` com instruções de publicação e proxy para `/apply/*`.
- Criado `_headers` para segurança/cache em hospedagem estática.
- Criado `_redirects.example` para documentar proxy de formulários sem ativar uma rota incorreta por engano.

### SEO

- Meta title/description na homepage.
- Canonical na homepage e subpáginas.
- Sitemap atualizado com todas as páginas novas.
- Robots aponta para sitemap.

### Integração com formulários

O projeto de formulários/agente existe em:

`C:\Users\mateu\Desktop\Projetos\ma-elo-profissional\ma-elo-recruitment-agent`

Rotas reais do agente:

- `GET /apply/soldador`
- `GET /apply/serralheiro`
- `GET /apply/pintor`
- `GET /apply/generic`
- `GET /forms`
- `GET /forms/:roleKey`
- `POST /forms/submissions`
- `POST /whatsapp/inbound`

O site institucional agora aponta para:

- `/apply/soldador`
- `/apply/serralheiro`
- `/apply/pintor`
- `/apply/generic`

Importante: para produção, o agente precisa estar montado no mesmo domínio ou atrás de proxy/redirect nessas rotas.

## 8. Verificações realizadas

### Website estático

Servidor local usado:

```bash
python -m http.server 4174
```

Páginas testadas com status 200:

- `index.html`
- `empresa.html`
- `servicos.html`
- `para-empresas.html`
- `profissoes.html`
- `candidatos.html`
- `regioes.html`
- `contacto.html`
- `privacidade.html`
- `soldador.html`
- `serralheiro.html`
- `pintor-industrial.html`
- `faq.html`
- `404.html`
- `sitemap.xml`
- `robots.txt`

JS validado:

```bash
node --check main.js
node --check animations.js
```

Ambos passaram.

### Lighthouse anterior

Medições finais realizadas após a expansão multi-página:

Homepage:

- Performance: 91
- Accessibility: 100
- Best Practices: 100
- SEO: 100
- LCP: 3.5s
- CLS: 0.012
- TBT: 0ms
- Speed Index: 1.6s

Página `candidatos.html`:

- Performance: 91
- Accessibility: 100
- Best Practices: 100
- SEO: 100
- LCP: 3.5s
- CLS: 0.002
- TBT: 0ms
- Speed Index: 1.4s

Página `profissoes.html`:

- Performance: 94 em repetição final limpa.
- Accessibility: 100.
- Best Practices: 100.
- SEO: 100.
- LCP: 3.0s
- CLS: 0.026
- TBT: 0ms
- Speed Index: 1.4s

Arquivos de evidência gerados durante QA:

- `lh-final-4.json`
- `maelo-lighthouse-final.jpg`
- `lh-home-final-2.json`
- `lh-candidatos-final-3.json`
- `lh-profissoes-final-2.json`

### Agente/formulários

Comando:

```bash
npm.cmd test
```

Diretório:

`C:\Users\mateu\Desktop\Projetos\ma-elo-profissional\ma-elo-recruitment-agent`

Resultado fora do sandbox:

- 6 testes passaram
- 0 falhas

Testes cobrem:

- fluxo WhatsApp curto enviando formulário de soldador
- rejeição por necessidade de alojamento
- certificação estrangeira de soldador marcada para revisão humana
- persistência de submissão via repositório
- rejeição sem autorização/documentos para trabalhar em Portugal
- exposição dos campos web dos formulários

## 9. Estado dos agentes/frameworks instalados

### VibeAuryon

Pasta existente:

- `.vibeauryon`
- também existe em `C:\Users\mateu\.vibeauryon`

Status anterior:

- VibeAuryon conectado
- Conta detectada: `mateusbrasil2007@gmail.com`
- Pro
- 3/8 agentes configurados
- havia recomendação de update

### Zynia OS Agents

Pastas existentes:

- `zynia-os-agents`
- `zynia-os-agents-npx-test`

Essas pastas parecem ser exports/documentação de agentes/playbooks.  
O backend local do Zynia MCP não respondeu anteriormente em `localhost:3001`, então foi tratado como referência/playbook, não como runtime ativo.

Comandos úteis encontrados:

- `/vibe-design`
- `/vibe-motion`
- `/vibe-speed`
- `/vibe-review`

### Skills mencionadas pelo usuário

O usuário disse que instalou:

- `impecable`
- `huashu-design`

Na sessão atual, essas skills não apareceram na lista ativa de skills carregadas pelo Codex e não foram encontradas nas pastas padrão consultadas. Se outra IA continuar, vale verificar se foram instaladas em caminho diferente.

Skills efetivamente usadas/conceitualmente aplicadas:

- `content-strategy`
- `copywriting`
- `ui-ux-pro-max`
- `backend-development`
- `verification-before-completion`

Agentes internos usados:

- Auditor de arquitetura/conteúdo
- Auditor de UI/UX/frontend

Conclusão dos agentes:

- A base visual está boa.
- O maior ganho era criar subpáginas reais, separar funil B2B e candidatos, enriquecer profissões e integrar formulários.
- Isso foi iniciado e implementado.

## 10. O que está sendo feito agora

Fase atual:

Transformação do site de one-page premium para site institucional multi-página.

Já foram criadas as páginas principais:

- Empresa
- Serviços
- Para Empresas
- Profissões
- Candidatos
- Regiões
- Contacto
- Privacidade
- FAQ
- Soldador
- Serralheiro
- Pintor Industrial
- 404

O próximo trabalho é refinamento:

- melhorar a qualidade visual dessas subpáginas
- testar navegação real em desktop/mobile
- rodar Lighthouse novamente após as subpáginas
- decidir deploy do backend de formulários
- configurar proxy/redirect para `/apply/*`

Atualização adicional: após a criação das páginas de FAQ, profissões específicas e 404, todas as páginas HTML principais responderam `200` em servidor local `python -m http.server 4174`. Também foi feita busca por termos indevidos como `outsourcing`, `contratação garantida`, `colocação garantida`, `salário garantido`, `alojamento incluído`, `cobertura nacional`, `naval`, `energia` e `logística`, sem ocorrências no conteúdo HTML/MD relevante.

## 11. O que falta fazer

### Prioridade alta

1. Testar visualmente todas as páginas novas no browser.
2. Ajustar detalhes visuais finos das subpáginas, especialmente densidade, espaçamento e imagens.
3. Rodar Lighthouse novamente na homepage, `profissoes.html` e `candidatos.html`.
4. Definir onde o agente de formulários será publicado.
5. Configurar integração real:
   - mesmo domínio: `/apply/*` servido pelo agente
   - ou subdomínio: exemplo `forms.maelo.pt/apply/soldador`
   - ou proxy na hospedagem
6. Atualizar links dos formulários se o agente ficar em outro domínio.
7. Remover ou ignorar assets antigos não usados no deploy.

### Prioridade média

1. Melhorar imagens por página.
2. Adicionar schema JSON-LD nas subpáginas.
3. Criar configuração específica de Netlify/Vercel quando o destino final for escolhido.
4. Criar página de termos/aviso legal se o cliente pedir.

### Prioridade baixa

1. Self-host de fontes.
2. Self-host de GSAP/Lenis ou SRI nas CDNs.
3. Limpeza de arquivos antigos no workspace:
   - `Emergent _ Fullstack App.html`
   - `Emergent _ Fullstack App_files`
   - screenshots antigos
   - relatórios Lighthouse antigos

Não apagar nada sem confirmar com o usuário.

## 12. Decisão técnica sobre backend

O site institucional continua estático e deployável sem build step.

O agente de candidaturas é backend separado em Node, com Supabase opcional/planejado.

Melhor arquitetura:

```text
maelo.pt                  -> site institucional estático
maelo.pt/apply/soldador   -> agente Node ou proxy para agente
maelo.pt/forms/*          -> agente Node
maelo.pt/forms/submissions -> agente Node
```

Alternativa:

```text
maelo.pt                  -> site institucional
forms.maelo.pt            -> agente de candidaturas
```

Se usar subdomínio, alterar links em:

- `profissoes.html`
- `candidatos.html`

## 13. Tom de copy a manter

Usar frases como:

- “análise humana”
- “quando aplicável”
- “conforme projetos e obras em curso”
- “organização e encaminhamento responsável”
- “canal de apoio”
- “sem garantia de colocação imediata”
- “condições informadas pela equipa após análise”

Evitar frases como:

- “garantimos profissionais”
- “temos equipas prontas”
- “cobertura nacional”
- “contratação imediata”
- “salários competitivos”
- “alojamento incluído”
- “outsourcing”

## 14. Comandos úteis

No site:

```bash
cd "C:\Users\mateu\Desktop\Nova pasta"
python -m http.server 4174
node --check main.js
node --check animations.js
```

No agente:

```bash
cd "C:\Users\mateu\Desktop\Projetos\ma-elo-profissional\ma-elo-recruitment-agent"
npm.cmd test
npm.cmd start
```

Depois abrir:

```text
http://localhost:3005
http://localhost:3005/apply/soldador
http://localhost:3005/apply/serralheiro
http://localhost:3005/apply/pintor
http://localhost:3005/apply/generic
```

## 15. Próximo prompt sugerido para continuar com outra IA

```text
Você está continuando o projeto M&A Elo Profissional. Leia primeiro o arquivo CONTEXTO-PROJETO-MA-ELO.md no workspace C:\Users\mateu\Desktop\Nova pasta. O objetivo é finalizar o site institucional premium multi-página, testar visualmente todas as páginas, validar Lighthouse, ajustar responsividade, e integrar corretamente as rotas do agente de candidaturas localizado em C:\Users\mateu\Desktop\Projetos\ma-elo-profissional\ma-elo-recruitment-agent. Não invente salários, benefícios, contratos, cobertura nacional fixa ou alojamento. Mantenha o site institucional, com candidaturas como canal secundário.
```

## 16. Atualizacao de producao - 11 de Maio de 2026

Decisao atual de arquitetura:

```text
maelo.pt                 -> website institucional estatico
candidaturas.maelo.pt    -> agente Node e formularios de candidatura
```

Motivo: o agente de candidaturas carrega assets como `/styles.css` e `/app.js`. Se ele for montado diretamente em `maelo.pt/apply/*`, esses assets podem conflitar com os arquivos do site institucional. Por isso, os CTAs do site foram atualizados para links absolutos em `https://candidaturas.maelo.pt/apply/*`.

Arquivos adicionados ou atualizados para lancamento:

- `.gitignore` para evitar commit/deploy de artefatos locais.
- `README.md` com visao rapida do projeto.
- `PRODUCTION-FILES.md` com allowlist dos arquivos que devem ir para producao.
- `_headers` com cabecalhos de seguranca e CSP inicial.
- `_redirects.example` documentando apenas o caso opcional de proxy.
- `DEPLOY.md` e `FORMULARIOS-INTEGRACAO.md` atualizados para o modelo com subdominio.

Ajustes feitos no agente em `C:\Users\mateu\Desktop\Projetos\ma-elo-profissional\ma-elo-recruitment-agent`:

- `/forms/submissions` deixou de depender de `WEBHOOK_SECRET`, porque o formulario publico nao deve expor segredo no browser.
- `WEBHOOK_SECRET` ficou restrito ao webhook `/whatsapp/inbound`.
- Adicionado limite de JSON por `MAX_JSON_BODY_BYTES`.
- Adicionado rate limit simples por IP para submissoes publicas.
- Adicionada validacao de `Content-Type: application/json`.
- Adicionada validacao de `roleKey`.
- `/apply/<funcao>/` com barra final passou a servir o formulario.
- `supabase/schema.sql` deixou de criar politicas publicas abertas de leitura/alteracao em tabelas com PII.

Verificacao apos esses ajustes:

- `npm.cmd test` no agente: 6/6 testes passando.

## 17. Ajustes visuais e formulario local - 11 de Maio de 2026

Ajustes feitos depois da revisao de design/agentes:

- NIF removido da topbar das paginas. Mantido apenas em areas legais/institucionais como dados estruturados, Empresa, Contacto e Privacidade.
- Links de formulario continuam com URL de producao `https://candidaturas.maelo.pt/apply/*`, mas `main.js` reescreve automaticamente para `http://localhost:3005/apply/*` quando o site roda em `localhost`, `127.0.0.1` ou `file:`.
- Menu mobile reduzido para uma escala mais sobria e institucional, com separadores finos.
- Botoes globais ficaram mais seguros em mobile com quebra de linha e `max-width: 100%`.
- Cards/blocos editoriais receberam linha animavel por `--line-progress`.
- `animations.js` passou a animar linhas tambem em cards e a revelar elementos de paginas internas com ritmo mais premium.

Verificacao:

- `node --check main.js`: passou.
- `node --check animations.js`: passou.
- Todas as paginas estaticas principais responderam 200 no servidor local.
- Rotas locais do agente `/apply/soldador`, `/apply/serralheiro`, `/apply/pintor`, `/apply/generic`: 200.
- `npm.cmd test` no agente: 6/6 testes passando.

## 18. Expansao SEO - 11 de Maio de 2026

Foram adicionadas paginas para captar intencoes especificas de busca no Google:

- `apoio-operacional-obras.html`
- `profissionais-industria-metalomecanica.html`
- `organizacao-candidatos-obra-industria.html`
- `obras-lisboa-parque-das-nacoes.html`
- `obras-estarreja-aveiro.html`
- `obras-viana-do-castelo.html`

Tambem foram atualizados:

- `servicos.html` com hub interno para paginas especializadas.
- `regioes.html` com links para paginas regionais.
- `sitemap.xml` com as novas URLs.
- `README.md` e `PRODUCTION-FILES.md` com a nova estrutura.
- `SEO-METRICS.md` com KPIs, Core Web Vitals alvo, checklist on-page, eventos GA4 recomendados e consultas alvo.
- `main.js` com eventos preparados para `dataLayer`/`gtag` em cliques de WhatsApp e formularios.

Validacoes realizadas:

- `node --check main.js`: passou.
- `node --check animations.js`: passou.
- Todas as paginas oficiais HTML têm um unico H1, title, meta description e canonical quando aplicavel.
- Nenhum link interno `.html` quebrado foi encontrado.
- Todas as paginas estaticas oficiais responderam 200 no servidor local.
- `npm.cmd test` no agente: 6/6 testes passando.

Fontes de criterio SEO usadas:

- Google Search Central: SEO Starter Guide.
- Google Search Central: boas praticas para title links.
- Google Search Central: link best practices.
- web.dev: Core Web Vitals.
