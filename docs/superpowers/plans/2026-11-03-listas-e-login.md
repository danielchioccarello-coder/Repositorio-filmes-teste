# Listas "Quero assistir" / "Já assisti" com Login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login por e-mail/senha com Supabase e duas listas pessoais de filmes, navegáveis por abas na página inicial.

**Architecture:** O navegador fala direto com o Supabase (Auth + tabela `marcacoes` protegida por RLS). A lógica fica em módulos que recebem o cliente Supabase por parâmetro (`conta.js`, `marcacoes.js`) e são testados em Node com um cliente falso; `supabase.js` é o único que carrega a biblioteca pela CDN. `main.js` liga sessão, abas, botões e selos ao catálogo existente.

**Tech Stack:** HTML/CSS/JS puros com módulos ES, `@supabase/supabase-js@2.45.4` via `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm`, testes com `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-03-listas-e-login-design.md`

## Global Constraints

- Sem servidor próprio e sem dependência npm de produção; a biblioteca Supabase só é importada (dinamicamente) dentro de `js/supabase.js`.
- Nenhum módulo testado em Node pode importar a URL da CDN nem tocar em `document` ao carregar.
- Status gravados: exatamente `"quero"` e `"assisti"`. Abas: `"catalogo"`, `"quero"`, `"assisti"`.
- Rótulos fixos: abas **Catálogo · Quero assistir · Já assisti**; botões **"🔖 Quero assistir"** e **"✓ Já assisti"**; selos **🔖** / **✓** com textos acessíveis "Na sua lista Quero assistir" / "Você já assistiu".
- Todas as mensagens de erro são as da tabela da seção 6 da spec, copiadas literalmente.
- Texto vindo do usuário ou do TMDB entra sempre por `textContent` (padrão `el()` de `ui.js`), nunca como HTML.
- Sem `SUPABASE_URL`/`SUPABASE_ANON_KEY`, o catálogo se comporta exatamente como hoje.
- Comentários e nomes no estilo atual: português, curtos, explicando o porquê.

## Review Focus

1. **Daniel esquece de desligar "Confirm email"** → `signUp` volta com usuário mas sem sessão; a pessoa precisa ver uma explicação, não ficar "sem logar" em silêncio (teste na Tarefa 2).
2. **E-mail digitado com espaços ou maiúsculas** (" Daniel@Gmail.com ") → deve funcionar igual ao e-mail limpo (teste na Tarefa 2).
3. **Filme sem pôster, sem data ou sem nota** marcado → grava `null` e o cartão da aba mostra o placeholder, sem quebrar (teste na Tarefa 3).
4. **Trocar de conta rápido** (sair de A e entrar com B enquanto as marcações de A ainda carregam) → a resposta atrasada de A é descartada; B nunca vê dados de A (contador na Tarefa 5, roteiro manual na Tarefa 6).
5. **Clique duplo no botão de marcar** → enquanto salva, os botões ficam desabilitados e o segundo clique é ignorado; o resultado final é o de um único clique (teste de `proximoStatus` na Tarefa 3 + verificação na Tarefa 5).

---

### Task 1: Configuração do Supabase (SQL, config e conexão)

**Files:**
- Create: `supabase/schema.sql`, `js/supabase.js`, `tests/supabase.test.js`
- Modify: `js/config.example.js`, `README.md`

**Interfaces:**
- Produces: `lerConfigSupabase(config: object) -> { url: string, chave: string } | null`; `async criarCliente() -> SupabaseClient | null` (null se o config não tiver as duas chaves ou se a CDN falhar).

- [ ] **Step 1: Write the failing test** (`tests/supabase.test.js`)

```js
test("lerConfigSupabase devolve null sem endereço ou chave", () => {
  assert.equal(lerConfigSupabase({}), null);
  assert.equal(lerConfigSupabase({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "" }), null);
  assert.equal(lerConfigSupabase({ SUPABASE_URL: "  ", SUPABASE_ANON_KEY: "abc" }), null);
});

test("lerConfigSupabase devolve endereço e chave sem espaços", () => {
  assert.deepEqual(
    lerConfigSupabase({ SUPABASE_URL: " https://x.supabase.co ", SUPABASE_ANON_KEY: " abc " }),
    { url: "https://x.supabase.co", chave: "abc" },
  );
});
```

