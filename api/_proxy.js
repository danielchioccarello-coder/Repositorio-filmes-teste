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

const QUALQUER = () => true;

// Parâmetro → regra do valor. Os que podem pedir dados extras ao TMDB só aceitam exatamente o que o site usa.
const PARAMETROS = {
  language: QUALQUER,
  watch_region: QUALQUER,
  with_watch_monetization_types: QUALQUER,
  with_watch_providers: QUALQUER,
  with_genres: QUALQUER,
  sort_by: QUALQUER,
  "vote_count.gte": QUALQUER,
  "vote_average.gte": QUALQUER,
  page: (v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 500,
  append_to_response: (v) => v === "credits,videos,watch/providers",
  include_video_language: (v) => v === "pt,en,null",
};

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
    for (const [nome, valido] of Object.entries(PARAMETROS)) {
      const valor = entrada.get(nome);
      if (valor !== null && valido(valor)) saida.set(nome, valor);
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
