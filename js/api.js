// Única parte do site que conversa com o TMDB.
import { formatYear, formatRating, formatRuntime } from "./format.js";

export const API_BASE = "https://api.themoviedb.org/3";

export class ApiError extends Error {
  // type: 'rede' | 'chave_invalida' | 'outro'
  constructor(type, message, status) {
    super(message);
    this.name = "ApiError";
    this.type = type;
    this.status = status;
  }
}

const SORT_BY = {
  popularidade: "popularity.desc",
  nota: "vote_average.desc",
  lancamento: "primary_release_date.desc",
};

// Monta os parâmetros da busca de filmes a partir dos filtros escolhidos.
// Serviços com "|" (qualquer um deles); gêneros com "," (todos eles).
export function buildDiscoverParams({ providerIds, allProviderIds, genreIds = [], sort = "popularidade", minRating = 0, page }) {
  const ids = providerIds.length > 0 ? providerIds : allProviderIds;
  const params = new URLSearchParams({
    language: "pt-BR",
    watch_region: "BR",
    with_watch_monetization_types: "flatrate",
    with_watch_providers: ids.join("|"),
    sort_by: SORT_BY[sort],
    page: String(page),
  });
  if (genreIds.length > 0) params.set("with_genres", genreIds.join(","));
  if (minRating > 0) params.set("vote_average.gte", String(minRating));
  // Sem isso, um filme com 3 votos e nota 10 ficaria no topo
  if (sort === "nota" || minRating > 0) params.set("vote_count.gte", "200");
  return params;
}

function toProvider(p) {
  return { id: p.provider_id, name: p.provider_name, logoPath: p.logo_path };
}

// Transforma a resposta de detalhes do TMDB só no que a janela precisa mostrar.
export function extractDetails(raw) {
  const trailers = (raw.videos?.results ?? []).filter((v) => v.site === "YouTube" && v.type === "Trailer");
  const trailer = trailers.find((v) => v.iso_639_1 === "pt") ?? trailers[0];
  const flatrate = raw["watch/providers"]?.results?.BR?.flatrate ?? [];
  return {
    id: raw.id,
    title: raw.title,
    year: formatYear(raw.release_date),
    rating: formatRating(raw.vote_average, raw.vote_count),
    runtime: formatRuntime(raw.runtime),
    genres: (raw.genres ?? []).map((g) => g.name),
    overview: raw.overview || "Sinopse não disponível em português.",
    cast: (raw.credits?.cast ?? []).slice(0, 5).map((c) => c.name),
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    providers: flatrate.map(toProvider),
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path ?? null,
  };
}

export function createApi(token, fetchFn = globalThis.fetch) {
  const cleanToken = (token ?? "").trim();

  // Com a chave local (js/config.js) fala direto com o TMDB.
  // Sem ela (site publicado) usa o intermediário /api/tmdb, que guarda a chave no servidor.
  function montarPedido(path, params) {
    if (cleanToken) {
      return {
        url: `${API_BASE}${path}?${params}`,
        headers: { Authorization: `Bearer ${cleanToken}`, accept: "application/json" },
      };
    }
    const query = new URLSearchParams({ caminho: path });
    for (const [nome, valor] of params) query.append(nome, valor);
    return { url: `/api/tmdb?${query}`, headers: { accept: "application/json" } };
  }

  async function request(path, params = new URLSearchParams()) {
    if (!params.has("language")) params.set("language", "pt-BR");
    const { url, headers } = montarPedido(path, params);

    let response;
    try {
      response = await fetchFn(url, { headers });
    } catch (error) {
      throw new ApiError("rede", error.message);
    }

    // Com chave: 401 = chave errada. Sem chave: 404 = não há intermediário (computador sem js/config.js)
    if (cleanToken ? response.status === 401 : response.status === 404) {
      throw new ApiError("chave_invalida", "Token do TMDB ausente ou inválido", response.status);
    }
    if (!response.ok) {
      throw new ApiError("outro", `Erro do TMDB: HTTP ${response.status}`, response.status);
    }
    return response.json();
  }

  async function getProviders() {
    const data = await request("/watch/providers/movie", new URLSearchParams({ watch_region: "BR" }));
    const priority = (p) => p.display_priorities?.BR ?? p.display_priority ?? Infinity;
    return [...data.results]
      .sort((a, b) => priority(a) - priority(b))
      .map(toProvider);
  }

  async function getGenres() {
    const data = await request("/genre/movie/list");
    return data.genres;
  }

  function discoverMovies(filters) {
    return request("/discover/movie", buildDiscoverParams(filters));
  }

  function getMovieDetails(id) {
    // Com language=pt-BR o TMDB só mandaria trailers em português; a maioria só tem em inglês
    const params = new URLSearchParams({
      append_to_response: "credits,videos,watch/providers",
      include_video_language: "pt,en,null",
    });
    return request(`/movie/${id}`, params);
  }

  return { getProviders, getGenres, discoverMovies, getMovieDetails };
}
