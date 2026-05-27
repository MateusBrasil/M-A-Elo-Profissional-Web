# M&A Elo Profissional — Website Institucional

Site institucional estático para a M&A Elo Profissional, Unipessoal, Lda., com foco em credibilidade empresarial, apoio operacional, obras, indústria e metalomecânica em Portugal.

## Estrutura

- `index.html` — página inicial institucional.
- `empresa.html`, `servicos.html`, `para-empresas.html`, `regioes.html`, `contacto.html` — páginas B2B principais.
- `apoio-operacional-obras.html`, `profissionais-industria-metalomecanica.html`, `organizacao-candidatos-obra-industria.html` — páginas SEO por intenção de busca.
- `obras-lisboa-parque-das-nacoes.html`, `obras-estarreja-aveiro.html`, `obras-viana-do-castelo.html` — páginas SEO por região em curso.
- `profissoes.html`, `soldador.html`, `serralheiro.html`, `pintor-industrial.html`, `candidatos.html` — área secundária de candidaturas.
- `faq.html`, `privacidade.html`, `404.html` — suporte, RGPD e erro.
- `design-tokens.css`, `styles.css` — sistema visual e CSS artesanal.
- `main.js`, `animations.js` — navegação, menu, Lenis, GSAP e ScrollTrigger.
- `assets/` — imagens WebP/JPG usadas no site.

## Candidaturas

O site institucional aponta para um agente separado de candidaturas:

```text
https://candidaturas.maelo.pt/apply/soldador
https://candidaturas.maelo.pt/apply/serralheiro
https://candidaturas.maelo.pt/apply/pintor
https://candidaturas.maelo.pt/apply/generic
```

Esta separação evita conflito entre assets do website estático e assets do agente Node. O conteúdo público continua institucional; candidaturas são um canal secundário com análise humana e sem promessa de colocação.

## Verificação

Última rodada validada:

- Home: Lighthouse 91 / 100 / 100 / 100.
- Candidatos: Lighthouse 91 / 100 / 100 / 100.
- Profissões: Lighthouse 94 / 100 / 100 / 100.
- `node --check main.js`.
- `node --check animations.js`.
- Testes do agente de candidaturas: 6/6.

## Deploy

Ver [DEPLOY.md](DEPLOY.md) para a estratégia recomendada de produção.
