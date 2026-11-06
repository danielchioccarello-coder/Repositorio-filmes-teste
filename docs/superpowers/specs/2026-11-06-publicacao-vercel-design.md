# Publicação na Vercel — Especificação de Design

**Data:** 2026-11-06
**Status:** aguardando revisão

## 1. Objetivo

Publicar o Catálogo Streaming BR na internet, **aberto ao público**, de graça, sem expor a chave do TMDB.

**Critérios de sucesso:**

- Qualquer pessoa abre o endereço da Vercel (ex.: `catalogo-streaming-br.vercel.app`) no computador ou no celular e vê os filmes, os filtros, os detalhes, o login e as listas, como no Live Server.
- A chave do TMDB não aparece em nenhum arquivo servido pelo site nem no repositório do GitHub.
- Cada `git push` para o GitHub atualiza o site publicado sozinho.
- No computador do Daniel, o site continua abrindo pelo Live Server como hoje.

## 2. Decisões

- **Hospedagem:** Vercel (plano grátis), ligada a um repositório no GitHub (conta do Daniel já existe).
- **Chave do TMDB:** fica só na variável de ambiente `TMDB_TOKEN` da Vercel. O site publicado chama um intermediário (`/api/tmdb`) que adiciona a chave.
- **Chaves do Supabase:** a URL do projeto e a chave *publishable/anon* são públicas por natureza (a proteção das listas está nas regras RLS de `supabase/schema.sql`). Elas passam para um arquivo versionado, `js/config.publico.js`.
- **Fora do escopo:** limite de pedidos por visitante, domínio próprio, testes automáticos de ponta a ponta no site publicado.

## 3. Estrutura

```
api/tmdb.js            ← função da Vercel: só exporta o handler
api/_proxy.js          ← lógica do intermediário (pura, testável); "_" impede a Vercel de publicá-la como rota
js/config.publico.js   ← NOVO, no git: SUPABASE_URL e SUPABASE_ANON_KEY
js/config.js           ← continua fora do git: só TMDB_TOKEN (uso local)
js/config.example.js   ← modelo atualizado: só TMDB_TOKEN
js/api.js              ← escolhe entre TMDB direto (com token) e /api/tmdb (sem token)
js/supabase.js         ← passa a ler js/config.publico.js
tests/proxy.test.js    ← testes do intermediário
.gitignore             ← acrescenta .env*
```

## 4. O intermediário (`api/tmdb.js` + `api/_proxy.js`)

**Formato do pedido:** `GET /api/tmdb?caminho=<caminho TMDB>&<parâmetros>`, ex.: `/api/tmdb?caminho=/discover/movie&language=pt-BR&page=2`.

A função usa o formato Web da Vercel (`export async function GET(request)` devolvendo `Response`). A lógica fica em `api/_proxy.js`:

- `criarHandler({ token, fetchFn }) -> (request: Request) => Promise<Response>`.
- `api/tmdb.js` faz `export const GET = (request) => criarHandler({ token: process.env.TMDB_TOKEN, fetchFn: fetch })(request)`.

**Regras:**

| Regra | Valor |
|---|---|
| Método | Só `GET`; outro método → `405` |
| Caminhos permitidos (`caminho`) | `^/discover/movie$`, `^/genre/movie/list$`, `^/watch/providers/movie$`, `^/movie/\d+$`; outro → `400` `{ "erro": "caminho_nao_permitido" }`, sem chamar o TMDB |
| Parâmetros repassados | `language`, `watch_region`, `with_watch_monetization_types`, `with_watch_providers`, `with_genres`, `sort_by`, `page`, `vote_count.gte`, `vote_average.gte`, `append_to_response`, `include_video_language`; os demais (inclusive `api_key`) são descartados |
| Autenticação no TMDB | Cabeçalho `Authorization: Bearer <TMDB_TOKEN>` (token com `.trim()`) |
| `TMDB_TOKEN` vazio/ausente | `502` `{ "erro": "falha" }`, sem chamar o TMDB |
| TMDB responde 2xx | Status `200`, corpo JSON do TMDB, `content-type: application/json` |
| TMDB responde 401 ou qualquer erro ≥ 400 | `502` `{ "erro": "falha" }` (o visitante nunca sabe que é problema de chave) |
| Falha de rede até o TMDB | `502` `{ "erro": "falha" }` |
| Cache (só em respostas 200) | `/genre/movie/list` e `/watch/providers/movie`: `Cache-Control: public, s-maxage=86400, stale-while-revalidate=86400`; `/discover/movie` e `/movie/{id}`: `public, s-maxage=3600, stale-while-revalidate=86400`. Erros: `Cache-Control: no-store` |

