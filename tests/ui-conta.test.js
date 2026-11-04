import { test } from "node:test";
import assert from "node:assert/strict";
// Importar ui-conta.js no Node já prova que ele não acessa "document" ao carregar
import { textosLogin, avisoLogin } from "../js/ui-conta.js";

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

test("avisoLogin explica login não configurado e falha ao carregar", () => {
  assert.equal(avisoLogin("nao_configurado"), "Login ainda não configurado. Preencha SUPABASE_URL e SUPABASE_ANON_KEY em js/config.js.");
  assert.equal(avisoLogin("falha"), "Não deu para carregar o login. Verifique a internet e recarregue a página.");
});

test("avisoLogin pede um instante enquanto o login carrega", () => {
  assert.equal(avisoLogin("carregando"), "Carregando o login… tente de novo em um instante.");
});
