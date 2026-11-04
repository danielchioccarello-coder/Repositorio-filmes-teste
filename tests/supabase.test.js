import { test } from "node:test";
import assert from "node:assert/strict";
// Importar supabase.js no Node já prova que ele não carrega a biblioteca da CDN ao abrir
import { lerConfigSupabase, conectar } from "../js/supabase.js";

test("lerConfigSupabase devolve null sem endereço ou chave", () => {
  assert.equal(lerConfigSupabase({}), null);
  assert.equal(lerConfigSupabase({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "" }), null);
  assert.equal(lerConfigSupabase({ SUPABASE_URL: "  ", SUPABASE_ANON_KEY: "abc" }), null);
});

test("lerConfigSupabase devolve endereço e chave sem espaços", () => {
  assert.deepEqual(
    lerConfigSupabase({ SUPABASE_URL: " https://x.supabase.co ", SUPABASE_ANON_KEY: " abc " }),
    { url: "https://x.supabase.co", chave: "abc" },
  );
});

const CONFIG = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "abc" };
// Biblioteca de mentira: createClient devolve o que recebeu
const biblioteca = { createClient: (url, chave) => ({ url, chave }) };

test("conectar sem configuração devolve null sem baixar a biblioteca", async () => {
  let baixou = false;
  assert.equal(await conectar({}, async () => { baixou = true; return biblioteca; }), null);
  assert.equal(baixou, false);
});

test("conectar cria o cliente com endereço e chave", async () => {
  assert.deepEqual(await conectar(CONFIG, async () => biblioteca), { url: "https://x.supabase.co", chave: "abc" });
});

test("conectar tenta baixar a biblioteca de novo se a primeira vez falhar", async () => {
  let tentativas = 0;
  const carregar = async () => {
    tentativas++;
    if (tentativas === 1) throw new TypeError("Failed to fetch dynamically imported module");
    return biblioteca;
  };
  assert.deepEqual(await conectar(CONFIG, carregar, 0), { url: "https://x.supabase.co", chave: "abc" });
  assert.equal(tentativas, 2);
});

test("conectar avisa que não deu para carregar o login se falhar duas vezes", async () => {
  const carregar = async () => { throw new TypeError("Failed to fetch dynamically imported module"); };
  await assert.rejects(conectar(CONFIG, carregar, 0), {
    message: "Não deu para carregar o login. Verifique a internet e recarregue a página.",
  });
});
