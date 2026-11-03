# Listas "Quero assistir" e "Já assisti" com Login — Especificação de Design

**Data:** 2026-11-03
**Status:** aguardando revisão

## 1. Objetivo

Permitir que a pessoa entre no catálogo com **e-mail e senha** e marque filmes em duas listas pessoais, **"Quero assistir"** e **"Já assisti"**, navegando entre elas por abas na página inicial. Login e listas ficam no **Supabase**, então as mesmas listas aparecem em qualquer navegador onde a pessoa entrar.

**Público:** Daniel e pessoas próximas. O site continua rodando localmente (Live Server); publicar online fica para depois e não exige refazer nada desta entrega.

**Critérios de sucesso:**

- Criar conta, entrar e sair pelo próprio site.
- Marcar um filme na janela de detalhes e vê-lo na aba certa, com o selo certo na grade.
- Fechar o navegador, abrir de novo e continuar logado, com as listas intactas.
- Uma pessoa nunca vê nem altera as marcações de outra.
- Sem Supabase configurado, o catálogo funciona exatamente como hoje.

## 2. Escopo

**Nesta entrega:**

- Cadastro, login e logout por e-mail e senha (Supabase Auth)
- Abas na página inicial: **Catálogo · Quero assistir · Já assisti**
- Botões "Quero assistir" e "Já assisti" na janela de detalhes
- Selo de status nos cartões da grade
- Tabela `marcacoes` no Supabase com regra de segurança por usuário
- Mensagens de erro em português
- Testes automáticos da lógica nova com um Supabase falso

**Fora desta entrega:** recuperar senha por e-mail, login com Google, confirmação de e-mail, nota/comentário pessoal no filme, filtros dentro das abas de lista, publicar o site online.

**Decisões fixas:**

- Supabase usado **direto no navegador** com a biblioteca oficial `@supabase/supabase-js` v2, carregada por CDN (jsDelivr) com versão exata fixada. Sem servidor próprio, sem `npm install` de dependência de produção.
- **Confirmação por e-mail desligada** no Supabase (o link de confirmação não funcionaria com o site local; uso é privado).
- Um filme fica em **no máximo uma** lista por pessoa.

## 3. O que a pessoa vê

### 3.1 Topo do site

- **Sem login:** botão **"Entrar"**, que abre a janela de login.
- **Com login:** o e-mail da pessoa e o botão **"Sair"**.

### 3.2 Janela de login

- Campos e-mail e senha, botão **"Entrar"**.
- Link **"Não tem conta? Criar conta"** troca a janela para o modo cadastro (mesmos campos, botão **"Criar conta"**), com link de volta **"Já tem conta? Entrar"**.
- Ao criar conta, a pessoa já fica logada (sem confirmação por e-mail).
- Enquanto envia, o botão fica desabilitado com texto "Entrando…" / "Criando conta…".
- Fecha com ×, tecla Esc ou clique fora, como a janela de detalhes.

### 3.3 Abas

Abaixo do banner: **Catálogo · Quero assistir · Já assisti**.

- **Catálogo:** igual a hoje (banner, filtros, ordenação, grade, "Carregar mais").
- **Quero assistir / Já assisti:** grade com os filmes marcados, **do mais recente para o mais antigo**. Filtros, ordenação e "Carregar mais" ficam escondidos.
- **Sem login, numa aba de lista:** mensagem "Entre para ver suas listas" com botão "Entrar".
- **Lista vazia:** "Você ainda não marcou nenhum filme para assistir." / "Você ainda não marcou nenhum filme como assistido."
- Clicar num cartão de qualquer aba abre a mesma janela de detalhes.
- Ao sair (logout) estando numa aba de lista, a aba mostra a mensagem de "Entre para ver suas listas".

### 3.4 Janela de detalhes

- Dois botões: **"🔖 Quero assistir"** e **"✓ Já assisti"**. O marcado fica destacado (`aria-pressed="true"`).
- Clicar no botão já marcado **desmarca** o filme.
- Clicar no outro botão **troca** o filme de lista.
- Sem login, qualquer um dos botões abre a janela de login. Depois de entrar, a pessoa volta à janela de detalhes e clica de novo (sem marcação automática).
- Se a pessoa está numa aba de lista e desmarca/troca o filme, a grade daquela aba é atualizada ao fechar a janela.

### 3.5 Grade

Cada cartão de filme marcado mostra um selo no canto do pôster: **🔖** (quero assistir) ou **✓** (já assisti), com texto acessível ("Na sua lista Quero assistir" / "Você já assistiu"). O selo aparece nos cartões de todas as abas, mas não no banner.

## 4. Dados no Supabase

### 4.1 Tabela `marcacoes`

| coluna | tipo | observação |
|---|---|---|
| `user_id` | uuid | padrão `auth.uid()`, referencia `auth.users` com `on delete cascade` |
| `movie_id` | integer | id do filme no TMDB |
| `status` | text | `'quero'` ou `'assisti'` (check constraint) |
| `title` | text | |
| `poster_path` | text | pode ser nulo |
| `release_date` | text | pode ser nulo |
| `vote_average` | real | pode ser nulo |
| `vote_count` | integer | pode ser nulo |
| `updated_at` | timestamptz | padrão `now()`; atualizado a cada marcação, usado na ordenação |

