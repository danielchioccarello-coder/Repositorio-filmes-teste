# Publicação na Vercel — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** publicar o catálogo na Vercel, aberto ao público, com a chave do TMDB escondida num intermediário (`/api/tmdb`).

**Arquitetura:** uma função da Vercel (`api/tmdb.js`) repassa ao TMDB apenas 4 caminhos e uma lista fixa de parâmetros, acrescentando o token da variável `TMDB_TOKEN`. O `js/api.js` usa o TMDB direto quando há token local e o intermediário quando não há. As chaves públicas do Supabase passam para `js/config.publico.js`, versionado.

**Tecnologia:** JavaScript ES modules, funções da Vercel no formato Web (`export async function GET(request)` → `Response`), Node 18+ (`node --test`, `Request`/`Response`/`fetch` nativos), git + GitHub, Vercel, Supabase.

**Spec:** `docs/superpowers/specs/2026-11-06-publicacao-vercel-design.md`

## Restrições globais

- Sem dependências novas; `package.json` continua só com `"type": "module"` e `"test": "node --test"`.
- O token do TMDB nunca é escrito em arquivo versionado, em log, nem impresso na saída de comandos.
- Respostas de erro do intermediário: corpo JSON exato `{ "erro": "caminho_nao_permitido" }` (400) ou `{ "erro": "falha" }` (502); 405 sem corpo obrigatório.
- Caminhos permitidos: `^/discover/movie$`, `^/genre/movie/list$`, `^/watch/providers/movie$`, `^/movie/\d+$`.
- Parâmetros repassados: `language`, `watch_region`, `with_watch_monetization_types`, `with_watch_providers`, `with_genres`, `sort_by`, `page`, `vote_count.gte`, `vote_average.gte`, `append_to_response`, `include_video_language`.
- Cache: gêneros e serviços `public, s-maxage=86400, stale-while-revalidate=86400`; filmes e detalhes `public, s-maxage=3600, stale-while-revalidate=86400`; erros `no-store`.
- Textos de interface em português; mensagens ao visitante nunca citam chave nem `js/config.js` no site publicado.
- Os 93 testes existentes continuam passando (exceto o que a spec manda substituir).

## Foco de revisão

1. **`caminho` com truques** (`/movie/550/../../account`, `/movie/550?api_key=x`, ausente) → 400 sem chamar o TMDB. Testes na Task 1.
2. **Parâmetro repetido** (`page=1&page=2`) → repassa só o primeiro valor, sem erro. Teste na Task 1.
3. **`js/config.js` servido no site publicado** → como está fora do git, `<endereço>/js/config.js` dá 404. Conferência na Task 4.
4. **Chave anon pública sem RLS** → `supabase/schema.sql` precisa ativar RLS nas tabelas de listas antes de publicar. Conferência na Task 3.
5. **Vercel não reconhecer a função** (formato Web + `"type": "module"`, projeto sem framework) → `/api/tmdb?caminho=/genre/movie/list` responde 200 com gêneros no site publicado. Conferência na Task 4.

---

### Task 1: Intermediário da Vercel

**Arquivos:**
- Criar: `api/_proxy.js`, `api/tmdb.js`
- Teste: `tests/proxy.test.js`

**Interfaces:**
- Produz: `criarHandler({ token: string | undefined, fetchFn: typeof fetch }) -> (request: Request) => Promise<Response>` em `api/_proxy.js`; `api/tmdb.js` exporta `GET(request)` que chama `criarHandler({ token: process.env.TMDB_TOKEN, fetchFn: fetch })(request)`.

