# M&A Elo Profissional — Regras de Trabalho

## Contexto do projecto

Site estático B2B da empresa **M&A Elo Profissional, Unipessoal, Lda.** (NIF 518 954 170), empresa portuguesa de apoio técnico operacional industrial (soldadura, serralharia, tubagem, montagem, manutenção). NÃO é ETT nem agência de recrutamento.

- 27 ficheiros HTML + styles.css + design-tokens.css + main.js + animations.js
- Paleta cream/copper, tipografia Cormorant Garamond + Inter, estética minimalista premium
- Sem framework — HTML estático puro. Deploy: Cloudflare Pages via push no main do GitHub (o vercel.json é legado; quem manda nos cabeçalhos é o _headers)
- A pasta do projecto é `DocumentsProjetosmaelo-site` (renomeada a 21/08/2026; antes era M-A-Elo-Profissional-Web-main)

## Regras de qualidade (NÃO NEGOCIÁVEIS)

### 1. Padrão 10/10 — obrigatório em cada entrega
- Cada página deve ter nota 10/10 de copy, design e experiência
- Se uma página tem problema, corrijo ANTES de reportar como feito
- Nunca entregar nem reportar um 7/10, 8/10 ou 9/10 como resultado final
- Após cada conjunto de mudanças, faço auto-auditoria e corrijo o que ficou abaixo do máximo

### 2. Imagens devem corresponder exactamente ao conteúdo
- Nunca usar foto genérica que não mostra claramente o assunto do card/secção
- Soldadura MIG/MAG → foto com tocha MIG e faíscas visíveis
- Serralharia → corte/dobra/montagem de metal
- Antes de usar qualquer asset, verificar visualmente se faz sentido com o label

### 3. Linguagem defensiva — proibida em posições de destaque
- Frases como "sem promessas automáticas", "pode não receber resposta", "não garante colocação" não podem aparecer no hero, H1, H2, ou primeiros parágrafos
- Se necessário, vão para rodapé ou credential-panel secundário

### 4. Diferenciação clara entre páginas com audiências diferentes
- profissoes.html (Áreas Técnicas) → ângulo B2B: o que a M&A Elo entrega a empresas
- candidatos.html (Profissionais) → ângulo candidato: processo de candidatura
- Nunca deixar duas páginas com estrutura, CTAs e copy quase idênticos

### 5. Copy B2B em primeiro lugar
- O público principal é a empresa que precisa de técnicos — não o candidato
- Cada página deve responder: "O que esta empresa ganha ao trabalhar connosco?"
- CTAs principais → WhatsApp empresa / para-empresas.html
- CTAs secundários → candidatos.html

## Workflow por tipo de tarefa

### Quando recebo pedido de melhoria de copy
1. Leio todas as páginas afectadas
2. Audito copy com nota por página
3. Corrijo TUDO abaixo de 10/10 — não entrego parcelar
4. Reporto resultado com antes/depois das mudanças principais

### Quando recebo pedido visual/imagens
1. Verifico assets disponíveis em `assets/`
2. Se não existem imagens adequadas → pesquiso e descarrego da internet (Pexels, Unsplash)
3. Nunca reutilizo uma foto genérica só porque existe — deve corresponder ao contexto
4. Actualizo HTML com novos caminhos e alt text descritivo

### Quando faço mudanças em massa (27 ficheiros HTML)
1. Uso PowerShell bulk replace
2. Verifico com `Select-String` se ficou algum caso por tratar
3. Trato casos com `aria-current="page"` separadamente (padrão diferente)

### Quando o utilizador desaprova uma entrega
1. Não defendo o trabalho entregue
2. Percebo o que ficou abaixo do esperado
3. Corrijo até 10/10 sem entregar versões intermédias

### Quando o utilizador aprova
1. Registo o que funcionou em memória (feedback positivo também importa)
2. Aplico o mesmo padrão às restantes páginas

## Régua tipográfica (design-system-squad, 17/08/2026)

- **Display: Archivo 900** (SIL OFL, Google Fonts). Escolhida contra Anton e Fraunces porque casa com o wordmark sans do logotipo. Fraunces foi rejeitada **neste site** (serif contradiz o logo), continua válida onde já está aprovada
- Corpo Inter (decisão activa, com rationale: numerais tabulares para os códigos de processo) e mono JetBrains promovida a marcar códigos de linha (`P-106-01A`, `SCH 40`)
- Signature component declarado: **a chapa numerada** (numeral Archivo 900 + filete 1px + código em mono), como uma peça marcada em obra
- `type-scale-v2.css` é **ligado em todas as páginas desde 19/08/2026**. Caminho definitivo: apagar as sobreposições de tipografia em `effects.css` e deixar de precisar de `!important`
- Relatório completo com os números: `design system/audit-2026-08-17.md`. Plano de motion: `HANDOFF-PREMIUM.md`

### Duas armadilhas de CSS neste projeto
- `effects.css` tem `section.section h2` (especificidade 0,1,2). Regra nova que queira mandar nos H2 precisa de prefixo `html body`, senão perde em silêncio
- `.spec-edit__body h3` traz `font-style: italic` sem `!important`. Ao trocar a família, repor `font-style: normal`

## Decisões já tomadas (não reverter)

