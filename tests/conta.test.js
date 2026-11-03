import { test } from "node:test";
import assert from "node:assert/strict";
import { traduzirErroConta, entrar, criarConta, sair, aoMudarSessao } from "../js/conta.js";

// Supabase de mentira: grava o que recebeu e devolve a resposta combinada
function fakeClient(resposta = { data: {}, error: null }) {
  const chamadas = [];
  let ouvinte = null;
  const auth = {
    signInWithPassword: async (dados) => { chamadas.push(["signInWithPassword", dados]); return resposta; },
    signUp: async (dados) => { chamadas.push(["signUp", dados]); return resposta; },
    signOut: async () => { chamadas.push(["signOut"]); return { error: null }; },
    onAuthStateChange: (cb) => { ouvinte = cb; },
  };
  return { auth, chamadas, disparar: (evento, sessao) => ouvinte(evento, sessao) };
}

const usuario = { id: "u1", email: "daniel@gmail.com" };

test("traduzirErroConta traduz cada código do Supabase", () => {
  const casos = {
    invalid_credentials: "E-mail ou senha incorretos.",
    user_already_exists: "Esse e-mail já tem conta. Que tal entrar?",
    email_exists: "Esse e-mail já tem conta. Que tal entrar?",
    weak_password: "A senha precisa ter pelo menos 6 caracteres.",
    email_address_invalid: "Digite um e-mail válido.",
    validation_failed: "Digite um e-mail válido.",
    xyz: "Algo deu errado. Tente de novo.",
  };
  for (const [code, texto] of Object.entries(casos)) {
    assert.equal(traduzirErroConta({ code }), texto, code);
  }
});

test("traduzirErroConta reconhece falta de internet", () => {
  const texto = "Não deu para conectar. Verifique a internet e tente de novo.";
  assert.equal(traduzirErroConta({ name: "AuthRetryableFetchError" }), texto);
  assert.equal(traduzirErroConta({ status: 0 }), texto);
  assert.equal(traduzirErroConta({ message: "Failed to fetch" }), texto);
});

test("entrar devolve o usuário", async () => {
  const client = fakeClient({ data: { user: usuario, session: {} }, error: null });
  assert.deepEqual(await entrar(client, "daniel@gmail.com", "123456"), usuario);
});

test("entrar limpa espaços e maiúsculas do e-mail", async () => {
  const client = fakeClient({ data: { user: usuario, session: {} }, error: null });
  await entrar(client, " Daniel@Gmail.com ", "123456");
  assert.deepEqual(client.chamadas[0], ["signInWithPassword", { email: "daniel@gmail.com", password: "123456" }]);
});

test("entrar com senha errada rejeita com a mensagem em português", async () => {
  const client = fakeClient({ data: {}, error: { code: "invalid_credentials" } });
  await assert.rejects(entrar(client, "a@b.com", "x"), { message: "E-mail ou senha incorretos." });
});

test("criarConta com sessão devolve o usuário", async () => {
  const client = fakeClient({ data: { user: usuario, session: {} }, error: null });
  assert.deepEqual(await criarConta(client, "daniel@gmail.com", "123456"), usuario);
});

test("criarConta sem sessão explica que falta desligar a confirmação por e-mail", async () => {
  const client = fakeClient({ data: { user: usuario, session: null }, error: null });
  await assert.rejects(criarConta(client, "daniel@gmail.com", "123456"), {
    message: 'Conta criada, mas o Supabase está pedindo confirmação por e-mail. Desligue "Confirm email" no painel do Supabase.',
  });
});

test("criarConta com e-mail repetido sugere entrar", async () => {
  const client = fakeClient({ data: {}, error: { code: "user_already_exists" } });
  await assert.rejects(criarConta(client, "a@b.com", "123456"), { message: "Esse e-mail já tem conta. Que tal entrar?" });
});

test("sair chama signOut", async () => {
  const client = fakeClient();
  await sair(client);
  assert.deepEqual(client.chamadas, [["signOut"]]);
});

test("aoMudarSessao avisa quem entrou e quem saiu", () => {
  const client = fakeClient();
  const recebidos = [];
  aoMudarSessao(client, (user) => recebidos.push(user));
  client.disparar("SIGNED_IN", { user: usuario });
  client.disparar("SIGNED_OUT", null);
  assert.deepEqual(recebidos, [usuario, null]);
});

test("entrar com e-mail não confirmado explica que falta desligar a confirmação", async () => {
  const client = fakeClient({ data: {}, error: { code: "email_not_confirmed" } });
  await assert.rejects(entrar(client, "a@b.com", "123456"), {
    message: 'Esse e-mail ainda não foi confirmado. Desligue "Confirm email" no painel do Supabase ou clique no link que chegou no seu e-mail.',
  });
});
