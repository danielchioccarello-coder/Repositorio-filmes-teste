// Única parte do site que conversa com o TMDB.
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

// Monta os parâmetros da busca de filmes a partir dos filtros escolhidos.
export function buildDiscoverParams({ providerIds, allProviderIds, page }) {
  const ids = providerIds.length > 0 ? providerIds : allProviderIds;
  return new URLSearchParams({
    language: "pt-BR",
    watch_region: "BR",
    with_watch_monetization_types: "flatrate",
    with_watch_providers: ids.join("|"),
    sort_by: "popularity.desc",
    page: String(page),
  });
}

export function createApi(token, fetchFn = globalThis.fetch) {
  const cleanToken = (token ?? "").trim();

  async function request(path, params = new URLSearchParams()) {
    if (!cleanToken) {
      throw new ApiError("chave_invalida", "Token do TMDB não configurado");
    }
    if (!params.has("language")) params.set("language", "pt-BR");

    let response;
    try {
      response = await fetchFn(`${API_BASE}${path}?${params}`, {
        headers: { Authorization: `Bearer ${cleanToken}`, accept: "application/json" },
      });
    } catch (error) {
      throw new ApiError("rede", error.message);
    }

    if (response.status === 401) {
      throw new ApiError("chave_invalida", "Token do TMDB inválido", 401);
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
      .map((p) => ({ id: p.provider_id, name: p.provider_name, logoPath: p.logo_path }));
  }

  function discoverMovies(filters) {
    return request("/discover/movie", buildDiscoverParams(filters));
  }

  return { getProviders, discoverMovies };
}
