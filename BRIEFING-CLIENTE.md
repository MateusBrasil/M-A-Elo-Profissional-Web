# Briefing de Mudanças — Site M&A Elo Profissional

**Data:** Junho 2026
**Âmbito:** Reestruturação estratégica e de conteúdo do site institucional segundo PRD aprovado
**Estado:** Pronto para revisão final do cliente

---

## Sumário executivo

O site foi reposicionado de **"intermediador de mão de obra"** para **"empresa portuguesa de execução de serviços técnicos industriais"**. A linguagem, a arquitectura de conteúdo, os formulários de candidatura e a exibição de dados institucionais foram revistos página a página para alinhar com a estratégia do PRD.

**Em uma frase:** o site agora lê-se como empresa B2B que executa serviços com equipa própria, não como agência de cedência de pessoas.

---

## Decisão estratégica nº1 — Posicionamento

### O problema que estava no site antes

A homepage abria com:

> "Reforço operacional para obras, indústria e metalomecânica. A M&A Elo Profissional **fornece equipas técnicas** a empresas em Portugal."

Esta frase, em conjunto com expressões como "apoio operacional", "encaminhamento responsável" e "canal de profissionais" espalhadas pelo site, posicionava a empresa como **agência de cedência de pessoas** — risco jurídico-comercial elevado, percepção errada por parte dos decisores empresariais, e contradizia o briefing.

### O posicionamento novo

A homepage abre agora com:

> "**Serviços técnicos industriais para metalomecânica, montagem e manutenção em Portugal.** A M&A Elo Profissional **executa intervenções técnicas** para empresas industriais em Portugal — soldadura MIG/MAG e TIG, serralharia, tubagem, montagem e manutenção metalomecânica. Equipa própria, leitura técnica do projeto e acompanhamento do orçamento à entrega."

A mesma lógica foi aplicada em todas as páginas do site.

---

## Mapa léxico — antes/depois (aplicado em 27 páginas)

| Antes (proibido) | Depois (preferido) |
|---|---|
| Reforço operacional | Serviços técnicos |
| Reforço técnico operacional | Execução técnica especializada |
| Fornece equipas técnicas | Executa serviços técnicos |
| Apoio operacional | Serviços técnicos industriais |
| Encaminhamento responsável | Execução técnica responsável |
| Encaminhamento de profissionais | Execução com equipa qualificada |
| Canal de Profissionais (como valor) | Equipa Própria Qualificada |
| Cedência / Cedência de mão de obra | Execução / Prestação de serviço |
| Solicitar apoio técnico (CTA) | Pedir orçamento técnico |
| Pedir perfil técnico (CTA) | Pedir orçamento técnico |

**Termos eliminados completamente:** terceirização, trabalho temporário, ETT, agência de recrutamento.

---

## Páginas refundadas — uma a uma

### 1. Homepage ([index.html](index.html))
- Novo H1 + subtítulo focados em execução técnica
- Meta tags (title, description, OG, Twitter) reescritas — SEO alinhado com novo posicionamento
- **Dados estruturados JSON-LD reescritos**: as 4 perguntas FAQ que apareciam no Google foram refundadas para perguntas B2B (ex: "Como pedir um orçamento para um serviço técnico industrial?")
- Secção "About" — eliminado o dossier institucional que mostrava NIF e morada em destaque, substituído por "Capacidades operacionais" (execução, especialidades, atuação geográfica)
- Strip institucional do hero — removido NIF, agora destaca "Equipa própria", "Execução técnica industrial", "Lisboa · Aveiro · Norte", "Sede em Miranda do Douro"
- Secção "Setores" — copy reescrita (deixou de mencionar "apoio a obras" e passou a "execução técnica em obras")
- Bloco "Como atuamos" — kicker "Apoio operacional industrial" → "Execução técnica industrial"
- Bloco "Profissionais" (mantido como secundário) — copy ajustada para "integrar equipas M&A Elo"
- CTA final reescrito: "Precisam de uma intervenção técnica para obra ou projeto industrial?"

