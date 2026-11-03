import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dadosDoFilme, proximoStatus, statusDoFilme, aplicarMarcacao, removerMarcacao, filmesDaAba,
  carregarMarcacoes, marcar, desmarcar,
} from "../js/marcacoes.js";

// Supabase de mentira: cada método encadeado é gravado; o "await" devolve a resposta combinada
function fakeClient(resposta = { data: null, error: null }) {
  const chamadas = [];
  const consulta = {
    then: (resolve, reject) => Promise.resolve(resposta).then(resolve, reject),
  };
  for (const metodo of ["select", "upsert", "single", "delete", "eq"]) {
    consulta[metodo] = (...args) => { chamadas.push([metodo, ...args]); return consulta; };
  }
  return {
    chamadas,
    from: (tabela) => { chamadas.push(["from", tabela]); return consulta; },
  };
}

const clube = {
  id: 550, title: "Clube da Luta", poster_path: "/p.jpg", release_date: "1999-10-15",
  vote_average: 8.4, vote_count: 30000, overview: "...", genres: [],
};

function linha(movieId, status, updatedAt) {
  return { user_id: "u1", movie_id: movieId, status, title: `Filme ${movieId}`, poster_path: null,
    release_date: null, vote_average: null, vote_count: null, updated_at: updatedAt };
}

test("dadosDoFilme guarda só o que o cartão usa", () => {
  assert.deepEqual(dadosDoFilme(clube), {
    movie_id: 550, title: "Clube da Luta", poster_path: "/p.jpg", release_date: "1999-10-15",
    vote_average: 8.4, vote_count: 30000,
  });
});

test("dadosDoFilme sem pôster, data e nota grava null", () => {
  assert.deepEqual(dadosDoFilme({ id: 7, title: "Sem nada" }), {
    movie_id: 7, title: "Sem nada", poster_path: null, release_date: null, vote_average: null, vote_count: null,
  });
});

test("proximoStatus marca, desmarca e troca", () => {
  assert.equal(proximoStatus(null, "quero"), "quero");
  assert.equal(proximoStatus("quero", "quero"), null);
  assert.equal(proximoStatus("quero", "assisti"), "assisti");
});

test("statusDoFilme devolve o status ou null", () => {
  const lista = [linha(550, "assisti", "2026-11-01")];
  assert.equal(statusDoFilme(lista, 550), "assisti");
  assert.equal(statusDoFilme(lista, 13), null);
});

test("aplicarMarcacao troca de lista sem duplicar o filme", () => {
  const lista = [linha(550, "quero", "2026-11-01"), linha(13, "quero", "2026-11-01")];
  const nova = aplicarMarcacao(lista, linha(550, "assisti", "2026-11-02"));
  assert.equal(nova.filter((m) => m.movie_id === 550).length, 1);
  assert.equal(statusDoFilme(nova, 550), "assisti");
  assert.equal(statusDoFilme(lista, 550), "quero");
});

test("aplicarMarcacao acrescenta filme novo", () => {
  assert.equal(aplicarMarcacao([], linha(550, "quero", "2026-11-01")).length, 1);
});

test("removerMarcacao tira só o filme pedido e não altera a original", () => {
  const lista = [linha(550, "quero", "2026-11-01"), linha(13, "quero", "2026-11-01")];
  assert.deepEqual(removerMarcacao(lista, 550).map((m) => m.movie_id), [13]);
  assert.equal(lista.length, 2);
});

test("filmesDaAba filtra pelo status e põe o mais recente primeiro", () => {
  const lista = [
    linha(1, "quero", "2026-11-01T10:00:00Z"),
    linha(2, "assisti", "2026-11-03T10:00:00Z"),
    linha(3, "quero", "2026-11-02T10:00:00Z"),
  ];
  const filmes = filmesDaAba(lista, "quero");
  assert.deepEqual(filmes.map((f) => f.id), [3, 1]);
  assert.deepEqual(filmes[0], {
    id: 3, title: "Filme 3", poster_path: null, release_date: null, vote_average: null, vote_count: null,
  });
});

test("marcar faz upsert com o usuário e o status e devolve a linha salva", async () => {
  const salva = linha(550, "quero", "2026-11-03");
  const client = fakeClient({ data: salva, error: null });
  assert.deepEqual(await marcar(client, "u1", clube, "quero"), salva);
  assert.deepEqual(client.chamadas[0], ["from", "marcacoes"]);
  const [, enviado, opcoes] = client.chamadas.find((c) => c[0] === "upsert");
  assert.equal(enviado.user_id, "u1");
  assert.equal(enviado.movie_id, 550);
  assert.equal(enviado.status, "quero");
  assert.equal(typeof enviado.updated_at, "string");
  assert.deepEqual(opcoes, { onConflict: "user_id,movie_id" });
});

test("marcar com erro avisa que não deu para salvar", async () => {
  const client = fakeClient({ data: null, error: { message: "Failed to fetch" } });
  await assert.rejects(marcar(client, "u1", clube, "quero"), { message: "Não deu para salvar, tente de novo." });
});

test("desmarcar apaga a linha do usuário e do filme", async () => {
  const client = fakeClient();
  await desmarcar(client, "u1", 550);
  assert.ok(client.chamadas.some((c) => c[0] === "delete"));
  assert.ok(client.chamadas.some((c) => c[0] === "eq" && c[1] === "user_id" && c[2] === "u1"));
  assert.ok(client.chamadas.some((c) => c[0] === "eq" && c[1] === "movie_id" && c[2] === 550));
});

test("desmarcar com erro avisa que não deu para salvar", async () => {
  const client = fakeClient({ data: null, error: { message: "x" } });
  await assert.rejects(desmarcar(client, "u1", 550), { message: "Não deu para salvar, tente de novo." });
});

test("carregarMarcacoes devolve as linhas", async () => {
  const linhas = [linha(550, "quero", "2026-11-01")];
  assert.deepEqual(await carregarMarcacoes(fakeClient({ data: linhas, error: null })), linhas);
});

test("carregarMarcacoes com erro avisa que não deu para carregar", async () => {
  const client = fakeClient({ data: null, error: { message: "x" } });
  await assert.rejects(carregarMarcacoes(client), { message: "Não deu para carregar suas listas." });
});