- **Chave primária:** (`user_id`, `movie_id`) — garante uma lista por filme.
- Título, pôster, data e nota são copiados do TMDB no momento da marcação, para as abas abrirem sem uma chamada ao TMDB por filme. São exatamente os campos que o cartão da grade já usa.

### 4.2 Regra de segurança (RLS)

RLS ligado na tabela, com políticas de `select`, `insert`, `update` e `delete` permitidas somente quando `user_id = auth.uid()`. A chave pública (anon) pode ficar no navegador porque o acesso é barrado por essas políticas.

O SQL completo (tabela + políticas) vai num arquivo `supabase/schema.sql` no repositório, pronto para colar no editor SQL do Supabase.

### 4.3 Operações

- **Marcar / trocar:** `upsert` da linha com o novo `status` e `updated_at = now()`.
- **Desmarcar:** `delete` da linha.
- **Carregar marcações:** ao entrar (e ao abrir o site já logado), buscar **todas** as linhas da pessoa uma vez e manter em memória. As abas e os selos usam essa cópia; cada marcação atualiza a cópia depois que o Supabase confirma.

## 5. Organização do código

Continua HTML/CSS/JS puros com módulos ES.

**Arquivos novos:**

- `js/supabase.js` — cria o cliente Supabase a partir de `SUPABASE_URL` e `SUPABASE_ANON_KEY` do `config.js`; se faltarem, exporta `null` (modo "login não configurado").
- `js/conta.js` — `entrar`, `criarConta`, `sair`, `aoMudarSessao(callback)`; traduz os erros do Supabase para as mensagens da seção 6. Recebe o cliente por parâmetro (para teste com cliente falso).
- `js/marcacoes.js` — `carregarMarcacoes`, `marcar(filme, status)`, `desmarcar(movieId)`, e funções puras para filtrar/ordenar a lista de uma aba e saber o status de um filme. Recebe o cliente por parâmetro.
- `js/ui-conta.js` — desenha botão Entrar/Sair, janela de login, abas, botões da janela de detalhes e selos.
- `supabase/schema.sql` — tabela e políticas.
- `tests/conta.test.js`, `tests/marcacoes.test.js` — testes com cliente Supabase falso.

**Arquivos alterados:**

- `js/config.example.js` — ganha `SUPABASE_URL` e `SUPABASE_ANON_KEY` vazios, com instruções.
- `js/state.js` — ganha a aba atual (`catalogo`, `quero`, `assisti`) e a função para trocá-la.
- `js/main.js` — liga sessão, abas, botões e selos ao resto.
- `js/ui.js` — `renderMovies` aceita o status de cada filme para desenhar o selo; `openDetails` reserva o lugar dos botões de marcar.
- `index.html`, `css/styles.css` — abas, botão de conta, janela de login, botões e selos no estilo atual.
- `README.md` — passo a passo do Supabase.

## 6. Erros

| situação | o que a pessoa vê |
|---|---|
| e-mail ou senha errados | "E-mail ou senha incorretos." |
| e-mail já cadastrado | "Esse e-mail já tem conta. Que tal entrar?" |
| senha com menos de 6 caracteres | "A senha precisa ter pelo menos 6 caracteres." |
| e-mail em formato inválido | "Digite um e-mail válido." |
| falha de rede / Supabase fora ao entrar ou cadastrar | "Não deu para conectar. Verifique a internet e tente de novo." |
| falha ao marcar/desmarcar | "Não deu para salvar, tente de novo." — botões voltam ao estado anterior |
| falha ao carregar as marcações | aba de lista mostra a mensagem de erro com "Tentar de novo" |
| Supabase não configurado | catálogo normal; "Entrar" abre aviso "Login ainda não configurado" com instrução para o `config.js` |
| outro erro inesperado | "Algo deu errado. Tente de novo." |

Erros do formulário aparecem dentro da janela de login; erros de marcar aparecem junto aos botões na janela de detalhes.

## 7. Testes

**Automáticos (`node --test`, sem Supabase real):**

- `conta.js`: cada erro do Supabase vira a mensagem certa; sucesso devolve o usuário.
- `marcacoes.js`: marcar envia o `upsert` correto; trocar de lista mantém uma linha só; desmarcar envia o `delete`; a lista de uma aba vem filtrada pelo status e ordenada por `updated_at` decrescente; status de um filme não marcado é "nenhum"; falha do Supabase não altera a cópia em memória.
- `state.js`: troca de aba.
- Os 53 testes atuais continuam passando.

**Manuais (com o Supabase do Daniel):**

1. Criar conta → fica logado.
2. Marcar filmes nas duas listas → aparecem nas abas e com selo.
3. Trocar e desmarcar → abas e selos se atualizam.
4. Recarregar a página → continua logado, listas intactas.
5. Sair e entrar com uma segunda conta → listas vazias, sem ver as da primeira.
6. Testar no celular (largura 390px).

## 8. Passo a passo do Daniel no Supabase

1. Criar conta em supabase.com e um projeto novo (plano gratuito).
2. Abrir **SQL Editor**, colar o conteúdo de `supabase/schema.sql` e rodar.
3. Em **Authentication → Sign In / Providers → Email**, desligar **"Confirm email"**.
4. Em **Project Settings → API**, copiar **Project URL** e a chave **anon / public** para `js/config.js`.

Aviso: no plano gratuito, projetos sem uso por 7 dias são pausados; para voltar, clicar em **Restore** no painel.
