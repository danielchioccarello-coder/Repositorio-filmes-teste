import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createState, toggleProvider, toggleGenre, setSort, setMinRating, clearFilters,
  nextPage, applyResults, hasMore, createRequestCounter, setAba,
} from "../js/state.js";

test("toggleProvider adiciona e remove", () => {
  const a = toggleProvider(createState(), 8);
  assert.deepEqual(a.selectedProviders, [8]);
  assert.deepEqual(toggleProvider(a, 8).selectedProviders, []);
});

test("toggleGenre adiciona e remove", () => {
  const a = toggleGenre(createState(), 28);
  assert.deepEqual(a.selectedGenres, [28]);
  assert.deepEqual(toggleGenre(a, 28).selectedGenres, []);
});

test("mudar filtro volta à página 1 e limpa filmes", () => {
  const s = { ...createState(), page: 4, movies: [{ id: 1 }] };
  for (const next of [toggleProvider(s, 8), toggleGenre(s, 28)]) {
    assert.equal(next.page, 1);
    assert.deepEqual(next.movies, []);
  }
});

test("setSort('nota') volta à página 1", () => {
  const s = setSort({ ...createState(), page: 3, movies: [{ id: 1 }] }, "nota");
  assert.equal(s.sort, "nota");
  assert.equal(s.page, 1);
  assert.deepEqual(s.movies, []);
});

test("clearFilters zera serviços e gêneros e mantém a ordenação", () => {
  const s = clearFilters({ ...createState(), selectedProviders: [8], selectedGenres: [28], sort: "nota", page: 2 });
  assert.deepEqual(s.selectedProviders, []);
  assert.deepEqual(s.selectedGenres, []);
  assert.equal(s.sort, "nota");
  assert.equal(s.page, 1);
});

test("nextPage avança e mantém os filmes", () => {
  const s = nextPage({ ...createState(), page: 1, movies: [{ id: 1 }] });
  assert.equal(s.page, 2);
  assert.deepEqual(s.movies, [{ id: 1 }]);
});

test("applyResults na página 1 substitui os filmes e copia totais", () => {
  const s = applyResults({ ...createState(), movies: [{ id: 9 }] }, { results: [{ id: 1 }], total_pages: 7, total_results: 130 });
  assert.deepEqual(s.movies.map((m) => m.id), [1]);
  assert.equal(s.totalPages, 7);
  assert.equal(s.totalResults, 130);
});

test("applyResults na página 2 acrescenta sem repetir id", () => {
  const s = applyResults(
    { ...createState(), page: 2, movies: [{ id: 1 }, { id: 2 }] },
    { results: [{ id: 2 }, { id: 3 }], total_pages: 5, total_results: 100 },
  );
  assert.deepEqual(s.movies.map((m) => m.id), [1, 2, 3]);
});

test("hasMore respeita total de páginas e o limite de 500", () => {
  assert.equal(hasMore({ ...createState(), page: 3, totalPages: 3 }), false);
  assert.equal(hasMore({ ...createState(), page: 500, totalPages: 900 }), false);
  assert.equal(hasMore({ ...createState(), page: 1, totalPages: 2 }), true);
});

test("createRequestCounter: só a última é a mais recente", () => {
  const counter = createRequestCounter();
  const a = counter.next();
  const b = counter.next();
  assert.equal(counter.isLatest(a), false);
  assert.equal(counter.isLatest(b), true);
});

test("funções não alteram o estado original", () => {
  const s = createState();
  const copy = structuredClone(s);
  toggleProvider(s, 8);
  toggleGenre(s, 28);
  setSort(s, "nota");
  nextPage(s);
  applyResults(s, { results: [{ id: 1 }], total_pages: 1, total_results: 1 });
  assert.deepEqual(s, copy);
});

test("começa sem nota mínima", () => {
  assert.equal(createState().minRating, 0);
});

test("setMinRating guarda a nota e volta à página 1", () => {
  const s = setMinRating({ ...createState(), page: 3, movies: [{ id: 1 }] }, 8);
  assert.equal(s.minRating, 8);
  assert.equal(s.page, 1);
  assert.deepEqual(s.movies, []);
});

test("clearFilters também zera a nota mínima", () => {
  assert.equal(clearFilters({ ...createState(), minRating: 8 }).minRating, 0);
});

test("setAba troca a aba sem perder filtros nem filmes", () => {
  const s = { ...createState(), selectedGenres: [28], page: 3, movies: [{ id: 1 }] };
  const next = setAba(s, "quero");
  assert.equal(next.aba, "quero");
  assert.deepEqual(next.selectedGenres, [28]);
  assert.equal(next.page, 3);
  assert.deepEqual(next.movies, [{ id: 1 }]);
  assert.equal(createState().aba, "catalogo");
});