- [ ] **Step 2: Run** `npm test` — Expected: FAIL (`js/supabase.js` não existe).

- [ ] **Step 3: Implement `js/supabase.js`**

`lerConfigSupabase` é pura. `criarCliente` faz `import("./config.js")` (em try/catch, como `loadToken` em `main.js`), chama `lerConfigSupabase`, e só então `import()` da URL da CDN do Tech Stack e `createClient(url, chave)`. Qualquer falha → `console.error` + `null`.

- [ ] **Step 4: Write `supabase/schema.sql`** (exato)

```sql
-- Cole este arquivo no SQL Editor do Supabase e clique em Run.
create table public.marcacoes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  movie_id integer not null,
  status text not null check (status in ('quero', 'assisti')),
  title text not null,
  poster_path text,
  release_date text,
  vote_average real,
  vote_count integer,
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

-- Cada pessoa só vê e mexe nas próprias marcações
alter table public.marcacoes enable row level security;
create policy "ler as próprias" on public.marcacoes for select using (auth.uid() = user_id);
create policy "criar as próprias" on public.marcacoes for insert with check (auth.uid() = user_id);
create policy "alterar as próprias" on public.marcacoes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apagar as próprias" on public.marcacoes for delete using (auth.uid() = user_id);
```

- [ ] **Step 5: Update `js/config.example.js` and `README.md`**

`config.example.js` ganha `export const SUPABASE_URL = "";` e `export const SUPABASE_ANON_KEY = "";` com comentário apontando para **Project Settings → API**. No README, nova seção "Login e listas (Supabase)" com os 4 passos e o aviso de pausa da seção 8 da spec.

- [ ] **Step 6: Run** `npm test` — Expected: todos passam (53 antigos + 2 novos).

- [ ] **Step 7: Commit** — `feat: configuração do Supabase (tabela, segurança e conexão)`

---

### Task 2: Conta (entrar, criar conta, sair)

**Files:**
- Create: `js/conta.js`, `tests/conta.test.js`

**Interfaces:**
- Consumes: um cliente com a forma de `client.auth` do supabase-js v2.
- Produces:
  - `traduzirErroConta(error) -> string`
  - `async entrar(client, email, senha) -> User` — lança `Error` cuja `message` já é o texto em português
  - `async criarConta(client, email, senha) -> User` — idem
  - `async sair(client) -> void`
  - `aoMudarSessao(client, callback: (user | null) => void) -> void` — usa `client.auth.onAuthStateChange((evento, sessao) => callback(sessao?.user ?? null))`

Tradução por `error.code` (supabase-js v2), com o texto como reserva:

| `error.code` / condição | mensagem |
|---|---|
| `invalid_credentials` | E-mail ou senha incorretos. |
| `user_already_exists`, `email_exists` | Esse e-mail já tem conta. Que tal entrar? |
| `weak_password` | A senha precisa ter pelo menos 6 caracteres. |
| `email_address_invalid`, `validation_failed` | Digite um e-mail válido. |
| `error.name === "AuthRetryableFetchError"` ou `status === 0` ou mensagem contém "fetch" | Não deu para conectar. Verifique a internet e tente de novo. |
| qualquer outro | Algo deu errado. Tente de novo. |
| `signUp` sem erro mas `data.session === null` | Conta criada, mas o Supabase está pedindo confirmação por e-mail. Desligue "Confirm email" no painel do Supabase. |

- [ ] **Step 1: Write the failing tests** (`tests/conta.test.js`)

Cliente falso: objeto `auth` cujos métodos `signInWithPassword`, `signUp`, `signOut` gravam os argumentos recebidos e devolvem um `{ data, error }` configurável.

