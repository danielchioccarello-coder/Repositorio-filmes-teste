// Conexão com o Supabase (login e listas). Único arquivo que carrega a biblioteca deles.
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
const FALHA_AO_CARREGAR = "Não deu para carregar o login. Verifique a internet e recarregue a página.";

// Sem endereço ou chave, o site funciona só como catálogo
export function lerConfigSupabase(config) {
  const url = (config.SUPABASE_URL ?? "").trim();
  const chave = (config.SUPABASE_ANON_KEY ?? "").trim();
  return url && chave ? { url, chave } : null;
}

// null = login não configurado. Lança erro se a biblioteca não baixar nem na segunda tentativa.
export async function conectar(config, carregar = (url) => import(url), espera = 1000) {
  const dados = lerConfigSupabase(config);
  if (!dados) return null;
  let biblioteca;
  try {
    biblioteca = await carregar(SUPABASE_CDN);
  } catch (error) {
    // A internet às vezes derruba a conexão: vale tentar mais uma vez
    console.error(error);
    await new Promise((r) => setTimeout(r, espera));
    try {
      biblioteca = await carregar(SUPABASE_CDN);
    } catch (error2) {
      console.error(error2);
      throw new Error(FALHA_AO_CARREGAR);
    }
  }
  return biblioteca.createClient(dados.url, dados.chave);
}

export async function criarCliente() {
  let config;
  try {
    config = await import("./config.publico.js");
  } catch {
    // Sem js/config.publico.js o login só fica desligado
    return null;
  }
  return conectar(config);
}