### 2. Empresa ([empresa.html](empresa.html))
- Title + meta description reescritas
- Hero: parágrafo de apresentação refundado para "empresa portuguesa de execução de serviços técnicos industriais"
- Painel institucional — removido NIF, mantido nome, especialidades, sede, contacto técnico
- Strip de credenciais (4 cards) refundada: "Execução Técnica · Análise Técnica · Regiões Ativas · Empresa Portuguesa" (em vez de "Apoio Operacional · Encaminhamento Responsável · Regiões Ativas · NIF")
- **6 valores institucionais completamente reescritos:**
  - Antes: Apoio Operacional · Encaminhamento Responsável · Canal de Profissionais · Portugal Conforme Obras · Processo Claro · Presença Formal
  - Depois: **Execução Técnica · Equipa Própria Qualificada · Acompanhamento Direto · Atuação Nacional · Processo Claro · Empresa Registada em Portugal**
- Bloco "Missão" reescrito: "Execução técnica responsável, sem promessas vazias."

### 3. Para Empresas ([para-empresas.html](para-empresas.html))
- Hero: "Execução técnica industrial para o vosso projeto — análise, planeamento e equipa própria."
- Painel "Informação útil no primeiro contacto" reorganizado por âmbito técnico (tipo de serviço, materiais, prazo, empresa)
- 4 cards de capacidades refundados: Obras · Indústria · Metalomecânica · Processo
- 4 etapas do processo: **Pedido inicial → Análise do âmbito → Proposta técnica → Execução e acompanhamento** (antes era "Pedido → Leitura → Triagem → Seguimento responsável")
- Bloco de limites: antes falava em "não garantimos colocação imediata"; agora fala em **compromissos B2B** (âmbito definido, orçamento sob consulta, equipa qualificada, acompanhamento até entrega)
- CTA final reescrito sem "necessidade operacional"

### 4. Serviços ([servicos.html](servicos.html))
- Hero + meta refundados
- 4 service items reescritos:
  1. Obras e projetos operacionais
  2. Indústria e metalomecânica
  3. **Análise e proposta técnica** (era "Gestão operacional de recursos técnicos")
  4. **Acompanhamento até à entrega** (era "Acompanhamento técnico e operacional")
- Hub de páginas especializadas com nomes alinhados

### 5. Áreas Técnicas ([profissoes.html](profissoes.html)) — **mudança conceptual grande**
- Antes: 4 cards de PERFIS profissionais (Soldador, Serralheiro, Pintor Industrial, Outros)
- Depois: **6 cards de MACROÁREAS TÉCNICAS** executadas pela empresa:
  1. **Soldadura** (MIG/MAG, TIG, Eletrodo)
  2. **Serralharia** industrial
  3. **Tubagem** industrial
  4. **Montagem** industrial
  5. **Manutenção** industrial
  6. **Estruturas Metálicas**
- Cada card mostra imagem real do trabalho, descritivo técnico e CTA "Pedir orçamento"
- Layout em grid de 2 colunas em desktop (mais escaneável)
- **Justificação:** a página deixa de transmitir "estes são os perfis disponíveis para colocação" e passa a transmitir "estas são as áreas técnicas que executamos com equipa própria"

### 6. Serviços Técnicos para Obras ([apoio-operacional-obras.html](apoio-operacional-obras.html))
- URL mantido por SEO (já estava indexado no Google)
- Title: "Apoio operacional para obras em Portugal" → **"Serviços Técnicos para Obras em Portugal"**
- H1, copy, etapas e CTAs totalmente reescritos para refletir execução técnica
- 4 etapas novas: Análise do âmbito → Proposta técnica e orçamento → Execução em obra → Entrega e acompanhamento

### 7. FAQ ([faq.html](faq.html))
- 6 perguntas refundadas (lista visível + dados estruturados JSON-LD do Google sincronizados):
  1. Que tipos de intervenção técnica a M&A Elo executa?
  2. Como funciona o processo de orçamento?
  3. Qual é o prazo médio de resposta a um pedido?
  4. A execução é feita com equipa própria ou subcontratada?
  5. Em que regiões a M&A Elo atua?
  6. Como é assegurada a supervisão técnica durante a execução?