- `traduzirErroConta` devolve cada mensagem da tabela para cada código listado, para `{ name: "AuthRetryableFetchError" }`, e "Algo deu errado. Tente de novo." para `{ code: "xyz" }`.
- `entrar` com sucesso devolve `data.user`.
- `entrar(client, " Daniel@Gmail.com ", "123456")` envia `{ email: "daniel@gmail.com", password: "123456" }`.
- `entrar` com `{ code: "invalid_credentials" }` rejeita com mensagem "E-mail ou senha incorretos." (`assert.rejects`).
- `criarConta` com sessão devolve o usuário; sem sessão rejeita com a mensagem de "Confirm email".
- `criarConta` com `{ code: "user_already_exists" }` rejeita com "Esse e-mail já tem conta. Que tal entrar?".
- `aoMudarSessao` chama o callback com `user` quando o fake dispara `("SIGNED_IN", { user })` e com `null` quando dispara `("SIGNED_OUT", null)`.

- [ ] **Step 2: Run** `npm test` — Expected: FAIL (`js/conta.js` não existe).

- [ ] **Step 3: Implement `js/conta.js`** com as assinaturas acima. O e-mail passa por `trim().toLowerCase()`; a senha não é alterada.

- [ ] **Step 4: Run** `npm test` — Expected: PASS.

- [ ] **Step 5: Commit** — `feat: entrar, criar conta e sair com Supabase`

---

### Task 3: Marcações (salvar e montar as listas)

**Files:**
- Create: `js/marcacoes.js`, `tests/marcacoes.test.js`

**Interfaces:**
- Consumes: cliente supabase-js v2 (`client.from("marcacoes")`).
- Produces (tipo `Marcacao` = linha da tabela da Tarefa 1):
  - `dadosDoFilme(raw) -> { movie_id, title, poster_path, release_date, vote_average, vote_count }` — `raw` é a resposta crua de `api.getMovieDetails`; campos ausentes viram `null`
  - `proximoStatus(atual: "quero"|"assisti"|null, clicado: "quero"|"assisti") -> "quero"|"assisti"|null` — clicar no já marcado devolve `null` (desmarcar)
  - `statusDoFilme(lista: Marcacao[], movieId: number) -> "quero"|"assisti"|null`
  - `aplicarMarcacao(lista, marcacao) -> Marcacao[]` — substitui a do mesmo `movie_id` ou acrescenta; nova lista
  - `removerMarcacao(lista, movieId) -> Marcacao[]` — nova lista
  - `filmesDaAba(lista, status) -> Movie[]` — só daquele status, `updated_at` decrescente, no formato que `renderMovies` usa: `{ id, title, poster_path, release_date, vote_average, vote_count }`
  - `async carregarMarcacoes(client) -> Marcacao[]` — `select("*")`; lança `Error("Não deu para carregar suas listas.")` se `error`
  - `async marcar(client, userId, raw, status) -> Marcacao` — `upsert({ user_id: userId, ...dadosDoFilme(raw), status, updated_at: new Date().toISOString() }, { onConflict: "user_id,movie_id" }).select().single()`
  - `async desmarcar(client, userId, movieId) -> void` — `delete().eq("user_id", userId).eq("movie_id", movieId)`
  - `marcar` e `desmarcar` lançam `Error("Não deu para salvar, tente de novo.")` se `error`

- [ ] **Step 1: Write the failing tests** (`tests/marcacoes.test.js`)

Cliente falso: `from(nome)` devolve um objeto encadeável que grava cada método chamado com seus argumentos (`upsert`, `select`, `single`, `delete`, `eq`) e, ao ser aguardado (`then`), resolve para um `{ data, error }` configurável.

