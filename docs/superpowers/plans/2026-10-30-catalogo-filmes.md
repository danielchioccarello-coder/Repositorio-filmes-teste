# Catálogo Streaming BR — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** site em português que lista os filmes inclusos na assinatura de todos os streamings do Brasil, com filtros, ordenação e janela de detalhes, usando a API do TMDB.

**Arquitetura:** HTML/CSS/JS puros com módulos ES, sem build. A lógica fica em funções puras (`api.js`, `state.js`, `format.js`) testadas com `node --test`; `ui.js` só mexe na página; `main.js` liga eventos → estado → API → interface. As tarefas seguem a ordem dos episódios 0–4 do curso.

**Tecnologia:** HTML5, CSS (Grid, variáveis), JavaScript ES2022 (módulos), Node.js 18+ apenas para testes (`node --test`, sem dependências), extensão Live Server do VS Code.

**Spec:** `docs/superpowers/specs/2026-10-30-catalogo-filmes-design.md`

## Restrições globais

- Sem frameworks, sem bibliotecas, sem etapa de build; `package.json` só tem `"type": "module"` e `"scripts": { "test": "node --test" }`.
- Arquivos de teste em `tests/` com nome `*.test.js`.
- `js/api.js`, `js/state.js` e `js/format.js` não podem acessar `document`/`window` (precisam importar no Node).
- Nenhum arquivo além de `js/api.js` chama `fetch`.
- Base da API: `https://api.themoviedb.org/3`. Imagens: `https://image.tmdb.org/t/p` (`w342` para pôsteres na grade e na janela, `w92` para logotipos).
- Toda chamada leva `language=pt-BR`; disponibilidade leva `watch_region=BR`.
- Autenticação: cabeçalho `Authorization: Bearer <token>`.
- `js/config.js` (fora do git) exporta `export const TMDB_TOKEN = "...";`. `js/config.example.js` é igual, com string vazia.
- Textos vindos do TMDB entram na página com `textContent`/`createElement`, nunca concatenados em `innerHTML`.
- Interface inteira em português; código (nomes de funções/variáveis) em inglês, comentários curtos em português.
- Tema escuro.
- Textos exatos da spec:
  - Vazio: `Nenhum filme encontrado. Tente remover algum gênero.` + botão `Limpar filtros`
  - Rede/outro: `Não foi possível carregar os filmes.` + botão `Tentar de novo`
  - Chave: `Configure sua chave do TMDB em js/config.js` + link `https://www.themoviedb.org/settings/api`
  - Contador: `N filmes encontrados` (N formatado em pt-BR, ex.: `1.234`)
  - Botão: `Carregar mais filmes` / `Carregando...`
  - Rodapé: `Dados: TMDB · Disponibilidade: JustWatch`

## Foco de revisão

1. **Mesmo filme em duas páginas** (a popularidade muda entre requisições) → não pode aparecer cartão repetido. Teste em `applyResults` (Tarefa 4).
2. **Filme sem sinopse em português, sem pôster, sem data ou sem votos** (comum no TMDB) → mostrar `Sinopse não disponível em português.`, quadro cinza, ano vazio e `Sem nota`, sem quebrar. Testes em `format.js` (Tarefa 3) e `extractDetails` (Tarefa 6).
3. **Filme sem disponibilidade no BR nos detalhes** (`watch/providers.results.BR` ausente) → lista de serviços vazia, sem erro. Teste em `extractDetails` (Tarefa 6).
4. **`js/config.js` ausente ou token com espaços** (erro clássico do aluno) → mensagem de chave, não página em branco. Teste de token vazio/espaços em `createApi` (Tarefa 2); importação dinâmica com verificação manual (Tarefa 7).
5. **Cliques rápidos em "Carregar mais" ou nos filtros** → resposta antiga não sobrescreve a nova e não há carga dobrada. Teste do contador de requisições (Tarefa 4) + botão desativado durante a carga (Tarefa 5).

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Estrutura da página (cabeçalho, filtros, grade, botão, rodapé, janela) |
| `css/styles.css` | Visual: tema escuro, grade responsiva, pílulas, janela, esqueletos |
| `js/config.example.js` / `js/config.js` | Token do TMDB |
| `js/api.js` | URLs, `fetch`, erros, extração de dados do TMDB |
| `js/format.js` | Formatação de ano, nota, duração, contador |
| `js/state.js` | Estado dos filtros/página/filmes e contador de requisições |
| `js/ui.js` | Desenho da página e mensagens |
| `js/main.js` | Inicialização e ligação dos eventos |
| `tests/*.test.js` | Testes das partes puras |
| `README.md` | Como configurar e rodar |