- **Removidas:** "A M&A Elo garante colocação?" e variantes que confirmavam ao Google que a empresa era de intermediação

### 8. Páginas de varredura (limpeza de termos + remoção de NIF do texto visível)
- [candidatos.html](candidatos.html) — meta + parágrafos institucionais
- [contacto.html](contacto.html) — ficha da empresa sem NIF
- [regioes.html](regioes.html) — meta description
- [obras-lisboa-parque-das-nacoes.html](obras-lisboa-parque-das-nacoes.html), [obras-estarreja-aveiro.html](obras-estarreja-aveiro.html), [obras-viana-do-castelo.html](obras-viana-do-castelo.html) — meta + parágrafos de "não garante colocação imediata"
- [organizacao-candidatos-obra-industria.html](organizacao-candidatos-obra-industria.html) — parágrafo defensivo
- [candidatura-dinamica.html](candidatura-dinamica.html) — disclaimer de consentimento atualizado
- [privacidade.html](privacidade.html) — copy técnica revista (NIF mantido por obrigação legal de identificação do controlador RGPD)

### 9. Footer e Navegação — alterações globais (27 páginas)
- **Footer institucional reescrito** em todas as páginas: "Prestação de serviços técnicos e apoio operacional para obras..." → "M&A Elo Profissional, Unipessoal, Lda. — execução de serviços técnicos industriais em soldadura, serralharia, tubagem, montagem e manutenção metalomecânica em Portugal."
- **NIF removido do rodapé legal** em todas as páginas
- CTAs "Solicitar apoio técnico" / "Pedir perfil técnico" → "Pedir orçamento técnico"
- Mensagens pré-preenchidas do WhatsApp atualizadas para não dizer "preciso de apoio operacional"

---

## Decisão estratégica nº2 — Política do NIF (518 954 170)

A pedido do cliente, o NIF deixou de estar exposto no site. Onde estava:
- Title da homepage e várias páginas
- Meta descriptions
- Strip institucional do hero
- Dossier "Conhecer a empresa" da homepage
- Painel "Dados da empresa" da página Empresa
- Painel "Ficha da empresa" do Contacto
- Footer legal de todas as 27 páginas
- Vários parágrafos institucionais

Onde foi **mantido** (justificação legal):
- Dados estruturados JSON-LD da homepage (`taxID` — invisível ao utilizador, necessário ao Google para identificação do negócio)
- Página de Privacidade — identificação do responsável de tratamento de dados (obrigação RGPD)

**Efeito:** o site comunica como empresa profissional sem ostentar dados fiscais como prova de existência. Mantém-se rastreável legalmente onde tem de ser.

---

## Decisão estratégica nº3 — Simplificação dos formulários de candidatura

### Diagnóstico

Os 4 formulários (Soldador, Serralheiro, Pintor, Geral) tinham **5 campos obrigatórios** cada um, dropdown para anos de experiência, e copy defensiva ("o envio não garante colocação imediata"). Profissionais operacionais com baixa literacia digital desistiam.

### Mudanças aplicadas em todos os 4 formulários

| Antes | Depois |
|---|---|
| 5 campos obrigatórios (nome, telefone, região, disponibilidade, experiência) | **3 obrigatórios** (nome, telefone, especialidade/função) |
| Dropdown de experiência ("Selecione...") | **Chips horizontais visíveis** (< 1 ano · 1-2 · 3-5 · 5-10 · > 10) |
| Nenhuma pergunta sobre idiomas | Checkboxes: Português · Espanhol · Inglês · Francês · Outro |
| Nenhuma pergunta sobre disponibilidade geográfica | Checkboxes: Norte · Centro · Lisboa · Sul · Ilhas · **Fora de Portugal (Europa)** |
| Nenhum espaço para experiência prática não certificada | **Textarea dedicada** ("Descreva trabalho relevante sem certificado oficial") |
| Disclaimer defensivo no fim ("não garante colocação imediata") | **Checkbox de consentimento RGPD explícito** num bloco visual destacado ("Autorizo a M&A Elo a guardar estes dados para esta candidatura e futuras oportunidades técnicas compatíveis") |
| "Candidatura enviada. Não há garantia de resposta imediata." | "Candidatura recebida. A equipa vai analisar o seu perfil e entrar em contacto quando surgir projeto compatível." |

