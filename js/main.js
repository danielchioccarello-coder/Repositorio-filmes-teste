// Liga tudo: cliques → estado → TMDB → interface.
import { TMDB_TOKEN } from "./config.js";
import { createApi } from "./api.js";
import { formatCount } from "./format.js";
import {
  createState, toggleProvider, toggleGenre, setSort, nextPage,
  applyResults, hasMore, createRequestCounter,
} from "./state.js";
import { renderMovies, renderProviders, renderGenres, setLoadMore } from "./ui.js";

const api = createApi(TMDB_TOKEN);
const counter = createRequestCounter();

const els = {
  providers: document.querySelector("#providers"),
  providerSearch: document.querySelector("#provider-search"),
  providerList: document.querySelector("#provider-list"),
  providerToggle: document.querySelector("#provider-toggle"),
  genres: document.querySelector("#genres"),
  sort: document.querySelector("#sort"),
  count: document.querySelector("#count"),
  grid: document.querySelector("#grid"),
  loadMore: document.querySelector("#load-more"),
};

let state = createState();
let providers = [];
let genres = [];
let providerView = { expanded: false, filterText: "" };
let loading = false;

function drawFilters() {
  renderProviders(els.providers, providers, state.selectedProviders, providerView);
  renderGenres(els.genres, genres, state.selectedGenres);
}

async function loadMovies() {
  const requestNumber = counter.next();
  const isFirstPage = state.page === 1;
  const before = state.movies.length;
  loading = true;
  setLoadMore(els.loadMore, { visible: !isFirstPage, loading: true });

  const data = await api.discoverMovies({
    providerIds: state.selectedProviders,
    allProviderIds: providers.map((p) => p.id),
    genreIds: state.selectedGenres,
    sort: state.sort,
    page: state.page,
  });
  // Se o usuário mudou o filtro enquanto esperava, esta resposta já não vale
  if (!counter.isLatest(requestNumber)) return;

  state = applyResults(state, data);
  if (isFirstPage) {
    renderMovies(els.grid, state.movies, { append: false });
  } else {
    renderMovies(els.grid, state.movies.slice(before), { append: true });
  }
  els.count.textContent = formatCount(state.totalResults);
  loading = false;
  setLoadMore(els.loadMore, { visible: hasMore(state), loading: false });
}

// Muda o estado, redesenha os filtros e busca de novo
function changeFilters(newState) {
  state = newState;
  drawFilters();
  loadMovies();
}

els.providerList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-provider-id]");
  if (button) changeFilters(toggleProvider(state, Number(button.dataset.providerId)));
});

els.genres.addEventListener("click", (event) => {
  const button = event.target.closest("[data-genre-id]");
  if (button) changeFilters(toggleGenre(state, Number(button.dataset.genreId)));
});

els.sort.addEventListener("change", () => changeFilters(setSort(state, els.sort.value)));

els.providerToggle.addEventListener("click", () => {
  providerView = { expanded: !providerView.expanded, filterText: "" };
  els.providerSearch.value = "";
  drawFilters();
  if (providerView.expanded) els.providerSearch.focus();
});

els.providerSearch.addEventListener("input", () => {
  providerView = { ...providerView, filterText: els.providerSearch.value };
  drawFilters();
});

els.loadMore.addEventListener("click", () => {
  if (loading) return;
  state = nextPage(state);
  loadMovies();
});

async function start() {
  [providers, genres] = await Promise.all([api.getProviders(), api.getGenres()]);
  drawFilters();
  await loadMovies();
}

start();
