# Integração dos formulários de candidatura

O website institucional aponta para as rotas públicas do agente de candidaturas no subdomínio:

- `https://candidaturas.maelo.pt/apply/soldador`
- `https://candidaturas.maelo.pt/apply/serralheiro`
- `https://candidaturas.maelo.pt/apply/pintor`
- `https://candidaturas.maelo.pt/apply/generic`

Essas rotas pertencem ao projeto:

```text
C:\Users\mateu\Desktop\Projetos\ma-elo-profissional\ma-elo-recruitment-agent
```

## Modelo recomendado

Manter duas camadas separadas:

1. Site institucional estático
   - Home
   - Empresa
   - Serviços
   - Para Empresas
   - Profissões
   - Candidatos
   - Regiões
   - FAQ
   - Contacto
   - Privacidade

2. Agente operacional de candidaturas
   - WhatsApp
   - Formulários por função
   - API `/forms`
   - API `/forms/submissions`
   - Supabase

## Por que usar subdomínio

O agente atualmente serve assets como `/styles.css` e `/app.js`. Se o agente for montado em `maelo.pt/apply/*`, esses caminhos entram em conflito com os assets do site institucional. O subdomínio evita esse conflito e deixa a arquitetura mais clara:

```text
maelo.pt                 -> presença institucional
candidaturas.maelo.pt    -> fluxo operacional de candidatura
```

## Observação de conteúdo

O site não promete contratação, salário, horário, contrato ou alojamento. O formulário organiza dados para análise humana da equipa M&A Elo.

## Checklist técnico

- Validar `GET /apply/soldador`, `/apply/serralheiro`, `/apply/pintor` e `/apply/generic`.
- Validar `GET /forms` e `GET /forms/:roleKey`.
- Validar `POST /forms/submissions`.
- Corrigir políticas Supabase antes de produção.
- Adicionar limite de payload e validação de ficheiros no backend.