## Episódios × tarefas

| Episódio | Tarefas |
|---|---|
| 0 — Preparação | 1 |
| 1 — Grade básica | 2, 3 |
| 2 — Filtros | 4, 5 |
| 3 — Detalhes | 6 |
| 4 — Acabamento | 7 |

---

### Tarefa 1 (Ep. 0): Esqueleto do projeto

**Arquivos:**
- Criar: `index.html`, `css/styles.css`, `js/config.example.js`, `js/main.js`, `package.json`, `README.md`

**Interfaces:**
- Produz: `js/config.js` exporta `TMDB_TOKEN: string`; `index.html` carrega `<script type="module" src="js/main.js">`.

- [ ] **Passo 1: Criar `package.json`** com `"name": "catalogo-streaming-br"`, `"private": true`, `"type": "module"`, `"scripts": { "test": "node --test" }`.
- [ ] **Passo 2: Criar `js/config.example.js`** com `export const TMDB_TOKEN = "";` e um comentário: copie para `config.js` e cole o *Read Access Token* de `https://www.themoviedb.org/settings/api`.
- [ ] **Passo 3: Criar `index.html`** (`lang="pt-BR"`, `<title>Catálogo Streaming BR</title>`, link para `css/styles.css`, `<h1>Catálogo Streaming BR</h1>`, `<main id="app">`, script módulo `js/main.js`) e `js/main.js` que escreve `Olá! O site está funcionando.` dentro de `#app`.
- [ ] **Passo 4: Criar `css/styles.css`** com variáveis do tema escuro em `:root` (`--bg: #0f1115`, `--surface: #1a1d24`, `--text: #e8e8ea`, `--muted: #9aa0a6`, `--accent: #e50914`), `body` com fundo e fonte de sistema.
- [ ] **Passo 5: Criar `README.md`** em português: criar conta no TMDB, gerar o token, copiar `js/config.example.js` para `js/config.js`, instalar a extensão Live Server, clicar em "Go Live", rodar `npm test`.
- [ ] **Passo 6: Verificar.** Abrir com Live Server. Esperado: título e "Olá! O site está funcionando." em fundo escuro, sem erros no console. `git status` não lista `js/config.js` (após criá-lo localmente).
- [ ] **Passo 7: Commit**
```bash
git add index.html css js/config.example.js js/main.js package.json README.md
git commit -m "feat: esqueleto do projeto (episódio 0)"
```

---

### Tarefa 2 (Ep. 1): Cliente da API — busca básica e serviços

**Arquivos:**
- Criar: `js/api.js`
- Teste: `tests/api.test.js`

**Interfaces:**
- Produz:
  - `class ApiError extends Error` com `type: 'rede' | 'chave_invalida' | 'outro'` e `status?: number`.
  - `buildDiscoverParams({ providerIds, allProviderIds, page }) -> URLSearchParams` (pura). A Tarefa 4 acrescenta `genreIds` e `sort`.
  - `createApi(token: string, fetchFn = globalThis.fetch) -> { getProviders(), discoverMovies(filters) }`.
  - `getProviders() -> Promise<Array<{ id: number, name: string, logoPath: string }>>` ordenada por `display_priorities.BR` crescente (sem `BR` → usa `display_priority`).
  - `discoverMovies({ providerIds, allProviderIds, page }) -> Promise<{ results, page, total_pages, total_results }>` (JSON cru do TMDB).

