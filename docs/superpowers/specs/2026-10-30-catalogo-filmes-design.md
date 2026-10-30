# Catálogo Streaming BR — Especificação de Design

**Data:** 2026-10-30
**Status:** aguardando revisão

## 1. Objetivo

Um site que funciona como catálogo dos filmes **inclusos na assinatura** de todos os serviços de streaming disponíveis no Brasil, usando dados da API do TMDB (disponibilidade fornecida pelo JustWatch).

O projeto tem dois propósitos:

1. **Projeto de demonstração** de um curso de Claude Code no YouTube para **iniciantes** — precisa ser simples de construir e de explicar, em episódios curtos.
2. **Uso pessoal** — precisa ser útil de verdade para descobrir o que assistir.

**Critérios de sucesso:**

- Abrir o site e ver, em poucos segundos, filmes que estão em algum streaming no Brasil.
- Filtrar por serviço e gênero e ordenar o resultado, com respostas coerentes.
- Clicar num filme e ver sinopse, elenco, trailer e em quais serviços ele está.
- Cada episódio do curso termina com algo funcionando na tela.

## 2. Escopo

**Na v1:**

- Grade de filmes (pôster, título, ano, nota)
- Filtro por serviço de streaming (todos os serviços que o TMDB lista para o Brasil)
- Filtro por gênero
- Ordenação: popularidade, nota, lançamento
- Janela de detalhes (sinopse, duração, gêneros, elenco, trailer, serviços)
- Botão "Carregar mais"
- Estados de carregando, vazio e erro
- Layout responsivo (computador e celular)
- Crédito a TMDB e JustWatch no rodapé

**Fora da v1 (ideias para episódios futuros):** busca por título, lista de favoritos, séries, filmes de aluguel/compra.

**Decisões fixas:**

- Região: Brasil (`watch_region=BR`).
- Idioma da interface e dos dados: português (`language=pt-BR`).
- Só filmes inclusos na assinatura (`with_watch_monetization_types=flatrate`).

## 3. Tecnologia e estrutura

- HTML, CSS e JavaScript puros, sem framework e sem etapa de build.
- Módulos JavaScript (`<script type="module">`), servidos localmente pela extensão **Live Server** do VS Code. (Módulos não funcionam abrindo o arquivo direto do disco.)
- Testes de lógica com o testador nativo do Node.js (`node --test`), sem dependências.

```
index.html
css/styles.css
js/config.example.js   ← modelo, vai para o git
js/config.js           ← chave real do TMDB, fora do git (.gitignore)
js/api.js              ← única parte que conversa com o TMDB
js/state.js            ← filtros escolhidos, página atual, filmes carregados
js/ui.js               ← desenha grade, filtros, janela de detalhes e mensagens
js/main.js             ← inicializa e liga as partes
tests/                 ← testes de api.js e state.js
package.json           ← apenas "type": "module" e o script "test"
```

**Responsabilidades e limites:**

- `api.js` monta URLs, faz `fetch`, devolve dados ou lança um erro com tipo (`rede`, `chave_invalida`, `outro`). Nenhum outro arquivo chama `fetch`.
- `state.js` guarda o estado e oferece funções para alterá-lo (ex.: alternar serviço, alternar gênero, mudar ordenação, próxima página). Não toca na página.
- `ui.js` recebe dados e estado e atualiza a página. Não chama a API diretamente; avisa `main.js` sobre cliques.
- `main.js` conecta eventos da interface → estado → API → interface.
- As funções que montam parâmetros de busca são **puras** (entrada → saída, sem `fetch`), para poderem ser testadas no Node.

## 4. Dados e API do TMDB

Autenticação: *Read Access Token* do TMDB no cabeçalho `Authorization: Bearer <token>`, lido de `js/config.js`.

Todas as chamadas levam `language=pt-BR`; as de disponibilidade levam `watch_region=BR`.

| Para quê | Endpoint | Quando |
|---|---|---|
| Serviços com logotipos | `GET /3/watch/providers/movie` | uma vez, ao abrir |
| Gêneros | `GET /3/genre/movie/list` | uma vez, ao abrir |
| Filmes da grade | `GET /3/discover/movie` | a cada mudança de filtro e a cada "carregar mais" |
| Detalhes | `GET /3/movie/{id}?append_to_response=credits,videos,watch/providers` | ao clicar num filme |

**Parâmetros do `discover`:**

- Sempre: `watch_region=BR`, `with_watch_monetization_types=flatrate`, `page=N` (20 filmes por página).
- Serviços: `with_watch_providers` com IDs separados por `|` (OU — filme em qualquer um dos marcados). **Sem nenhum serviço marcado, envia os IDs de todos os serviços** da lista do Brasil.
- Gêneros: `with_genres` com IDs separados por `,` (E — o filme precisa ter todos os gêneros marcados). Sem gênero marcado, o parâmetro não é enviado.
- Ordenação:
  - Popularidade: `sort_by=popularity.desc` (padrão)
  - Nota: `sort_by=vote_average.desc` + `vote_count.gte=200`
  - Lançamento: `sort_by=primary_release_date.desc`
