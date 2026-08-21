# M&A Elo Profissional — Regras de Trabalho

## Contexto do projecto

Site estático B2B da empresa **M&A Elo Profissional, Unipessoal, Lda.** (NIF 518 954 170), empresa portuguesa de apoio técnico operacional industrial (soldadura, serralharia, tubagem, montagem, manutenção). NÃO é ETT nem agência de recrutamento.

- 27 ficheiros HTML + styles.css + design-tokens.css + main.js + animations.js
- Paleta cream/copper, tipografia Cormorant Garamond + Inter, estética minimalista premium
- Sem framework — HTML estático puro, deploy em Vercel

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

## Decisões já tomadas (não reverter)

- Paleta e estética mantidas: cream/copper, minimalista premium — sem dark industrial
- Linguagem: português europeu (pt-PT) — não brasileiro
- ETT/recrutamento removido: a empresa é de "prestação de serviços técnicos"
- nav-link--secondary aplicado a "Profissionais" em todos os HTML
- Imagens dos 8 cards de serviço: ficheiros `mig-mag-welding.jpg`, `tig-welding.jpg`, `electrode-welding.jpg`, `serralharia-industrial.jpg`, `tubagem-industrial.jpg`, `montagem-industrial.jpg`, `manutencao-industrial.jpg`, `estruturas-metalicas.jpg`
