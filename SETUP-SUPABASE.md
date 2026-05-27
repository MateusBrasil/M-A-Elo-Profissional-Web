# Configuração do Supabase — M&A Elo Profissional

Guia passo a passo para ativar o sistema de candidaturas e o painel de gestão.

---

## 1. Criar conta e projeto no Supabase

1. Vai a **https://supabase.com** e cria uma conta gratuita (podes usar a conta Google)
2. Clica em **"New project"**
3. Escolhe um nome (ex: `maelo-candidaturas`)
4. Define uma password forte para a base de dados — guarda-a em lugar seguro
5. Escolhe a região **Europe (Frankfurt)** — mais próxima de Portugal
6. Aguarda ~2 minutos até o projeto ficar pronto

---

## 2. Criar a tabela de candidatos

1. No painel do Supabase, clica em **"SQL Editor"** (ícone de base de dados no menu lateral)
2. Clica em **"New query"**
3. Cola todo o código SQL abaixo e clica em **"Run"** (ou Ctrl+Enter)

```sql
-- Tabela principal de candidatos
create table candidatos (
  id uuid default gen_random_uuid() primary key,
  criado_em timestamptz default now() not null,
  profissao text not null,
  nome text not null,
  telefone text not null,
  email text,
  regiao text,
  experiencia text,
  disponibilidade boolean default false,
  processos text,
  certificacoes text,
  tipo_trabalhos text,
  le_medidas boolean,
  tipo_pintura text,
  equipamentos text,
  mensagem text,
  estado text default 'pendente' not null,
  notas_internas text,
  contactado_em timestamptz,
  atualizado_em timestamptz default now() not null
);

-- Ativar segurança por linha (RLS)
alter table candidatos enable row level security;

-- Qualquer pessoa pode enviar candidatura (formulários públicos)
create policy "insert_publico" on candidatos
  for insert to anon with check (true);

-- Apenas utilizadores com sessão (admin) podem ver os dados
create policy "select_admin" on candidatos
  for select to authenticated using (true);

-- Apenas admin pode atualizar (mudar estado, notas, etc.)
create policy "update_admin" on candidatos
  for update to authenticated using (true);

-- Função para atualizar automaticamente o campo atualizado_em
create or replace function handle_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger set_atualizado_em
  before update on candidatos
  for each row execute function handle_atualizado_em();
```

---

## 3. Obter as credenciais do projeto

1. No painel do Supabase, clica em **"Project Settings"** (ícone de engrenagem)
2. Clica em **"API"**
3. Copia:
   - **Project URL** — começa com `https://`
   - **anon public** key — começa com `eyJ`

4. Abre o ficheiro **`supabase.js`** na pasta do site e substitui os valores:

```javascript
const SUPABASE_URL = "https://SEU-PROJECT-ID.supabase.co";   // ← colar aqui
const SUPABASE_ANON_KEY = "SUA-ANON-KEY-AQUI";               // ← colar aqui
```

---

## 4. Criar o utilizador administrador

1. No painel do Supabase, clica em **"Authentication"**
2. Clica em **"Users"**
3. Clica em **"Add user"** → **"Create new user"**
4. Preenche:
   - Email: o email do dono/staff (ex: `admin@maelo.pt`)
   - Password: uma password segura
5. Clica em **"Create user"**

Podes criar quantos utilizadores quiseres (um por cada pessoa da equipa).

---

## 5. Testar o sistema

### Testar o formulário:
1. Abre o `candidatura-soldador.html` no browser
2. Preenche o formulário e clica em "Enviar candidatura"
3. Deve aparecer a mensagem de sucesso

### Verificar no Supabase:
1. Vai a **"Table Editor"** → **"candidatos"**
2. Deve aparecer a candidatura que acabaste de enviar

### Testar o painel de administração:
1. Abre o `admin.html` no browser
2. Faz login com o email e password que criaste no passo 4
3. Deve aparecer a lista de candidaturas

---

## 6. Colocar online (quando o site for para produção)

Quando o site estiver publicado em `maelo.pt`:

1. No Supabase, vai a **"Authentication"** → **"URL Configuration"**
2. Em **"Site URL"**, coloca `https://maelo.pt`
3. Em **"Redirect URLs"**, adiciona `https://maelo.pt/admin.html`

---

## Resumo dos ficheiros criados

| Ficheiro | O que faz |
|---|---|
| `supabase.js` | Credenciais de ligação ao Supabase |
| `candidatura-soldador.html` | Formulário de candidatura para soldador |
| `candidatura-serralheiro.html` | Formulário de candidatura para serralheiro |
| `candidatura-pintor.html` | Formulário de candidatura para pintor industrial |
| `candidatura-geral.html` | Formulário de candidatura geral |
| `admin.html` | Painel de gestão (login + lista + detalhe de candidatos) |
| `forms.css` | Estilos dos formulários |

---

## O que o painel de administração permite fazer

- Ver todas as candidaturas numa lista com filtros
- Filtrar por profissão (soldador, serralheiro, pintor, geral)
- Filtrar por estado (pendente, aprovado, rejeitado, em espera)
- Pesquisar por nome ou telefone
- Clicar numa candidatura para ver todos os detalhes
- Mudar o estado da candidatura (aprovado/rejeitado/em espera)
- Escrever notas internas sobre o candidato
- Abrir o WhatsApp diretamente com o candidato (botão no painel)
- Marcar quando foi contactado
- **Os dados nunca são apagados** — mesmo rejeitados ficam no histórico