- O total de filmes vem de `total_results`; o fim da lista é quando `page >= total_pages`. O TMDB limita a busca a 500 páginas; acima disso, o botão "Carregar mais" também some.

**Detalhes do filme:**

- Elenco: os 5 primeiros de `credits.cast`.
- Trailer: primeiro vídeo com `site = "YouTube"` e `type = "Trailer"`; se não houver, o link não aparece. Abre `https://www.youtube.com/watch?v=<key>` em nova aba.
- Serviços: `watch/providers.results.BR.flatrate`.

**Imagens:** pôsteres em `https://image.tmdb.org/t/p/w342<poster_path>`; logotipos em `https://image.tmdb.org/t/p/w92<logo_path>`.

## 5. Interface

**Página principal:**

```
┌──────────────────────────────────────────────────────────────┐
│  Catálogo Streaming BR                                       │
├──────────────────────────────────────────────────────────────┤
│  Serviços: [Netflix][Prime][Disney+][Max][Globoplay]  [+ ver todos]
│  Gêneros: (Ação)(Comédia)(Drama)(Terror)(Animação)...        │
│  Ordenar: [Popularidade ▾]          1.234 filmes encontrados │
├──────────────────────────────────────────────────────────────┤
│  grade de pôsteres com título, ano e nota                    │
│                 [ Carregar mais filmes ]                     │
├──────────────────────────────────────────────────────────────┤
│  Dados: TMDB · Disponibilidade: JustWatch                    │
└──────────────────────────────────────────────────────────────┘
```

- **Serviços:** a linha mostra os 8 primeiros pela ordem de `display_priority` do Brasil. "+ ver todos" expande a lista completa com um campo para filtrar por nome. Clicar num logotipo marca/desmarca; marcado fica destacado.
- **Gêneros:** botões em formato de pílula que ligam/desligam.
- **Ordenação:** um `<select>` com as três opções.
- **Contador:** "N filmes encontrados", a partir de `total_results`.
- **Grade:** CSS Grid com `auto-fill`; cerca de 6 colunas no computador e 2 no celular. Filme sem pôster mostra um quadro cinza com o título.
- **Tema:** escuro.
- **Nome:** "Catálogo Streaming BR" é provisório.

**Janela de detalhes:** abre por cima da grade; mostra pôster, título, ano, nota, duração, gêneros, sinopse, logotipos dos serviços, elenco e link do trailer. Fecha com ✕, com a tecla Esc ou clicando fora.

Qualquer mudança de filtro ou ordenação volta para a página 1 e substitui a grade.

## 6. Estados e erros

| Situação | O que aparece |
|---|---|
| Primeira carga | Cartões cinza "piscando" no lugar dos pôsteres |
| Carregando mais | Botão vira "Carregando..." e fica desativado |
| Nenhum resultado | "Nenhum filme encontrado. Tente remover algum gênero." + botão **Limpar filtros** |
| Fim da lista | Botão "Carregar mais" some |
| Sem internet / TMDB fora (erros `rede` e `outro`) | "Não foi possível carregar os filmes." + botão **Tentar de novo** |
| Chave ausente ou inválida (HTTP 401, ou `config.js` sem token) | "Configure sua chave do TMDB em `js/config.js`" + link para `https://www.themoviedb.org/settings/api` |
| Erro nos detalhes | Mensagem dentro da janela; a grade continua funcionando |

**Respostas fora de ordem:** cada busca do `discover` recebe um número sequencial; a interface só aplica a resposta cuja numeração é a mais recente e descarta as demais.

## 7. Testes

**Automáticos (`npm test` → `node --test`):**

- Montagem dos parâmetros do `discover` para cada combinação: sem serviço (envia todos), um e vários serviços (`|`), gêneros (`,`), cada ordenação (incluindo `vote_count.gte=200` na de nota), número da página.
- Escolha do trailer (pega o trailer do YouTube; sem trailer → nenhum).
- Estado: alternar serviço/gênero, mudar ordenação volta à página 1, "tem mais páginas" respeita `total_pages` e o limite de 500.
- Classificação de erros: 401 → `chave_invalida`; falha de rede → `rede`.

**Manuais (lista de conferência):** carregar o site; marcar/desmarcar serviços e gêneros; trocar ordenação; carregar mais até o fim; abrir e fechar detalhes (✕, Esc, clique fora); abrir trailer; testar com a chave errada; testar sem internet; testar em largura de celular nas ferramentas do navegador.

## 8. Episódios do curso

| Ep. | Tema | Resultado na tela |
|---|---|---|
| 0 | Preparação: conta e chave no TMDB, VS Code, Live Server, git, `config.js` | Página "Olá" rodando no navegador |
| 1 | Grade básica | Filmes populares dos streamings do Brasil, com pôster, título, ano e nota |
| 2 | Filtros | Serviços com logotipos, gêneros, ordenação, "carregar mais" |
| 3 | Detalhes | Janela com sinopse, elenco, trailer e serviços |
| 4 | Acabamento | Estados de carregando/vazio/erro, celular, crédito TMDB/JustWatch |

O plano de implementação segue essa ordem.