- [ ] **Step 1: Escrever os testes que falham** em `tests/proxy.test.js`. Use `new Request("https://site.test/api/tmdb?caminho=...")` e um `fetchFn` falso que registra a URL/cabeçalhos e devolve `new Response(JSON.stringify(body), { status })`.
  - `cada caminho permitido vai para o TMDB`: para `/discover/movie`, `/genre/movie/list`, `/watch/providers/movie`, `/movie/550` → URL chamada começa com `https://api.themoviedb.org/3<caminho>`, resposta 200 com o mesmo JSON.
  - `caminho não permitido dá 400 sem chamar o TMDB`: `/account`, `/movie/abc`, `/movie/550/../../account`, caminho ausente → status 400, corpo `{ erro: "caminho_nao_permitido" }`, `fetchFn` não chamado.
  - `parâmetros desconhecidos são descartados`: `&page=2&api_key=x&foo=1` → URL do TMDB tem `page=2`, não tem `api_key` nem `foo`, nem `caminho`.
  - `parâmetro repetido usa o primeiro valor`: `&page=1&page=2` → `page=1`.
  - `só GET`: `new Request(url, { method: "POST" })` → 405, `fetchFn` não chamado.
  - `token aparado no cabeçalho`: token `"  abc \n"` → `Authorization: "Bearer abc"`.
  - `token vazio dá 502 sem chamar o TMDB`: token `""` e `undefined` → 502, `{ erro: "falha" }`.
  - `erros do TMDB viram 502`: TMDB 401 e 500 → 502, `{ erro: "falha" }`, `Cache-Control: no-store`.
  - `falha de rede vira 502`: `fetchFn` lança `TypeError` → 502.
  - `cache por caminho`: `/genre/movie/list` e `/watch/providers/movie` → `public, s-maxage=86400, stale-while-revalidate=86400`; `/discover/movie` e `/movie/550` → `public, s-maxage=3600, stale-while-revalidate=86400`; `content-type` começa com `application/json`.
- [ ] **Step 2: Rodar** `npm test` → Esperado: FALHA em `tests/proxy.test.js` (módulo não existe).
- [ ] **Step 3: Implementar `criarHandler` em `api/_proxy.js` e `api/tmdb.js`.** Validação de `caminho` com as regex ancoradas das Restrições globais, aplicadas ao valor bruto de `searchParams.get("caminho")`; parâmetros copiados com `searchParams.get(nome)` para cada nome permitido presente.
- [ ] **Step 4: Rodar** `npm test` → Esperado: todos passam (93 + novos).
- [ ] **Step 5: Commit**
```bash
git add api tests/proxy.test.js
git commit -m "feat: intermediário da Vercel que esconde a chave do TMDB"
```

---

### Task 2: Site usa o intermediário quando não há token local

**Arquivos:**
- Modificar: `js/api.js` (função `createApi`, ~linhas 66-90)
- Teste: `tests/api.test.js`

**Interfaces:**
- Consome: formato `GET /api/tmdb?caminho=<path>&<params>` e respostas 400/502 (Task 1).
- Produz: `createApi(token, fetchFn)` com a mesma assinatura e os mesmos métodos de hoje.

- [ ] **Step 1: Ajustar e escrever os testes** em `tests/api.test.js`:
  - Substituir `token vazio ou só espaços lança chave_invalida sem chamar fetch` por `token vazio usa o intermediário`: `createApi("   ", f).discoverMovies(base)` → URL chamada começa com `/api/tmdb?`, `searchParams.get("caminho") === "/discover/movie"`, tem `watch_region=BR`, e `options.headers.Authorization` é `undefined`.
  - `intermediário 404 vira chave_invalida` (sem token, `fakeFetch({}, { ok: false, status: 404 })`).
  - `intermediário 502 vira outro` (com `status: 502`).
  - `sem token, falha de rede vira rede`.
  - `getMovieDetails sem token passa caminho /movie/550 e append_to_response`.
  - Os testes `createApi envia Bearer token` e `HTTP 401 vira chave_invalida` (com token) continuam iguais.
- [ ] **Step 2: Rodar** `npm test` → Esperado: FALHA nos testes novos/ajustados.
- [ ] **Step 3: Implementar** em `createApi`: sem token, URL `/api/tmdb?caminho=${path}&${params}` (montada com `URLSearchParams`, `caminho` primeiro) e cabeçalhos só com `accept`; status 404 → `chave_invalida`; com token, comportamento atual.
- [ ] **Step 4: Rodar** `npm test` → Esperado: todos passam.
- [ ] **Step 5: Verificar no navegador local** (Live Server ou servidor estático na porta 5600): com `js/config.js` → filmes carregam; com `js/config.js` renomeado → mensagem "Configure sua chave do TMDB em js/config.js"; restaurar o arquivo.
- [ ] **Step 6: Commit**
```bash
git add js/api.js tests/api.test.js
git commit -m "feat: site usa o intermediário /api/tmdb quando não há chave local"
```

---

### Task 3: Configuração pública do Supabase e preparação do repositório

**Arquivos:**
- Criar: `js/config.publico.js`
- Modificar: `js/supabase.js` (`criarCliente`), `js/config.example.js`, `js/config.js` (local, fora do git), `js/ui-conta.js` (texto de `avisoLogin("nao_configurado")`), `tests/ui-conta.test.js`, `.gitignore`, `README.md`