- Paleta e estética mantidas: cream/copper, minimalista premium — sem dark industrial
- Linguagem: português europeu (pt-PT) — não brasileiro
- ETT/recrutamento removido: a empresa é de "prestação de serviços técnicos"
- nav-link--secondary aplicado a "Profissionais" em todos os HTML
- Imagens: desde 17/08/2026 o site usa **fotos próprias da equipa M&A Elo** (uniforme com logo visível), prefixo `assets/equipa-*.webp` + `.jpg`. As antigas stock (`mig-mag-welding`, `tig-welding`, `electrode-welding`, `serralharia-industrial`, `tubagem-industrial`, `montagem-industrial`, `manutencao-industrial`, `estruturas-metalicas`, `welder-field`, `metal-bending`, heros `*-hero`) continuam em `assets/` mas **não são referenciadas** — não voltar a usá-las havendo foto própria equivalente
- Mapa foto própria → uso: `equipa-solda-electrodo` (soldadura/eléctrodo, versão `-tall` para o card alto do index), `equipa-solda-tig-inox` (TIG/inox), `equipa-solda-tubagem` (soldadura de tubagem em obra), `equipa-serralharia-corte` (serralharia/corte), `equipa-serralheiro-preparacao` (preparação de peças/apoio técnico), `equipa-caldeiraria` (caldeiraria), `equipa-tubista` (tubagem), `equipa-pintura-industrial` (pintura), `equipa-montagem-estruturas` (montagem/estruturas, og:image), `equipa-manutencao-bomba` (manutenção/mecânica)
- **Não existe** foto própria de MIG/MAG. O card de soldadura usa eléctrodo revestido; não rotular uma foto como MIG/MAG sem foto real
- Reprocessar fotos novas com `node scripts/importar-fotos-equipa.mjs` (sharp, gera webp+jpg)
- **Heros com fotografia própria** (revertido o cream vazio em 17/08/2026, bloco 24 do `effects.css`): a foto real com uniforme M&A é o que distingue o site de um template de IA. Homepage a `opacity: 1`, internas com `.page-hero::before` reactivado. Texto do hero é branco
- **Véu só em gradiente vertical uniforme, na mesma camada da foto.** Nunca usar elipse/radial centrado atrás do texto: deixa os cantos claros e a emenda vê-se como uma "película" colada (reprovado pelo Mateus em 17/08/2026). A foto de cada página entra pela custom property `--hero-foto` e o `::before` compõe `linear-gradient(...), var(--hero-foto)`
- Ao trocar a foto de uma página, editar `--hero-foto` no bloco 24 do `effects.css` e o `<link rel="preload" as="image">` dessa página
- Sinalética PT-BR nas fotos: as versões `equipa-manutencao-bomba-hero` e `equipa-serralheiro-preparacao-hero` são crops que cortam placas com "SOMENTE PESSOAL AUTORIZADO", "ÁREA DE SOLDA" e "Planejamento" (o site é pt-PT). Usar sempre as `-hero` em heros; nos cards pequenos o texto é ilegível e não importa
- Nav pill precisa de `background` ≥ 0.90 de opacidade: sobre hero fotográfico escuro, o glass a 0.6 tornava os links ilegíveis
- `animations.js`: a entrada do header usa `fromTo` com `immediateRender:false` e `clearProps`. Um `from` deixava o `.nav-cta` preso em `opacity: 0` quando a timeline corria duas vezes (init + Barba)

## Secções com scroll (portes do banco Code Eagle)

Três peças, cada uma com o mecanismo documentado no cabeçalho do seu ficheiro:

| Secção | Ficheiros | Origem no acervo |
|---|---|---|
| Execução em obra (home) | `obra-reveal.css/js` | `parallax/svg-mask-scroll-transitions` |
| Intervenções reais (home) | `casos-scroll.css/js` | `parallax/gsap-scroll-reveal` |
| A equipa em obra (empresa) | `equipa-grid.css/js` | `parallax/sticky-grid-scroll` |

### Regras para qualquer secção nova com ScrollTrigger

1. **Ligar ao evento `maelo:page-init`**, nunca criar triggers por fora. O `animations.js` mata todos os ScrollTriggers no `runPageInits` e recria só os dele; triggers criados fora morrem poucos milissegundos depois. O evento é disparado no fim do boot e no fim de cada entrada do Barba.
2. **Nunca `gsap.from`. Sempre `fromTo` com `immediateRender: false`.** Como o pipeline corre duas vezes, um `from` deixa os elementos presos em `opacity: 0`. Já aconteceu no CTA do nav e nas fotos da grelha da equipa; é a primeira coisa a verificar quando algo não aparece.
3. **Preferir `position: sticky` ao `pin` do ScrollTrigger.** Com `pinSpacing: false` o elemento solta-se mal no fim e invade a secção seguinte.
4. **Estado por progresso, não por callbacks na timeline.** Com `scrub`, um salto de scroll dispara todos os callbacks de uma vez e o texto passa à frente da imagem.
5. **Fallback estático obrigatório** para `prefers-reduced-motion` e para o caso de o GSAP não carregar.
6. **Correr `node scripts/versionar-assets.mjs`** antes de commitar CSS ou JS, senão o edge da Cloudflare serve a versão antiga durante 24h.