- [ ] **Passo 1: Escrever os testes que falham** (o `fetchFn` falso devolve `{ ok, status, json: async () => body }` e registra URL e cabeçalhos):
  - `buildDiscoverParams sempre envia região, flatrate, idioma e página`: `watch_region=BR`, `with_watch_monetization_types=flatrate`, `language=pt-BR`, `page=3` para `page: 3`.
  - `sem serviço marcado envia todos os serviços`: `providerIds: []`, `allProviderIds: [8, 119, 337]` → `with_watch_providers` = `"8|119|337"`.
  - `com serviços marcados envia só eles, separados por |`: `providerIds: [8, 337]` → `"8|337"`.
  - `ordem padrão é popularidade`: `sort_by=popularity.desc`.
  - `createApi envia Bearer token`: cabeçalho `Authorization` = `"Bearer abc"`; URL começa com `https://api.themoviedb.org/3/discover/movie?`.
  - `token vazio ou só espaços lança chave_invalida sem chamar fetch`: `createApi("   ")` → `discoverMovies` rejeita com `type === 'chave_invalida'`; o `fetchFn` falso não foi chamado.
  - `token com espaços nas pontas é aparado`: `createApi("  abc \n")` → cabeçalho `"Bearer abc"`.
  - `HTTP 401 vira chave_invalida`; `HTTP 500 vira outro` (com `status: 500`); `fetch rejeitado (TypeError) vira rede`.
  - `getProviders ordena por prioridade do Brasil e renomeia campos`: entrada `results: [{provider_id: 2, provider_name: "B", logo_path: "/b.png", display_priorities: {BR: 5}}, {provider_id: 1, provider_name: "A", logo_path: "/a.png", display_priorities: {BR: 1}}]` → `[{id: 1, name: "A", logoPath: "/a.png"}, {id: 2, ...}]`; URL contém `/watch/providers/movie` e `watch_region=BR`.
- [ ] **Passo 2: Rodar** `npm test` → Esperado: FALHA (`api.js` não existe).
- [ ] **Passo 3: Implementar `js/api.js`.** Uma função interna `request(path, params)` monta a URL com `URLSearchParams` (sempre com `language=pt-BR`), chama `fetchFn`, converte falhas em `ApiError` e devolve `response.json()`.
- [ ] **Passo 4: Rodar** `npm test` → Esperado: todos passam.
- [ ] **Passo 5: Commit**
```bash
git add js/api.js tests/api.test.js
git commit -m "feat: cliente da API do TMDB com busca básica e serviços"
```

---

### Tarefa 3 (Ep. 1): Grade básica na tela

**Arquivos:**
- Criar: `js/format.js`, `js/ui.js`, `tests/format.test.js`
- Modificar: `index.html`, `css/styles.css`, `js/main.js`

**Interfaces:**
- Consome: `createApi`, `getProviders`, `discoverMovies` (Tarefa 2); `TMDB_TOKEN`.
- Produz:
  - `formatYear(date: string | undefined) -> string` (`"2024-05-01"` → `"2024"`; vazio/ausente → `""`).
  - `formatRating(voteAverage: number, voteCount: number) -> string` (`7.84, 1200` → `"7,8"`; `voteCount === 0` → `"Sem nota"`).
  - `formatCount(n: number) -> string` (`1234` → `"1.234 filmes encontrados"`; `1` → `"1 filme encontrado"`).
  - `posterUrl(path: string | null, size = 'w342') -> string | null` em `format.js`.
  - `renderMovies(grid: HTMLElement, movies: object[], { append: boolean }) -> void` em `ui.js`. Cada cartão: `<article class="card" data-id="...">` com pôster (ou `.card-placeholder` com o título), título, ano e `★ nota`.