**Interfaces:**
- Produz: `js/config.publico.js` exporta `SUPABASE_URL: string` e `SUPABASE_ANON_KEY: string`; `criarCliente()` importa `./config.publico.js`.

- [ ] **Step 1: Ajustar o teste** em `tests/ui-conta.test.js`: `avisoLogin("nao_configurado") === "Login ainda não configurado. Preencha SUPABASE_URL e SUPABASE_ANON_KEY em js/config.publico.js."`
- [ ] **Step 2: Rodar** `npm test` → FALHA nesse teste.
- [ ] **Step 3: Implementar:**
  - criar `js/config.publico.js` com os valores atuais de `SUPABASE_URL`/`SUPABASE_ANON_KEY` lidos de `js/config.js` (copiar sem imprimir), e um comentário dizendo que esses dados são públicos e a segurança das listas está no RLS;
  - `criarCliente()` importa `./config.publico.js`;
  - remover os dois campos de `js/config.example.js` e de `js/config.js`;
  - atualizar o texto em `js/ui-conta.js`;
  - `.gitignore` ganha a linha `.env*`.
- [ ] **Step 4: Rodar** `npm test` → todos passam.
- [ ] **Step 5: Conferir segurança antes de publicar:**
  - `grep -niE "enable row level security" supabase/schema.sql` → encontra a tabela das listas. Se não encontrar: PARAR e avisar o Daniel.
  - `git log --all --oneline -- js/config.js` → saída vazia.
  - Ler o token de `js/config.js` numa variável do shell e rodar `git grep -c "$TOKEN" $(git rev-list --all)` → saída vazia (sem imprimir o token).
  - `git status --short` não lista `.env.local`.
- [ ] **Step 6: Atualizar `README.md`** com a seção "Publicar na Vercel" (os 3 passos manuais da spec §7) e a nota de que `js/config.js` só é usado no computador local.
- [ ] **Step 7: Verificar no navegador local** que "Entrar" ainda abre a janela de login e um login de teste funciona.
- [ ] **Step 8: Commit**
```bash
git add js/config.publico.js js/supabase.js js/config.example.js js/ui-conta.js tests/ui-conta.test.js .gitignore README.md
git commit -m "feat: configuração pública do Supabase e instruções de publicação"
```

---

### Task 4: Publicar (guiado, com o Daniel)

**Arquivos:** nenhum código; possivelmente `README.md` com o endereço final.

**Interfaces:**
- Consome: Tasks 1–3 commitadas.

- [ ] **Step 1: GitHub.** Guiar o Daniel a criar o repositório vazio `catalogo-streaming-br` em github.com/new (sem README, sem .gitignore). Rodar `git remote add origin <url>` e `git push -u origin master` (o Git Credential Manager abre o login do GitHub no navegador). Esperado: código visível no GitHub, sem `js/config.js` e sem `.env.local`.
- [ ] **Step 2: Vercel.** Guiar: vercel.com → *Continue with GitHub* → *Add New → Project* → importar `catalogo-streaming-br` → *Framework Preset: Other*, *Build Command* vazio → *Environment Variables*: `TMDB_TOKEN` = token → *Deploy*. Esperado: endereço `https://<projeto>.vercel.app`.
- [ ] **Step 3: Conferir o intermediário publicado** (via Chrome headless ou Node `fetch`; `curl` falha com TLS nesta máquina):
  - `<endereço>/api/tmdb?caminho=/genre/movie/list&language=pt-BR` → 200 com `genres`.
  - `<endereço>/api/tmdb?caminho=/account` → 400.
  - `<endereço>/js/config.js` → 404.
  - HTML e JS servidos não contêm o token.
- [ ] **Step 4: Supabase.** Guiar: *Authentication → URL Configuration* → *Site URL* = endereço da Vercel; *Redirect URLs* mantém `http://127.0.0.1:5500/**`.
- [ ] **Step 5: Conferência final com o Daniel:** abrir no computador e no celular; filmes, filtros, detalhes, trailer; criar conta de teste, confirmar pelo e-mail (link leva ao endereço da Vercel), marcar um filme nas listas.
- [ ] **Step 6: Commit** (se o README ganhou o endereço) e `git push`; conferir que a Vercel publicou a nova versão sozinha.
