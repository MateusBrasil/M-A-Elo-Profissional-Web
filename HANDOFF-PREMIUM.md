# HANDOFF — subir o site M&A Elo de "correcto" para "isto custou caro"

Aberto em 2026-08-17. Diagnóstico feito no site tal como está agora (com as fotos próprias já instaladas),
medido no browser, e cruzado com o banco Code Eagle em `Documents\Projetos\prospector-premium\prospector-premium\blocks-ce`.

Nada aqui é impressão. Cada número foi medido, cada peça do banco citada foi renderizada e vista.

---

## 1. Porque é que o site parece feito por IA (medido, não opinado)

Régua de comparação: o **padrão Kasablanca**, que já é a régua dos sites do Prospector.

| Métrica | Kasablanca (régua) | M&A Elo hoje | Estado |
|---|---|---|---|
| Ratio display / corpo | 9,4× (mínimo aceitável 8×) | **3,6×** (64px vs 18px) | falha |
| Peso do display | 900 | **500** | falha |
| Line-height do display | 0,85 | **1,15** | falha |
| Famílias | serif display + grotesca + mono | Inter em tudo (Cormorant só em h3 de card) | falha |
| Cores computadas na home | ~6 tokens | **36** | disperso |
| ScrollTriggers com `scrub` | — | **1 de 50** | quase zero movimento ligado ao scroll |
| Secções com `pin` | — | **0** | zero narrativa presa |
| Fundos distintos em 9 secções | — | **3** (2 cremes + 1 navy) | monotonia |
| `border-radius` dominante | — | **20px em 9 cards** | assinatura de template |

Tradução: o site tem tipografia média, fundo uniforme, cantos arredondados e movimento só de *fade*.
Isto é literalmente a assinatura visual de página gerada. O conteúdo é bom, a copy é B2B a sério,
as fotos agora são próprias. **O que falta é hierarquia tipográfica brutal e movimento ligado ao scroll.**

## 2. O que o banco Code Eagle tem de facto

Medido correndo um indexador sobre `blocks-ce` (nada deduzido do nome da pasta):

- **580 dobras** com ficheiros; **551 utilizáveis** como HTML/CSS/JS puro
- **8 dobras** têm JSX cru guardado como `.html` (inutilizáveis sem porte) — as corrompidas já conhecidas
- **0 dobras** com `<script src>` externo a vazar (o bug antigo está corrigido)
- **306 dobras correm com as libs que existem** em `blocks-ce/_libs` (gsap, ScrollTrigger, Flip, Lenis, imagesLoaded)
- **245 dobras exigem lib que não está no banco**: `three` (174), `swiper` (103), **`SplitText` (95)**, `matter` (59), `splitting` (19), `splittype` (12)

Funções detetadas no código (uma dobra pode ter várias):
`grid-galeria` 222 · `acordeão` 198 · `marquee` 181 · `sticky` 144 · `mask-reveal` 126 ·
`parallax-imagem` 109 · `contador-números` 108 · `split-text-linhas` 97 · `scrub` 79 ·
`canvas/webgl` 65 · `lenis` 49 · `hover-reveal-card` 39 · `timeline-processo` 39 ·
`pin-vertical` 16 · `pin-horizontal` 10 · `vídeo-fundo` 9

**Aviso de licença:** `SplitText` é plugin do GSAP Club (pago). 95 dobras dependem dele.
O site já tem um divisor de palavras próprio em `animations.js` (`splitHeroTitle`), que serve
para o mesmo efeito sem a lib. Portar a técnica, não a dependência.

**Natureza do banco:** as dobras são **demos de técnica**, não secções prontas com conteúdo
(o `scroll-44` diz literalmente "Keep scrolling to reveal the cards" com cartões placeholder).
Duas exceções úteis, que são layout a sério: `secoes/secao-149` (case study) e `secoes/secao-52` (stats + logos).
Isto significa: o valor está em **portar o mecanismo e vestir com o conteúdo M&A**, nunca em colar a dobra como está.

## 3. Peças escolhidas, com prova