- [ ] **Passo 1: Escrever os testes que falham** em `tests/format.test.js` com os valores exatos das interfaces acima, incluindo `formatYear(undefined) === ""`, `formatRating(0, 0) === "Sem nota"`, `posterUrl(null) === null`, `posterUrl("/x.jpg") === "https://image.tmdb.org/t/p/w342/x.jpg"`.
- [ ] **Passo 2: Rodar** `npm test` → FALHA.
- [ ] **Passo 3: Implementar `js/format.js`** (nota com `toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })`; contador com `toLocaleString('pt-BR')`).
- [ ] **Passo 4: Rodar** `npm test` → passa.
- [ ] **Passo 5: Montar a grade.** `index.html` ganha `<section id="grid" class="grid">` e `<p id="count">`; CSS: `.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }`, pôster com `aspect-ratio: 2/3`, placeholder cinza do mesmo tamanho. `main.js`: importa o token, cria a API, busca os serviços, chama `discoverMovies({ providerIds: [], allProviderIds, page: 1 })`, chama `renderMovies` e mostra `formatCount(total_results)`.
- [ ] **Passo 6: Verificar no navegador.** Esperado: cerca de 20 filmes populares com pôster, título, ano e nota com vírgula; contador com ponto de milhar; nenhum erro no console.
- [ ] **Passo 7: Commit**
```bash
git add index.html css js tests
git commit -m "feat: grade básica de filmes (episódio 1)"
```

---

### Tarefa 4 (Ep. 2): Estado, gêneros e ordenação na busca

**Arquivos:**
- Criar: `js/state.js`, `tests/state.test.js`
- Modificar: `js/api.js`, `tests/api.test.js`

**Interfaces:**
- Consome: `buildDiscoverParams` (Tarefa 2).
- Produz:
  - `buildDiscoverParams({ providerIds, allProviderIds, genreIds, sort, page })`, onde `sort` é `'popularidade' | 'nota' | 'lancamento'`.
  - `api.getGenres() -> Promise<Array<{ id: number, name: string }>>` (`/genre/movie/list`).
  - `discoverMovies` aceita os mesmos campos de `buildDiscoverParams`.
  - Em `state.js` (todas as funções puras, devolvem um **novo** objeto):
    - `createState() -> { selectedProviders: [], selectedGenres: [], sort: 'popularidade', page: 1, totalPages: 0, totalResults: 0, movies: [] }`
    - `toggleProvider(state, id)`, `toggleGenre(state, id)`, `setSort(state, sort)`, `clearFilters(state)`: alteram o filtro e voltam para `page: 1`, `movies: []`.
    - `nextPage(state)`: `page + 1`, mantém os filmes.
    - `applyResults(state, response)`: na página 1 substitui `movies`, nas seguintes acrescenta **ignorando ids já presentes**; copia `total_pages` e `total_results`.
    - `hasMore(state) -> boolean`: `state.page < Math.min(state.totalPages, 500)`.
    - `createRequestCounter() -> { next(): number, isLatest(n: number): boolean }`.

- [ ] **Passo 1: Escrever os testes que falham.**
  - Em `tests/api.test.js`:
    - `gêneros separados por vírgula`: `genreIds: [28, 35]` → `with_genres=28,35`.
    - `sem gênero não envia with_genres`.
    - `ordenação por nota`: `sort_by=vote_average.desc` e `vote_count.gte=200`.
    - `ordenação por lançamento`: `sort_by=primary_release_date.desc`, sem `vote_count.gte`.
    - `getGenres devolve genres`.
  - Em `tests/state.test.js`:
    - `toggleProvider adiciona e remove`.
    - `mudar filtro volta à página 1 e limpa filmes`.
    - `setSort('nota') volta à página 1`.
    - `clearFilters zera serviços e gêneros e mantém a ordenação`.
    - `applyResults na página 2 acrescenta sem repetir id`: filmes `[{id:1},{id:2}]` + resposta `[{id:2},{id:3}]` → ids `[1,2,3]`.
    - `hasMore`: falso quando `page === totalPages`; falso com `page: 500, totalPages: 900`; verdadeiro com `page: 1, totalPages: 2`.
    - `createRequestCounter: só a última é a mais recente`: `a = next(); b = next();` → `isLatest(a) === false`, `isLatest(b) === true`.
    - `funções não alteram o estado original`.