- `dadosDoFilme` de um filme sem `poster_path`, `release_date`, `vote_average` e `vote_count` devolve esses quatro como `null` e mantém `movie_id` e `title`.
- `proximoStatus(null, "quero") === "quero"`, `proximoStatus("quero", "quero") === null`, `proximoStatus("quero", "assisti") === "assisti"`.
- `statusDoFilme` devolve o status de um filme marcado e `null` para um não marcado.
- `aplicarMarcacao` sobre uma lista que já tem o filme 550 como `"quero"`, com a marcação 550 `"assisti"`, deixa **uma** linha para 550, com status `"assisti"`.
- `removerMarcacao` tira só o filme pedido e não altera a lista original.
- `filmesDaAba(lista, "quero")` traz só os `"quero"`, do `updated_at` mais novo para o mais velho, com `id` igual ao `movie_id`.
- `marcar` chama `upsert` com `user_id`, `movie_id`, `status` e `{ onConflict: "user_id,movie_id" }`, e devolve `data`.
- `marcar` com `error` rejeita com "Não deu para salvar, tente de novo.".
- `desmarcar` chama `eq("user_id", "u1")` e `eq("movie_id", 550)`.
- `carregarMarcacoes` com `error` rejeita com "Não deu para carregar suas listas.".

- [ ] **Step 2: Run** `npm test` — Expected: FAIL (`js/marcacoes.js` não existe).

- [ ] **Step 3: Implement `js/marcacoes.js`** com as assinaturas acima.

- [ ] **Step 4: Run** `npm test` — Expected: PASS.

- [ ] **Step 5: Commit** — `feat: marcar, trocar e desmarcar filmes nas listas`

---

### Task 4: Interface das contas, abas, botões e selos

**Files:**
- Create: `js/ui-conta.js`, `tests/ui-conta.test.js`
- Modify: `js/ui.js`, `index.html`, `css/styles.css`, `tests/ui-messages.test.js`

**Interfaces:**
- Consumes: `statusDoFilme` (Tarefa 3) só via o `statusDe` que `main.js` passará.
- Produces em `ui.js`:
  - `seloDoStatus(status) -> { icone: "🔖", texto: "Na sua lista Quero assistir" } | { icone: "✓", texto: "Você já assistiu" } | null`
  - `renderMovies(grid, movies, { append, statusDe = () => null })` — cartão com status ganha `<span class="card-selo" aria-label=texto>` com o ícone no canto do pôster
  - `openDetails` passa a incluir um `<div class="details-marcar">` vazio logo após `details-meta`
  - Novos tipos em `MESSAGES` (usados com `renderMessage`):

    | kind | text | action |
    |---|---|---|
    | `entre_para_ver` | Entre para ver suas listas | `{ label: "Entrar", kind: "entrar" }` |
    | `vazia_quero` | Você ainda não marcou nenhum filme para assistir. | `null` |
    | `vazia_assisti` | Você ainda não marcou nenhum filme como assistido. | `null` |
    | `falha_listas` | Não deu para carregar suas listas. | `{ label: "Tentar de novo", kind: "tentar_listas" }` |

- Produces em `ui-conta.js`:
  - `textosLogin(modo: "entrar"|"criar") -> { titulo, botao, enviando, troca }` — entrar: `"Entrar"`, `"Entrar"`, `"Entrando…"`, `"Não tem conta? Criar conta"`; criar: `"Criar conta"`, `"Criar conta"`, `"Criando conta…"`, `"Já tem conta? Entrar"`
  - `renderConta(container, user | null)` — sem user: botão `data-conta="entrar"` "Entrar"; com user: `<span class="conta-email">` + botão `data-conta="sair"` "Sair"
  - `renderAbas(container, aba)` — três botões `role="tab"`, `data-aba` = `catalogo|quero|assisti`, `aria-selected` no ativo
  - `abrirLogin(dialog, modo: "entrar"|"criar"|"nao_configurado")` — aplica `textosLogin`, limpa erro e campos de senha, `showModal()`; em `nao_configurado` esconde o formulário e mostra "Login ainda não configurado. Preencha SUPABASE_URL e SUPABASE_ANON_KEY em js/config.js."
  - `setLoginEnviando(dialog, enviando: boolean)`, `mostrarErroLogin(dialog, texto | "")`, `fecharLogin(dialog)`
  - `renderBotoesMarcar(container, status, { salvando = false, erro = "" })` — dois botões `data-marcar="quero"` / `data-marcar="assisti"` com os rótulos fixos, `aria-pressed` conforme `status`, `disabled` quando `salvando`, e `<p class="marcar-erro" role="alert">` com `erro` quando houver