Todas foram renderizadas em browser e vistas em screenshot antes de entrarem nesta lista.
Screenshots em `AppData\Local\Temp\claude\...\scratchpad\previews\`.

| # | Onde no site | Dobra do banco | Peso | Libs | O que é, verificado |
|---|---|---|---|---|---|
| T1 | Faixas de fotografia (empresa, serviços, regiões) | `scroll/scroll-9` | 17 kb | gsap+ScrollTrigger+lenis | Revela a foto em lâminas horizontais conforme o scroll (SVG mask). Vi funcionar com foto de arquitectura; com as fotos de obra fica cinematográfico |
| T2 | "O que executamos" (6 cards) | `scroll/scroll-44` | 7 kb | gsap+ScrollTrigger+Flip+lenis | Secção presa e cartões que entram a rodar e assentam. Placeholders no original, mecanismo limpo |
| T3 | "Intervenções reais" | `secoes/secao-149` | 33 kb | gsap | Layout de case study: título enorme, resumo com números dentro do texto, imagem grande. É a estrutura que falta ao site |
| T4 | Barra de credenciais / números | `secoes/secao-52` | 21 kb | gsap+ScrollTrigger | Fundo escuro, 3 números grandes com rótulo em maiúsculas + fila de logos. Prova social que o site hoje não tem |
| T5 | Processo (4 etapas) | técnica de `scroll/scroll-39` + `scroll/scroll-42` | 10 e 13 kb | gsap+ScrollTrigger(+lenis) | Narrativa presa com progresso ligado ao scroll e contador. As dobras de timeline "prontas" pesam 70-90 kb e exigem three+swiper: rejeitadas |
| T6 | Título do hero e H2 de secção | técnica de `split-text-linhas` (97 dobras) reimplementada no divisor que já existe | 0 kb novos | gsap | Linhas a subir por baixo de máscara, em vez do fade actual |
| T7 | Transição entre páginas | `transicoes-de-pagina/transicao-pagina-2` (a confirmar) ou reforço do Barba existente | 69 kb | gsap+ScrollTrigger+lenis | Marcado como **por verificar**: não o renderizei ainda |

Rejeitadas com motivo (para não voltarem a ser propostas):
- `animacoes-de-grid/animacao-grid-8` — renderiza com altura 0px, quebrada
- `animacoes-de-rolagem/animacao-rolagem-12` — depende de `charming` (lib ausente), erro em consola
- `scroll/scroll-17` — `SyntaxError: ExpandImageEffect has already been declared`, precisa de limpeza
- `scroll/scroll-30` — `import` ESM dentro de script clássico, não corre como está
- Todas as `timeline-processo` de `secoes/` — 68 a 90 kb e exigem three+swiper+SplitText

## 4. O que muda no site, por ordem de impacto

**P1 — Régua tipográfica (é isto que mata a cara de IA, e não custa peso nenhum)**
- Display sobe para ratio ≥ 8× em relação ao corpo, peso 900, line-height 0,85 a 0,90
- Escolher a display: duas direcções possíveis, e isto é decisão de direcção de arte, não minha
  - **Grotesca industrial pesada** (Archivo Black / Anton / Bebas Neue): fala aço, obra, engenharia
  - **Serif display alto contraste** (Fraunces): fala instituição sólida, é a linha do Kasablanca
- Reduzir a paleta computada de 36 para ~8 tokens
- Matar o `border-radius: 20px` dos cards (ou cortar para 4px) e a faísca que roda 360° em loop

**P2 — Ritmo de fundos.** Hoje: creme, creme, creme, navy, creme. Alternar blocos escuros full-bleed
com a fotografia industrial a ocupar 100vh entre secções claras.

**P3 — Movimento ligado ao scroll.** T1, T2, T5, T6. Zero pins hoje, meta 3 a 4 pins na home.

**P4 — Prova social e números (T4) e cases (T3).** Isto é o que faz um comprador achar que o site vale muito:
números concretos, obras nomeadas, clientes. Nota: **os números e nomes têm de vir do cliente**,
não se inventa. Se não houver, a secção usa o que é verdade (nº de especialidades, regiões, anos).

**P5 — Copy dos novos blocos.** Regra do Mateus: copy de página nova é escrita pelo `/copy-elite`, não improvisada
no meio do build.

## 5. Gates de aceitação (números, não opinião)

Nenhuma entrega é reportada como pronta sem isto medido no browser:

1. `ratio display/corpo ≥ 8` na home e em pelo menos 3 páginas internas
2. `peso do display = 900` e `line-height ≤ 0,90`
3. `≤ 10 cores computadas` distintas na home
4. `≥ 3 ScrollTriggers com pin` e `≥ 8 com scrub` na home
5. Zero erros de consola e zero 404 nas 19 páginas
6. Peso total da home `≤ 1,6 MB` e LCP `≤ 2,5 s` em 4G simulado
7. Nenhum preloader nem "click to enter" (regra dura, `Preloader.jsx` está arquivado por isso)
8. Corre sem `SplitText` e sem `three`, salvo decisão explícita em contrário

## 6. Riscos

- **Porte falso.** Já aconteceu 3 vezes no Prospector: dizer "usei a dobra X" quando o código final tem 0% do banco.
  Cada tarefa desta lista tem de indicar as linhas efectivamente aproveitadas, e isso é verificável por diff.
- **Regressão do que já está aprovado.** O hero com foto, o véu uniforme e as 10 fotos próprias foram
  validados hoje. Nada disto se mexe sem pedido.
- **Peso.** As dobras com `three` puxam 174 dobras do banco mas também puxam 600 kb de runtime. Fora, por omissão.
- **Adequação.** Este é um site B2B industrial em Portugal, não um portfólio de moda. Cinematográfico aqui
  é peso, escala e precisão, não trail de imagens no cursor nem tipografia gritada de estúdio criativo.

## 7. Estado

- [x] Diagnóstico medido
- [x] Banco indexado e classificado por função
- [x] 16 dobras renderizadas e avaliadas
- [ ] Direcção de arte da display escolhida (decisão do Mateus)
- [ ] Squad aprovado (ver proposta no chat)
- [ ] T1 a T6 implementados
- [ ] Gates medidos
