// Intermediário entre o site publicado e o TMDB: guarda a chave e só deixa passar o que o site usa.
// O "_" no nome impede a Vercel de publicar este arquivo como uma rota.
const TMDB_BASE = "https://api.themoviedb.org/3";

// Caminho do TMDB → por quanto tempo (segundos) a Vercel guarda a resposta
const CAMINHOS = [
  { regra: /^\/discover\/movie$/, cache: 3600 },
  { regra: /^\/genre\/movie\/list$/, cache: 86400 },
  { regra: /^\/watch\/providers\/movie$/, cache: 86400 },
  { regra: /^\/movie\/\d+$/, cache: 3600 },
];

const PARAMETROS = [
  "language", "watch_region", "with_watch_monetization_types", "with_watch_providers", "with_genres",
  "sort_by", "page", "vote_count.gte", "vote_average.gte", "append_to_response", "include_video_language",
];

function json(corpo, status, cache = "no-store") {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache },
  });
}

// O visitante nunca fica sabendo se o problema foi a chave: só que falhou
const falha = () => json({ erro: "falha" }, 502);

export function criarHandler({ token, fetchFn }) {
  const chave = (token ?? "").trim();

  return async function handler(request) {
    if (request.method !== "GET") {
      return new Response(null, { status: 405, headers: { allow: "GET", "cache-control": "no-store" } });
    }

    const entrada = new URL(request.url).searchParams;
    const caminho = entrada.get("caminho") ?? "";
    const permitido = CAMINHOS.find((c) => c.regra.test(caminho));
    if (!permitido) return json({ erro: "caminho_nao_permitido" }, 400);
    if (!chave) return falha();

    const saida = new URLSearchParams();
    for (const nome of PARAMETROS) {
      if (entrada.has(nome)) saida.set(nome, entrada.get(nome));
    }

    let resposta;
    try {
      resposta = await fetchFn(`${TMDB_BASE}${caminho}?${saida}`, {
        headers: { Authorization: `Bearer ${chave}`, accept: "application/json" },
      });
    } catch {
      return falha();
    }
    if (!resposta.ok) return falha();

    const cache = `public, s-maxage=${permitido.cache}, stale-while-revalidate=86400`;
    return json(await resposta.json(), 200, cache);
  };
}
