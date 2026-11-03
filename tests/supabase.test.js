import { test } from "node:test";
import assert from "node:assert/strict";
// Importar supabase.js no Node já prova que ele não carrega a biblioteca da CDN ao abrir
import { lerConfigSupabase } from "../js/supabase.js";

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