- [ ] **Step 1: Write the failing tests**

`tests/ui-conta.test.js`: `textosLogin("entrar")` e `textosLogin("criar")` devolvem exatamente os objetos acima. `tests/ui-messages.test.js`: `messageFor` dos quatro tipos novos devolve `{ text, action, link: null }` da tabela; `seloDoStatus` dos três casos.

- [ ] **Step 2: Run** `npm test` — Expected: FAIL.

- [ ] **Step 3: Implement** `ui-conta.js` (importa `el` — exporte `el` de `ui.js`) e as mudanças em `ui.js`.

- [ ] **Step 4: Update `index.html`**

- No `<header>`: `<div id="conta" class="conta"></div>` à direita do logo.
- No início de `<main>`, antes dos filtros: `<nav id="abas" class="abas" aria-label="Listas" role="tablist"></nav>`.
- `<section class="filters">` ganha `id="filters"`; os dois `<label class="sort-wrap">` vão para dentro de `<div id="row-controls" class="row-controls">`.
- Novo `<dialog id="login" class="login" aria-label="Entrar">` com `<button class="details-close">✕</button>`, `<h2 class="login-titulo">`, `<p class="login-aviso" hidden>`, e `<form class="login-form">` com `<input type="email" name="email" autocomplete="email" required>`, `<input type="password" name="senha" autocomplete="current-password" minlength="6" required>`, `<p class="login-erro" role="alert">`, `<button type="submit" class="btn btn-primary login-enviar">` e `<button type="button" class="link-button login-troca">`.

- [ ] **Step 5: Style in `css/styles.css`** no visual atual (tokens, fonte Archivo, vidro dos filtros): abas como pílulas com a ativa em destaque, botão de conta no cabeçalho, janela de login centralizada no estilo de `.details`, botões de marcar com estado `[aria-pressed="true"]`, selo redondo no canto superior direito do pôster. Funciona em 390px de largura.

- [ ] **Step 6: Run** `npm test` — Expected: PASS.

- [ ] **Step 7: Commit** — `feat: abas, janela de login, botões de marcar e selos`

---

### Task 5: Ligar tudo no `main.js`

**Files:**
- Modify: `js/state.js`, `js/main.js`, `tests/state.test.js`

**Interfaces:**
- Consumes: tudo das Tarefas 1–4.
- Produces: `createState()` ganha `aba: "catalogo"`; `setAba(state, aba) -> state` muda só `aba` (não recomeça a busca nem mexe nos filtros).

- [ ] **Step 1: Write the failing test** (`tests/state.test.js`)

```js
test("setAba troca a aba sem perder filtros nem filmes", () => {
  const s = { ...createState(), selectedGenres: [28], page: 3, movies: [{ id: 1 }] };
  const next = setAba(s, "quero");
  assert.equal(next.aba, "quero");
  assert.deepEqual(next.selectedGenres, [28]);
  assert.equal(next.page, 3);
  assert.deepEqual(next.movies, [{ id: 1 }]);
  assert.equal(createState().aba, "catalogo");
});
```

- [ ] **Step 2: Run** `npm test` — Expected: FAIL.

- [ ] **Step 3: Implement `setAba` in `js/state.js`.** Run `npm test` — Expected: PASS.

- [ ] **Step 4: Wire `js/main.js`**

Variáveis novas: `client` (de `await criarCliente()`), `user`, `marcacoes` (array), `listasStatus` (`"ok" | "carregando" | "falha"`), `filmeAberto` (raw da janela de detalhes), `salvando`, e `listasCounter = createRequestCounter()`.