### Benefício esperado
- Menos fricção para profissionais → mais candidaturas completadas
- Dados mais úteis na base — idiomas, disponibilidade geográfica e Europa estão captados desde o início
- Cumprimento RGPD reforçado com consentimento explícito (não enterrado em legalês)

---

## O que **não** mudou (decisões deliberadas)

- **Paleta cromática e tipografia** — cream + copper, Cormorant Garamond + Inter mantidos (regra CLAUDE.md)
- **URLs** das páginas — todos mantidos para preservar SEO existente (inclui o URL antigo `apoio-operacional-obras.html` que só teve o conteúdo reescrito)
- **Arquitectura de navegação principal** — mesmo conjunto de links: Empresa · Serviços · Empresas · Áreas Técnicas · Regiões · Profissionais · Contacto
- **WhatsApp** continua o canal principal de conversão B2B e candidato
- **Estrutura DB dos formulários** (Neon PostgreSQL) — não foi alterada; os novos campos (idiomas, zonas, experiência prática) são concatenados na coluna `mensagem` existente com prefixos claros, evitando migração de schema

---

## Como visualizar antes de aprovar

O site está em ficheiros estáticos prontos a abrir em qualquer browser:

1. Abrir [index.html](index.html) directamente no browser
2. Para experiência completa com nav e assets, servir localmente (ex: arrastar a pasta para o VS Code com extensão Live Server, ou usar `python -m http.server` na pasta do projeto)
3. Páginas mais importantes para rever (por ordem de prioridade):
   1. [index.html](index.html) — homepage
   2. [empresa.html](empresa.html) — secção "6 valores" foi a que mais mudou
   3. [profissoes.html](profissoes.html) — refundação conceptual (6 macroáreas)
   4. [para-empresas.html](para-empresas.html) — copy B2B
   5. [candidatura-soldador.html](candidatura-soldador.html) — novo formulário
   6. [faq.html](faq.html) — perguntas refundadas

---

## Próximos passos sugeridos

### Para o cliente decidir
1. **Aprovar reposicionamento** — confirmar que a nova mensagem-mãe ("execução de serviços técnicos industriais com equipa própria") está alinhada com a visão da empresa
2. **Validar política do NIF** — confirmar que esconder NIF do site (mantendo-o em RGPD e JSON-LD) é a abordagem desejada
3. **Aprovar as 6 macroáreas técnicas** em [profissoes.html](profissoes.html) — confirmar que estas são as competências centrais executadas
4. **Aprovar os 6 valores institucionais** em [empresa.html](empresa.html) — Execução Técnica · Equipa Própria · Acompanhamento Directo · Atuação Nacional · Processo Claro · Empresa Registada
5. **Validar formulário simplificado** — pedir ao cliente que preencha um dos formulários de candidatura como teste
6. **Decidir se faz deploy** desta versão para produção (Vercel) ou se prefere afinar mais primeiro

### Possíveis ajustes adicionais (se solicitados)
- Reescrever em maior detalhe as páginas de regiões/obras individuais
- Adicionar 1-2 fotos próprias de equipa em obra (substituir imagens stock)
- Adicionar página "Casos de execução" / portefólio técnico
- Implementar tracking de conversão WhatsApp para medir impacto

---

## Para feedback rápido

Pode marcar pontos a alterar com formato:

> **Página:** empresa.html
> **Secção:** valor nº 2
> **Pedido:** trocar "Equipa Própria Qualificada" por "Equipa Técnica Especializada"

Cada pedido é tratado e devolvido no mesmo dia.

---

**M&A Elo Profissional — Junho 2026**