## 5. Mudanças no site

**`js/api.js` — `createApi(token, fetchFn)`:**

- Com token (após `.trim()`): igual a hoje (chama `https://api.themoviedb.org/3...` com `Authorization`).
- Sem token: chama `/api/tmdb?caminho=<path>&<params>`, **sem** cabeçalho `Authorization`.
- Mapeamento de erros no modo intermediário:
  - `404` → `chave_invalida` (não existe intermediário: é o computador local sem `js/config.js`, e a mensagem de hoje continua valendo);
  - qualquer outro status ≥ 400 → `outro`;
  - falha de rede → `rede`.
- O teste atual "token vazio ou só espaços lança chave_invalida sem chamar fetch" passa a ser: "token vazio usa o intermediário" (chama `/api/tmdb?caminho=...` sem `Authorization`).

**`js/supabase.js` — `criarCliente()`:** importa `./config.publico.js` em vez de `./config.js`. Se o arquivo faltar ou estiver vazio, o login fica desligado como hoje.

**`js/config.publico.js`:** recebe os valores atuais de `SUPABASE_URL` e `SUPABASE_ANON_KEY` que estão em `js/config.js`; esses dois campos saem de `js/config.js` e de `js/config.example.js`.

**`.gitignore`:** acrescenta `.env*` (o `.env.local` atual não é usado pelo site e não deve ir para o GitHub).

## 6. Antes de enviar ao GitHub

- Confirmar que `js/config.js` nunca entrou em nenhum commit: `git log --all --oneline -- js/config.js` não lista nada.
- Confirmar que o token do TMDB não aparece em nenhum arquivo versionado: buscar o começo do token (`eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkZWU1`) em `git grep` de todo o histórico não encontra nada.

## 7. Passos manuais (guiados, feitos pelo Daniel)

1. **GitHub:** criar repositório (ex.: `catalogo-streaming-br`), público ou privado (os dois funcionam na Vercel); enviar o código com `git push`.
2. **Vercel:** entrar com a conta do GitHub → *Add New → Project* → importar o repositório → *Framework Preset: Other*, sem comando de build → em *Environment Variables* criar `TMDB_TOKEN` com o token → *Deploy*.
3. **Supabase:** *Authentication → URL Configuration* → *Site URL* = endereço da Vercel; manter `http://127.0.0.1:5500` em *Redirect URLs* para o uso local.

## 8. Testes

**Automáticos (`npm test`), além dos 93 atuais:**

- Intermediário: cada caminho permitido chama `https://api.themoviedb.org/3<caminho>`; `/account` e `/movie/abc` → 400 sem chamar o TMDB; parâmetro `api_key` e outros desconhecidos descartados; `POST` → 405; cabeçalho `Authorization` com token aparado; token vazio → 502 sem chamar o TMDB; TMDB 401 → 502; TMDB 500 → 502; falha de rede → 502; `Cache-Control` certo para cada caminho e `no-store` nos erros.
- Site: token vazio usa `/api/tmdb?caminho=/discover/movie...` sem `Authorization`; intermediário 404 → `chave_invalida`; 502 → `outro`; falha de rede → `rede`; com token continua indo direto ao TMDB.
- Supabase: `criarCliente` lê `config.publico.js` (coberto pelos testes existentes de `lerConfigSupabase`/`conectar`).

**Conferência manual após publicar:**

1. Abrir o endereço da Vercel no computador e no celular: filmes, filtros, detalhes, trailer.
2. No navegador, *Ver código-fonte* e a aba *Rede* (DevTools): o token do TMDB não aparece; pedidos vão para `/api/tmdb`.
3. Abrir `<endereço>/api/tmdb?caminho=/account` → resposta 400.
4. Criar conta de teste: o link do e-mail de confirmação leva ao endereço da Vercel; entrar e marcar um filme nas listas.
5. No computador, o Live Server continua funcionando com o `js/config.js`.