- [ ] **Passo 2: Rodar** `npm test` → FALHA nos testes novos.
- [ ] **Passo 3: Implementar** as extensões em `js/api.js` e o arquivo `js/state.js`.
- [ ] **Passo 4: Rodar** `npm test` → tudo passa, inclusive os testes da Tarefa 2.
- [ ] **Passo 5: Commit**
```bash
git add js/api.js js/state.js tests
git commit -m "feat: estado dos filtros, gêneros e ordenação"
```

---

### Tarefa 5 (Ep. 2): Filtros e "Carregar mais" na tela

**Arquivos:**
- Modificar: `index.html`, `css/styles.css`, `js/ui.js`, `js/main.js`

**Interfaces:**
- Consome: `state.js` inteiro e `getGenres`/`discoverMovies` (Tarefa 4); `renderMovies`, `formatCount` (Tarefa 3).
- Produz em `ui.js`:
  - `renderProviders(container, providers, selectedIds, { expanded: boolean, filterText: string })`: mostra os 8 primeiros quando recolhido e todos (filtrados por nome, sem diferenciar maiúsculas) quando expandido; cada logotipo é um `<button data-provider-id aria-pressed>` com `<img alt="nome">`; botão `+ ver todos` / `− ver menos`; campo de busca só quando expandido.
  - `renderGenres(container, genres, selectedIds)`: `<button class="pill" data-genre-id aria-pressed>`.
  - `setLoadMore(button, { visible: boolean, loading: boolean })`: texto `Carregar mais filmes` / `Carregando...`, `disabled` durante a carga.

- [ ] **Passo 1: Estrutura.** `index.html` ganha `#providers`, `#genres`, `<select id="sort">` com as opções `Popularidade` (`popularidade`), `Nota` (`nota`), `Lançamento` (`lancamento`) e o botão `#load-more` abaixo da grade. CSS: pílulas e logotipos marcados destacados com `--accent`.
- [ ] **Passo 2: Ligação em `main.js`.** Uma função `loadMovies()` que: pega `n = counter.next()`, ativa `setLoadMore(..., loading: true)`, chama `discoverMovies` com o estado, **descarta a resposta se `!counter.isLatest(n)`**, aplica `applyResults`, chama `renderMovies` (com `append` quando `page > 1`), atualiza o contador e `setLoadMore({ visible: hasMore(state), loading: false })`. Cliques usam delegação de eventos nos contêineres; qualquer filtro → novo estado → `loadMovies()`. O clique em "Carregar mais" é ignorado enquanto `loading`.
- [ ] **Passo 3: Rodar** `npm test` → continua passando.
- [ ] **Passo 4: Verificar no navegador:**
  - marcar Netflix muda a grade e o contador; marcar Netflix + outro serviço aumenta o total;
  - marcar Ação + Comédia diminui o total;
  - "Nota" mostra notas altas primeiro;
  - "+ ver todos" mostra dezenas de serviços, e digitar "glob" deixa só o Globoplay;
  - "Carregar mais" acrescenta 20 filmes sem repetir;
  - clicar em 4 filtros bem rápido deixa a grade coerente com o último filtro.
- [ ] **Passo 5: Commit**
```bash
git add index.html css js
git commit -m "feat: filtros de serviço e gênero, ordenação e carregar mais (episódio 2)"
```

