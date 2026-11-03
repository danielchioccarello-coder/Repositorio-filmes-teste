// Conexão com o Supabase (login e listas). Único arquivo que carrega a biblioteca deles.
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

// Sem endereço ou chave, o site funciona só como catálogo
export function lerConfigSupabase(config) {
  const url = (config.SUPABASE_URL ?? "").trim();
  const chave = (config.SUPABASE_ANON_KEY ?? "").trim();
  return url && chave ? { url, chave } : null;
}

export async function criarCliente() {
  try {
    const config = await import("./config.js");
    const dados = lerConfigSupabase(config);
    if (!dados) return null;
    // A biblioteca só é baixada quando o login está configurado
    const { createClient } = await import(SUPABASE_CDN);
    return createClient(dados.url, dados.chave);
  } catch (error) {
    console.error(error);
    return null;
  }
}
