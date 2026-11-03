import { test } from "node:test";
import assert from "node:assert/strict";
// Importar ui-conta.js no Node já prova que ele não acessa "document" ao carregar
import { textosLogin } from "../js/ui-conta.js";

test("textosLogin do modo entrar", () => {
  assert.deepEqual(textosLogin("entrar"), {
    titulo: "Entrar", botao: "Entrar", enviando: "Entrando…", troca: "Não tem conta? Criar conta",
  });
});

test("textosLogin do modo criar", () => {
  assert.deepEqual(textosLogin("criar"), {
    titulo: "Criar conta", botao: "Criar conta", enviando: "Criando conta…", troca: "Já tem conta? Entrar",
  });
});