---

### Tarefa 6 (Ep. 3): Janela de detalhes

**Arquivos:**
- Modificar: `js/api.js`, `js/format.js`, `js/ui.js`, `js/main.js`, `index.html`, `css/styles.css`, `tests/api.test.js`, `tests/format.test.js`

**Interfaces:**
- Consome: `createApi`, `request` interno (Tarefa 2); `formatYear`, `formatRating`, `posterUrl` (Tarefa 3).
- Produz:
  - `formatRuntime(minutes: number | null) -> string` (`130` → `"2h 10min"`, `120` → `"2h"`, `45` → `"45min"`, `0`/`null` → `""`).
  - `api.getMovieDetails(id) -> Promise<object>` (JSON cru de `/movie/{id}` com `append_to_response=credits,videos,watch/providers`).
  - `extractDetails(raw) -> { id, title, year, rating, runtime, genres: string[], overview, cast: string[], trailerUrl: string | null, providers: Array<{ id, name, logoPath }>, posterPath }` (pura, em `api.js`).
  - `openDetails(modal, details)`, `showDetailsError(modal)` e `closeDetails(modal)` em `ui.js`.

- [ ] **Passo 1: Escrever os testes que falham.**
  - `formatRuntime` com os quatro casos acima.
  - `extractDetails pega os 5 primeiros do elenco` (entrada com 7 → 5 nomes).
  - `trailer: primeiro vídeo YouTube do tipo Trailer`: vídeos `[{site:"Vimeo",type:"Trailer",key:"v"},{site:"YouTube",type:"Teaser",key:"t"},{site:"YouTube",type:"Trailer",key:"abc"}]` → `"https://www.youtube.com/watch?v=abc"`.
  - `sem trailer → trailerUrl null`.
  - `serviços vêm de watch/providers.results.BR.flatrate`, renomeados para `{id, name, logoPath}`.
  - `sem BR ou sem flatrate → providers []` (sem lançar erro).
  - `sinopse vazia vira "Sinopse não disponível em português."`.
  - `getMovieDetails chama /movie/550 com append_to_response=credits,videos,watch/providers`.
- [ ] **Passo 2: Rodar** `npm test` → FALHA nos testes novos.
- [ ] **Passo 3: Implementar** `formatRuntime`, `getMovieDetails` e `extractDetails`.
- [ ] **Passo 4: Rodar** `npm test` → passa.
- [ ] **Passo 5: Janela.** `index.html` ganha `<dialog id="details">` (o elemento nativo `<dialog>` traz Esc e o fundo escurecido). `openDetails` preenche pôster, `Título (ano)`, `★ nota · duração · gêneros`, sinopse, `Disponível em:` com os logotipos (sem serviços: `Não está em nenhuma assinatura no Brasil.`), `Elenco:` e o link `▶ Ver trailer no YouTube` (`target="_blank" rel="noopener"`, omitido se `null`). Fecha com o botão ✕ e com clique fora do conteúdo. `main.js`: clique em `.card` → `showModal()` com `Carregando...` → `getMovieDetails` → `extractDetails` → `openDetails`; em erro, `showDetailsError` mostra `Não foi possível carregar os detalhes.` dentro da janela.
- [ ] **Passo 6: Verificar no navegador:** abrir 3 filmes diferentes; fechar com ✕, Esc e clique fora; o trailer abre em nova aba; desligar a internet (DevTools → Network → Offline), clicar num filme → erro aparece dentro da janela e a grade continua funcionando.
- [ ] **Passo 7: Commit**
```bash
git add index.html css js tests
git commit -m "feat: janela de detalhes do filme (episódio 3)"
```

---

### Tarefa 7 (Ep. 4): Estados, erros, celular e créditos

**Arquivos:**
- Modificar: `js/ui.js`, `js/main.js`, `index.html`, `css/styles.css`, `README.md`
- Criar: `tests/ui-messages.test.js`

