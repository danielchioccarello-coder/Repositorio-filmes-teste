# Catálogo Streaming BR

Site que mostra os filmes inclusos na assinatura dos serviços de streaming no Brasil, com dados do [TMDB](https://www.themoviedb.org) e disponibilidade do [JustWatch](https://www.justwatch.com).

## Como configurar

1. Crie uma conta gratuita em [themoviedb.org](https://www.themoviedb.org/signup).
2. Acesse [Configurações → API](https://www.themoviedb.org/settings/api) e copie o **Token de Leitura da API** (*API Read Access Token*).
3. Copie o arquivo `js/config.example.js` para `js/config.js` e cole o token entre as aspas.
   O `js/config.js` fica fora do git, então sua chave não vai parar no repositório.
   Ele só é usado no seu computador: no site publicado a chave fica na Vercel (veja abaixo).

## Login e listas (Supabase)

Opcional: sem isso, o site funciona só como catálogo.

1. Crie uma conta em [supabase.com](https://supabase.com) e um projeto novo (o plano gratuito basta).
2. Abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication → Sign In / Providers → Email**, desligue **"Confirm email"**.
4. Em **Project Settings → API**, copie o **Project URL** e a chave **publishable** (ou **anon / public**) para `SUPABASE_URL` e `SUPABASE_ANON_KEY` no `js/config.publico.js`.
   Esses dados são públicos e vão para o GitHub; quem protege as listas são as regras de segurança do `supabase/schema.sql`. **Nunca** use a chave *secret* ou *service_role*.

> No plano gratuito, projetos sem uso por 7 dias são pausados. Para voltar, clique em **Restore** no painel do Supabase.

## Como rodar

1. Abra esta pasta no VS Code.
2. Instale a extensão **Live Server** (de Ritwick Dey).
3. Clique em **Go Live**, no canto inferior direito. O site abre no navegador.

> O site usa módulos JavaScript, que não funcionam abrindo o `index.html` com duplo clique. Use o Live Server.

## Publicar na Vercel

O site publicado não usa o `js/config.js`: ele pede os filmes ao intermediário `/api/tmdb` (arquivo `api/tmdb.js`), que roda na Vercel e guarda a chave do TMDB escondida.

1. **GitHub:** crie um repositório e envie o projeto (`git push`).
2. **Vercel:** entre em [vercel.com](https://vercel.com) com a conta do GitHub → **Add New → Project** → importe o repositório → **Framework Preset: Other**, sem comando de build → em **Environment Variables** crie `TMDB_TOKEN` com o seu token → **Deploy**.
3. **Supabase:** em **Authentication → URL Configuration**, coloque o endereço da Vercel em **Site URL** e mantenha `http://127.0.0.1:5500/**` em **Redirect URLs** para o uso local.

Depois disso, cada `git push` atualiza o site publicado sozinho.

## Testes

Com o [Node.js](https://nodejs.org) instalado, rode:

```
npm test
```

### Conferência manual no navegador

- [ ] O site abre e mostra filmes, com o contador "N filmes encontrados"
- [ ] Marcar e desmarcar serviços e gêneros muda a grade e o contador
- [ ] Trocar a ordenação (Popularidade, Nota, Lançamento)
- [ ] "+ ver todos" mostra todos os serviços e a busca filtra pelo nome
- [ ] "Carregar mais filmes" acrescenta filmes sem repetir e some no fim
- [ ] Clicar num filme abre os detalhes; fecha com ✕, tecla Esc e clique fora
- [ ] O link do trailer abre o YouTube em outra aba
- [ ] Com a chave errada ou sem `js/config.js` aparece "Configure sua chave do TMDB em js/config.js"
- [ ] Sem internet (DevTools → Network → Offline) aparece "Não foi possível carregar os filmes." e "Tentar de novo" funciona
- [ ] Na largura de celular (DevTools → ícone de celular, 375px): 2 colunas, sem rolagem lateral, janela em tela cheia

## Ideias para próximas versões

- Busca por título
- Séries, além dos filmes
