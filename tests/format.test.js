import { test } from "node:test";
import assert from "node:assert/strict";
import { formatYear, formatRating, formatCount, posterUrl } from "../js/format.js";

test("formatYear pega o ano da data", () => {
  assert.equal(formatYear("2024-05-01"), "2024");
});

test("formatYear sem data devolve vazio", () => {
  assert.equal(formatYear(""), "");
  assert.equal(formatYear(undefined), "");
});

test("formatRating usa uma casa decimal com vírgula", () => {
  assert.equal(formatRating(7.84, 1200), "7,8");
  assert.equal(formatRating(8, 50), "8,0");
});

test("formatRating sem votos devolve Sem nota", () => {
  assert.equal(formatRating(0, 0), "Sem nota");
});

test("formatCount usa ponto de milhar e plural", () => {
  assert.equal(formatCount(1234), "1.234 filmes encontrados");
  assert.equal(formatCount(1), "1 filme encontrado");
  assert.equal(formatCount(0), "0 filmes encontrados");
});

test("posterUrl monta a URL da imagem ou devolve null", () => {
  assert.equal(posterUrl(null), null);
  assert.equal(posterUrl("/x.jpg"), "https://image.tmdb.org/t/p/w342/x.jpg");
  assert.equal(posterUrl("/l.png", "w92"), "https://image.tmdb.org/t/p/w92/l.png");
});