**Interfaces:**
- Consome: `ApiError.type` (Tarefa 2); `loadMovies`, `clearFilters` (Tarefas 4–5).
- Produz em `ui.js`:
  - `messageFor(kind: 'vazio' | 'rede' | 'outro' | 'chave_invalida') -> { text: string, action: { label: string, kind: 'limpar' | 'tentar' } | null, link: string | null }`, com os textos exatos das Restrições globais. Função pura, sem acesso a `document`.
  - `renderMessage(container, kind)` e `renderSkeleton(grid, count = 12)`.

- [ ] **Passo 1: Escrever os testes que falham** em `tests/ui-messages.test.js`:
  - `vazio` → texto `Nenhum filme encontrado. Tente remover algum gênero.`, ação `{ label: 'Limpar filtros', kind: 'limpar' }`.
  - `rede` e `outro` → `Não foi possível carregar os filmes.`, ação `{ label: 'Tentar de novo', kind: 'tentar' }`.
  - `chave_invalida` → `Configure sua chave do TMDB em js/config.js`, `link: 'https://www.themoviedb.org/settings/api'`, `action: null`.
  - Importar `ui.js` no Node não lança erro (prova que não há acesso a `document` no carregamento).
- [ ] **Passo 2: Rodar** `npm test` → FALHA.
- [ ] **Passo 3: Implementar** `messageFor`, `renderMessage` e `renderSkeleton` (cartões cinza com animação `@keyframes` de opacidade).
- [ ] **Passo 4: Rodar** `npm test` → passa.
- [ ] **Passo 5: Ligar os estados em `main.js`:**
  - primeira carga e troca de filtro → esqueleto;
  - `total_results === 0` → mensagem `vazio`, e o botão chama `clearFilters` + `loadMovies`;
  - erro → mensagem pelo `error.type`, e "Tentar de novo" repete a última ação;
  - **o token passa a ser carregado com `await import('./config.js')` dentro de `try/catch`**: se o arquivo não existir, `TMDB_TOKEN = ""` → aparece a mensagem de chave.
  - Uma falha em `getProviders`/`getGenres` na abertura também mostra a mensagem correspondente.
- [ ] **Passo 6: Celular e rodapé.** Em `@media (max-width: 600px)`, os filtros se empilham, a fileira de logotipos rola na horizontal dentro do próprio contêiner (a página não rola de lado), a grade fica com `minmax(140px, 1fr)` (cerca de 2 colunas) e a janela ocupa a tela toda. Rodapé com `Dados: TMDB · Disponibilidade: JustWatch`, com links para `https://www.themoviedb.org` e `https://www.justwatch.com`.
- [ ] **Passo 7: Verificar no navegador (lista de conferência da spec):**
  - renomear `js/config.js` → mensagem de chave com link; restaurar;
  - colocar um token errado → mesma mensagem; restaurar;
  - modo Offline → `Não foi possível carregar os filmes.`; voltar para Online e clicar em "Tentar de novo" → a grade volta;
  - marcar gêneros até não sobrar filme → mensagem de vazio, e "Limpar filtros" funciona;
  - o esqueleto aparece ao trocar de filtro (rede em "Slow 4G");
  - largura de 375px (iPhone) nas ferramentas do navegador → 2 colunas, sem rolagem lateral da página, janela em tela cheia;
  - "Carregar mais" até o fim de um filtro pequeno → o botão some;
  - rodapé com os créditos.
- [ ] **Passo 8: Atualizar `README.md`** com a lista de conferência manual e as ideias para episódios futuros (busca, favoritos, séries).
- [ ] **Passo 9: Rodar** `npm test` → tudo passa.
- [ ] **Passo 10: Commit**
```bash
git add index.html css js tests README.md
git commit -m "feat: estados de carregamento e erro, celular e créditos (episódio 4)"
```
