import { test } from "node:test";
import assert from "node:assert/strict";
// Importar ui.js no Node já prova que ele não acessa "document" ao carregar
import { messageFor, seloDoStatus } from "../js/ui.js";

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

test("abas de lista sem login pedem para entrar", () => {
  assert.deepEqual(messageFor("entre_para_ver"), {
    text: "Entre para ver suas listas",
    action: { label: "Entrar", kind: "entrar" },
    link: null,
  });
});

test("listas vazias têm mensagem própria, sem botão", () => {
  assert.deepEqual(messageFor("vazia_quero"), {
    text: "Você ainda não marcou nenhum filme para assistir.", action: null, link: null,
  });
  assert.deepEqual(messageFor("vazia_assisti"), {
    text: "Você ainda não marcou nenhum filme como assistido.", action: null, link: null,
  });
});

test("falha ao carregar as listas oferece tentar de novo", () => {
  assert.deepEqual(messageFor("falha_listas"), {
    text: "Não deu para carregar suas listas.",
    action: { label: "Tentar de novo", kind: "tentar_listas" },
    link: null,
  });
});

test("seloDoStatus mostra ícone e texto de cada lista", () => {
  assert.deepEqual(seloDoStatus("quero"), { icone: "🔖", texto: "Na sua lista Quero assistir" });
  assert.deepEqual(seloDoStatus("assisti"), { icone: "✓", texto: "Você já assistiu" });
  assert.equal(seloDoStatus(null), null);
});
