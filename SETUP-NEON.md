# Configuração do Backend — M&A Elo Profissional (Neon Database)

O sistema de candidaturas e o painel de administração estão ligados ao **Neon Database** (PostgreSQL serverless). A base de dados já foi criada e configurada. Este guia documenta o que existe e como usar.

---

## Estado atual

| Item | Estado |
|---|---|
| Projeto Neon | `super-wave-06190921` |
| Base de dados | `neondb` |
| Tabela | `candidatos` — criada e pronta |
| Role pública | `form_user` — apenas INSERT (candidaturas) |
| Role admin | `neondb_owner` — acesso total |
| Formulários | ✅ Ligados ao Neon via `neon.js` |
| Painel admin | ✅ Ligado ao Neon com login por password |

---

## Ficheiros do sistema

| Ficheiro | O que faz |
|---|---|
| `neon.js` | Configuração da ligação ao Neon (credenciais do formulário + função `neonQuery`) |
| `candidatura-soldador.html` | Formulário de candidatura para soldador |
| `candidatura-serralheiro.html` | Formulário de candidatura para serralheiro |
| `candidatura-pintor.html` | Formulário de candidatura para pintor industrial |
| `candidatura-geral.html` | Formulário de candidatura geral |
| `admin.html` | Painel de gestão (login + lista + detalhe de candidatos) |
| `forms.css` | Estilos dos formulários |

---

## Credenciais

> **As credenciais NÃO ficam neste ficheiro — nem em nenhum ficheiro do repositório.**
> Vivem apenas nas **variáveis de ambiente encriptadas da Cloudflare** (`NEON_OWNER_CONN`,
> `NEON_FORM_CONN`, `SESSION_SECRET`, `ADMIN_PASSWORD_HASH`, `AI_API_KEY`…). Ver
> `SETUP-CLOUDFLARE.md` e `DEPLOY-AGENTE.md`.
>
> ⚠️ **Histórico:** versões anteriores deste ficheiro continham as passwords em texto e o
> repositório foi público. Essas passwords têm de ser tratadas como **comprometidas** e
> **rotacionadas no Neon** (`neondb_owner` + `form_user`), a par do `SESSION_SECRET` e do
> `ADMIN_PASSWORD_HASH`.

- **Role pública** `form_user` — apenas INSERT em `candidatos` (baixo privilégio) → `NEON_FORM_CONN`.
- **Role admin** `neondb_owner` — acesso total → `NEON_OWNER_CONN` (só no servidor, nunca no browser).

---

## Como usar o painel de administração

1. Abrir `admin.html` (em `https://maelo.pt/admin.html`)
2. Entrar com o **email autorizado** (`ADMIN_EMAIL`) e a **password de admin** — definida no
   arranque via `ADMIN_PASSWORD_HASH` e alterável no próprio painel. **Não** é a password da base de dados.
3. Clicar em **Entrar**

A sessão dura ~8h (cookie HttpOnly). O login e as queries passam pelos endpoints `/api/*`; o browser nunca fala diretamente com o Neon.

---

## O que o painel permite

- Ver todas as candidaturas numa lista com filtros
- Filtrar por profissão (soldador, serralheiro, pintor, geral)
- Filtrar por estado (pendente, aprovado, rejeitado, em espera)
- Pesquisar por nome ou telefone
- Clicar numa candidatura para ver todos os detalhes
- Mudar o estado da candidatura (aprovado/rejeitado/em espera)
- Escrever notas internas sobre o candidato
- Abrir o WhatsApp diretamente com o candidato
- Marcar quando foi contactado
- **Os dados nunca são apagados** — mesmo rejeitados ficam no histórico

---

## Estrutura da tabela `candidatos`

```sql
id              uuid (gerado automaticamente)
criado_em       timestamptz (data de envio)
atualizado_em   timestamptz (atualizado automaticamente)
profissao       text (soldador | serralheiro | pintor | geral)
nome            text
telefone        text
email           text (pode ser nulo)
regiao          text
experiencia     text
disponibilidade boolean
processos       text (soldador: processos; geral: função)
certificacoes   text (soldador)
tipo_trabalhos  text (serralheiro)
le_medidas      boolean (serralheiro)
tipo_pintura    text (pintor)
equipamentos    text (pintor)
mensagem        text
estado          text (pendente | aprovado | rejeitado | em_espera)
notas_internas  text
contactado_em   timestamptz
```

---

## Quando o site for para produção

O `neon.js` já usa a ligação ao Neon via HTTPS — funciona em qualquer servidor sem alterações adicionais. Não é necessária nenhuma configuração extra para o domínio `maelo.pt`.

---

## Acesso ao painel Neon (gestão avançada)

Para ver os dados diretamente ou fazer operações avançadas:

1. Ir a **https://console.neon.tech**
2. Fazer login
3. Abrir o projeto `super-wave-06190921`
4. Ir a **Tables** para ver os dados
5. Ir a **SQL Editor** para correr queries manuais
