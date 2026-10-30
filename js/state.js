// Estado do catálogo. Cada função devolve um NOVO objeto, sem alterar o anterior.

export function createState() {
  return {
    selectedProviders: [],
    selectedGenres: [],
    sort: "popularidade",
    page: 1,
    totalPages: 0,
    totalResults: 0,
    movies: [],
  };
}

function toggle(list, id) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

// Qualquer mudança de filtro recomeça da página 1
function restart(state, changes) {
  return { ...state, ...changes, page: 1, movies: [] };
}

export function toggleProvider(state, id) {
  return restart(state, { selectedProviders: toggle(state.selectedProviders, id) });
}

export function toggleGenre(state, id) {
  return restart(state, { selectedGenres: toggle(state.selectedGenres, id) });
}

export function setSort(state, sort) {
  return restart(state, { sort });
}

export function clearFilters(state) {
  return restart(state, { selectedProviders: [], selectedGenres: [] });
}

export function nextPage(state) {
  return { ...state, page: state.page + 1 };
}

export function applyResults(state, response) {
  let movies = response.results;
  if (state.page > 1) {
    // A popularidade muda entre uma página e outra, então o TMDB pode repetir filmes
    const seen = new Set(state.movies.map((m) => m.id));
    movies = [...state.movies, ...movies.filter((m) => !seen.has(m.id))];
  }
  return { ...state, movies, totalPages: response.total_pages, totalResults: response.total_results };
}

// O TMDB não deixa passar da página 500
export function hasMore(state) {
  return state.page < Math.min(state.totalPages, 500);
}

// Numera as buscas para ignorar respostas que chegam fora de ordem
export function createRequestCounter() {
  let last = 0;
  return {
    next: () => ++last,
    isLatest: (n) => n === last,
  };
}
