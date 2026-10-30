# Catálogo Streaming BR

Site que mostra os filmes inclusos na assinatura dos serviços de streaming no Brasil, com dados do [TMDB](https://www.themoviedb.org) e disponibilidade do [JustWatch](https://www.justwatch.com).

## Como configurar

1. Crie uma conta gratuita em [themoviedb.org](https://www.themoviedb.org/signup).
2. Acesse [Configurações → API](https://www.themoviedb.org/settings/api) e copie o **Token de Leitura da API** (*API Read Access Token*).
3. Copie o arquivo `js/config.example.js` para `js/config.js` e cole o token entre as aspas.
   O `js/config.js` fica fora do git, então sua chave não vai parar no repositório.

## Como rodar

1. Abra esta pasta no VS Code.
2. Instale a extensão **Live Server** (de Ritwick Dey).
3. Clique em **Go Live**, no canto inferior direito. O site abre no navegador.

> O site usa módulos JavaScript, que não funcionam abrindo o `index.html` com duplo clique. Use o Live Server.

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
- Lista de favoritos / "quero assistir" salva no navegador
- Séries, além dos filmes
