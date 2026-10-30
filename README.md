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