- **Sessão:** se `client`, `aoMudarSessao(client, ...)`: guarda `user`, desenha `renderConta`, zera `marcacoes`; com user, carrega `carregarMarcacoes` numerado pelo `listasCounter` (resposta que não for a última é descartada — Review Focus 4); depois `desenharAba()`. Sem `client`, `renderConta(null)`.
- **`desenharAba()`:** `renderAbas`; no `catalogo` mostra `#filters`, `#row-controls`, contagem e "Carregar mais" (conforme `hasMore`), título de `ROW_TITLES` e `renderMovies(state.movies, { append: false, statusDe })`, onde `statusDe = (id) => statusDoFilme(marcacoes, id)`. Em `quero`/`assisti` esconde esses quatro, título "Quero assistir"/"Já assisti", e mostra, nesta ordem: `entre_para_ver` sem user; "Carregando..." (`renderSkeleton`) enquanto carrega; `falha_listas`; `vazia_quero`/`vazia_assisti`; ou `renderMovies(filmesDaAba(marcacoes, aba), …)`.
- **`loadMovies`** passa `statusDe` para `renderMovies` e só desenha a grade se `state.aba === "catalogo"` (uma busca do catálogo não pode sobrescrever uma aba de lista).
- **Abas:** clique em `[data-aba]` → `state = setAba(state, aba)` → `desenharAba()`.
- **Conta:** `data-conta="entrar"` → `abrirLogin(login, client ? "entrar" : "nao_configurado")`; `data-conta="sair"` → `sair(client)`.
- **Login:** submit → `setLoginEnviando(true)`, `entrar` ou `criarConta` conforme o modo atual; sucesso → `fecharLogin` (a janela de detalhes, se aberta, continua aberta e tem os botões redesenhados com o status); erro → `mostrarErroLogin(error.message)`; sempre `setLoginEnviando(false)`. `.login-troca` alterna o modo; ✕ e clique no fundo fecham, como em `#details`.
- **Mensagens:** em `els.message`, `data-action="entrar"` abre o login e `"tentar_listas"` recarrega as marcações.
- **Detalhes:** `showMovie` guarda o raw em `filmeAberto` e, após `openDetails`, chama `renderBotoesMarcar(details.querySelector(".details-marcar"), statusDoFilme(marcacoes, id))`.
- **Marcar:** clique em `[data-marcar]` dentro de `#details`: se `salvando`, ignora (Review Focus 5); sem user → abre login; senão `novo = proximoStatus(atual, clicado)`, redesenha com `salvando: true`, chama `marcar` ou `desmarcar`, atualiza `marcacoes` com `aplicarMarcacao`/`removerMarcacao`, redesenha os botões; em erro mantém `marcacoes` e redesenha com o status antigo e `erro: error.message`.
- **Fechar detalhes:** no evento `close` de `#details`, `desenharAba()` (atualiza selos e a lista da aba).

- [ ] **Step 5: Run** `npm test` — Expected: todos passam.

- [ ] **Step 6: Verify in the browser without Supabase** (Chrome headless ou Live Server; `js/config.js` só com o token do TMDB)

Expected: catálogo igual a antes (banner, filtros, carregar mais); abas visíveis; "Quero assistir" mostra "Entre para ver suas listas"; "Entrar" abre "Login ainda não configurado…"; botões de marcar na janela de detalhes abrem esse mesmo aviso; nenhum erro no console além do aviso de config; layout ok em 390px.

- [ ] **Step 7: Commit** — `feat: login e listas ligados ao catálogo`

---

### Task 6: Teste de verdade com o Supabase do Daniel

Depende de Daniel ter feito os passos da seção 8 da spec e preenchido `js/config.js`.

- [ ] **Step 1:** Conferir em **Authentication → Sign In / Providers → Email** que "Confirm email" está desligado.
- [ ] **Step 2:** Rodar o roteiro manual da seção 7 da spec (itens 1–6).
- [ ] **Step 3:** Review Focus 4: com a conta A logada, sair e entrar com B logo em seguida; B vê só as próprias listas.
- [ ] **Step 4:** Review Focus 5: clique duplo rápido em "✓ Já assisti"; o filme termina marcado (não desmarcado).
- [ ] **Step 5:** No painel do Supabase (**Table Editor → marcacoes**), conferir uma linha por filme marcado, com `user_id` da conta certa.
- [ ] **Step 6:** Corrigir o que falhar (com teste, se for lógica) e commitar — `fix: ajustes do teste com Supabase real`.
