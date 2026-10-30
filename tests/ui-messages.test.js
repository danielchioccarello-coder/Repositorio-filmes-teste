import { test } from "node:test";
import assert from "node:assert/strict";
// Importar ui.js no Node já prova que ele não acessa "document" ao carregar
import { messageFor } from "../js/ui.js";

test("vazio sugere limpar filtros", () => {
  assert.deepEqual(messageFor("vazio"), {
    text: "Nenhum filme encontrado. Tente remover algum gênero.",
    action: { label: "Limpar filtros", kind: "limpar" },
    link: null,
  });
});

test("rede e outro sugerem tentar de novo", () => {
  for (const kind of ["rede", "outro"]) {
    assert.deepEqual(messageFor(kind), {
      text: "Não foi possível carregar os filmes.",
      action: { label: "Tentar de novo", kind: "tentar" },
      link: null,
    });
  }
});

test("chave_invalida ensina a configurar a chave", () => {
  assert.deepEqual(messageFor("chave_invalida"), {
    text: "Configure sua chave do TMDB em js/config.js",
    action: null,
    link: "https://www.themoviedb.org/settings/api",
  });
});

test("tipo desconhecido cai na mensagem genérica", () => {
  assert.equal(messageFor("qualquer").text, "Não foi possível carregar os filmes.");
});
